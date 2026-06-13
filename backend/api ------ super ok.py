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

# Khởi tạo máy chủ FastAPI
app = FastAPI(title="Vision AI Command Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= KHO LƯU TRỮ TRẠNG THÁI (GLOBAL STATE) =================
app_state = {
    "status": "NORMAL",
    "police_dispatch": "Standby",
    "ems_dispatch": "Standby",
    "fps": 0.0,
    "total_accidents": 0,
    "incident_reports": [],
    "logs": [],       
    "is_running": False,
    "location": "Đang chờ thiết lập..."  # Đồng bộ hiển thị địa điểm với Frontend
}

system_config = {
    "video_path": None,
    "sender_email": "",
    "app_password": "",
    "receiver_email": "",
    "location": "Thành phố Tân An, Long An"
}

# Tải AI Models
classifier_config = ClassifierConfig(model_type='EfficientNetB0', classifier_path='models/cnn/EfficientNetB0.h5')
detection_config = DetectionConfig(model_path='models/yolo/best.pt', threshold_conf=0.7, valid_classes=[0, 1], nms_threshold=0.4)
detection_model = VehicleDetection(detection_config, classifier_config)
label_condition = DetectCondition()

# ================= HÀM HỖ TRỢ (GỬI EMAIL & GHI LOG) =================
def send_email_alert(image_frame, sender_email, app_password, receiver_email, severity, location):
    """Hàm gửi email được thiết kế để chạy ngầm (Threading)"""
    msg = MIMEMultipart()
    if severity == "moderate":
        msg['Subject'] = f'⚠️ [CẢNH BÁO] VA CHẠM TẠI: {location}'
        body = f"Hệ thống AI phát hiện va chạm mức VỪA.\n📍 VỊ TRÍ: {location}\nYêu cầu CSGT đến phân luồng."
    else:
        msg['Subject'] = f'🚨 [KHẨN CẤP] TAI NẠN NGHIÊM TRỌNG TẠI: {location}'
        body = f"BÁO ĐỘNG ĐỎ! Tai nạn NGHIÊM TRỌNG.\n📍 VỊ TRÍ: {location}\nYêu cầu CẤP CỨU (115) và CẢNH SÁT (113) ngay lập tức!"
    
    msg['From'], msg['To'] = sender_email, receiver_email
    msg.attach(MIMEText(body, 'plain'))
    _, buffer = cv2.imencode('.jpg', image_frame)
    msg.attach(MIMEImage(buffer.tobytes(), _subtype="jpeg"))
    
    try:
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, app_password)
        server.send_message(msg)
        server.quit()
    except Exception as e: 
        print("Lỗi Email:", e)

def add_log(level, message):
    """Hàm thêm Log mới vào danh sách và giới hạn 20 dòng"""
    t_str = datetime.datetime.now().strftime("%H:%M:%S")
    log_entry = {"time": t_str, "level": level, "message": message}
    app_state["logs"].insert(0, log_entry)
    if len(app_state["logs"]) > 20:
        app_state["logs"].pop()

# ================= 1. CỔNG API NHẬN THIẾT LẬP (SETUP) =================
@app.post("/api/setup")
async def setup_system(
    input_type: str = Form("file"),                 
    video: Optional[UploadFile] = File(None),       
    sender_email: str = Form(""), 
    app_password: str = Form(""), 
    receiver_email: str = Form(""),
    location: str = Form("Phường Long An, Tây Ninh")
):
    system_config["input_type"] = input_type
    
    if input_type == "file" and video is not None:
        tfile = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') 
        content = await video.read()
        tfile.write(content)
        tfile.close()
        system_config["video_path"] = tfile.name
    elif input_type == "webcam":
        system_config["video_path"] = 0 

    system_config["sender_email"] = sender_email
    system_config["app_password"] = app_password
    system_config["receiver_email"] = receiver_email
    system_config["location"] = location
    
    app_state["is_running"] = True
    app_state["logs"] = [] 
    app_state["location"] = location # Đồng bộ trạng thái
    add_log("normal", f"[SYS] Đã khởi động hệ thống tại: {location} (Nguồn: {input_type.upper()})")
    
    return {"status": "success", "message": "Cấu hình thành công!"}

