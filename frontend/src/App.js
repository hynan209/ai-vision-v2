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
import AddCircleIcon from '@mui/icons-material/AddCircle';
import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Leaflet config
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Component chọn vị trí trên bản đồ
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

// Dữ liệu mẫu cho biểu đồ
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

// ==========================================
// TRANG 1: DASHBOARD
// ==========================================
function DashboardPage({ allCamStates, fakeStats }) {
  // Tính tổng số vụ tai nạn từ tất cả camera
  const totalAccidents = Object.values(allCamStates).reduce((sum, cam) => sum + (cam.total_accidents || 0), 0) + fakeStats.extraAccidents;
  
  return (
    <>
      <div className="kpi-row">
        <div className="kpi-card glass-card">
          <div>
            <p className="kpi-title">Tổng Vụ Tai Nạn</p>
            <h3 className="kpi-value" style={{color: '#ff4b4b'}}>
              {totalAccidents}
              <span className="trend-down"><TrendingDownIcon fontSize="small"/> -12%</span>
            </h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #f12711, #f5af19)' }}>💥</div>
        </div>
        <div className="kpi-card glass-card">
          <div>
            <p className="kpi-title">Camera Đang Hoạt Động</p>
            <h3 className="kpi-value">
              {Object.values(allCamStates).filter(cam => cam.is_running).length} / {Object.keys(allCamStates).length}
              <span className="trend-up"><TrendingUpIcon fontSize="small"/> +2</span>
            </h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #8E2DE2, #4A00E0)' }}><VideocamIcon /></div>
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
            <p className="kpi-title">Active AI Models</p>
            <h3 className="kpi-value">YOLOv8+EN <span className="trend-up" style={{color: '#8b949e', fontFamily: 'var(--text-font)'}}>~ 98.5%</span></h3>
          </div>
          <div className="icon-box" style={{ background: 'linear-gradient(135deg, #0075FF, #4FACFE)' }}><CheckCircleIcon /></div>
        </div>
      </div>

      <div className="content-row">
        <div className="glass-card" style={{flex: 7, padding: '25px', display: 'flex', flexDirection: 'column', minWidth: 0}}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <p className="section-header" style={{margin: 0}}>📈 XU HƯỚNG GIAO THÔNG & CẢNH BÁO TAI NẠN</p>
          </div>
          <div className="chart-container" style={{height: '280px'}}>
            <ResponsiveContainer>
              <AreaChart data={trafficData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAlerts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4b4b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ff4b4b" stopOpacity={0}/>
                  </linearGradient>
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
        </div>

        <div style={{flex: 3, display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0}}>
          <div className="glass-card" style={{padding: '20px', flex: 1}}>
            <p className="section-header">📊 PHÂN BỔ MỨC ĐỘ SỰ CỐ</p>
            <div style={{height: '140px', width: '100%', position: 'relative'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={severityData} cx="50%" cy="50%" innerRadius={42} outerRadius={58} paddingAngle={5} dataKey="value" stroke="none">
                    {severityData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
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
            <p className="section-header" style={{margin: 0}}>📡 TÌNH TRẠNG CAMERA AI</p>
            <div className="camera-list">
              {Object.entries(allCamStates).map(([camId, cam]) => (
                <div className="camera-item" key={camId}>
                  <div className="cam-info">
                    <span className="cam-name">{camId}</span>
                    <span className="cam-id">{cam.location?.slice(0, 30)} | {cam.fps || 0} FPS</span>
                  </div>
                  <div className="cam-status">
                    <span className={`status-dot ${cam.is_running ? 'dot-online' : 'dot-offline'}`}></span>
                    <span style={{color: cam.is_running ? (cam.status === 'EMERGENCY' ? '#ff4b4b' : '#00ffcc') : '#ff4b4b'}}>
                      {cam.is_running ? cam.status : 'OFFLINE'}
                    </span>
                  </div>
                </div>
              ))}
              {Object.keys(allCamStates).length === 0 && (
                <p style={{color: '#8b949e', textAlign: 'center', padding: '20px'}}>Chưa có camera nào được cấu hình</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==========================================
// TRANG 2: LIVE MONITOR (VIDEO GIỚI HẠN CHIỀU CAO)
// ==========================================
function LiveMonitorPage({ allCamStates, setAllCamStates, selectedCam, setSelectedCam }) {
  const [videoHeight, setVideoHeight] = useState(400);
  const rightPanelRef = useRef(null);
  const videoCardRef = useRef(null);

  const handleStopCamera = async (camId) => {
    if (!camId) return;
    try {
      await axios.post(`http://127.0.0.1:8000/api/cam/stop/${camId}`);
      setAllCamStates(prev => ({
        ...prev,
        [camId]: { ...prev[camId], is_running: false, status: "NORMAL", fps: 0 }
      }));
      alert(`Đã dừng camera ${camId}`);
    } catch (e) { 
      console.error("Lỗi dừng camera:", e);
      alert("Lỗi kết nối backend!");
    }
  };

  const handleClearLogs = async (camId) => {
    if (!camId) return;
    try {
      await axios.post(`http://127.0.0.1:8000/api/cam/clear_logs/${camId}`);
      const response = await axios.get(`http://127.0.0.1:8000/api/cam/state/${camId}`);
      setAllCamStates(prev => ({
        ...prev,
        [camId]: { ...prev[camId], logs: response.data.logs || [] }
      }));
    } catch (e) { console.error(e); }
  };

  const selectedCamData = selectedCam ? allCamStates[selectedCam] : null;
  const cameraList = ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04', 'CAM-05'];

  // Cập nhật chiều cao video dựa trên cột phải, nhưng giới hạn tối đa
  useEffect(() => {
    const updateVideoHeight = () => {
      if (rightPanelRef.current) {
        // Lấy chiều cao cột phải
        let panelHeight = rightPanelRef.current.offsetHeight;
        
        // GIỚI HẠN: Không quá 500px, không dưới 300px
        panelHeight = Math.min(Math.max(panelHeight, 300), 500);
        
        // Chỉ cập nhật nếu khác biệt lớn (tránh cập nhật liên tục)
        setVideoHeight(prev => {
          if (Math.abs(prev - panelHeight) > 20) return panelHeight;
          return prev;
        });
      }
    };
    
    // Cập nhật ban đầu
    updateVideoHeight();
    
    // Dùng ResizeObserver để theo dõi thay đổi kích thước cột phải
    const resizeObserver = new ResizeObserver(() => updateVideoHeight());
    if (rightPanelRef.current) {
      resizeObserver.observe(rightPanelRef.current);
    }
    
    // Cleanup
    return () => resizeObserver.disconnect();
  }, [selectedCamData?.logs?.length]); // Chỉ chạy khi số lượng log thay đổi

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* === HÀNG 1: CAMERA GRID === */}
      <div className="glass-card" style={{ padding: '15px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <p className="section-header" style={{ margin: 0 }}>🎥 CAMERA NETWORK (Click để xem)</p>
          <button 
            className="btn-stop" 
            onClick={async () => {
              if (window.confirm('Dừng tất cả camera đang chạy?')) {
                try {
                  await axios.post("http://127.0.0.1:8000/api/cam/stop_all");
                  const newStates = {...allCamStates};
                  Object.keys(newStates).forEach(camId => {
                    newStates[camId] = {...newStates[camId], is_running: false, status: "NORMAL"};
                  });
                  setAllCamStates(newStates);
                  alert("Đã dừng tất cả camera");
                } catch(e) { alert("Lỗi: " + e); }
              }
            }}
            style={{ padding: '5px 15px', fontSize: '12px' }}
          >
            ⏹ DỪNG TẤT CẢ
          </button>
        </div>
        
        <div className="cam-grid-horizontal" style={{
          display: 'flex',
          gap: '15px',
          overflowX: 'auto',
          paddingBottom: '10px',
        }}>
          {cameraList.map(camId => {
            const cam = allCamStates[camId] || { is_running: false, status: 'NORMAL', fps: 0, location: 'Chưa cấu hình' };
            const isActive = selectedCam === camId;
            
            return (
              <div
                key={camId}
                onClick={() => setSelectedCam(camId)}
                style={{
                  minWidth: '180px',
                  width: '180px',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '10px',
                  border: isActive ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ aspectRatio: '16/9', background: '#000', position: 'relative' }}>
                  {cam.is_running ? (
                    <img 
                      src={`http://127.0.0.1:8000/api/cam/video_feed/${camId}`}
                      alt={camId}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                      <VideocamOffIcon style={{ fontSize: 30, color: '#ff4b4b', opacity: 0.5 }} />
                    </div>
                  )}
                  
                  <div style={{
                    position: 'absolute',
                    top: '5px',
                    left: '5px',
                    background: cam.is_running 
                      ? (cam.status === 'EMERGENCY' ? '#ff4b4b' : cam.status === 'WARNING' ? '#ff9800' : '#00ffcc')
                      : '#ff4b4b',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '9px',
                    fontWeight: 'bold',
                    color: '#000'
                  }}>
                    {cam.is_running ? (cam.status || 'NORMAL') : 'OFF'}
                  </div>
                  
                  {cam.is_running && (
                    <div style={{
                      position: 'absolute',
                      bottom: '5px',
                      right: '5px',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 5px',
                      borderRadius: '5px',
                      fontSize: '8px',
                      color: '#00e5ff'
                    }}>
                      {cam.fps || 0} FPS
                    </div>
                  )}
                </div>
                
                <div style={{ padding: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#00e5ff', fontSize: '12px' }}>{camId}</span>
                    <span className={`status-dot ${cam.is_running ? 'dot-online' : 'dot-offline'}`} style={{ width: '8px', height: '8px' }}></span>
                  </div>
                  <p style={{ fontSize: '9px', color: '#8b949e', margin: '4px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {cam.location?.slice(0, 25) || 'Chưa cấu hình'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* === HÀNG 2: VIDEO CHÍNH + LOGS + INFO === */}
      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Cột trái: VIDEO - CHIỀU CAO CỐ ĐỊNH, KHÔNG BỊ KÉO DÀI */}
        <div 
          ref={videoCardRef}
          className="glass-card" 
          style={{ 
            flex: 7, 
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column',
            height: `${videoHeight}px`,
            transition: 'height 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexShrink: 0 }}>
            <div>
              <h2 className="section-header" style={{ margin: 0, fontSize: '16px' }}>
                📹 LIVE - {selectedCam || 'CHỌN CAMERA'}
              </h2>
              {selectedCam && selectedCamData?.location && (
                <p style={{ fontSize: '11px', color: '#8b949e', margin: '5px 0 0 0' }}>
                  📍 {selectedCamData.location}
                </p>
              )}
            </div>
            {selectedCam && selectedCamData?.is_running && (
              <button className="btn-stop" onClick={() => handleStopCamera(selectedCam)} style={{ padding: '6px 15px' }}>
                ⏹ DỪNG CAMERA
              </button>
            )}
          </div>

          {/* VIDEO CONTAINER */}
          <div style={{
            background: '#000',
            borderRadius: '12px',
            border: selectedCamData?.status === 'EMERGENCY' ? '2px solid #ff4b4b' : 
                    selectedCamData?.status === 'WARNING' ? '2px solid #ff9800' : 
                    '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
            flex: 1
          }}>
            {selectedCam && selectedCamData?.is_running ? (
              <img 
                src={`http://127.0.0.1:8000/api/cam/video_feed/${selectedCam}`} 
                alt={`Camera ${selectedCam}`} 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                key={selectedCam}
              />
            ) : (
              <div style={{ textAlign: 'center', color: '#8b949e' }}>
                <VideocamOffIcon style={{ fontSize: 48, opacity: 0.3, marginBottom: '10px' }} />
                <p>{!selectedCam ? "👆 Click vào camera bên trên để xem" : `📷 Camera ${selectedCam} chưa được bật`}</p>
                <p style={{ fontSize: '12px', marginTop: '10px' }}>
                  {!selectedCam ? "Chọn camera từ danh sách" : "Vào trang Cấu Hình để bật camera"}
                </p>
              </div>
            )}
            
            {selectedCam && selectedCamData?.is_running && (
              <div style={{
                position: 'absolute',
                top: '15px',
                left: '15px',
                background: selectedCamData?.status === 'EMERGENCY' ? '#ff4b4b' :
                            selectedCamData?.status === 'WARNING' ? '#ff9800' : '#00ffcc',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#000'
              }}>
                {selectedCamData?.status || 'NORMAL'}
              </div>
            )}
            
            {selectedCam && selectedCamData?.is_running && (
              <div style={{
                position: 'absolute',
                bottom: '15px',
                right: '15px',
                background: 'rgba(0,0,0,0.7)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
                color: '#00e5ff'
              }}>
                {selectedCamData?.fps || 0} FPS
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: LOGS + INFO */}
        <div 
          ref={rightPanelRef}
          style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          {/* LOGS - CÓ SCROLL, CHIỀU CAO CỐ ĐỊNH */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 className="section-header" style={{ margin: 0, fontSize: '14px' }}>📋 ACTIVITY LOGS</h2>
              {selectedCam && (
                <button className="btn-clear" onClick={() => handleClearLogs(selectedCam)} style={{ fontSize: '11px', padding: '4px 12px' }}>
                  XÓA
                </button>
              )}
            </div>
            <div className="log-container" style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {selectedCam && selectedCamData?.logs?.length > 0 ? (
                selectedCamData.logs.map((log, index) => (
                  <div key={index} className={`log-item log-${log.level}`} style={{ fontSize: '11px', marginBottom: '8px', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <b style={{ color: '#00e5ff' }}>[{log.time}]</b>
                    <span dangerouslySetInnerHTML={{ __html: log.message }}></span>
                  </div>
                ))
              ) : (
                <p style={{ color: '#8b949e', fontSize: '11px', textAlign: 'center', padding: '20px' }}>
                  {!selectedCam ? "👈 Chọn camera để xem log" : "Chưa có log cho camera này"}
                </p>
              )}
            </div>
          </div>

          {/* INFO PANEL */}
          {selectedCam && selectedCamData && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 className="section-header" style={{ margin: '0 0 15px 0', fontSize: '14px' }}>ℹ️ THÔNG TIN NHANH</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '10px', color: '#8b949e', margin: 0 }}>CAMERA ID</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{selectedCam}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#8b949e', margin: 0 }}>TRẠNG THÁI</p>
                  <p style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold', 
                    margin: '4px 0 0 0', 
                    color: selectedCamData.status === 'EMERGENCY' ? '#ff4b4b' : 
                           selectedCamData.status === 'WARNING' ? '#ff9800' : '#00ffcc'
                  }}>
                    {selectedCamData.status || 'NORMAL'}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#8b949e', margin: 0 }}>🚓 CẢNH SÁT</p>
                  <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>{selectedCamData.police_dispatch || 'Standby'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#8b949e', margin: 0 }}>🚑 CỨU THƯƠNG</p>
                  <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>{selectedCamData.ems_dispatch || 'Standby'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#8b949e', margin: 0 }}>💥 TỔNG TAI NẠN</p>
                  <p style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#ff4b4b' }}>
                    {selectedCamData.total_accidents || 0}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: '10px', color: '#8b949e', margin: 0 }}>⚡ FPS</p>
                  <p style={{ fontSize: '16px', fontWeight: 'bold', margin: '4px 0 0 0', color: '#00e5ff' }}>
                    {selectedCamData.fps || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// TRANG 3: REPORTS
// ==========================================
function ReportsPage({ allCamStates }) {
  // Gom tất cả báo cáo từ các camera
  const allReports = [];
  Object.entries(allCamStates).forEach(([camId, cam]) => {
    if (cam.incident_reports) {
      cam.incident_reports.forEach(report => {
        allReports.push({...report, camera: camId});
      });
    }
  });
  allReports.sort((a, b) => new Date(b.time) - new Date(a.time));
  
  const totalAccidents = allReports.length;

  return (
    <div className="glass-card" style={{ flex: 1, padding: '30px' }}>
      <h2 className="vision-title" style={{ marginBottom: '20px' }}>📋 HỒ SƠ TAI NẠN GIAO THÔNG</h2>
      <div style={{display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'center'}}>
        <div className="icon-box" style={{ background: '#ff4b4b' }}>💥</div>
        <p style={{ color: '#ff4b4b', fontSize: '20px', fontFamily: 'var(--primary-font)', margin: 0 }}>
          ĐÃ GHI NHẬN: {totalAccidents} VỤ TAI NẠN
        </p>
      </div>
      {allReports.length === 0 ? (
        <p style={{ color: '#8b949e', textAlign: 'center', marginTop: '50px' }}>Chưa có vụ tai nạn nào được ghi nhận.</p>
      ) : (
        <div style={{ overflowX: 'auto', maxHeight: '550px', overflowY: 'auto' }}>
          <table className="vision-table">
            <thead>
              <tr>
                <th>Camera</th>
                <th>Mã số</th>
                <th><AccessTimeIcon fontSize="small" style={{verticalAlign: 'middle'}}/> Thời gian</th>
                <th><MapIcon fontSize="small" style={{verticalAlign: 'middle'}}/> Vị trí</th>
                <th>Mức độ</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {allReports.map((report, index) => (
                <tr key={index}>
                  <td style={{fontWeight: 'bold', color: '#00e5ff'}}>{report.camera}</td>
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
// TRANG 4: SETTINGS (CẤU HÌNH MULTI CAMERA)
// ==========================================
function SettingsPage({ allCamStates, setAllCamStates, setSelectedCam }) {
  const [selectedCamForSetup, setSelectedCamForSetup] = useState('CAM-01');
  const [inputType, setInputType] = useState('file');
  const [videoFile, setVideoFile] = useState(null);
  const [senderEmail, setSenderEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [receiverEmail, setReceiverEmail] = useState('');
  const [locationName, setLocationName] = useState('Thành phố Tân An, Long An');
  const [coords, setCoords] = useState([10.5366, 106.4043]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Danh sách camera có sẵn
  const availableCameras = ['CAM-01', 'CAM-02', 'CAM-03', 'CAM-04', 'CAM-05'];

  const handleSetupCamera = async () => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append("cam_id", selectedCamForSetup);
    formData.append("input_type", inputType);
    formData.append("location", locationName);
    formData.append("sender_email", senderEmail);
    formData.append("app_password", appPassword);
    formData.append("receiver_email", receiverEmail);
    
    if (inputType === 'file' && videoFile) {
      formData.append("video", videoFile);
    }
    
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/cam/setup", formData);
      alert(response.data.message || `Camera ${selectedCamForSetup} đã được khởi động!`);
      
      // Lấy lại trạng thái mới
      const stateResponse = await axios.get(`http://127.0.0.1:8000/api/cam/state/${selectedCamForSetup}`);
      setAllCamStates(prev => ({
        ...prev,
        [selectedCamForSetup]: {...stateResponse.data, is_running: true}
      }));
      
      // Chuyển sang tab Live sau 2 giây
      setTimeout(() => {
        setSelectedCam(selectedCamForSetup);
        navigate('/live');
      }, 2000);
    } catch (err) {
      console.error(err);
      alert("LỖI KẾT NỐI BACKEND!\n\nVui lòng kiểm tra server đang chạy ở cổng 8000");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopCamera = async (camId) => {
    try {
      await axios.post(`http://127.0.0.1:8000/api/cam/stop/${camId}`);
      setAllCamStates(prev => ({...prev, [camId]: {...prev[camId], is_running: false}}));
      alert(`Camera ${camId} đã dừng`);
    } catch (err) {
      alert("Lỗi khi dừng camera");
    }
  };

  const handleStopAll = async () => {
    if (window.confirm("Dừng tất cả camera?")) {
      try {
        await axios.post("http://127.0.0.1:8000/api/cam/stop_all");
        const newStates = {...allCamStates};
        Object.keys(newStates).forEach(camId => {
          newStates[camId] = {...newStates[camId], is_running: false};
        });
        setAllCamStates(newStates);
        alert("Đã dừng tất cả camera");
      } catch (err) {
        alert("Lỗi khi dừng camera");
      }
    }
  };

  return (
    <div className="glass-card" style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
      <h2 className="vision-title" style={{marginBottom: '20px'}}>⚙️ Cấu hình Multi-Camera AI</h2>
      
      {/* Chọn camera */}
      <div style={{marginBottom: '25px'}}>
        <p className="sidebar-label">📷 1. CHỌN CAMERA CẦN CẤU HÌNH</p>
        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
          {availableCameras.map(camId => (
            <button
              key={camId}
              onClick={() => setSelectedCamForSetup(camId)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: selectedCamForSetup === camId ? '2px solid #00e5ff' : '1px solid rgba(255,255,255,0.2)',
                background: selectedCamForSetup === camId ? 'rgba(0,229,255,0.2)' : 'rgba(0,0,0,0.3)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {camId}
              {allCamStates[camId]?.is_running && <span style={{color: '#00ffcc'}}>🟢</span>}
              {!allCamStates[camId]?.is_running && allCamStates[camId] && <span style={{color: '#ff4b4b'}}>⚫</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Trạng thái hiện tại */}
      {allCamStates[selectedCamForSetup] && (
        <div className="glass-card" style={{padding: '15px', marginBottom: '25px', background: 'rgba(0,0,0,0.2)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <p style={{fontSize: '12px', color: '#8b949e', margin: 0}}>TRẠNG THÁI HIỆN TẠI</p>
              <p style={{fontSize: '18px', fontWeight: 'bold', margin: '5px 0 0 0', color: allCamStates[selectedCamForSetup]?.is_running ? '#00ffcc' : '#ff4b4b'}}>
                {allCamStates[selectedCamForSetup]?.is_running ? '🟢 ĐANG HOẠT ĐỘNG' : '⚫ ĐANG TẮT'}
              </p>
            </div>
            {allCamStates[selectedCamForSetup]?.is_running && (
              <button className="btn-stop" onClick={() => handleStopCamera(selectedCamForSetup)}>⏹ DỪNG CAMERA</button>
            )}
          </div>
          {allCamStates[selectedCamForSetup]?.location && (
            <p style={{fontSize: '12px', marginTop: '10px'}}>📍 Vị trí: {allCamStates[selectedCamForSetup].location}</p>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <p className="sidebar-label">2. CHỌN NGUỒN DỮ LIỆU</p>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button 
              onClick={() => setInputType('file')}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #00e5ff', background: inputType === 'file' ? '#00e5ff' : 'transparent', color: inputType === 'file' ? '#050810' : '#00e5ff', cursor: 'pointer', fontWeight: 'bold' }}
            >📁 FILE VIDEO</button>
            <button 
              onClick={() => setInputType('webcam')}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #00e5ff', background: inputType === 'webcam' ? '#00e5ff' : 'transparent', color: inputType === 'webcam' ? '#050810' : '#00e5ff', cursor: 'pointer', fontWeight: 'bold' }}
            >💻 WEBCAM</button>
          </div>

          {inputType === 'file' && (
            <input 
              type="file" 
              accept="video/mp4,video/avi" 
              onChange={(e) => setVideoFile(e.target.files[0])} 
              className="vision-input"
            />
          )}

          <p className="sidebar-label" style={{marginTop: '20px'}}>3. EMAIL CẢNH BÁO (Tùy chọn)</p>
          <input type="email" placeholder="Email gửi (Gmail)" value={senderEmail} onChange={e => setSenderEmail(e.target.value)} className="vision-input" />
          <input type="password" placeholder="Mật khẩu ứng dụng Gmail" value={appPassword} onChange={e => setAppPassword(e.target.value)} className="vision-input" />
          <input type="email" placeholder="Email nhận cảnh báo" value={receiverEmail} onChange={e => setReceiverEmail(e.target.value)} className="vision-input" />
        </div>

        <div style={{ flex: 1, minWidth: '250px' }}>
          <p className="sidebar-label">4. ĐỊNH VỊ CAMERA (Click trên bản đồ)</p>
          <p style={{ fontSize: '13px', color: '#00e5ff', marginBottom: '10px', fontWeight: 'bold' }}>📍 {locationName}</p>
          <div style={{ borderRadius: '10px', overflow: 'hidden', height: '250px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <MapContainer center={coords} zoom={15} style={{ height: '100%', width: '100%' }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={coords} />
              <LocationPicker setLocation={setLocationName} setCoords={setCoords} />
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Nút hành động */}
      <div style={{ display: 'flex', gap: '15px', marginTop: '30px', justifyContent: 'center' }}>
        <button className="btn-deploy" onClick={handleSetupCamera} disabled={isLoading} style={{minWidth: '200px'}}>
          {isLoading ? '⏳ ĐANG KHỞI ĐỘNG...' : `🚀 BẬT CAMERA ${selectedCamForSetup}`}
        </button>
        <button className="btn-stop" onClick={handleStopAll} style={{minWidth: '150px'}}>
          ⏹ DỪNG TẤT CẢ
        </button>
      </div>

      {/* Hướng dẫn */}
      <div className="glass-card" style={{marginTop: '30px', padding: '15px', background: 'rgba(0,229,255,0.05)'}}>
        <p style={{margin: 0, fontSize: '12px', color: '#00e5ff'}}>📌 HƯỚNG DẪN:</p>
        <ul style={{fontSize: '11px', color: '#8b949e', marginTop: '8px'}}>
          <li>Mỗi camera có thể chạy file video hoặc webcam riêng biệt</li>
          <li>Có thể bật/tắt từng camera độc lập, không ảnh hưởng lẫn nhau</li>
          <li>Email cảnh báo sẽ gửi khi phát hiện va chạm (nếu cấu hình)</li>
          <li>Sau khi bật, vào tab <strong>Giám Sát Camera</strong> và click vào camera để xem</li>
        </ul>
      </div>
    </div>
  );
}

// ==========================================
// COMPONENT CHÍNH: APP
// ==========================================
function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [allCamStates, setAllCamStates] = useState({});
  const [selectedCam, setSelectedCam] = useState(null);
  const [fakeStats] = useState({
    vehiclesCount: "12,450", 
    responseTime: "1.8 min",
    extraAccidents: 0 
  });

// WebSocket lắng nghe trạng thái tất cả camera với realtime update
useEffect(() => {
  let ws = null;
  
  const connectWebSocket = () => {
    ws = new WebSocket("ws://127.0.0.1:8000/ws/all");
    
    ws.onopen = () => {
      console.log("✅ WebSocket connected for realtime updates");
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "init") {
          // Khởi tạo state ban đầu
          setAllCamStates(data.states);
        } 
        else if (data.type === "state") {
          // Cập nhật state realtime cho một camera
          setAllCamStates(prev => ({
            ...prev,
            [data.cam_id]: {
              ...prev[data.cam_id],
              ...data.state,
              is_running: data.state.is_running ?? prev[data.cam_id]?.is_running
            }
          }));
        }
        else if (data.type === "log") {
          // Thêm log realtime
          setAllCamStates(prev => {
            const cam = prev[data.cam_id];
            if (!cam) return prev;
            const newLogs = [data.log, ...(cam.logs || [])].slice(0, 50);
            return {
              ...prev,
              [data.cam_id]: {
                ...cam,
                logs: newLogs
              }
            };
          });
        }
        else if (data.type === "report") {
          // Thêm báo cáo mới realtime
          setAllCamStates(prev => {
            const cam = prev[data.cam_id];
            if (!cam) return prev;
            const newReports = [data.report, ...(cam.incident_reports || [])];
            return {
              ...prev,
              [data.cam_id]: {
                ...cam,
                incident_reports: newReports,
                total_accidents: (cam.total_accidents || 0) + 1
              }
            };
          });
        }
        else if (data.type === "fps") {
          // Cập nhật FPS realtime
          setAllCamStates(prev => ({
            ...prev,
            [data.cam_id]: {
              ...prev[data.cam_id],
              fps: data.fps
            }
          }));
        }
      } catch (e) {
        console.error("WebSocket parse error:", e);
      }
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setTimeout(connectWebSocket, 3000); // Tự động reconnect sau 3s
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      setTimeout(connectWebSocket, 3000);
    };
  };
  
  connectWebSocket();
  
  // Fetch danh sách camera ban đầu (fallback)
  const fetchCameras = async () => {
    try {
      const response = await axios.get("http://127.0.0.1:8000/api/cam/list");
      if (response.data.cameras) {
        const states = {};
        for (const [camId, info] of Object.entries(response.data.cameras)) {
          const stateRes = await axios.get(`http://127.0.0.1:8000/api/cam/state/${camId}`);
          states[camId] = {...stateRes.data, is_running: info.is_running};
        }
        setAllCamStates(states);
      }
    } catch (err) {
      console.log("Backend chưa sẵn sàng");
    }
  };
  
  fetchCameras();
  
  return () => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  };
}, []);

  // Component phụ lấy tên đường dẫn cho Header
  const PageTitle = () => {
    const location = useLocation();
    const path = location.pathname;
    if (path === '/') return <span>DASHBOARD</span>;
    if (path === '/live') return <span>GIÁM SÁT CAMERA {selectedCam ? `- ${selectedCam}` : ''}</span>;
    if (path === '/reports') return <span>HỒ SƠ TAI NẠN</span>;
    if (path === '/settings') return <span>CẤU HÌNH HỆ THỐNG</span>;
    return <span>VISION AI</span>;
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* SIDEBAR */}
        <div className={`sidebar glass-card ${!isSidebarOpen ? 'closed' : ''}`}>
          <h2 className="vision-title" style={{ textAlign: 'center', marginTop: '10px' }}>VISION AI</h2>
          <div className="menu-container">
            <NavLink to="/" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"} end>
              <DashboardIcon /> Tổng Quan
            </NavLink>
            <NavLink to="/live" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
              <VideocamIcon /> Giám Sát
            </NavLink>
            <NavLink to="/reports" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
              <AssessmentIcon /> Hồ Sơ
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
              <SettingsIcon /> Cấu Hình
            </NavLink>
          </div>
          
          <div className="glass-card" style={{marginTop: 'auto', padding: '15px', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.3)'}}>
            <div style={{width: '10px', height: '10px', borderRadius: '50%', background: '#00ffcc', boxShadow: '0 0 10px #00ffcc'}}></div>
            <span style={{fontSize: '12px', fontFamily: 'var(--primary-font)'}}>Multi-Camera Ready</span>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-wrapper">
          <header className="top-bar glass-card">
            <button className="menu-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <MenuIcon />
            </button>
            <div className="header-info">
              <span style={{color: '#8b949e'}}>VISION AI COMMAND CENTER / </span> 
              <PageTitle />
            </div>
          </header>

          <main className="main-content">
            <Routes>
              <Route path="/" element={<DashboardPage allCamStates={allCamStates} fakeStats={fakeStats} />} />
              <Route path="/live" element={<LiveMonitorPage allCamStates={allCamStates} setAllCamStates={setAllCamStates} selectedCam={selectedCam} setSelectedCam={setSelectedCam} />} />
              <Route path="/reports" element={<ReportsPage allCamStates={allCamStates} />} />
              <Route path="/settings" element={<SettingsPage allCamStates={allCamStates} setAllCamStates={setAllCamStates} setSelectedCam={setSelectedCam} />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;