import os
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2' 

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from typing import Optional, Dict, Set  
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
import json
from queue import Queue

from src.Configs import ClassifierConfig, DetectionConfig, DetectCondition
from src.Detection import VehicleDetection

app = FastAPI(title="Vision AI Command Backend - Multi Camera")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= GLOBAL BROADCAST QUEUE =================
broadcast_queue = Queue()
active_websockets: Set[WebSocket] = set()
ws_lock = threading.Lock()

async def broadcast_worker():
    while True:
        try:
            try:
                message = broadcast_queue.get(timeout=0.1)
            except:
                await asyncio.sleep(0.05)
                continue
            
            with ws_lock:
                disconnected = set()
                for ws in active_websockets:
                    try:
                        await ws.send_json(message)
                    except:
                        disconnected.add(ws)
                for ws in disconnected:
                    active_websockets.discard(ws)
        except Exception as e:
            print(f"Broadcast worker error: {e}")
            await asyncio.sleep(0.1)

def broadcast_message(message: dict):
    broadcast_queue.put(message)

# ================= CẤU HÌNH AI =================
classifier_config = ClassifierConfig(model_type='EfficientNetB0', classifier_path='models/cnn/EfficientNetB0.h5')
detection_config = DetectionConfig(model_path='models/yolo/best.pt', threshold_conf=0.7, valid_classes=[0, 1], nms_threshold=0.4)
shared_detection_model = VehicleDetection(detection_config, classifier_config)
label_condition = DetectCondition()

# ================= HÀM GỬI EMAIL =================
def send_email_alert(image_frame, sender_email, app_password, receiver_email, severity, location, cam_id):
    try:
        print(f"📧 BẮT ĐẦU GỬI EMAIL: {cam_id} - {severity}")
        msg = MIMEMultipart()
        if severity == "moderate":
            msg['Subject'] = f'⚠️ [CẢNH BÁO] VA CHẠM TẠI: {location} - Camera {cam_id}'
            body = f"""<html>
<body>
<h2>⚠️ CẢNH BÁO VA CHẠM GIAO THÔNG</h2>
<p><b>Mức độ:</b> VA CHẠM VỪA</p>
<p><b>Vị trí:</b> {location}</p>
<p><b>Camera:</b> {cam_id}</p>
<p><b>Thời gian:</b> {datetime.datetime.now().strftime("%H:%M:%S - %d/%m/%Y")}</p>
<p><b>Yêu cầu:</b> CSGT đến phân luồng giao thông</p>
<hr>
<p><i>Email được gửi tự động từ hệ thống Vision AI</i></p>
</body>
</html>"""
        else:
            msg['Subject'] = f'🚨 [KHẨN CẤP] TAI NẠN NGHIÊM TRỌNG TẠI: {location} - Camera {cam_id}'
            body = f"""<html>
<body>
<h2 style="color: red;">🚨 BÁO ĐỘNG ĐỎ - TAI NẠN NGHIÊM TRỌNG</h2>
<p><b>Mức độ:</b> NGHIÊM TRỌNG</p>
<p><b>Vị trí:</b> {location}</p>
<p><b>Camera:</b> {cam_id}</p>
<p><b>Thời gian:</b> {datetime.datetime.now().strftime("%H:%M:%S - %d/%m/%Y")}</p>
<p><b>Yêu cầu:</b> Điều động CẤP CỨU (115) và CẢNH SÁT (113) ngay lập tức!</p>
<hr>
<p><i>Email được gửi tự động từ hệ thống Vision AI</i></p>
</body>
</html>"""
        
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg.attach(MIMEText(body, 'html'))
        
        # Đính kèm ảnh
        _, buffer = cv2.imencode('.jpg', image_frame)
        image_attachment = MIMEImage(buffer.tobytes(), _subtype="jpeg")
        image_attachment.add_header('Content-Disposition', 'attachment', filename=f'accident_{cam_id}_{int(time.time())}.jpg')
        msg.attach(image_attachment)
        
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, app_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ Email sent for {cam_id} - {severity}")
    except Exception as e:
        print(f"❌ Email error {cam_id}: {e}")

