import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

import DashboardIcon from '@mui/icons-material/Dashboard';
import VideocamIcon from '@mui/icons-material/Videocam';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MapIcon from '@mui/icons-material/Map';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import MenuIcon from '@mui/icons-material/Menu';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

function LocationPicker({ setLocation, setCoords }) {
  useMapEvents({
    click(e) {
      setCoords([e.latlng.lat, e.latlng.lng]);
      axios.get(`https://nominatim.openstreetmap.org/reverse?lat=${e.latlng.lat}&lon=${e.latlng.lng}&format=json`)
        .then(res => setLocation(res.data.display_name.split(',').slice(0, 4).join(', ')))
        .catch(() => setLocation(`Tọa độ: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`));
    }
  });
  return null;
}

const trafficData = [
  { name: '00h', traffic: 120, alerts: 10 }, { name: '02h', traffic: 80, alerts: 5 }, { name: '04h', traffic: 150, alerts: 15 },
  { name: '06h', traffic: 450, alerts: 30 }, { name: '08h', traffic: 800, alerts: 50 }, { name: '10h', traffic: 600, alerts: 40 },
  { name: '12h', traffic: 550, alerts: 35 }, { name: '14h', traffic: 650, alerts: 45 }, { name: '16h', traffic: 900, alerts: 60 },
  { name: '18h', traffic: 750, alerts: 55 }, { name: '20h', traffic: 400, alerts: 25 }, { name: '22h', traffic: 250, alerts: 15 }
];

const severityData = [
  { name: 'Nghiêm Trọng', value: 4, color: '#ff4b4b' },
  { name: 'Va Chạm Vừa', value: 12, color: '#ff9800' },
  { name: 'Va Chạm Nhẹ', value: 25, color: '#00e5ff' }
];

const mockCameras = [
  { id: 'CAM-01', name: 'Ngã tư Hùng Vương', status: 'Online', fps: 30.2, color: 'dot-online', text: '#00ffcc' },
  { id: 'CAM-02', name: 'QL1A - Vòng xoay', status: 'Online', fps: 29.8, color: 'dot-online', text: '#00ffcc' },
  { id: 'CAM-03', name: 'THPT Lê Quý Đôn', status: 'Warning', fps: 15.4, color: 'dot-warning', text: '#ff9800' },
  { id: 'CAM-04', name: 'Cầu Tân An (Bắc)', status: 'Offline', fps: 0, color: 'dot-offline', text: '#ff4b4b' },
  { id: 'CAM-05', name: 'Vincom Long An', status: 'Online', fps: 30.0, color: 'dot-online', text: '#00ffcc' },
];

