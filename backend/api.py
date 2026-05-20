import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 

from fastapi import FastAPI, UploadFile, File, Form, WebSocket
from typing import Optional  
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import cv2
import tempfile
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
import time
import datetime
import asyncio
import threading

from src.Configs import ClassifierConfig, DetectionConfig, DetectCondition
from src.Detection import VehicleDetection

app = FastAPI(title="Vision AI Multi-Node Command Center")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= 1. KHO LƯU TRỮ TOÀN CỤC (GLOBAL BUFFER & STATE) =================
CAMERA_SOURCES = {
    "CAM-01": "videos/accident_sample1.mp4", 
    "CAM-02": "videos/accident_sample2.mp4",
    "CAM-03": "videos/normal_traffic.mp4"
}

global_frame_buffer = {cam_id: None for cam_id in CAMERA_SOURCES.keys()}

app_state = {
    "is_running": False,
    "total_accidents": 0,
    "incident_reports": [],
    "logs": [],
    "location": "Đang chờ thiết lập...",
    "nodes": {
        cam_id: {
            "status": "NORMAL",
            "police_dispatch": "Standby",
            "ems_dispatch": "Standby",
            "fps": 0.0,
            "location": f"Giao lộ Khu vực - {cam_id}"
        } for cam_id in CAMERA_SOURCES.keys()
    }
}

system_config = {
    "sender_email": "",
    "app_password": "",
    "receiver_email": ""
}

# Khởi tạo mô hình AI dùng chung cho tất cả Camera (Shared Weights)
classifier_config = ClassifierConfig(model_type='EfficientNetB0', classifier_path='models/cnn/EfficientNetB0.h5')
detection_config = DetectionConfig(model_path='models/yolo/best.pt', threshold_conf=0.7, valid_classes=[0, 1], nms_threshold=0.4)
detection_model = VehicleDetection(detection_config, classifier_config)
label_condition = DetectCondition()

# ================= HÀM HỖ TRỢ NGẦM =================
def add_log(level, message):
    t_str = datetime.datetime.now().strftime("%H:%M:%S")
    app_state["logs"].insert(0, {"time": t_str, "level": level, "message": message})
    if len(app_state["logs"]) > 20: app_state["logs"].pop()

def send_email_alert(image_frame, severity, location):
    if not system_config["sender_email"]: return
    msg = MIMEMultipart()
    if severity == "MODERATE":
        msg['Subject'] = f"⚠️ [CẢNH BÁO] VA CHẠM VỪA TẠI {location.upper()}"
        body = f"Hệ thống AI phát hiện va chạm mức VỪA.\n📍 Địa điểm: {location}\nYêu cầu CSGT đến phân luồng."
    else:
        msg['Subject'] = f"🚨 [KHẨN CẤP] TAI NẠN NGHIÊM TRỌNG TẠI {location.upper()}"
        body = f"BÁO ĐỘNG ĐỎ! Tai nạn NGHIÊM TRỌNG.\n📍 Địa điểm: {location}\nYêu cầu CẤP CỨU (115) và CSGT (113) ngay lập tức!"
        
    msg.attach(MIMEText(body, 'plain'))
    _, buffer = cv2.imencode('.jpg', image_frame)
    msg.attach(MIMEImage(buffer.tobytes(), _subtype="jpeg"))
    msg['From'], msg['To'] = system_config["sender_email"], system_config["receiver_email"]
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(system_config["sender_email"], system_config["app_password"])
        server.send_message(msg)
        server.quit()
    except Exception as e: print("Lỗi Email:", e)