# ================= 2. CỔNG PHÁT SÓNG VIDEO & AI (STREAMING) =================
def generate_frames():
    """Hàm chạy AI kép, tối ưu luồng và phát sóng video"""
    if system_config.get("video_path") is None: 
        return
    cap = cv2.VideoCapture(system_config["video_path"])
    
    # Các biến quản lý trạng thái
    current_alert_level = 0
    sent_mod, sent_sev = False, False
    start_time = time.time()
    frame_count = 0
    
    # Biến phục vụ tối ưu hóa (Tăng FPS và Thuật toán Bỏ phiếu)
    frame_skip = 3  
    raw_frame_count = 0 
    severity_history = [] # Bộ nhớ 10 khung hình
    
    while cap.isOpened() and app_state["is_running"]:
        ret, frame = cap.read()
        if not ret: break
        
        raw_frame_count += 1
        # KỸ THUẬT 1: FRAME SKIPPING (Chỉ quét 1, bỏ qua 2)
        if raw_frame_count % frame_skip != 0:
            continue
        
        frame_count += 1
        fps = 1.0 / (time.time() - start_time) if (time.time() - start_time) > 0.001 else 0.0
        start_time = time.time()
        app_state["fps"] = round(fps, 1)
        
        # CHẠY LÕI YOLO
        boxes, confidences, classes = detection_model.process_frame(frame)
        indices = detection_model.apply_nms(boxes, confidences)
        detections = [(boxes[i], confidences[i], classes[i]) for i in indices]
        
        max_severity = -1 
        
        for i, (bbox, conf, cls) in enumerate(detections):
            x1, y1, w, h = bbox
            cl, ct = max(0, int(x1)-35), max(0, int(y1)-35)
            cr, cb = min(frame.shape[1], int(x1+w)+35), min(frame.shape[0], int(y1+h)+35)
            dx1, dy1 = max(0, int(x1)), max(0, int(y1))
            dx2, dy2 = min(frame.shape[1], int(x1+w)), min(frame.shape[0], int(y1+h))
            
            cond = detection_model.CarConditionStatus(int(cls))
            color, label = (0, 255, 0), "Normal"
            
            # CHỈ CHẠY CNN NẾU CÓ VA CHẠM VÀ CHƯA VƯỢT QUÁ GIỚI HẠN 1 LẦN/FRAME
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
                    else: 
                        color, label = (0, 255, 255), f"MINOR ({dmg_conf:.2f})"
                        
            # Vẽ khung nhận diện
            cv2.rectangle(frame, (dx1, dy1), (dx2, dy2), color, 2)
            cv2.putText(frame, label, (dx1, dy1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        # ================= KỸ THUẬT 3: LƯU LỊCH SỬ BỎ PHIẾU (SLIDING WINDOW) =================
        severity_history.append(max_severity)
        if len(severity_history) > 10:  
            severity_history.pop(0)
            
        count_sev = severity_history.count(2)
        count_mod = severity_history.count(0)
        count_norm = severity_history.count(-1)

        # ================= LOGIC AUTO-RESET (CHỐT SỔ) =================
        if count_norm >= 8 and current_alert_level > 0:
            app_state["total_accidents"] += 1 
            sev_level = "NGHIÊM TRỌNG" if current_alert_level == 2 else "VA CHẠM VỪA"
            t_str = datetime.datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
            
            new_report = {
                "id": f"AC-{app_state['total_accidents']:04d}",
                "time": t_str, "location": system_config["location"],
                "severity": sev_level, "status": "Đã giải quyết"
            }
            app_state["incident_reports"].insert(0, new_report)
            
            current_alert_level = 0
            sent_sev, sent_mod = False, False
            app_state["status"] = "NORMAL"
            app_state["police_dispatch"] = "Standby"
            app_state["ems_dispatch"] = "Standby"
            severity_history.clear() 
            add_log("reset", "🔄 Hiện trường giải tỏa. Chốt sổ báo cáo và Reset AI.")

        # ================= LOGIC BÁO ĐỘNG (KHÔNG ĐỨNG HÌNH) =================
        elif count_sev >= 7 and current_alert_level < 2:
            current_alert_level = 2 
            app_state["status"] = "EMERGENCY"
            app_state["police_dispatch"] = "DISPATCHED"
            app_state["ems_dispatch"] = "DISPATCHED"
            add_log("severe", f"🚨 KHẨN CẤP: TAI NẠN NGHIÊM TRỌNG tại {system_config['location']}")
            
            # Gọi hàm gửi Email ngầm (Threading) với frame.copy()
            if not sent_sev and system_config["sender_email"]:
                sent_sev, sent_mod = True, True 
                threading.Thread(target=send_email_alert, args=(
                    frame.copy(), system_config["sender_email"], system_config["app_password"], 
                    system_config["receiver_email"], "severe", system_config["location"]
                )).start()

        elif count_mod >= 7 and current_alert_level < 1:
            current_alert_level = 1
            app_state["status"] = "WARNING"
            app_state["police_dispatch"] = "DISPATCHED"
            add_log("moderate", f"⚠️ CẢNH BÁO: VA CHẠM VỪA tại {system_config['location']}")
            
            # Gọi hàm gửi Email ngầm (Threading) với frame.copy()
            if not sent_mod and system_config["sender_email"]:
                sent_mod = True
                threading.Thread(target=send_email_alert, args=(
                    frame.copy(), system_config["sender_email"], system_config["app_password"], 
                    system_config["receiver_email"], "moderate", system_config["location"]
                )).start()

        elif current_alert_level == 0 and max_severity == -1 and frame_count % 30 == 0:
            add_log("normal", "🟢 Đang quét... Khu vực an toàn.")

        # Mã hóa khung hình sang chuẩn JPEG để đẩy lên web
        ret, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    cap.release()
    
    # Chốt sổ nếu video kết thúc giữa chừng lúc đang có báo động
    if current_alert_level > 0:
        app_state["total_accidents"] += 1 
        sev_level = "NGHIÊM TRỌNG" if current_alert_level == 2 else "VA CHẠM VỪA"
        t_str = datetime.datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
        new_report = {
            "id": f"AC-{app_state['total_accidents']:04d}",
            "time": t_str, "location": system_config["location"],
            "severity": sev_level, "status": "Đã giải quyết"
        }
        app_state["incident_reports"].insert(0, new_report)

    app_state["is_running"] = False
    app_state["status"] = "NORMAL"
    app_state["police_dispatch"] = "Standby"
    app_state["ems_dispatch"] = "Standby"
    app_state["fps"] = 0.0
    
    add_log("reset", "✅ Kết thúc phiên quét. Đã tự động ngắt báo động.")

# ================= 3. CÁC CỔNG ĐIỀU KHIỂN & WEBSOCKET =================
@app.post("/api/stop")
async def stop_system():
    app_state["is_running"] = False
    app_state["status"] = "NORMAL"
    app_state["police_dispatch"] = "Standby"
    app_state["ems_dispatch"] = "Standby"
    app_state["fps"] = 0.0
    add_log("warning", "🛑 Hệ thống đã bị DỪNG bởi người điều hành.")
    return {"status": "stopped"}

@app.post("/api/clear_logs")
async def clear_logs():
    app_state["logs"] = []
    return {"status": "cleared"}

@app.get("/api/video_feed")
def video_feed():
    return StreamingResponse(generate_frames(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.websocket("/ws/data")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            await websocket.send_json(app_state)
            await asyncio.sleep(0.2)
    except Exception as e:
        print("Mất kết nối với giao diện Frontend.")