function DashboardPage({ sysState, fakeStats }) {
  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card glass-card">
          <div>
            <p className="kpi-title">Tổng Vụ Tai Nạn</p>
            <h3 className="kpi-value" style={{color: '#ff4b4b'}}>
              {sysState.total_accidents + fakeStats.extraAccidents}
              <span className="trend-down"><TrendingDownIcon fontSize="small"/> -12%</span>
            </h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #f12711, #f5af19)' }}>💥</div>
        </div>
        <div className="kpi-card glass-card">
          <div>
            <p className="kpi-title">Phương Tiện Được Quét</p>
            <h3 className="kpi-value">
              {fakeStats.vehiclesCount}
              <span className="trend-up"><TrendingUpIcon fontSize="small"/> +5.4%</span>
            </h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }}><DirectionsCarIcon /></div>
        </div>
        <div className="kpi-card glass-card">
          <div>
            <p className="kpi-title">Response Time TB</p>
            <h3 className="kpi-value">
              {fakeStats.responseTime}
              <span className="trend-up"><TrendingDownIcon fontSize="small"/> -0.2m</span>
            </h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #00b09b, #96c93d)' }}><SpeedIcon /></div>
        </div>
        <div className="kpi-card glass-card">
          <div>
            <p className="kpi-title">Active AI Nodes</p>
            <h3 className="kpi-value">4 / 5 <span className="trend-up" style={{color: '#8b949e', fontFamily: 'var(--text-font)'}}>~ {fakeStats.uptime}</span></h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #0075FF, #4FACFE)' }}><CheckCircleIcon /></div>
        </div>
      </div>

      <div className="content-row">
        <div className="glass-card" style={{flex: 7, padding: '25px', display: 'flex', flexDirection: 'column', minWidth: 0}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <p className="section-header" style={{margin: 0}}>📈 XU HƯỚNG GIAO THÔNG & CẢNH BÁO TAI NẠN</p>
            <div style={{ display: 'flex', gap: '5px' }}>
              <button style={{ background: 'rgba(0, 229, 255, 0.2)', border: '1px solid #00e5ff', color: '#00e5ff', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--text-font)', fontWeight: 'bold' }}>24H</button>
              <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: '#8b949e', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--text-font)' }}>7D</button>
            </div>
          </div>

          <div className="chart-container" style={{height: '280px'}}>
            <ResponsiveContainer>
              <AreaChart data={trafficData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00e5ff" stopOpacity={0.8}/><stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/></linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ff4b4b" stopOpacity={0.8}/><stop offset="95%" stopColor="#ff4b4b" stopOpacity={0}/></linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#a0aec0" axisLine={false} tickLine={false} fontSize={12} style={{fontFamily: 'var(--text-font)'}}/>
                <YAxis stroke="#a0aec0" axisLine={false} tickLine={false} hide />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <Tooltip />
                <Area type="monotone" dataKey="traffic" name="Lượng xe" stroke="#00e5ff" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
                <Area type="monotone" dataKey="alerts" name="Cảnh báo" stroke="#ff4b4b" strokeWidth={3} fillOpacity={1} fill="url(#colorAlerts)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginTop: 'auto', paddingTop: '20px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#a0aec0', fontFamily: 'var(--text-font)', fontWeight: 'bold' }}>🕒 GIỜ CAO ĐIỂM</p>
              <h4 style={{ margin: '8px 0 0 0', color: '#00e5ff', fontSize: '18px', fontFamily: 'var(--primary-font)' }}>16:00 - 18:00</h4>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#a0aec0', fontFamily: 'var(--text-font)', fontWeight: 'bold' }}>📍 ĐIỂM ĐEN CẢNH BÁO</p>
              <h4 style={{ margin: '8px 0 0 0', color: '#ff4b4b', fontSize: '18px', fontFamily: 'var(--primary-font)' }}>NGÃ TƯ HÙNG VƯƠNG</h4>
            </div>
            <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <p style={{ margin: 0, fontSize: '11px', color: '#a0aec0', fontFamily: 'var(--text-font)', fontWeight: 'bold' }}>🧠 ĐỘ CHÍNH XÁC AI</p>
              <h4 style={{ margin: '8px 0 0 0', color: '#00ffcc', fontSize: '18px', fontFamily: 'var(--primary-font)' }}>98.5% <span style={{fontSize: '11px', color: '#8b949e', fontFamily: 'var(--text-font)'}}>~ YOLOv8</span></h4>
            </div>
          </div>
        </div>

        <div style={{flex: 3, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0}}>
          <div className="glass-card" style={{padding: '20px', flex: 1}}>
            <p className="section-header">📊 PHÂN BỔ MỨC ĐỘ SỰ CỐ</p>
            <div style={{height: '140px', width: '100%', position: 'relative'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={severityData} cx="50%" cy="50%" innerRadius={42} outerRadius={58} 
                    paddingAngle={5} dataKey="value" stroke="none" 
                    isAnimationActive={false}
                    >
                    {severityData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color} /> ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none'}}>
                <h3 style={{margin: 0, fontSize: '20px', fontFamily: 'var(--primary-font)'}}>41</h3>
                <p style={{margin: 0, fontSize: '10px', color: '#8b949e', fontFamily: 'var(--text-font)'}}>Tổng Alert</p>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{padding: '20px', flex: 2}}>
            <p className="section-header" style={{margin: 0}}>📡 TÌNH TRẠNG NODE AI</p>
            <div className="camera-list">
              {mockCameras.map((cam) => (
                <div className="camera-item" key={cam.id}>
                  <div className="cam-info">
                    <span className="cam-name">{cam.name}</span>
                    <span className="cam-id">{cam.id} | {cam.fps} FPS</span>
                  </div>
                  <div className="cam-status">
                    <span className={`status-dot ${cam.color}`}></span>
                    <span style={{color: cam.text}}>{cam.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LiveMonitorPage({ sysState }) {
  const handleStop = async () => { try { await axios.post("http://127.0.0.1:8000/api/stop"); } catch (e){} };
  const handleClearLogs = async () => { try { await axios.post("http://127.0.0.1:8000/api/clear_logs"); } catch (e){} };
  const [selectedCam, setSelectedCam] = useState(null);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      {/* 1. HÀNG KPI TỔNG THỂ (ĐÃ KHÔI PHỤC ICON) */}
      <div className="kpi-row" style={{marginBottom: '15px'}}>
        <div className="kpi-card glass-card" style={{padding: '12px 20px'}}>
          <div>
            <p className="kpi-title">SYSTEM STATUS</p>
            <h3 className="kpi-value" style={{ fontSize: '20px', color: sysState.status === 'EMERGENCY' ? '#ff4b4b' : sysState.status === 'WARNING' ? '#ff9800' : '#00ffcc' }}>{sysState.status}</h3>
          </div>
          <div className="icon-box" style={{ width: '38px', height: '38px', fontSize: '18px', background: sysState.status === 'EMERGENCY' ? 'linear-gradient(135deg, #ff4b1f, #ff9068)' : 'linear-gradient(135deg, #00b09b, #96c93d)' }}>🛡️</div>
        </div>
        <div className="kpi-card glass-card" style={{padding: '12px 20px'}}>
          <div>
            <p className="kpi-title">POLICE DISPATCH</p>
            <h3 className="kpi-value" style={{ fontSize: '20px'}}>{sysState.police_dispatch}</h3>
          </div>
          <div className="icon-box" style={{ width: '38px', height: '38px', fontSize: '18px', background: 'linear-gradient(135deg, #0075FF, #4FACFE)' }}>🚓</div>
        </div>
        <div className="kpi-card glass-card" style={{padding: '12px 20px'}}>
          <div>
            <p className="kpi-title">EMS DISPATCH</p>
            <h3 className="kpi-value" style={{ fontSize: '20px'}}>{sysState.ems_dispatch}</h3>
          </div>
          <div className="icon-box" style={{ width: '38px', height: '38px', fontSize: '18px', background: 'linear-gradient(135deg, #f12711, #f5af19)' }}>🚑</div>
        </div>
        <div className="kpi-card glass-card" style={{padding: '12px 20px'}}>
          <div>
            <p className="kpi-title">AI ENGINE FPS</p>
            <h3 className="kpi-value" style={{ fontSize: '20px'}}>{sysState.fps}</h3>
          </div>
          <div className="icon-box" style={{ width: '38px', height: '38px', fontSize: '18px', background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }}>⚡</div>
        </div>
      </div>

      <div className="content-row">
        <div className="video-section glass-card" style={{ flex: 7, padding: '15px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <h2 className="section-header" style={{margin: 0, fontSize: '15px'}}>
              {selectedCam ? `LIVE DETAIL - ${selectedCam}` : 'MULTI-NODE NETWORK (4/5 ONLINE)'}
            </h2>
            {selectedCam ? (
              <button onClick={() => setSelectedCam(null)} style={{background: 'rgba(0, 229, 255, 0.2)', color: '#00e5ff', border: '1px solid #00e5ff', borderRadius: '6px', padding: '5px 15px', cursor: 'pointer', fontFamily: 'inherit'}}>⬅ QUAY LẠI LƯỚI</button>
            ) : (
              <button className="btn-stop" onClick={handleStop} style={{width: 'auto', padding: '5px 15px', margin: 0}}>STOP ALL NODE</button>
            )}
          </div>

          {selectedCam === 'CAM-01' ? (
            <div style={{flex: 1, background: '#000', borderRadius: '12px', border: sysState.status !== 'NORMAL' ? '2px solid #ff4b4b' : '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
                {sysState.is_running ? (
                  <img src="http://127.0.0.1:8000/api/video_feed" alt="Video" style={{height: '100%', width: '100%', objectFit: 'contain'}} />
                ) : (
                  <p style={{color: '#8b949e', fontFamily: 'var(--text-font)'}}>HỆ THỐNG ĐANG NGHỈ NGƠI...</p>
                )}
            </div>
          ) : (
            <div className="cam-grid">
              <div className={`cam-box cam-clickable ${sysState.status !== 'NORMAL' ? 'active-cam' : ''}`} onClick={() => setSelectedCam('CAM-01')}>
                <div className="cam-label">CAM-01: Ngã Tư Hùng Vương</div>
                {sysState.is_running ? <img src="http://127.0.0.1:8000/api/video_feed" alt="Video" className="cam-feed" /> : <div className="cam-placeholder-text">Đang nghỉ ngơi...</div>}
              </div>
              <div className="cam-box"><div className="cam-label"><span className="status-dot dot-online"></span> CAM-02: QL1A</div><div className="fake-scan"></div><div className="cam-placeholder-text" style={{color: '#00ffcc'}}>[ SCAN ] Tín hiệu tốt</div></div>
              <div className="cam-box"><div className="cam-label"><span className="status-dot dot-online"></span> CAM-03: THPT LÊ QUÝ ĐÔN</div><div className="fake-scan" style={{animationDelay: '1.5s', background: 'rgba(56, 211, 159, 0.5)'}}></div><div className="cam-placeholder-text" style={{color: '#38d39f'}}>[ SCAN ] An toàn</div></div>
              <div className="cam-box"><div className="cam-label"><span className="status-dot dot-offline"></span> CAM-04: CẦU TÂN AN</div><div className="cam-placeholder-text" style={{color: '#ff4b4b'}}>❌ SIGNAL LOST</div></div>
            </div>
          )}
        </div>
        
        <div className="log-section glass-card" style={{ flex: 3, padding: '15px', display: 'flex', flexDirection: 'column' }}>
          {selectedCam === 'CAM-01' && (
            <div style={{ marginBottom: '25px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 className="section-header" style={{color: '#00e5ff', margin: 0}}>🔍 THÔNG SỐ AI CHI TIẾT</h2>
              <div className="glass-card" style={{padding: '12px', background: 'rgba(0,0,0,0.2)'}}>
                <p style={{margin: '0', fontSize: '10px', color: '#8b949e', fontFamily: 'var(--text-font)'}}>VỊ TRÍ CAMERA</p>
                <h3 style={{margin: '5px 0 0 0', fontSize: '16px'}}>NGÃ TƯ HÙNG VƯƠNG</h3>
              </div>
              
              <div className="glass-card" style={{padding: '12px', background: sysState.status !== 'NORMAL' ? 'rgba(255,75,75,0.1)' : 'rgba(0,0,0,0.2)', border: sysState.status !== 'NORMAL' ? '1px solid #ff4b4b' : 'none'}}>
                <p style={{margin: '0', fontSize: '10px', color: '#8b949e', fontFamily: 'var(--text-font)'}}>TRẠNG THÁI HIỆN TẠI</p>
                <h3 style={{margin: '5px 0 0 0', fontSize: '22px', color: sysState.status === 'EMERGENCY' ? '#ff4b4b' : '#00ffcc'}}>{sysState.status}</h3>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h2 className="section-header" style={{margin: 0}}>📋 ACTIVITY LOGS</h2>
            <button className="btn-clear" onClick={handleClearLogs}>XÓA NHẬT KÝ</button>
          </div>
          <div className="log-container" style={{ flex: 1 }}>
            {sysState.logs.length === 0 ? <p style={{color: '#8b949e', fontSize: '12px'}}>Hệ thống đang chờ dữ liệu...</p> : null}
            {sysState.logs.map((log, index) => (
              <div key={index} className={`log-item log-${log.level}`}>
                <b style={{color: '#00e5ff', fontFamily: 'var(--primary-font)'}}>[{log.time}]</b> <span dangerouslySetInnerHTML={{ __html: log.message }}></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ReportsPage({ reports, totalAccidents }) {
  return (
    <div className="glass-card" style={{ flex: 1, padding: '30px' }}>
      <h2 className="vision-title" style={{ marginBottom: '20px' }}>📋 HỒ SƠ TAI NẠN GIAO THÔNG</h2>
      <div style={{display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center'}}>
        <div className="icon-box" style={{ background: '#ff4b4b' }}>💥</div>
        <p style={{ color: '#ff4b4b', fontSize: '20px', fontFamily: 'var(--primary-font)', margin: 0 }}>ĐÃ GHI NHẬN: {totalAccidents} VỤ TAI NẠN.</p>
      </div>
      {reports.length === 0 ? (
        <p style={{ color: '#8b949e', textAlign: 'center', marginTop: '50px' }}>Chưa có vụ tai nạn nào được ghi nhận.</p>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '550px' }}>
          <table className="vision-table">
            <thead>
              <tr>
                <th>Mã số</th>
                <th><AccessTimeIcon fontSize="small" style={{verticalAlign: 'middle'}}/> Thời gian</th>
                <th><MapIcon fontSize="small" style={{verticalAlign: 'middle'}}/> Tọa độ / Vị trí</th>
                <th>Mức độ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report, index) => (
                <tr key={index}>
                  <td style={{fontWeight: 'bold', color: '#00e5ff', fontFamily: 'var(--primary-font)'}}>{report.id}</td>
                  <td>{report.time}</td>
                  <td>{report.location}</td>
                  <td style={{ color: report.severity === 'NGHIÊM TRỌNG' ? '#ff4b4b' : '#ff9800', fontWeight: 'bold' }}>{report.severity}</td>
                  <td style={{ color: '#00ffcc', fontWeight: 'bold' }}><CheckCircleIcon fontSize="small" style={{verticalAlign: 'middle'}}/> {report.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ==========================================
// ⚙️ TRANG 4: SETTINGS (CHỈ CÒN FILE & WEBCAM)
// ==========================================
function SettingsPage({ fakeStats, setFakeStats, setFakeReports }) {
  const [inputType, setInputType] = useState('file');
  const [videoFile, setVideoFile] = useState(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [receiver, setReceiver] = useState('');
  const [coords, setCoords] = useState([10.5366, 106.4043]);
  const [locationName, setLocationName] = useState('Phường Long An, Tây Ninh');
  const navigate = useNavigate();

  const [showSecretMode, setShowSecretMode] = useState(false);
  
  // Dữ liệu giả lập
  const [jsonInput, setJsonInput] = useState(`[
  { "id": "AC-1052", "time": "08:15:22 - 12/04/2026", "location": "Ngã tư Hùng Vương, Tân An", "severity": "NGHIÊM TRỌNG", "status": "Đã giải quyết" },
  { "id": "AC-1053", "time": "14:30:00 - 13/04/2026", "location": "Quốc lộ 1A, Tân An", "severity": "VA CHẠM VỪA", "status": "Đã giải quyết" }
]`); 

  const handleDeploy = async () => {
    const formData = new FormData();
    formData.append("input_type", inputType);
    
    if (inputType === 'file') {
      if (!videoFile) { alert("Vui lòng Upload Video MP4!"); return; }
      formData.append("video", videoFile);
    }

    formData.append("sender_email", email);
    formData.append("app_password", password);
    formData.append("receiver_email", receiver);
    formData.append("location", locationName);

    try {
      await axios.post("http://127.0.0.1:8000/api/setup", formData);
      navigate('/live');
    } catch (err) { alert("LỖI KẾT NỐI BACKEND!\n\nNhớ bật server Python ở cổng 8000 trước khi chạy nhé!"); }
  };

  const handleInjectFakeData = () => {
    try {
      const parsedData = JSON.parse(jsonInput);
      setFakeReports(parsedData);
      alert("😎 Đã bơm dữ liệu ảo thành công!");
    } catch(e) { alert("Lỗi cấu trúc JSON rồi Kỹ sư trưởng!"); }
  };

  return (
    <div className="glass-card" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
      <h2 className="vision-title" style={{marginBottom: '30px', cursor: 'pointer'}} onDoubleClick={() => setShowSecretMode(!showSecretMode)}>
        Cấu hình Máy chủ Vision AI
      </h2>
      
      <div style={{ display: 'flex', gap: '30px' }}>
        <div style={{ flex: 1 }}>
          <p className="sidebar-label">1. CHỌN NGUỒN DỮ LIỆU (Input Source)</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button 
              onClick={() => setInputType('file')}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #00e5ff', background: inputType === 'file' ? '#00e5ff' : 'transparent', color: inputType === 'file' ? '#050810' : '#00e5ff', cursor: 'pointer', transition: '0.3s', fontWeight: 'bold' }}
            >📁 SỬ DỤNG FILE VIDEO</button>
            <button 
              onClick={() => setInputType('webcam')}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #00e5ff', background: inputType === 'webcam' ? '#00e5ff' : 'transparent', color: inputType === 'webcam' ? '#050810' : '#00e5ff', cursor: 'pointer', transition: '0.3s', fontWeight: 'bold' }}
            >💻 SỬ DỤNG WEBCAM MÁY TÍNH</button>
          </div>

          {inputType === 'file' ? (
            <input type="file" accept="video/mp4" onChange={(e) => setVideoFile(e.target.files[0])} className="vision-input"/>
          ) : (
            <div className="vision-input" style={{textAlign: 'center', color: '#00ffcc', fontWeight: 'bold', padding: '15px'}}>
              📸 Đã chọn Webcam. Đèn camera laptop sẽ tự động bật khi Deploy.
            </div>
          )}

          <p className="sidebar-label">2. EMAIL GATEWAY (Cảnh báo khẩn cấp)</p>
          <input type="text" placeholder="Hệ thống Gmail gửi" value={email} onChange={e => setEmail(e.target.value)} className="vision-input" />
          <input type="password" placeholder="Mật khẩu ứng dụng Gmail" value={password} onChange={e => setPassword(e.target.value)} className="vision-input" />
          <input type="text" placeholder="Email nhận cảnh báo" value={receiver} onChange={e => setReceiver(e.target.value)} className="vision-input" />
        </div>

        <div style={{ flex: 1 }}>
          <p className="sidebar-label">3. TARGET MAP (Định vị Camera)</p>
          <p style={{ fontSize: '13px', color: '#00e5ff', marginBottom: '10px', fontWeight: 'bold' }}>📍 {locationName}</p>
          <div style={{ borderRadius: '10px', overflow: 'hidden', height: '230px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <MapContainer center={coords} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coords} />
              <LocationPicker setLocation={setLocationName} setCoords={setCoords} />
            </MapContainer>
          </div>
          <button className="btn-deploy" onClick={handleDeploy} style={{ marginTop: '25px' }}>🚀 DEPLOY SYSTEM TỚI MÁY CHỦ AI</button>
        </div>
      </div>

      {showSecretMode && (
        <div style={{ marginTop: '30px', padding: '20px', border: '1px dashed #ff4b4b', borderRadius: '12px', background: 'rgba(255, 75, 75, 0.05)' }}>
          <h3 style={{ color: '#ff4b4b', marginTop: 0 }}>🕵️ DEVELOPER MODE (FAKE DATA INJECTOR)</h3>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '15px' }}>
            <div style={{flex: 1}}>
              <label style={{fontSize: '11px', color: '#a0aec0'}}>Số xe quét được:</label>
              <input className="vision-input" value={fakeStats.vehiclesCount} onChange={e => setFakeStats({...fakeStats, vehiclesCount: e.target.value})} style={{marginBottom: 0}} />
            </div>
            <div style={{flex: 1}}>
               <label style={{fontSize: '11px', color: '#a0aec0'}}>Thêm số vụ tai nạn:</label>
               <input className="vision-input" type="number" value={fakeStats.extraAccidents} onChange={e => setFakeStats({...fakeStats, extraAccidents: parseInt(e.target.value) || 0})} style={{marginBottom: 0}} />
            </div>
          </div>
          <textarea className="vision-input" rows="6" style={{resize: 'vertical', fontFamily: 'monospace', color: '#00ffcc'}} value={jsonInput} onChange={e => setJsonInput(e.target.value)} />
          <button className="btn-stop" onClick={handleInjectFakeData}>💉 BƠM DỮ LIỆU ẢO VÀO HỆ THỐNG</button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// COMPONENT GỐC: LAYOUT VÀ QUẢN LÝ STATE TỔNG
// ==========================================
function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [sysState, setSysState] = useState({
    status: 'NORMAL', police_dispatch: 'Standby', ems_dispatch: 'Standby', fps: 0.0, total_accidents: 0, incident_reports: [], logs: [], is_running: false
  });

  const [fakeReports, setFakeReports] = useState([]);
  const [fakeStats, setFakeStats] = useState({
    vehiclesCount: "12,450", 
    responseTime: "1.8 min",
    uptime: "23 hours",
    extraAccidents: 0 
  });

  const ws = useRef(null);
  const alarmAudio = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket("ws://127.0.0.1:8000/ws/data");
    ws.current.onmessage = (event) => setSysState(JSON.parse(event.data));
    return () => ws.current.close();
  }, []);

  useEffect(() => {
    alarmAudio.current = new Audio('/alarm.mp3');
    alarmAudio.current.loop = true;
  }, []);

  useEffect(() => {
    if (!alarmAudio.current) return;
    if (sysState.status === 'EMERGENCY') alarmAudio.current.play().catch(()=>{});
    else { alarmAudio.current.pause(); alarmAudio.current.currentTime = 0; }
  }, [sysState.status]);

  const handleMouseMove = (e) => {
    document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
  };

  const combinedReports = [...fakeReports, ...sysState.incident_reports];

  // Component phụ lấy tên đường dẫn cho Header
  const PageTitle = () => {
    const location = useLocation();
    const pathName = location.pathname.replace('/', '').toUpperCase() || 'DASHBOARD';
    return <span>{pathName}</span>;
  };

  return (
    <BrowserRouter>
      <div className="app-container" onMouseMove={handleMouseMove}>
        
        {/* 1. SIDEBAR TRƯỢT */}
        <div className={`sidebar glass-card ${!isSidebarOpen ? 'closed' : ''}`}>
          <h2 className="vision-title" style={{ textAlign: 'center', marginTop: '10px' }}>VISION AI</h2>
          <div className="menu-container">
            <NavLink to="/" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"} end><DashboardIcon /> Tổng Quan Thống Kê</NavLink>
            <NavLink to="/live" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}><VideocamIcon /> Giám Sát Camera</NavLink>
            <NavLink to="/reports" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}><AssessmentIcon /> Hồ Sơ Tai Nạn</NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}><SettingsIcon /> Cấu Hình Hệ Thống</NavLink>
          </div>
          
          <div className="glass-card" style={{marginTop: 'auto', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)'}}>
               <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 10px #00ffcc'}}></div>
               <span style={{fontSize: '12px', fontFamily: 'var(--primary-font)'}}>Server Port: 8000</span>
          </div>
        </div>

        {/* 2. MAIN WRAPPER (CHỨA HEADER VÀ NỘI DUNG CHÍNH) */}
        <div className="main-wrapper">
          
          {/* THANH TOP BAR */}
          <header className="top-bar glass-card">
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <MenuIcon />
            </button>
            <div className="header-info">
              <span style={{color: '#8b949e'}}>VISION AI COMMAND CENTER / </span> 
              <PageTitle />
            </div>
          </header>

          {/* VÙNG NỘI DUNG ROUTER */}
          <main className="main-content">
            <Routes>
              <Route path="/" element={<DashboardPage sysState={sysState} fakeStats={fakeStats} />} />
              <Route path="/live" element={<LiveMonitorPage sysState={sysState} />} />
              <Route path="/reports" element={<ReportsPage reports={combinedReports} totalAccidents={sysState.total_accidents + fakeStats.extraAccidents} />} />
              <Route path="/settings" element={<SettingsPage fakeStats={fakeStats} setFakeStats={setFakeStats} setFakeReports={setFakeReports}/>} />
            </Routes>
          </main>
        </div>

      </div>
    </BrowserRouter>
  );
}

export default App;