# ================= MULTI-CAMERA MANAGER =================
class CameraInstance:
    def __init__(self, cam_id: str):
        self.cam_id = cam_id
        self.is_running = False
        self.video_path = None
        self.input_type = None
        self.cap = None
        self.frame_count = 0
        self.last_fps_time = time.time()
        
        self.sender_email = ""
        self.app_password = ""
        self.receiver_email = ""
        
        self.state = {
            "status": "NORMAL",
            "police_dispatch": "Standby",
            "ems_dispatch": "Standby",
            "fps": 0.0,
            "total_accidents": 0,
            "incident_reports": [],
            "logs": [],
            "location": "Đang chờ thiết lập..."
        }
        
        self.current_alert_level = 0
        self.sent_sev = False
        self.sent_mod = False
        self.severity_history = []
        self.frame_counter = 0
        self.state_lock = threading.Lock()
    
    def add_log(self, level: str, message: str):
        t_str = datetime.datetime.now().strftime("%H:%M:%S")
        log_entry = {"time": t_str, "level": level, "message": message}
        
        with self.state_lock:
            self.state["logs"].insert(0, log_entry)
            if len(self.state["logs"]) > 50:
                self.state["logs"].pop()
        
        broadcast_message({
            "type": "log",
            "cam_id": self.cam_id,
            "log": log_entry
        })
        print(f"[{self.cam_id}] {message}")
    
    def update_state(self, **kwargs):
        with self.state_lock:
            for key, value in kwargs.items():
                if key in self.state:
                    self.state[key] = value
        
        broadcast_message({
            "type": "state",
            "cam_id": self.cam_id,
            "state": {
                "is_running": self.is_running,
                **self.state
            }
        })
    
    def update_fps(self):
        self.frame_counter += 1
        now = time.time()
        elapsed = now - self.last_fps_time
        if elapsed >= 1.0:
            fps = self.frame_counter / elapsed
            with self.state_lock:
                self.state["fps"] = round(fps, 1)
            self.frame_counter = 0
            self.last_fps_time = now
            
            broadcast_message({
                "type": "fps",
                "cam_id": self.cam_id,
                "fps": self.state["fps"]
            })
    
    def add_report(self, severity: str):
        with self.state_lock:
            self.state["total_accidents"] += 1
            t_str = datetime.datetime.now().strftime("%H:%M:%S - %d/%m/%Y")
            new_report = {
                "id": f"{self.cam_id}-{self.state['total_accidents']:04d}",
                "time": t_str,
                "location": self.state["location"],
                "severity": severity,
                "status": "Đã giải quyết",
                "camera": self.cam_id
            }
            self.state["incident_reports"].insert(0, new_report)
        
        broadcast_message({
            "type": "report",
            "cam_id": self.cam_id,
            "report": new_report
        })
    
    def generate_frames(self):
        if self.video_path is None:
            return
        
        self.cap = cv2.VideoCapture(self.video_path)
        if not self.cap.isOpened():
            self.add_log("error", f"Không thể mở video: {self.video_path}")
            return
        
        is_webcam = (self.input_type == "webcam")
        
        if is_webcam:
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            frame_skip = 1
            detection_threshold_severe = 5
            detection_threshold_moderate = 5
            history_length = 10
            reset_threshold = 8
            cnn_cooldown = 0.5
            self.add_log("normal", "📷 Chế độ Webcam - Ngưỡng=5")
        else:
            frame_skip = 3
            detection_threshold_severe = 7
            detection_threshold_moderate = 7
            history_length = 10
            reset_threshold = 8
            cnn_cooldown = 0
            self.add_log("normal", f"🎬 Chế độ File video - Nguyên bản (ngưỡng=7)")
        
        raw_frame_count = 0
        self.frame_counter = 0
        self.last_fps_time = time.time()
        self.severity_history = []
        self.current_alert_level = 0
        self.sent_sev = False
        self.sent_mod = False
        
        last_cnn_time = 0
        
        self.add_log("normal", f"Bắt đầu xử lý (nguồn: {self.input_type})")
        self.update_state(status="NORMAL")
        
        while self.cap.isOpened() and self.is_running:
            ret, frame = self.cap.read()
            if not ret:
                break
            
            raw_frame_count += 1
            if raw_frame_count % frame_skip != 0:
                continue
            
            self.update_fps()
            
            process_frame = frame
            if is_webcam and process_frame.shape[1] > 640:
                scale = 640 / process_frame.shape[1]
                new_w = 640
                new_h = int(process_frame.shape[0] * scale)
                process_frame = cv2.resize(process_frame, (new_w, new_h))
            
            try:
                boxes, confidences, classes = shared_detection_model.process_frame(process_frame)
                indices = shared_detection_model.apply_nms(boxes, confidences)
                detections = [(boxes[i], confidences[i], classes[i]) for i in indices]
            except Exception as e:
                detections = []
            
            max_severity = -1
            current_time = time.time()
            
            for bbox, conf, cls in detections:
                x1, y1, w, h = bbox
                x1, y1, w, h = int(x1), int(y1), int(w), int(h)
                
                if is_webcam and process_frame.shape[1] != frame.shape[1]:
                    scale_x = frame.shape[1] / process_frame.shape[1]
                    scale_y = frame.shape[0] / process_frame.shape[0]
                    x1 = int(x1 * scale_x)
                    y1 = int(y1 * scale_y)
                    w = int(w * scale_x)
                    h = int(h * scale_y)
                
                margin = 35
                cl = max(0, x1 - margin)
                ct = max(0, y1 - margin)
                cr = min(frame.shape[1], x1 + w + margin)
                cb = min(frame.shape[0], y1 + h + margin)
                
                dx1, dy1 = max(0, x1), max(0, y1)
                dx2, dy2 = min(frame.shape[1], x1 + w), min(frame.shape[0], y1 + h)
                
                cond = shared_detection_model.CarConditionStatus(int(cls))
                color = (0, 255, 0)
                label = "Normal"
                
                if cond == label_condition.accident:
                    if not is_webcam or (current_time - last_cnn_time >= cnn_cooldown):
                        if is_webcam:
                            last_cnn_time = current_time
                        cropped = frame[ct:cb, cl:cr]
                        if cropped.size > 0 and cropped.shape[0] > 20 and cropped.shape[1] > 20:
                            try:
                                dmg_cls, dmg_conf = shared_detection_model.classify_damage(cropped)
                                if dmg_cls == 0:
                                    color = (255, 165, 0)
                                    label = "MODERATE"
                                    max_severity = max(max_severity, 0)
                                elif dmg_cls == 2:
                                    color = (0, 0, 255)
                                    label = "SEVERE"
                                    max_severity = max(max_severity, 2)
                                else:
                                    color = (0, 255, 255)
                                    label = "MINOR"
                            except:
                                pass
                    else:
                        if self.current_alert_level > 0:
                            color = (0, 0, 255) if self.current_alert_level == 2 else (255, 165, 0)
                            label = "SEVERE" if self.current_alert_level == 2 else "MODERATE"
                
                cv2.rectangle(frame, (dx1, dy1), (dx2, dy2), color, 2)
                cv2.putText(frame, label, (dx1, dy1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)
            
            self.severity_history.append(max_severity)
            if len(self.severity_history) > history_length:
                self.severity_history.pop(0)
            
            count_sev = self.severity_history.count(2)
            count_mod = self.severity_history.count(0)
            count_norm = self.severity_history.count(-1)
            
            # RESET
            if count_norm >= reset_threshold and self.current_alert_level > 0:
                severity_name = "NGHIÊM TRỌNG" if self.current_alert_level == 2 else "VA CHẠM VỪA"
                self.add_report(severity_name)
                self.add_log("reset", f"🔄 GIẢI TỎA - Kết thúc sự cố, đã lưu báo cáo")
                
                self.current_alert_level = 0
                self.sent_sev = False
                self.sent_mod = False
                self.severity_history = []
                self.update_state(
                    status="NORMAL",
                    police_dispatch="Standby",
                    ems_dispatch="Standby"
                )
            
            # CẢNH BÁO SEVERE + GỬI EMAIL
            elif count_sev >= detection_threshold_severe and self.current_alert_level < 2:
                self.current_alert_level = 2
                self.add_log("severe", f"🚨 KHẨN CẤP - TAI NẠN NGHIÊM TRỌNG tại {self.state['location']}")
                self.update_state(
                    status="EMERGENCY",
                    police_dispatch="DISPATCHED",
                    ems_dispatch="DISPATCHED"
                )
                
                # DEBUG
                print(f"🔍 [DEBUG] SEVERE - count_sev={count_sev}, threshold={detection_threshold_severe}")
                print(f"🔍 [DEBUG] sender={self.sender_email}, receiver={self.receiver_email}")
                print(f"🔍 [DEBUG] sent_sev={self.sent_sev}")
                
                if not self.sent_sev and self.sender_email and self.receiver_email:
                    self.sent_sev = True
                    self.sent_mod = True
                    print(f"📧 [DEBUG] ĐANG GỬI EMAIL KHẨN CẤP...")
                    threading.Thread(target=send_email_alert, args=(
                        frame.copy(), self.sender_email, self.app_password,
                        self.receiver_email, "severe", self.state["location"], self.cam_id
                    ), daemon=True).start()
                    self.add_log("severe", f"📧 Đã gửi email KHẨN CẤP đến {self.receiver_email}")
                else:
                    print(f"⚠️ [DEBUG] KHÔNG gửi email: sent_sev={self.sent_sev}, has_email={bool(self.sender_email and self.receiver_email)}")
            
            # CẢNH BÁO MODERATE + GỬI EMAIL
            elif count_mod >= detection_threshold_moderate and self.current_alert_level < 1:
                self.current_alert_level = 1
                self.add_log("moderate", f"⚠️ CẢNH BÁO - VA CHẠM VỪA tại {self.state['location']}")
                self.update_state(
                    status="WARNING",
                    police_dispatch="DISPATCHED"
                )
                
                # DEBUG
                print(f"🔍 [DEBUG] MODERATE - count_mod={count_mod}, threshold={detection_threshold_moderate}")
                print(f"🔍 [DEBUG] sender={self.sender_email}, receiver={self.receiver_email}")
                print(f"🔍 [DEBUG] sent_mod={self.sent_mod}")
                
                if not self.sent_mod and self.sender_email and self.receiver_email:
                    self.sent_mod = True
                    print(f"📧 [DEBUG] ĐANG GỬI EMAIL VA CHẠM VỪA...")
                    threading.Thread(target=send_email_alert, args=(
                        frame.copy(), self.sender_email, self.app_password,
                        self.receiver_email, "moderate", self.state["location"], self.cam_id
                    ), daemon=True).start()
                    self.add_log("moderate", f"📧 Đã gửi email VA CHẠM VỪA đến {self.receiver_email}")
                else:
                    print(f"⚠️ [DEBUG] KHÔNG gửi email: sent_mod={self.sent_mod}, has_email={bool(self.sender_email and self.receiver_email)}")
            
            cv2.putText(frame, f"FPS: {self.state['fps']}", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
            
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            if ret:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
        
        if self.cap:
            self.cap.release()
        
        if self.current_alert_level > 0:
            severity_name = "NGHIÊM TRỌNG" if self.current_alert_level == 2 else "VA CHẠM VỪA"
            self.add_report(severity_name)
        
        self.is_running = False
        self.update_state(status="NORMAL", fps=0.0)
        self.add_log("reset", f"✅ Đã dừng hoàn toàn")
    
    def stop(self):
        """Dừng camera - tránh gọi nhiều lần"""
        if not self.is_running:
            print(f"[{self.cam_id}] Camera đã dừng rồi, bỏ qua")
            return
        print(f"[{self.cam_id}] Đang dừng camera...")
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
        print(f"[{self.cam_id}] Đã dừng hoàn toàn")


# ================= LƯU TRỮ CAMERA =================
cameras: Dict[str, CameraInstance] = {}

# ================= API =================

@app.post("/api/cam/setup")
async def setup_camera(
    cam_id: str = Form(...),
    input_type: str = Form(...),
    video: Optional[UploadFile] = File(None),
    location: str = Form("Địa điểm chưa đặt"),
    sender_email: str = Form(""),
    app_password: str = Form(""),
    receiver_email: str = Form("")
):
    if cam_id not in cameras:
        cameras[cam_id] = CameraInstance(cam_id)
    
    cam = cameras[cam_id]
    
    if cam.is_running:
        cam.stop()
        await asyncio.sleep(0.5)
    
    if input_type == "file" and video is not None:
        content = await video.read()
        tfile = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        tfile.write(content)
        tfile.close()
        cam.video_path = tfile.name
        cam.input_type = "file"
    elif input_type == "webcam":
        cam.video_path = 0
        cam.input_type = "webcam"
    else:
        return {"status": "error", "message": "Input type không hợp lệ"}
    
    if sender_email and app_password and receiver_email:
        cam.sender_email = sender_email
        cam.app_password = app_password
        cam.receiver_email = receiver_email
        cam.add_log("normal", f"📧 Đã cấu hình email: {sender_email} -> {receiver_email}")
        print(f"📧 [SETUP] Email configured: {sender_email} -> {receiver_email}")
    else:
        print(f"⚠️ [SETUP] No email configured for {cam_id}")
    
    cam.state["location"] = location
    cam.is_running = True
    
    cam.add_log("normal", f"🚀 Khởi động tại {location} (nguồn: {input_type})")
    cam.update_state(status="NORMAL")
    
    return {"status": "success", "message": f"Camera {cam_id} đã khởi động"}


@app.post("/api/cam/stop/{cam_id}")
async def stop_camera(cam_id: str):
    if cam_id not in cameras:
        return {"status": "error", "message": "Camera không tồn tại"}
    
    cameras[cam_id].stop()
    return {"status": "success", "message": f"Đã dừng {cam_id}"}


@app.post("/api/cam/stop_all")
async def stop_all_cameras():
    for cam in cameras.values():
        if cam.is_running:
            cam.stop()
    return {"status": "success", "message": "Đã dừng tất cả"}


@app.get("/api/cam/video_feed/{cam_id}")
async def video_feed_cam(cam_id: str):
    if cam_id not in cameras or not cameras[cam_id].is_running:
        return StreamingResponse(iter([]), media_type="multipart/x-mixed-replace; boundary=frame")
    
    return StreamingResponse(
        cameras[cam_id].generate_frames(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/api/cam/state/{cam_id}")
async def get_cam_state(cam_id: str):
    if cam_id not in cameras:
        return {"error": "Camera not found"}
    
    cam = cameras[cam_id]
    return {
        "cam_id": cam_id,
        "is_running": cam.is_running,
        **cam.state
    }


@app.get("/api/cam/list")
async def list_cameras():
    result = {}
    for cam_id, cam in cameras.items():
        result[cam_id] = {
            "is_running": cam.is_running,
            "location": cam.state["location"],
            "status": cam.state["status"],
            "fps": cam.state["fps"],
            "total_accidents": cam.state["total_accidents"]
        }
    return {"cameras": result, "total": len(cameras)}


@app.post("/api/cam/clear_logs/{cam_id}")
async def clear_cam_logs(cam_id: str):
    if cam_id in cameras:
        with cameras[cam_id].state_lock:
            cameras[cam_id].state["logs"] = []
        cameras[cam_id].update_state()
        return {"status": "cleared"}
    return {"status": "error"}


@app.websocket("/ws/all")
async def websocket_all(websocket: WebSocket):
    await websocket.accept()
    
    with ws_lock:
        active_websockets.add(websocket)
    
    current_states = {}
    for cam_id, cam in cameras.items():
        with cam.state_lock:
            current_states[cam_id] = {
                "is_running": cam.is_running,
                **cam.state
            }
    
    if current_states:
        await websocket.send_json({"type": "init", "states": current_states})
    
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        with ws_lock:
            active_websockets.discard(websocket)


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(broadcast_worker())
    print("✅ Broadcast worker started")
    print("🚀 Vision AI Multi-Camera Backend Ready")
    print("📡 WebSocket: ws://localhost:8000/ws/all")
    print("📧 Email alert: BẬT (cần cấu hình email trong Settings)")


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "cameras": len(cameras),
        "running": sum(1 for c in cameras.values() if c.is_running),
        "websockets": len(active_websockets)
    }


if __name__ == "__main__":
    import uvicorn
    print("=" * 50)
    print("🚀 VISION AI MULTI-CAMERA BACKEND")
    print("=" * 50)
    print("📹 FILE VIDEO: Ngưỡng=7, skip=3 (giống bản gốc)")
    print("📱 WEBCAM: Ngưỡng=5, skip=1, resize 640x480")
    print("📧 EMAIL: Sẽ gửi khi phát hiện Moderate hoặc Severe")
    print("=" * 50)
    uvicorn.run(app, host="0.0.0.0", port=8000)