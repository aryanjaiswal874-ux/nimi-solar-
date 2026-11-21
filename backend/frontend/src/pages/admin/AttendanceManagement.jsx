import { useState, useEffect, useMemo, useRef } from "react";
import {
  Clock,
  MapPin,
  Camera,
  Download,
  Search,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  LayoutDashboard,
  ArrowRight,
  Filter,
  Eye,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  UserCheck,
  UserX,
  Clock3,
  RefreshCw,
  LogOut,
  X,
  FileText
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import API from "../../api/axios";
import { useToast } from "../../context/ToastContext";
import { Helmet } from "react-helmet-async";
import moment from "moment";
import * as XLSX from "xlsx";

const AttendanceManagement = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const isAdmin = ['admin', 'super_admin'].includes(user?.role);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin' : 'my');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [selectedMonth, setSelectedMonth] = useState(moment().format('YYYY-MM'));
  const [searchTerm, setSearchTerm] = useState("");
  const [adminSubTab, setAdminSubTab] = useState('daily'); // daily, monthly
  const [drilledEmployee, setDrilledEmployee] = useState(null); // For admin drill-down
  const [drilledHistory, setDrilledHistory] = useState([]);

  // Marking States
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("Fetching location...");
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [attendanceType, setAttendanceType] = useState('in');
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [staffData, setStaffData] = useState([]);
  const [officeSettings, setOfficeSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, present, absent
  const [sortConfig, setSortConfig] = useState({ key: 'full_name', direction: 'asc' });
  const [forceLogoutReason, setForceLogoutReason] = useState('');
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  const [forceLogoutMsg, setForceLogoutMsg] = useState('');

  const IMG_URL = import.meta.env.VITE_API_BASE_URL_IMG || import.meta.env.VITE_API_BASE_URL.replace('/api', '');
  const getImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http') || path.startsWith('data:')) return path;
    const normalizedPath = path.replace(/\\/g, '/').startsWith('/') ? path.replace(/\\/g, '/') : `/${path.replace(/\\/g, '/')}`;
    return `${IMG_URL}${normalizedPath}`;
  };

  useEffect(() => {
    fetchOfficeSettings();
    if (activeTab === 'admin') {
      if (adminSubTab === 'daily') fetchAdminDailyAttendance();
      else fetchAdminMonthlyAttendance();
    } else {
      fetchMyAttendanceHistory();
    }
    fetchMyTodayStatus();
  }, [selectedDate, selectedMonth, activeTab, adminSubTab]);

  useEffect(() => {
    if (drilledEmployee) {
      fetchDrilledHistory(drilledEmployee.id);
    }
  }, [drilledEmployee, selectedMonth]);

  const fetchDrilledHistory = async (userId) => {
    setLoading(true);
    try {
      const start = moment(selectedMonth).startOf('month').format("YYYY-MM-DD");
      const end = moment(selectedMonth).endOf('month').format("YYYY-MM-DD");
      const res = await API.get(`/erp/attendance/history?userId=${userId}&startDate=${start}&endDate=${end}`);
      setDrilledHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setDrilledHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isMarkingModalOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isMarkingModalOpen]);

  const fetchOfficeSettings = async () => {
    try {
      const res = await API.get("/erp/office-settings");
      setOfficeSettings(res.data);
    } catch (e) { }
  };

  const fetchAdminDailyAttendance = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/erp/attendance/daily?date=${selectedDate}`);
      setStaffData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminMonthlyAttendance = async () => {
    setLoading(true);
    try {
      const res = await API.get("/erp/attendance/monthly-summary", { params: { month: selectedMonth } });
      const records = Array.isArray(res.data) ? res.data : [];
      // Nest User object if not already nested for the UI components
      const formatted = records.map(r => ({
        ...r,
        User: r.User || { id: r.id, full_name: r.full_name, designation: r.designation, profile_photo: r.profile_photo, mobile: r.mobile, email: r.email }
      }));
      setStaffData(formatted);
    } catch (error) {
      showToast("Error loading monthly performance", "error");
      setStaffData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAttendanceHistory = async () => {
    setLoading(true);
    try {
      const start = moment(selectedMonth).startOf('month').format("YYYY-MM-DD");
      const end = moment(selectedMonth).endOf('month').format("YYYY-MM-DD");
      const res = await API.get(`/erp/attendance/history?startDate=${start}&endDate=${end}`);
      setAttendanceHistory(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      setAttendanceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTodayStatus = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await API.get(`/erp/attendance/history?startDate=${today}&endDate=${today}`);
      if (res.data && res.data.length > 0) {
        setTodayAttendance(res.data[0]);
      } else {
        setTodayAttendance(null);
      }
    } catch (e) { }
  };

  const startCamera = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          await fetchAddressFromGoogle(loc.lat, loc.lng);
        }, () => setAddress("Location Access Denied"));
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Giving a tiny delay for the ref to bind after setIsCameraOpen(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 200);

    } catch (err) {
      showToast("Access Denied: Camera required", "error");
      setIsCameraOpen(false);
    }
  };

  const fetchAddressFromGoogle = async (lat, lng) => {
    try {
      // Use FREE OpenStreetMap Nominatim instead of Google Maps
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'SOLAR-ERP/1.0 (admin@yourdomain.com)' // Required by Nominatim
          }
        }
      );

      const data = await response.json();

      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Set fixed size
    canvas.width = 400;
    canvas.height = 300;

    // Flip the context horizontally to match mirrored preview (User Experience)
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);

    // Draw the video frame
    context.drawImage(videoRef.current, 0, 0, 400, 300);

    context.restore();

    const data = canvas.toDataURL('image/jpeg');
    setCapturedImage(data);
    stopCamera();
  };

  const submitAttendance = async (forceOverride = false) => {
    if (attendanceType === 'in' && !capturedImage) return showToast("Selfie required for In-Punch", "warning");
    setLoading(true);
    try {
      const endpoint = attendanceType === 'in' ? 'erp/attendance/in' : 'erp/attendance/out';
      const payload = {
        location: address || "Unknown Location",
        photo: capturedImage,
        lat: location?.lat,
        lng: location?.lng
      };
      if (forceOverride) {
        payload.force = true;
        payload.force_reason = forceLogoutReason;
      }
      await API.post(endpoint, payload);
      showToast(`${attendanceType === 'in' ? 'Punch In' : 'Punch Out'} Success`, "success");
      handleCloseModal();
      setShowForceLogoutModal(false);
      setForceLogoutReason('');
      fetchMyTodayStatus();
      if (isAdmin) {
        if (adminSubTab === 'daily') fetchAdminDailyAttendance();
        else fetchAdminMonthlyAttendance();
      }
      fetchMyAttendanceHistory();
    } catch (error) {
      if (error.response?.data?.requireForce) {
        showToast(error.response.data.message, "warning");
        setForceLogoutMsg(error.response.data.message);
        setShowForceLogoutModal(true);
        handleCloseModal();
      } else {
        showToast(error.response?.data?.message || "Error", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTakeBreak = async () => {
    const reason = prompt("Enter reason for break (e.g. Lunch, Personal work):");
    if (reason === null) return;
    setLoading(true);
    try {
      await API.post('erp/attendance/break', { reason });
      showToast("Break started", "info");
      fetchMyTodayStatus();
    } catch (error) {
      showToast(error.response?.data?.message || "Error starting break", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResumeWork = async () => {
    setLoading(true);
    try {
      await API.post('erp/attendance/resume');
      showToast("Work resumed", "success");
      fetchMyTodayStatus();
    } catch (error) {
      showToast(error.response?.data?.message || "Error resuming work", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setIsMarkingModalOpen(false);
    stopCamera();
    setCapturedImage(null);
  };

  const exportToExcel = () => {
    const dataToExport = activeTab === 'admin' ? staffData : attendanceHistory;
    const xlsData = dataToExport.map((item, idx) => {
      const name = item.full_name || item.User?.full_name || user.full_name;
      const date = item.attendance?.date || item.date || selectedDate;
      const hours = item.attendance?.total_work_hours || item.total_work_hours || "00:00:00";
      return {
        "SN": idx + 1,
        "Name": name,
        "Date": date,
        "In": item.attendance?.in_time || item.in_time || "Absent",
        "Out": item.attendance?.out_time || item.out_time || "-",
        "Status": item.attendance?.status || item.status || "Absent",
        "Hours": hours
      };
    });
    const ws = XLSX.utils.json_to_sheet(xlsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `AttendanceReport_${moment().format('DD_MM_YYYY')}.xlsx`);
  };

  const stats = useMemo(() => {
    if (activeTab === 'admin') {
      const total = staffData.length;
      const present = staffData.filter(s => s.attendance && s.attendance.status === 'present').length;
      const absent = staffData.filter(s => !s.attendance || s.attendance.status === 'absent').length;
      return { total, present, absent };
    }
    return null;
  }, [staffData, activeTab]);

  return (
    <div className="p-1 sm:p-2 md:p-4 space-y-3 sm:space-y-4 bg-white min-h-screen font-sans text-slate-700">
      <Helmet>
        <title>Attendance | SBGM ERP</title>
      </Helmet>

      {/* Dashboard Style Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-6 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">Attendance</h1>
          <p className="text-[10px] sm:text-xs font-medium text-slate-400 mt-0.5 sm:mt-1 italic">Manage your team and individual attendance records simply</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 flex-1 sm:flex-none">
            <Calendar size={13} className="text-slate-400 shrink-0" />
            <input
              type={activeTab === 'admin' && adminSubTab === 'daily' ? "date" : "month"}
              value={activeTab === 'admin' && adminSubTab === 'daily' ? selectedDate : selectedMonth}
              onChange={(e) => {
                if (activeTab === 'admin' && adminSubTab === 'daily') setSelectedDate(e.target.value);
                else setSelectedMonth(e.target.value);
              }}
              className="text-[10px] font-bold text-slate-600 outline-none uppercase bg-transparent w-full sm:w-auto"
            />
          </div>

          {activeTab === 'admin' && (
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-emerald-600 text-white px-3 sm:px-4 py-1.5 rounded-lg text-[10px] font-bold shadow-sm hover:bg-blue-700 transition-all shrink-0"
            >
              <Download size={13} /><span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {/* Colorful Capsule Stats */}
      {isAdmin && activeTab === 'admin' && adminSubTab === 'daily' && stats && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => setFilterType('all')}
            className={`flex items-center justify-between flex-1 sm:flex-none min-w-[100px] sm:min-w-[130px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all ${filterType === 'all' ? 'bg-sky-500 text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1 sm:p-1.5 rounded-lg ${filterType === 'all' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-600 border border-sky-100'}`}><User size={14} /></div>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight">Total</span>
            </div>
            <span className={`text-xs sm:text-sm font-bold ml-3 sm:ml-4 ${filterType === 'all' ? 'text-white' : 'text-slate-800'}`}>{stats.total}</span>
          </button>

          <button
            onClick={() => setFilterType('present')}
            className={`flex items-center justify-between flex-1 sm:flex-none min-w-[100px] sm:min-w-[130px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all ${filterType === 'present' ? 'bg-emerald-500 text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1 sm:p-1.5 rounded-lg ${filterType === 'present' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}><UserCheck size={14} /></div>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight">Present</span>
            </div>
            <span className={`text-xs sm:text-sm font-bold ml-3 sm:ml-4 ${filterType === 'present' ? 'text-white' : 'text-slate-800'}`}>{stats.present}</span>
          </button>

          <button
            onClick={() => setFilterType('absent')}
            className={`flex items-center justify-between flex-1 sm:flex-none min-w-[100px] sm:min-w-[130px] px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border transition-all ${filterType === 'absent' ? 'bg-rose-500 text-white shadow-md border-transparent' : 'bg-white text-slate-600 border-slate-100 shadow-sm'}`}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1 sm:p-1.5 rounded-lg ${filterType === 'absent' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}><UserX size={14} /></div>
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight">Absent</span>
            </div>
            <span className={`text-xs sm:text-sm font-bold ml-3 sm:ml-4 ${filterType === 'absent' ? 'text-white' : 'text-slate-800'}`}>{stats.absent}</span>
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Navigation Tabs */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex bg-slate-200/50 p-1 rounded-lg">
            {isAdmin && (
              <button
                onClick={() => { setActiveTab('admin'); setDrilledEmployee(null); }}
                className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'admin' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Team Records
              </button>
            )}
            <button
              onClick={() => { setActiveTab('my'); setDrilledEmployee(null); }}
              className={`px-6 py-2 rounded-md text-xs font-bold transition-all ${activeTab === 'my' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              My Records
            </button>
          </div>

          {isAdmin && activeTab === 'admin' && (
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {['daily', 'monthly'].map(tab => (
                <button
                  key={tab}
                  onClick={() => { setAdminSubTab(tab); setDrilledEmployee(null); }}
                  className={`px-5 py-1.5 rounded-md text-[9px] font-bold transition-all ${adminSubTab === tab ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-400 hover:text-slate-500'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col relative min-h-[300px]">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-[50] flex items-center justify-center">
              <RefreshCw className="text-sky-600 animate-spin" size={32} />
            </div>
          )}
          {activeTab === 'admin' && isAdmin ? (
            adminSubTab === 'daily' ? (
              <AdminDailyView
                data={staffData}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onViewDetail={setSelectedDetail}
                onRefresh={fetchAdminDailyAttendance}
                filterType={filterType}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                getImageUrl={getImageUrl}
              />
            ) : drilledEmployee ? (
              <div className="flex flex-col h-full animate-in slide-in-from-right duration-500">
                <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between shadow-sm">
                  <button
                    onClick={() => setDrilledEmployee(null)}
                    className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:gap-3 transition-all"
                  >
                    <ChevronLeft size={16} /> Back to Team
                  </button>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tighter leading-none">{drilledEmployee.full_name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{moment(selectedMonth).format("MMMM YYYY")}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-emerald-600 border-2 border-white shadow-sm overflow-hidden">
                      {drilledEmployee.profile_photo ? (
                        <img src={getImageUrl(drilledEmployee.profile_photo)} className="w-full h-full object-cover" />
                      ) : (
                        <User size={20} />
                      )}
                    </div>
                  </div>
                </div>
                <MyAttendanceView data={drilledHistory} onViewDetail={setSelectedDetail} getImageUrl={getImageUrl} />
              </div>
            ) : (
              <AdminMonthlyView
                data={staffData}
                selectedMonth={selectedMonth}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                onViewDetail={setSelectedDetail}
                onViewMemberHistory={(emp) => {
                  setDrilledEmployee(emp);
                }}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                getImageUrl={getImageUrl}
              />
            )
          ) : (
            <div className="flex flex-col bg-white min-h-[500px]">
              {/* History Table Section */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 tracking-tight">Recent Records</h4>
                <span className="text-[10px] font-bold text-slate-400">{moment(selectedMonth).format("MMMM YYYY")}</span>
              </div>
              <MyAttendanceView
                data={attendanceHistory}
                onViewDetail={setSelectedDetail}
                getImageUrl={getImageUrl}
              />
            </div>
          )}
        </div>
      </div>

      {/* Attendance Action Modal */}
      {isMarkingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-2xl overflow-hidden border border-slate-200 max-h-[95vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-xs tracking-tight flex items-center gap-2">
                <Clock size={16} className="text-sky-500" />
                Attendance Verification
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 sm:p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
              <div className="space-y-4">
                {/* Camera only for Punch In */}
                {attendanceType === 'in' ? (
                  isCameraOpen ? (
                    <div className="space-y-4">
                      <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-slate-100 shadow-inner">
                        <video ref={videoRef} autoPlay className="w-full h-full object-cover scale-x-[-1]" />
                      </div>
                      <button
                        onClick={capturePhoto}
                        className="w-full py-3 bg-sky-600 text-white rounded-xl shadow-md flex items-center justify-center gap-2 hover:bg-sky-700 transition-all"
                      >
                        <Camera size={18} />
                        <span className="text-xs font-bold tracking-tight">Take Photo</span>
                      </button>
                    </div>
                  ) : capturedImage ? (
                    <div className="relative aspect-video bg-slate-50 rounded-xl overflow-hidden border-2 border-emerald-100">
                      <img src={capturedImage} alt="Identity" className="w-full h-full object-cover" />
                      <button onClick={() => { setCapturedImage(null); setTimeout(() => startCamera(), 100); }} className="absolute bottom-4 right-4 p-2 bg-slate-900/80 text-white rounded-lg hover:bg-slate-900">
                        <RotateCcw size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className="aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300">
                      <Camera size={48} />
                      <p className="text-[10px] font-bold mt-2 uppercase tracking-widest">Waiting for lens</p>
                    </div>
                  )
                ) : (
                  <div className="aspect-video bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center text-emerald-600">
                    <LogOut size={48} className="mb-4 opacity-50" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Punching Out...</p>
                    <p className="text-[9px] text-blue-400 mt-1">No photo required for session end</p>
                  </div>
                )}

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                  <MapPin size={18} className="text-rose-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</p>
                    <p className="text-[11px] text-slate-600 font-bold whitespace-normal mt-0.5">{address}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <span className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase ${attendanceType === 'in' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} shadow-sm`}>
                      Punch {attendanceType.toUpperCase()}
                    </span>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Time</p>
                      <p className="text-sm font-black text-slate-700">{moment().format("hh:mm:ss A")}</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <CheckCircle2 size={12} /> Live Integrity
                  </p>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Identity Verification Ready
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Geo-Tagging Active
                    </li>
                    <li className="flex items-center gap-3 text-xs font-bold text-slate-500">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Server Sync Check
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => submitAttendance(false)}
                  disabled={loading || (attendanceType === 'in' && !capturedImage) || !location}
                  className="w-full bg-emerald-600 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-300 transition-all flex items-center justify-center gap-3 shadow-md active:scale-95"
                >
                  {loading ? <RefreshCw size={16} className="animate-spin" /> : `Record Attendance ${attendanceType.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} width="400" height="300"></canvas>
        </div>
      )}

      {/* Force Logout Reason Modal */}
      {showForceLogoutModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 p-6">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <AlertCircle size={24} />
              <h3 className="font-black text-sm uppercase tracking-wider">Early Logout Warning</h3>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-4 leading-relaxed">{forceLogoutMsg}</p>
            <p className="text-xs font-bold text-rose-500 mb-6 italic">This may impact your attendance and salary!</p>

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Reason for Early Logout</label>
              <textarea
                value={forceLogoutReason}
                onChange={(e) => setForceLogoutReason(e.target.value)}
                placeholder="State your reason to system..."
                rows={3}
                className="w-full p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-bold text-slate-700 focus:bg-white focus:ring-4 focus:ring-rose-500/10 outline-none transition-all"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowForceLogoutModal(false)}
                className="px-4 py-2.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all border border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={() => submitAttendance(true)}
                disabled={!forceLogoutReason.trim() || loading}
                className="px-4 py-2.5 bg-rose-600 text-white rounded-lg text-xs font-black uppercase tracking-widest shadow-md hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <RefreshCw size={14} className="animate-spin" />}
                Force Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Viewer Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-sm overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-emerald-600" />
                {selectedDetail.employeeName || selectedDetail.User?.full_name || 'My Attendance'} <span className="opacity-40 px-1">|</span> {selectedDetail.formattedDate || moment(selectedDetail.date).format("DD-MM-YYYY")}
              </h3>
              <button onClick={() => setSelectedDetail(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {selectedDetail.photo ? (
                <img src={getImageUrl(selectedDetail.photo)} alt="Punch" className="w-full aspect-video object-cover rounded-lg shadow-md border border-slate-100" />
              ) : (
                <div className="w-full aspect-video bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
                  <Camera size={40} />
                </div>
              )}

              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200/50">
                    <MapPin size={14} className="text-emerald-600" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Location</p>
                  </div>
                  <p className="text-[10px] text-slate-700 font-bold leading-relaxed">{selectedDetail.location}</p>
                </div>

                {selectedDetail.remarks && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <div className="flex items-center gap-2 mb-1 pb-1">
                      <FileText size={14} className="text-amber-600" />
                      <p className="text-[9px] font-black text-amber-600/60 uppercase tracking-widest leading-none">Remark</p>
                    </div>
                    <p className="text-[10px] text-amber-900 font-medium italic">"{selectedDetail.remarks}"</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-60">In Time</p>
                  <p className="text-[11px] font-black text-emerald-700">{moment(selectedDetail.in_time, "HH:mm:ss").format("hh:mm:ss A")}</p>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl text-center border border-emerald-100">
                  <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1 opacity-60">Out Time</p>
                  <p className="text-[11px] font-black text-blue-700">{selectedDetail.out_time ? moment(selectedDetail.out_time, "HH:mm:ss").format("hh:mm:ss A") : "---"}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl text-center shadow-lg">
                <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Total Worked Hours</p>
                <p className="text-sm font-black text-white">{selectedDetail.total_work_hours || "00:00:00"}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminDailyView = ({ data, searchTerm, setSearchTerm, onViewDetail, onRefresh, filterType, sortConfig, setSortConfig, getImageUrl }) => {
  const { showToast } = useToast();

  const handleMarkAbsent = async (empId) => {
    if (!confirm("Are you sure you want to mark this employee as absent?")) return;
    try {
      await API.get(`/erp/attendance/mark-absent?employee_id=${empId}`);
      showToast("Marked as Absent", "success");
      onRefresh();
    } catch (e) {
      showToast("Error marking absent", "error");
    }
  };

  const filteredData = useMemo(() => {
    let result = data.filter(s => s.status !== 'inactive'); // Only active employees

    // Filter by Type
    if (filterType === 'present') result = result.filter(s => s.attendance && s.attendance.status === 'present');
    else if (filterType === 'absent') result = result.filter(s => !s.attendance || s.attendance.status === 'absent');

    // Search
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.full_name?.toLowerCase().includes(lowSearch) ||
        s.mobile?.includes(lowSearch) ||
        s.phone?.includes(lowSearch) ||
        s.designation?.toLowerCase().includes(lowSearch)
      );
    }

    // Sort
    result.sort((a, b) => {
      const valA = a[sortConfig.key] || "";
      const valB = b[sortConfig.key] || "";
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, filterType, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const calculateDuration = (inTime, outTime) => {
    if (!inTime) return "---";
    if (!outTime) return "Active";
    const start = moment(inTime, "HH:mm:ss");
    const end = moment(outTime, "HH:mm:ss");
    const diffInMs = end.diff(start);
    const duration = moment.duration(diffInMs);
    const h = Math.floor(duration.asHours()).toString().padStart(2, '0');
    const m = duration.minutes().toString().padStart(2, '0');
    const s = duration.seconds().toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in transition-all">
      <div className="p-3 bg-white border-b border-slate-50 px-3 sm:px-6 py-2">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
          <input
            type="text"
            placeholder="Search by name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] focus:ring-4 focus:ring-blue-500/5 outline-none font-bold text-slate-600"
          />
        </div>
      </div>
      <div className="overflow-x-auto table-responsive">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="bg-sky-500 text-white text-[10px] font-bold tracking-tight">
              <th className="py-3 px-6 cursor-pointer hover:bg-sky-600" onClick={() => requestSort('full_name')}>Employee</th>
              <th className="py-3 px-6">Contact</th>
              <th className="py-3 px-6">In Time</th>
              <th className="py-3 px-6">Out Time</th>
              <th className="py-3 px-6">Duration</th>
              <th className="py-3 px-6 text-right">Status</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-[11px] text-slate-700">
            {filteredData.map((staff, idx) => (
              <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-200 even:bg-slate-100/50">
                <td className="py-2.5 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden text-slate-400 flex items-center justify-center font-bold shadow-sm">
                      {staff.profile_photo ? (
                        <img
                          src={getImageUrl(staff.profile_photo)}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = `<span class="text-[10px] font-black">${staff.full_name?.charAt(0)}</span>`;
                          }}
                        />
                      ) : staff.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 leading-tight text-[11px]">{staff.full_name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{staff.designation}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-6">
                  <p className="font-bold text-slate-700">{staff.mobile || staff.User?.mobile || staff.phone || staff.User?.phone || staff.userData?.mobile || staff.whatsapp_number || "No Contact"}</p>
                  <p className="text-[10px] text-slate-400 font-medium italic">{staff.email || staff.User?.email || staff.userData?.email || "No Email"}</p>
                </td>
                <td className="py-2.5 px-6">
                  {staff.attendance?.in_time ? (
                    <div className="font-black text-emerald-600 flex items-center gap-1.5">
                      <Clock size={11} /> {moment(staff.attendance.in_time, "HH:mm:ss").format("hh:mm:ss A")}
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">---</span>
                  )}
                </td>
                <td className="py-2.5 px-6">
                  {staff.attendance?.out_time ? (
                    <div className="font-black text-emerald-600 flex items-center gap-1.5">
                      <LogOut size={11} /> {moment(staff.attendance.out_time, "HH:mm:ss").format("hh:mm:ss A")}
                    </div>
                  ) : staff.attendance?.in_time ? (
                    <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1">
                      <RefreshCw size={9} className="animate-spin" /> On Duty
                    </span>
                  ) : "---"}
                </td>
                <td className="py-2.5 px-6 font-bold text-slate-500">
                  {calculateDuration(staff.attendance?.in_time, staff.attendance?.out_time)}
                </td>
                <td className="py-2.5 px-6 text-right">
                  {staff.attendance?.status === 'present' ? (
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 text-[8px] font-bold capitalize">Present</span>
                  ) : staff.attendance?.status === 'absent' ? (
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded border border-rose-100 text-[8px] font-bold capitalize">Absent</span>
                  ) : (
                    <span className="text-[10px] text-slate-300 font-black uppercase tracking-widest">---</span>
                  )}
                </td>
                <td className="py-2.5 px-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!staff.attendance && (
                      <button
                        onClick={() => handleMarkAbsent(staff.id)}
                        className="bg-white text-rose-500 p-1.5 rounded-lg border border-slate-100 hover:border-rose-200 transition-all shadow-sm"
                        title="Mark Absent"
                      >
                        <UserX size={14} />
                      </button>
                    )}
                    {staff.attendance && (
                      <button
                        onClick={() => onViewDetail({ ...staff.attendance, employeeName: staff.full_name, formattedDate: moment(staff.attendance.date).format("DD/MM/YYYY") })}
                        className="p-1.5 bg-white text-emerald-600 rounded-lg border border-slate-200 hover:border-emerald-400 transition-all shadow-sm"
                      >
                        <FileText size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AdminMonthlyView = ({ data, selectedMonth, searchTerm, setSearchTerm, onViewDetail, onViewMemberHistory, sortConfig, setSortConfig, getImageUrl }) => {
  const currentDays = useMemo(() => {
    const start = moment(selectedMonth).startOf('month');
    const end = moment(selectedMonth).endOf('month');
    let count = 0;
    let cur = start.clone();
    while (cur <= end) {
      if (cur.day() !== 0) count++; // Exclude Sundays
      cur.add(1, 'days');
    }
    return count;
  }, [selectedMonth]);

  const filteredData = useMemo(() => {
    let result = Array.isArray(data) ? data : [];

    // Search
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(s =>
        s.User?.full_name?.toLowerCase().includes(lowSearch) ||
        s.User?.phone?.includes(lowSearch) ||
        s.User?.email?.toLowerCase().includes(lowSearch)
      );
    }

    // Sort
    result.sort((a, b) => {
      const valA = a.User?.full_name || "";
      const valB = b.User?.full_name || "";
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, searchTerm, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in transition-all">
      <div className="p-3 bg-white border-b border-slate-50 px-3 sm:px-6 py-3">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            type="text"
            placeholder="Employee name or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] focus:ring-4 focus:ring-blue-500/5 outline-none font-bold text-slate-700"
          />
        </div>
      </div>
      <div className="overflow-x-auto table-responsive">
        <table className="w-full text-left min-w-[700px]">
          <thead>
            <tr className="bg-emerald-600 text-white text-[9px] uppercase font-black tracking-widest">
              <th className="py-3 px-6 w-16">SN</th>
              <th className="py-3 px-6 cursor-pointer hover:bg-emerald-700" onClick={() => requestSort('name')}>Employee</th>
              <th className="py-3 px-6">Contact Details</th>
              <th className="py-3 px-6 text-center">Working</th>
              <th className="py-3 px-6 text-center">Present</th>
              <th className="py-3 px-6 text-center">Absent</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-[11px] text-slate-700">
            {filteredData.length > 0 ? filteredData.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-emerald-50/50 transition-colors border-b border-slate-200 even:bg-slate-100/50">
                <td className="py-2.5 px-6 text-slate-400 font-bold">{idx + 1}</td>
                <td className="py-2.5 px-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black text-[10px] uppercase overflow-hidden shadow-sm">
                      {item.User?.profile_photo ? <img src={getImageUrl(item.User.profile_photo)} className="w-full h-full object-cover" /> : item.User?.full_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight text-[11px]">{item.User?.full_name}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{item.User?.designation}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-6">
                  <p className="font-bold text-slate-700 leading-none">{item.User?.mobile || item.User?.phone || item.mobile || item.phone || item.User?.whatsapp_number || "---"}</p>
                  <p className="text-[10px] text-slate-400 font-medium mt-1 italic leading-none">{item.User?.email || item.email || "---"}</p>
                </td>
                <td className="py-2.5 px-6 text-center font-bold text-slate-500">{item.total_working_days || currentDays}</td>
                <td className="py-2.5 px-6 text-center">
                  <span className="text-emerald-700 font-black">{item.total_present || 0}</span>
                </td>
                <td className="py-2.5 px-6 text-center">
                  <span className="text-rose-600 font-black">{(item.total_working_days || currentDays) - (item.total_present || 0)}</span>
                </td>
                <td className="py-2.5 px-6 text-right">
                  <button
                    onClick={() => onViewMemberHistory(item.User)}
                    className="px-4 py-1.5 bg-emerald-50 text-blue-700 border border-emerald-100 rounded-lg text-[9px] font-black uppercase hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                  >
                    Details
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="7" className="py-24 text-center font-black text-slate-300 uppercase tracking-widest text-[10px]">No Records Found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MyAttendanceView = ({ data, onViewDetail, getImageUrl }) => (
  <div className="flex-1 flex flex-col h-full bg-white">
    <div className="overflow-x-auto table-responsive">
      <table className="w-full text-left min-w-[600px]">
        <thead>
          <tr className="bg-emerald-600 text-white text-[9px] uppercase font-black tracking-widest">
            <th className="py-3 px-6">Date</th>
            <th className="py-3 px-6 text-center">Status</th>
            <th className="py-3 px-6">In</th>
            <th className="py-3 px-6">Out</th>
            <th className="py-3 px-6 text-center">Hours</th>
            <th className="py-3 px-6 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="text-[11px] text-slate-700">
          {data.length > 0 ? data.map((log, idx) => (
            <tr key={log.id} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-200 even:bg-slate-100/50">
              <td className="py-4 px-6">
                <div className="text-[11px] font-bold text-slate-900">{moment(log.date).format("DD/MM/YYYY")}</div>
              </td>
              <td className="py-2 px-6 text-center">
                <span className={`px-2 py-0.5 rounded border text-[8px] font-bold capitalize ${log.status === 'present' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                  {log.status}
                </span>
              </td>
              <td className="py-2 px-6 font-black text-emerald-600">
                <button onClick={() => onViewDetail({ ...log, employeeName: log.User?.full_name || 'My Attendance', formattedDate: moment(log.date).format("DD-MM-YYYY") })} className="flex items-center gap-1.5 hover:underline font-bold">
                  <Clock size={11} /> {moment(log.in_time, "HH:mm:ss").format("hh:mm A")}
                </button>
              </td>
              <td className="py-2 px-6 font-black text-emerald-600">
                {log.out_time ? (
                  <div className="flex items-center gap-1.5 font-bold">
                    <LogOut size={11} /> {moment(log.out_time, "HH:mm:ss").format("hh:mm A")}
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-slate-300 uppercase italic">Active</span>
                )}
              </td>
              <td className="py-2 px-6 text-center font-bold text-slate-500">{log.total_work_hours || "--"}</td>
              <td className="py-2 px-6 text-right">
                <button
                  onClick={() => onViewDetail({ ...log, employeeName: log.User?.full_name || 'My Attendance', formattedDate: moment(log.date).format("DD-MM-YYYY") })}
                  className="p-1.5 bg-white text-emerald-600 rounded-lg border border-slate-200 hover:border-emerald-400 transition-all shadow-sm"
                >
                  <FileText size={14} />
                </button>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan="6" className="py-24 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-slate-100">
                  <Calendar size={32} className="text-slate-200" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 tracking-widest">No Records Found</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default AttendanceManagement;