# ================= 2. LUỒNG WORKER CHẠY AI NGẦM CHO TỪNG CAMERA =================
def video_processing_worker(cam_id: str, source_path: str):
    print(f"[WORKER] Đã kích hoạt luồng xử lý ngầm cho {cam_id}")
    cap = cv2.VideoCapture(source_path)
    
    current_alert_level = 0
    sent_mod, sent_sev = False, False
    start_time = time.time()
    
    frame_skip = 3
    raw_frame_count = 0
    severity_history = []
    
    while cap.isOpened() and app_state["is_running"]:
        ret, frame = cap.read()
        if not ret:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # Lặp lại video khi hết
            continue
            
        raw_frame_count += 1
        if raw_frame_count % frame_skip != 0: continue
        
        fps = 1.0 / (time.time() - start_time) if (time.time() - start_time) > 0.001 else 0.0
        start_time = time.time()
        app_state["nodes"][cam_id]["fps"] = round(fps, 1)
        
        # Pipeline AI Luồng kép
        boxes, confidences, classes = detection_model.process_frame(frame)
        indices = detection_model.apply_nms(boxes, confidences)
        detections = [(boxes[i], confidences[i], classes[i]) for i in indices]
        
        max_severity = -1
        for bbox, conf, cls in detections:
            x1, y1, w, h = bbox
            cl, ct = max(0, int(x1)-35), max(0, int(y1)-35)
            cr, cb = min(frame.shape[1], int(x1+w)+35), min(frame.shape[0], int(y1+h)+35)
            
            cond = detection_model.CarConditionStatus(int(cls))
            color, label = (0, 255, 0), "Normal"
            
            if cond == label_condition.accident:
                cropped = frame[ct:cb, cl:cr]
                if cropped.size > 0:
                    dmg_cls, dmg_conf = detection_model.classify_damage(cropped)
                    if dmg_cls == 0:
                        color, label = (255, 165, 0), f"MODERATE ({dmg_conf:.2f})"
                        max_severity = max(max_severity, 0)
                    elif dmg_cls == 2:
                        color, label = (0, 0, 255), f"SEVERE ({dmg_conf:.2f})"
                        max_severity = max(max_severity, 2)
            
            cv2.rectangle(frame, (max(0, int(x1)), max(0, int(y1))), (min(frame.shape[1], int(x1+w)), min(frame.shape[0], int(y1+h))), color, 2)
            cv2.putText(frame, f"[{cam_id}] {label}", (max(0, int(x1)), max(0, int(y1)) - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

        # Thuật toán Sliding Window Voting
        severity_history.append(max_severity)
        if len(severity_history) > 10: severity_history.pop(0)
        
        count_sev = severity_history.count(2)
        count_mod = severity_history.count(0)
        count_norm = severity_history.count(-1)
        
        node_ref = app_state["nodes"][cam_id]
        loc = node_ref["location"]
        
        # Reset khi an toàn
        if count_norm >= 8 and current_alert_level > 0:
            app_state["total_accidents"] += 1
            sev_str = "NGHIÊM TRỌNG" if current_alert_level == 2 else "VA CHẠM VỪA"
            app_state["incident_reports"].insert(0, {
                "id": f"AC-{app_state['total_accidents']:04d}",
                "time": datetime.datetime.now().strftime("%H:%M:%S - %d/%m/%Y"),
                "location": loc, "severity": sev_str, "status": "Đã giải quyết"
            })
            current_alert_level, sent_sev, sent_mod = 0, False, False
            node_ref["status"], node_ref["police_dispatch"], node_ref["ems_dispatch"] = "NORMAL", "Standby", "Standby"
            add_log("reset", f"🔄 {cam_id}: Hiện trường đã giải tỏa ổn định.")
            
        # Báo động đỏ
        elif count_sev >= 5 and current_alert_level < 2:
            current_alert_level = 2
            node_ref["status"], node_ref["police_dispatch"], node_ref["ems_dispatch"] = "EMERGENCY", "DISPATCHED", "DISPATCHED"
            add_log("severe", f"🚨 KHẨN CẤP: {cam_id} phát hiện tai nạn NGHIÊM TRỌNG!")
            if not sent_sev:
                sent_sev, sent_mod = True, True
                threading.Thread(target=send_email_alert, args=(frame.copy(), "SEVERE", loc)).start()
                
        # Cảnh báo cam
        elif count_mod >= 5 and current_alert_level < 1:
            current_alert_level = 1
            node_ref["status"], node_ref["police_dispatch"] = "WARNING", "DISPATCHED"
            add_log("moderate", f"⚠️ CẢNH BÁO: {cam_id} xảy ra va chạm vừa.")
            if not sent_mod:
                sent_mod = True
                threading.Thread(target=send_email_alert, args=(frame.copy(), "MODERATE", loc)).start()

        global_frame_buffer[cam_id] = frame.copy()

    cap.release()
    print(f"[WORKER] Luồng ngầm của {cam_id} đã tắt.")

# ================= 3. CỔNG ĐIỀU KHIỂN API ENDPOINTS =================
@app.post("/api/setup")
async def setup_system(
    input_type: str = Form("file"),                 
    video: Optional[UploadFile] = File(None),       
    sender_email: str = Form(""), 
    app_password: str = Form(""), 
    receiver_email: str = Form(""),
    location: str = Form("Phường Long An, Tây Ninh")
):
    system_config["sender_email"] = sender_email
    system_config["app_password"] = app_password
    system_config["receiver_email"] = receiver_email
    
    if not app_state["is_running"]:
        app_state["is_running"] = True
        
        # NẾU FRONTEND GỬI FILE MỚI
        if input_type == "file" and video is not None:
            tfile = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') 
            content = await video.read()
            tfile.write(content)
            tfile.close()
            
            # GÁN 1 VIDEO ĐÓ CHO CẢ 3 CAM ĐỂ DEMO ĐA LUỒNG
            CAMERA_SOURCES["CAM-01"] = tfile.name
            CAMERA_SOURCES["CAM-02"] = tfile.name
            CAMERA_SOURCES["CAM-03"] = tfile.name
            
            app_state["location"] = location # Đồng bộ địa điểm tổng            
        elif input_type == "webcam":
            CAMERA_SOURCES["CAM-01"] = 0 
            app_state["nodes"]["CAM-01"]["location"] = location

        # Bật luồng chạy song song cho toàn bộ danh sách Camera
        for cam_id, source_path in CAMERA_SOURCES.items():
            t = threading.Thread(target=video_processing_worker, args=(cam_id, source_path), daemon=True)
            t.start()
            
        add_log("normal", f"🚀 Hệ thống tích hợp đa luồng Mạng lưới {len(CAMERA_SOURCES)} Camera thành công.")
        
    return {"status": "success"}

@app.post("/api/stop")
async def stop_system():
    app_state["is_running"] = False
    for cam_id in app_state["nodes"]:
        app_state["nodes"][cam_id]["status"] = "NORMAL"
        app_state["nodes"][cam_id]["fps"] = 0.0
    for cam_id in global_frame_buffer.keys(): 
        global_frame_buffer[cam_id] = None
    add_log("warning", "🛑 Đã DỪNG toàn bộ mạng lưới Camera.")
    return {"status": "stopped"}

@app.post("/api/clear_logs")
async def clear_logs():
    app_state["logs"] = []
    return {"status": "cleared"}

# ENDPOINT ĐỘNG: Giao diện Web cần xem Camera nào thì gọi tới đường dẫn của Camera đó
@app.get("/api/video_feed/{cam_id}")
async def dynamic_video_feed(cam_id: str):
    if cam_id not in CAMERA_SOURCES:
        return {"error": "Camera ID không tồn tại"}
        
    async def frame_consumer():
        while app_state["is_running"]:
            frame = global_frame_buffer.get(cam_id)
            if frame is not None:
                ret, buffer = cv2.imencode('.jpg', frame)
                if ret:
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            await asyncio.sleep(0.04) # Khống chế Web chỉ lấy khoảng 25 FPS để nhẹ máy
            
    return StreamingResponse(frame_consumer(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.websocket("/ws/data")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Gộp trạng thái báo động chung cho toàn hệ thống
            system_status = "NORMAL"
            for node in app_state["nodes"].values():
                if node["status"] == "EMERGENCY":
                    system_status = "EMERGENCY"
                    break
                elif node["status"] == "WARNING":
                    system_status = "WARNING"
            app_state["status"] = system_status
            
            await websocket.send_json(app_state)
            await asyncio.sleep(0.2)
    except Exception: pass