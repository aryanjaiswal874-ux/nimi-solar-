import { useState, useEffect, useMemo, useRef } from "react";
import * as faceapi from "face-api.js";
import {
  Users,
  FileText,
  CreditCard,
  Activity,
  TrendingUp,
  Briefcase,
  Package,
  Award,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Send,
  ListTodo,
  Edit,
  Camera,
  MapPin,
  LogOut,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileSpreadsheet,
  LayoutDashboard,
  BarChart3,
  Timer,
  Play,
  Square,
  AlertCircle,
  X,
  RotateCcw,
  Edit3,
  Shield,
} from "lucide-react";
import API from "../../api/axios";
import DashboardLoader from "../../components/layout/DashboardLoader";
import StatsCard from "../../components/shared/StatsCard";
import WhatsAppConnection from "../../components/admin/WhatsAppConnection";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import moment from "moment";

// ─── LIVE TIMER (COMPACT) ────────────────────────────────────
const LiveTimer = (props) => {
  const [elapsed, setElapsed] = useState("00:00:00");
  const startTime = props.startTime;

  useEffect(() => {
    if (!startTime) return;
    const update = () => {
      const now = moment();
      const start = moment(startTime, "HH:mm:ss");
      const diff = moment.duration(now.diff(start));
      // Ensure positive duration or zero
      const ms = Math.max(0, diff.asMilliseconds());
      const duration = moment.duration(ms);
      const h = String(Math.floor(duration.asHours())).padStart(2, "0");
      const m = String(duration.minutes()).padStart(2, "0");
      const s = String(duration.seconds()).padStart(2, "0");
      setElapsed(`${h}:${m}:${s}`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startTime]);

  return (
    <span className={props.className || "font-mono text-[11px] font-black text-emerald-600 tabular-nums"}>
      {elapsed}
    </span>
  );
};


// ─── MINI CALENDAR (COMPACT) ──────────────────────────────────
const MiniCalendar = ({ selectedDate, onSelectDate }) => {
  const [viewMonth, setViewMonth] = useState(moment(selectedDate));
  const startOfMonth = viewMonth.clone().startOf("month");
  const endOfMonth = viewMonth.clone().endOf("month");
  const startDayOfWeek = startOfMonth.day();
  const daysInMonth = endOfMonth.date();
  const today = moment().format("YYYY-MM-DD");

  const weekdays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  const prevMonth = () => setViewMonth(viewMonth.clone().subtract(1, "month"));
  const nextMonth = () => setViewMonth(viewMonth.clone().add(1, "month"));

  return (
    <div className="bg-sky-50 border border-sky-100 rounded-lg shadow-sm w-full h-full flex flex-col hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <span className="text-sm font-black text-blue-900 uppercase tracking-tighter">
          {viewMonth.format("MMMM YYYY")}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all border border-transparent hover:border-slate-200"
          >
            <ChevronLeft size={14} className="text-slate-400" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all border border-transparent hover:border-slate-200"
          >
            <ChevronRight size={14} className="text-slate-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-1.5 sm:px-3 pb-3 sm:pb-5 pt-3 gap-0.5 sm:gap-1 flex-1 content-start">
        {weekdays.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-black py-2 uppercase text-emerald-600 tracking-[0.1em]"
          >
            {d}
          </div>
        ))}
        {Array.from({ length: startDayOfWeek }).map((_, i) => (
          <div key={`e-${i}`} className="h-8" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const date = viewMonth.clone().date(day).format("YYYY-MM-DD");
          const isToday = date === today;
          const isSelected = date === selectedDate;
          const isSunday = viewMonth.clone().date(day).day() === 0;

          return (
            <button
              key={day}
              onClick={() => onSelectDate(date)}
              className={`h-8 w-full flex flex-col items-center justify-center text-[11px] font-black rounded-lg transition-all relative
                ${isSelected ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-1" : ""}
                ${isToday && !isSelected ? "bg-blue-600 text-white shadow-sm" : ""}
                ${isSunday && !isSelected && !isToday ? "text-red-500" : ""}
                ${!isSelected && !isToday && !isSunday ? "text-slate-700 hover:bg-white/50" : ""}
              `}
            >
              {day}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 w-1 h-1 bg-white rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── MY DASHBOARD TAB ────────────────────────────────────────
const MyDashboardTab = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(
    moment().format("YYYY-MM-DD"),
  );
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [officeSettings, setOfficeSettings] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [workReport, setWorkReport] = useState("1. ");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reports, setReports] = useState([]);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPunch, setLoadingPunch] = useState(false);

  // Camera states
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isMarkingModalOpen, setIsMarkingModalOpen] = useState(false);
  const [attendanceType, setAttendanceType] = useState("in");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [faceDetectionBuffer, setFaceDetectionBuffer] = useState(0); // For stability
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const detectionIntervalRef = useRef(null);
  const [location, setLocation] = useState(null);
  const [address, setAddress] = useState("Fetching location...");
  const [showForceLogoutModal, setShowForceLogoutModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakReason, setBreakReason] = useState("");
  const [forceLogoutReason, setForceLogoutReason] = useState("");
  const [forceLogoutMsg, setForceLogoutMsg] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTaskText, setEditTaskText] = useState("");
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const IMG_URL = import.meta.env.VITE_API_BASE_URL_IMG;
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models/tiny_face_detector";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setIsModelsLoaded(true);
      } catch (e) {
        console.error("Biometric models failed to load", e);
      }
    };
    loadModels();
    loadAll();
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
       fetchAttendanceHistory();
       fetchReports();
    }
  }, [selectedDate, user?.id]);

  useEffect(() => {
    if (isMarkingModalOpen) {
      fetchLocationAndAddress();
      if (attendanceType === "in") startVideo();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isMarkingModalOpen, attendanceType]);

  const loadAll = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchTodayStatus(),
        fetchOfficeSettings(),
        fetchTasks(),
        fetchReports(),
        fetchAttendanceHistory(),
      ]);
    } catch (err) {
       console.error("Dashboard mount fetch failed", err);
    } finally {
       setLoading(false);
    }
  };

  const fetchTodayStatus = async () => {
    try {
      const today = moment().format("YYYY-MM-DD");
      // Explicitly request current user's attendance status
      const res = await API.get(
        `/erp/attendance/history?startDate=${today}&endDate=${today}&employee_id=${user.id}`,
      );
      if (res.data?.length > 0) setTodayAttendance(res.data[0]);
      else setTodayAttendance(null);
    } catch (e) { }
  };

  const fetchOfficeSettings = async () => {
    try {
      const res = await API.get("/erp/office-settings");
      setOfficeSettings(res.data);
    } catch (e) { }
  };

  const fetchTasks = async () => {
    try {
      const res = await API.get("erp/todo");
      setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (e) { }
  };

  const fetchReports = async () => {
    try {
      const start = moment(selectedDate).startOf("month").format("YYYY-MM-DD");
      const end = moment(selectedDate).endOf("month").format("YYYY-MM-DD");
      // Security: Pass employee_id to ensure even admins see ONLY their own reports on My Dashboard
      const res = await API.get(
        `erp/work-report?startDate=${start}&endDate=${end}&employee_id=${user.id}`,
      );
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (e) { }
  };

  const fetchAttendanceHistory = async () => {
    try {
      const start = moment(selectedDate).startOf("month").format("YYYY-MM-DD");
      const end = moment(selectedDate).endOf("month").format("YYYY-MM-DD");
      // Explicitly request current user's history
      const res = await API.get(
        `/erp/attendance/history?startDate=${start}&endDate=${end}&employee_id=${user.id}`,
      );
      setAttendanceHistory(Array.isArray(res.data) ? res.data : []);
    } catch (e) { }
  };

  // ── CAMERA & LOCATION ──
  const fetchLocationAndAddress = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(loc);
          await fetchAddressFromGoogle(loc.lat, loc.lng);
        },
        () => setAddress("Location Access Denied"),
      );
    }
  };

  const startVideo = async () => {
    setIsCameraOpen(true);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          if (attendanceType === "in") startDetection();
        };
      }
    } catch (err) {
      showToast("Camera access denied", "error");
      setIsCameraOpen(false);
    }
  };

  const startCamera = async () => {
    fetchLocationAndAddress();
    startVideo();
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

  const startDetection = () => {
    if (detectionIntervalRef.current) clearInterval(detectionIntervalRef.current);
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && isModelsLoaded && attendanceType === "in") {
        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.1,
          }),
        );

        if (detections.length > 0) {
          setIsFaceDetected(true);
          setFaceDetectionBuffer(0);
        } else {
          setFaceDetectionBuffer((prev) => {
            const next = prev + 1;
            if (next > 3) setIsFaceDetected(false);
            return next;
          });
        }
      }
    }, 150); // Faster polling for instant enabling
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsFaceDetected(false);
    setFaceDetectionBuffer(0);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    canvas.width = 400;
    canvas.height = 300;
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(videoRef.current, 0, 0, 400, 300);
    context.restore();
    setCapturedImage(canvas.toDataURL("image/jpeg"));
    stopCamera();
  };

  const handleCloseModal = () => {
    setIsMarkingModalOpen(false);
    stopCamera();
    setCapturedImage(null);
  };

  const submitAttendance = async (forceOverride = false) => {
    if (address === "Fetching location...")
      return showToast("Please wait, fetching your location...", "warning");
    if (!location)
      return showToast(
        "Location could not be determined. Please enable GPS.",
        "warning",
      );

    let finalPhoto = capturedImage;
    if (attendanceType === "in") {
      if (!isFaceDetected) return showToast("Face not detected", "warning");

      // Auto capture frame
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = 400;
      canvas.height = 300;
      context.save();
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(videoRef.current, 0, 0, 400, 300);
      context.restore();
      finalPhoto = canvas.toDataURL("image/jpeg");
    }

    setLoadingPunch(true);
    try {
      const endpoint =
        attendanceType === "in" ? "erp/attendance/in" : "erp/attendance/out";
      const payload = {
        location: address || "Unknown",
        photo: finalPhoto,
        lat: location?.lat,
        lng: location?.lng,
      };
      if (forceOverride) {
        payload.force = true;
        payload.force_reason = forceLogoutReason;
      }
      const res = await API.post(endpoint, payload);

      // Personalized Toast Template
      const now = moment();
      const timeStr = now.format("hh:mm A");
      if (attendanceType === "in") {
        showToast(
          `✅ Attendance Marked Successfully\n\n👤 Employee: ${user.full_name}\n📅 Date: ${now.format("DD MMMM YYYY (dddd)")}\n🕒 Time: ${timeStr}\n📍 Location: ${address || "Verified"}`,
          "success"
        );
      } else {
        showToast(
          `✔️ ${user.full_name} logged out from work at ${timeStr}${forceOverride ? "\nReason: " + forceLogoutReason : ""}`,
          "info"
        );
      }

      handleCloseModal();
      setShowForceLogoutModal(false);
      setForceLogoutReason("");
      fetchTodayStatus();
      fetchAttendanceHistory();
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
      setLoadingPunch(false);
    }
  };

  const handleTakeBreak = async () => {
    if (!breakReason.trim()) {
      return showToast("Please enter a reason for the break", "warning");
    }
    setLoadingPunch(true);
    try {
      await API.post("erp/attendance/break", { reason: breakReason });
      const timeNow = moment().format("hh:mm A");
      showToast(`🔴 ${user?.full_name} took a break at ${timeNow}\nReason: ${breakReason}`, "info");
      setShowBreakModal(false);
      setBreakReason("");
      fetchTodayStatus();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error starting break",
        "error",
      );
    } finally {
      setLoadingPunch(false);
    }
  };

  const handleResumeWork = async () => {
    setLoadingPunch(true);
    try {
      await API.post("erp/attendance/resume");
      const timeNow = moment().format("hh:mm A");
      showToast(`🟢 ${user?.full_name} resumed work at ${timeNow}`, "success");
      fetchTodayStatus();
    } catch (error) {
      showToast(
        error.response?.data?.message || "Error resuming work",
        "error",
      );
    } finally {
      setLoadingPunch(false);
    }
  };

  // ── TASKS ──
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      const { data } = await API.post("erp/todo", { task: newTask });
      setTasks([data, ...tasks]);
      setNewTask("");
      showToast("Task added", "success");
    } catch (e) {
      showToast("Error adding task", "error");
    }
  };

  const toggleTask = async (id, currentStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await API.put(`erp/todo/${id}`, { status: newStatus });
      setTasks(
        tasks.map((t) => (t.id === id ? { ...t, status: newStatus } : t)),
      );
    } catch (e) { }
  };

  const deleteTask = async (id) => {
    setDeletingTaskId(id);
    try {
      await API.delete(`erp/todo/${id}`);
      setTasks(tasks.filter((t) => t.id !== id));
      showToast("Task removed", "success");
    } catch (e) {
      showToast("Could not remove task", "error");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const saveEditedTask = async (id) => {
    if (!editTaskText.trim()) return;
    setIsSavingTask(true);
    try {
      await API.put(`/erp/todo/${id}/edit`, { task: editTaskText });
      setTasks(
        tasks.map((t) => (t.id === id ? { ...t, task: editTaskText } : t)),
      );
      setEditingTaskId(null);
      showToast("Task updated", "success");
    } catch (e) {
      showToast("Could not update task", "error");
    } finally {
      setIsSavingTask(false);
    }
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTaskText(task.task);
  };

  // ── REPORT ──
  const handleReportKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const lines = workReport.split("\n");
      const lastLine = lines[lines.length - 1];
      const match = lastLine.match(/^(\d+)\.\s/);
      if (match) {
        const nextNum = parseInt(match[1]) + 1;
        setWorkReport((prev) => prev + "\n" + nextNum + ". ");
      } else {
        setWorkReport((prev) => prev + "\n1. ");
      }
    }
  };

  const handleSubmitReport = async () => {
    if (workReport.trim() === "1." || workReport.trim() === "")
      return showToast("Report content required", "warning");
    setIsSubmittingReport(true);
    try {
      await API.post("erp/work-report", {
        report_content: workReport,
        date: moment().format("YYYY-MM-DD"),
      });
      showToast("Daily report submitted", "success");
      setWorkReport("1. ");
      fetchReports();
    } catch (e) {
      showToast(e.response?.data?.message || "Error", "error");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Derived
  const isPunchedIn = todayAttendance?.current_work_status === "start";
  const isPunchedOut = todayAttendance?.current_work_status === "stop";
  const pendingTasks = tasks.filter((t) => t.status !== "completed").length;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const todayReport = reports.find(
    (r) =>
      moment(r.date).format("YYYY-MM-DD") === moment(selectedDate).format("YYYY-MM-DD"),
  );

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto pb-10 relative min-h-[400px]">
      <DashboardLoader loading={loading} title="Building Your Workspace..." />

      {/* ─── ROW 1: MAIN GRID (TOP SECTION) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-stretch">
        {/* LEFT SIDE: Calendar + Attendance */}
        <div className="lg:col-span-10 xl:col-span-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch h-full">
            {/* Top-Left: Mini Calendar (Compact) */}
            <div className="w-full md:w-[320px] shrink-0 h-[340px] md:h-full">
              <MiniCalendar
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>

            {/* Attendance Card (Main Focus) */}
            <div className="flex-1 bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col h-full min-h-[340px] hover:shadow-md transition-all duration-300">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                    Office Timing <span className="text-[8px] text-rose-400">(Sunday Off)</span>
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="p-1 px-2 bg-blue-50 rounded-md flex items-center gap-1.5 border border-blue-100/50 shadow-sm">
                      <Clock size={12} className="text-blue-500" />
                      <span className="text-[10px] sm:text-[11px] font-black text-slate-700 whitespace-nowrap">
                        {officeSettings?.office_in_time ? (
                          <span className="text-emerald-600">
                            {moment(
                              officeSettings.office_in_time,
                              "HH:mm:ss",
                            ).format("hh:mm A")}
                          </span>
                        ) : (
                          "--"
                        )}
                        <span className="mx-1 text-slate-300">→</span>
                        {officeSettings?.office_out_time ? (
                          <span className="text-rose-600">
                            {moment(
                              officeSettings.office_out_time,
                              "HH:mm:ss",
                            ).format("hh:mm A")}
                          </span>
                        ) : (
                          "--"
                        )}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-md transition-all ${todayAttendance?.status === "present"
                      ? "bg-emerald-500 text-white border-emerald-400"
                      : todayAttendance?.status === "absent"
                        ? "bg-rose-500 text-white border-rose-400"
                        : "bg-amber-500 text-white border-amber-400"
                    }`}
                >
                  {todayAttendance?.status || "Pending"}
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-center">
                {/* In/Out Side-by-Side Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                  <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-md flex flex-row sm:flex-col items-center sm:justify-center justify-between">
                    <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest sm:mb-1 leading-none">
                      In Time
                    </span>
                    <span className="text-sm font-black text-emerald-700">
                      {todayAttendance?.in_time
                        ? moment(todayAttendance.in_time, "HH:mm:ss").format(
                          "hh:mm A",
                        )
                        : "--:--"}
                    </span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-md flex flex-row sm:flex-col items-center sm:justify-center justify-between">
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest sm:mb-1 leading-none">
                      Out Time
                    </span>
                    <span className="text-sm font-black text-amber-700">
                      {todayAttendance?.out_time
                        ? moment(todayAttendance.out_time, "HH:mm:ss").format(
                          "hh:mm A",
                        )
                        : "--:--"}
                    </span>
                  </div>
                </div>

                {/* Total Work Hours (Center) */}
                <div className="text-center mb-6">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                    Work Hours
                  </p>
                  
                  {isPunchedIn ? (
                    <div className="flex flex-col items-center">
                       <div className="flex items-center justify-center gap-1.5 text-emerald-600 mb-1">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm" />
                          <LiveTimer 
                            startTime={todayAttendance?.in_time} 
                            className="text-4xl font-black tracking-tighter tabular-nums leading-none"
                          />
                       </div>
                       <p className="text-[11px] font-black text-blue-600 tabular-nums uppercase tracking-tight">
                          Total Worked: {todayAttendance?.total_work_hours || "00:00:00"}
                       </p>
                    </div>
                  ) : (
                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                       {todayAttendance?.total_work_hours || "00:00:00"}
                    </h2>
                  )}
                </div>


                {/* Action Buttons: Clean, small, less rounded */}
                <div className="grid grid-cols-2 gap-2">
                  {isPunchedIn ? (
                    <>
                      <button
                        onClick={() => {
                          setAttendanceType("out");
                          setIsMarkingModalOpen(true);
                        }}
                        className="bg-gradient-to-br from-rose-500 to-rose-700 text-white h-9 rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-rose-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <LogOut size={12} /> Punch Out
                      </button>
                      <button
                        onClick={() => {
                          setBreakReason("");
                          setShowBreakModal(true);
                        }}
                        className="border-2 border-amber-200 text-amber-600 h-9 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Clock size={12} /> Break
                      </button>
                    </>
                  ) : todayAttendance?.current_work_status === "break" ? (
                    <button
                      onClick={handleResumeWork}
                      className="col-span-2 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white h-9 rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw size={12} /> Resume Work
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setAttendanceType("in");
                        setIsMarkingModalOpen(true);
                      }}
                      disabled={isPunchedOut && todayAttendance?.in_time}
                      className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-950 text-white h-9 rounded-md text-[10px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-slate-200 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {isPunchedOut ? (
                        <>
                          <CheckCircle2 size={12} className="text-emerald-400" />
                          You are signed out
                        </>
                      ) : (
                        <>
                          <Play size={12} /> Punch In
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (approx 40%): Today's Work Report */}
        <div className="lg:col-span-4 bg-[#fff1f2]/60 border border-[#fecdd3]/60 rounded-md shadow-sm flex flex-col overflow-hidden h-full min-h-[340px]">
          <div className="px-4 py-2 border-b border-[#fecdd3]/40 flex items-center justify-between bg-white/40">
            <h3 className="text-[10px] font-black text-[#9f1239] uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText size={12} className="text-[#fb7185]" />
              {moment(selectedDate).isSame(moment(), 'day') ? "Today's Work Report" : `Work Report: ${moment(selectedDate).format('DD MMM')}`}
            </h3>
            {todayReport && (
              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                <CheckCircle2 size={10} /> SUBMITTED
              </span>
            )}
          </div>
          <div className="p-4 flex-1 flex flex-col relative">
            {todayReport ? (
              <div className="flex-1 bg-white/40 rounded border border-[#fecdd3]/20 p-4 text-[11px] font-medium text-[#881337] whitespace-pre-wrap leading-[2] overflow-y-auto custom-scrollbar">
                {todayReport.report_content}
              </div>
            ) : (
              <div className="flex-1 flex flex-col">
                <textarea
                  value={workReport}
                  onKeyDown={handleReportKeyDown}
                  onChange={(e) => setWorkReport(e.target.value)}
                  placeholder="1. _________"
                  className="flex-1 bg-transparent border-none text-[11px] font-bold text-slate-700 leading-[2.18] focus:ring-0 resize-none p-0 placeholder:text-[#fecdd3]"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(transparent, transparent 23px, #fecdd3 23px, #fecdd3 24px)",
                    backgroundSize: "100% 24px",
                    backgroundAttachment: "local",
                  }}
                />
                <button
                  onClick={handleSubmitReport}
                  disabled={isSubmittingReport}
                  className="mt-4 w-full bg-[#e11d48] text-white h-8 rounded text-[9px] font-black uppercase tracking-widest hover:bg-[#be123c] transition-all disabled:opacity-50 shadow-sm flex items-center justify-center gap-2"
                >
                  {isSubmittingReport ? (
                    <RefreshCw size={11} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={11} /> Submit Report
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── ROW 2: TODO (STICKY) & ATTENDANCE TABLE ─── */}

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 mt-4">
        {/* LEFT SIDE (approx 40%): To-Do List (Sticky Note Style) */}
        <div className="lg:col-span-4 bg-[#fefce8] border border-[#fde68a] rounded-md shadow-sm relative overflow-hidden flex flex-col min-h-[340px]">
          {/* Pin Icon Component */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex flex-col items-center group pointer-events-none z-10">
            <div className="w-1.5 h-1.5 bg-slate-800 rounded-full shadow-sm mb-[1px]" />
            <div className="w-4 h-4 bg-rose-500 rounded-full shadow-[inset_-1px_-1px_1px_rgba(0,0,0,0.2)]" />
          </div>

          <div className="px-5 pt-8 pb-3 flex items-center justify-between">
            <h3 className="text-[10px] font-black text-amber-900 uppercase tracking-[0.2em] flex items-center gap-2">
              <ListTodo size={12} className="text-amber-600" /> To-Do List
            </h3>
          </div>

          <div className="px-5 pb-5 flex-1 flex flex-col">
            <form
              onSubmit={handleAddTask}
              className="flex gap-2 mb-4 border-b border-amber-300/50 pb-2"
            >
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add to list..."
                className="flex-1 bg-transparent border-none text-[11px] font-bold text-amber-900 placeholder:text-amber-300 outline-none p-0 focus:ring-0"
              />
              <button
                type="submit"
                className="text-amber-500 hover:text-amber-700 transition-colors"
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </form>

            <div className="space-y-0 flex-1 overflow-y-auto custom-scrollbar">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="group flex items-center gap-3 py-2 border-b border-blue-100 border-dashed last:border-0 hover:bg-white/20 transition-colors px-1 -mx-1"
                  >
                    <button
                      onClick={() => toggleTask(task.id, task.status)}
                      className="shrink-0 transition-transform active:scale-90"
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 size={15} className="text-emerald-500" />
                      ) : (
                        <Circle
                          size={15}
                          className="text-amber-300 hover:text-amber-500"
                        />
                      )}
                    </button>
                    {editingTaskId === task.id ? (
                      <div className="flex-1 flex gap-1 items-center bg-white/50 p-1 rounded border border-amber-200 shadow-inner">
                        <input
                          value={editTaskText}
                          onChange={(e) => setEditTaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditedTask(task.id);
                            if (e.key === "Escape") setEditingTaskId(null);
                          }}
                          className="flex-1 bg-transparent border-none text-[11px] font-bold text-amber-900 outline-none p-0 focus:ring-0"
                          autoFocus
                        />
                        <button
                          onClick={() => saveEditedTask(task.id)}
                          disabled={isSavingTask}
                          className="text-emerald-500 hover:text-emerald-700 transition-colors p-0.5"
                        >
                          {isSavingTask ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                        </button>
                        <button
                          onClick={() => setEditingTaskId(null)}
                          className="text-rose-400 hover:text-rose-600 transition-colors p-0.5"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`flex-1 text-[11px] font-bold tracking-tight ${task.status === "completed" ? "text-amber-300 line-through" : "text-amber-900/80"}`}
                        >
                          {task.task}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditing(task)}
                            className="text-amber-400 hover:text-blue-500 p-1"
                          >
                            <Edit3 size={11} />
                          </button>
                          <button
                            onClick={() => deleteTask(task.id)}
                            disabled={deletingTaskId === task.id}
                            className="text-amber-400 hover:text-rose-500 p-1"
                          >
                            {deletingTaskId === task.id ? (
                              <RefreshCw size={11} className="animate-spin text-rose-500" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
                  <ListTodo size={32} className="text-amber-900 mb-2" />
                  <span className="text-[9px] font-black uppercase tracking-widest">
                    No pending tasks
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE (approx 60%): Attendance History (Month Summary) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-md shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/20 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={12} className="text-blue-400" /> Attendance Record
            </h3>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2.5 py-0.5 rounded-full">
              {moment(selectedDate).format("MMMM YYYY")}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto custom-scrollbar">
            <div className="min-w-[600px] lg:min-w-full">
              <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-900">
                  <th className="px-4 py-3 text-[9px] font-black text-yellow-400 uppercase tracking-widest">
                    Date
                  </th>
                  <th className="px-4 py-3 text-[9px] font-black text-yellow-400 uppercase tracking-widest text-center">
                    In Time
                  </th>
                  <th className="px-4 py-3 text-[9px] font-black text-yellow-400 uppercase tracking-widest text-center">
                    Out Time
                  </th>
                  <th className="px-4 py-3 text-[9px] font-black text-yellow-400 uppercase tracking-widest text-center">
                    Worked
                  </th>
                  <th className="px-4 py-3 text-[9px] font-black text-yellow-400 uppercase tracking-widest text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[10px]">
                {attendanceHistory.length > 0 ? (
                  attendanceHistory.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-4 py-2.5 font-bold text-slate-700 whitespace-nowrap">
                        {moment(item.date).format("DD MMM")}{" "}
                        <span className="text-slate-300 ml-1.5 font-medium">
                          {moment(item.date).format("ddd")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500 font-bold tabular-nums">
                        {item.in_time
                          ? moment(item.in_time, "HH:mm:ss").format("hh:mm A")
                          : "--"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500 font-bold tabular-nums">
                        {item.out_time
                          ? moment(item.out_time, "HH:mm:ss").format("hh:mm A")
                          : "--"}
                      </td>
                      <td className="px-4 py-2.5 text-center font-black text-slate-900 tracking-tight tabular-nums">
                        {item.total_work_hours || "--"}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <div className="flex items-center justify-center">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${item.status === "present" ? "bg-emerald-500" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.3)]"}`}
                            title={item.status.toUpperCase()}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-20 text-center">
                      <Calendar
                        size={24}
                        className="mx-auto text-slate-100 mb-2"
                      />
                      <p className="text-[9px] font-black text-slate-200 uppercase tracking-widest">
                        No archival records found
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>

      {/* ─── WHATSAPP CONNECTION SECTION ─── */}
      <div className="mt-6 max-w-[1600px] mx-auto">
        <WhatsAppConnection />
      </div>

      {/* ─── MODALS ─── */}

      {/* 1. Attendance Capture Modal */}
      {isMarkingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Shield size={12} className="text-blue-600" />
                Punch {attendanceType === "in" ? "In" : "Out"} Verification
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-900 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {attendanceType === "in" ? (
                  <div className="space-y-4 relative">
                    <div
                      className={`relative aspect-[4/3] bg-slate-900 rounded overflow-hidden border-2 transition-all duration-500 ${isFaceDetected ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]" : "border-slate-800"}`}
                    >
                      <video
                        ref={videoRef}
                        autoPlay
                        className="w-full h-full object-cover scale-x-[-1]"
                      />
                      {/* Scanning Animation (Beam) */}
                      <div className="absolute inset-x-0 h-1 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-[scan_2s_linear_infinite] opacity-80 pointer-events-none z-20" />

                      {!isFaceDetected && (
                        <div className="absolute inset-x-0 bottom-4 flex justify-center z-30">
                          <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 animate-[blink_1.5s_infinite]">
                            <p className="text-[8px] font-black text-amber-400 uppercase tracking-[0.2em]">
                              Position face in frame
                            </p>
                          </div>
                        </div>
                      )}

                      {isFaceDetected && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-emerald-500 text-white px-3 py-1 rounded-full text-[8.5px] font-black tracking-widest shadow-lg z-30">
                          <CheckCircle2 size={12} /> VERIFICATION COMPLETE
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-slate-50 rounded-sm border border-slate-100 flex flex-col items-center justify-center text-slate-400">
                    <LogOut size={48} className="opacity-10 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Standard Punch Out
                    </p>
                    <p className="text-[9px] text-slate-300 mt-1 uppercase font-bold tracking-tighter">
                      No biometric data required
                    </p>
                  </div>
                )}

                <div className="p-3 bg-slate-50 border border-slate-100 rounded flex items-start gap-2.5">
                  <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      Verified Geolocation
                    </p>
                    <p className="text-[10px] text-slate-600 font-bold mt-0.5 leading-tight">
                      {address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col h-full bg-slate-50/50 p-4 border-l border-slate-100">
                <div className="flex-1 space-y-6">
                  {/* Status Group */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Service Type
                        </p>
                        <h4 className="text-sm font-black text-slate-900">
                          Punch {attendanceType === "in" ? "IN" : "OUT"}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Date
                        </p>
                        <h4 className="text-[11px] font-black text-slate-900">
                          {moment().format("DD-MM-YYYY")} (
                          {moment().format("ddd").toUpperCase()})
                        </h4>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Current Time
                        </p>
                        <h4 className="text-sm font-black text-slate-900 tabular-nums">
                          {moment().format("hh:mm:ss A")}
                        </h4>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Remark
                        </p>
                        {(() => {
                          const now = moment();
                          if (attendanceType === "in") {
                            if (!officeSettings?.office_in_time) return <h4 className="text-[10px] font-black text-slate-400">N/A</h4>;
                            const officeIn = moment(officeSettings.office_in_time, "HH:mm:ss");
                            const diff = now.diff(officeIn, "minutes");
                            if (diff > 0) {
                              const hh = Math.floor(diff / 60);
                              const mm = diff % 60;
                              return <h4 className="text-[10px] font-black text-rose-600">LATE: {hh}h {mm}m</h4>;
                            }
                            return <h4 className="text-[10px] font-black text-emerald-600">ON TIME</h4>;
                          } else {
                            if (!officeSettings?.office_out_time) return <h4 className="text-[10px] font-black text-slate-400">N/A</h4>;
                            const officeOut = moment(officeSettings.office_out_time, "HH:mm:ss");
                            const diff = officeOut.diff(now, "minutes");
                            if (diff > 0) {
                              const hh = Math.floor(diff / 60);
                              const mm = diff % 60;
                              return <h4 className="text-[10px] font-black text-rose-500 underline decoration-rose-200">EARLY BY: {hh}h {mm}m</h4>;
                            }
                            return <h4 className="text-[10px] font-black text-emerald-600">ON TIME</h4>;
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
                    <p className="text-[11px] font-bold text-slate-600 leading-relaxed text-center">
                      Attendance will be marked for{" "}
                      <span className="text-blue-600 font-black">
                        {moment().format("DD MMMM YYYY")}
                      </span>{" "}
                      at the current verified location.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => submitAttendance(false)}
                  disabled={
                    loadingPunch ||
                    (attendanceType === "in" && !isFaceDetected) ||
                    address === "Fetching location..." ||
                    address === "Location Access Denied"
                  }
                  className={`w-full h-12 rounded text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 ${attendanceType === "in"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-slate-100 disabled:text-slate-300"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                    }`}
                >
                  {loadingPunch ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span className="animate-pulse">Attendance being marked...</span>
                    </>
                  ) : (
                    `Execute Punch ${attendanceType.toUpperCase()}..`
                  )}
                </button>
              </div>
            </div>
          </div>
          <canvas
            ref={canvasRef}
            style={{ display: "none" }}
            width="400"
            height="300"
          />
        </div>
      )}

      {/* 2. Force Logout Cautionary Modal */}
      {showForceLogoutModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded shadow-2xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-4 pb-3 border-b border-rose-50">
              <Shield size={16} className="text-rose-500" />
              <h3 className="font-black text-[11px] uppercase tracking-[0.2em]">
                Punch {attendanceType === "in" ? "In" : "Out"} Warning
              </h3>
            </div>

            <p className="text-[11px] font-bold text-slate-600 mb-4 leading-relaxed">
              {forceLogoutMsg}
            </p>

            <div className="mb-5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Mandatory Justification
              </label>
              <textarea
                value={forceLogoutReason}
                onChange={(e) => setForceLogoutReason(e.target.value)}
                placeholder="Specify reason for non-standard logout..."
                rows={4}
                className="w-full p-3 rounded bg-slate-50 border border-slate-200 text-[11px] font-bold outline-none focus:border-rose-400 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowForceLogoutModal(false)}
                className="px-5 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 rounded hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitAttendance(true)}
                disabled={!forceLogoutReason.trim() || loadingPunch}
                className="px-5 py-2 bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2 shadow-md transition-all active:scale-95"
              >
                {loadingPunch ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  <Shield size={12} />
                )}
                Authorize {attendanceType === "in" ? "Punch In" : "Logout"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Break Reason Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden border border-slate-200">
            <div className="bg-slate-950 p-4 border-b border-white/5">
              <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={12} /> Taking a Break
              </h3>
            </div>

            <div className="p-6">
              <p className="text-[11px] font-bold text-slate-500 mb-4 leading-relaxed">
                Please specify the reason for taking a break from your active session.
              </p>

              <div className="space-y-4">
                <textarea
                  value={breakReason}
                  onChange={(e) => setBreakReason(e.target.value)}
                  placeholder="e.g. Lunch Break, Client Meeting, Personal Work..."
                  rows={3}
                  className="w-full p-4 rounded-lg bg-slate-50 border border-slate-200 text-[11px] font-bold outline-none focus:border-amber-400 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
                  autoFocus
                />

                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => setShowBreakModal(false)}
                    className="px-6 h-10 text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTakeBreak}
                    disabled={!breakReason.trim() || loadingPunch}
                    className="px-8 h-10 bg-amber-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 disabled:opacity-50 shadow-lg shadow-amber-200/50 flex items-center gap-2 transition-all active:scale-95"
                  >
                    {loadingPunch ? <RefreshCw size={12} className="animate-spin" /> : "Confirm Break"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── BUSINESS OVERVIEW TAB ───────────────────────────────────
const BusinessOverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = "/models/tiny_face_detector";
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      } catch (e) {
        console.error("Models failed", e);
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await API.get("/admin/stats");
      setStats(data);
    } catch (error) {
      setError(
        error.response?.data?.message || error.message || "Failed to load data",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 relative min-h-[400px]">
      <DashboardLoader loading={loading} title="Loading Analytics..." />

      <div className="flex justify-between items-center bg-white p-5 border border-slate-200 rounded-lg shadow-sm">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            Platform Analytics
          </h2>
          <p className="text-[10px] font-medium text-slate-400 mt-0.5">
            Real-time performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
              Error: {error}
            </span>
          )}
          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 uppercase tracking-wider">
            <Activity size={12} /> Online
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 p-6 rounded-lg text-center">
          <p className="text-rose-800 font-bold text-sm mb-3">{error}</p>
          <button
            onClick={fetchStats}
            className="bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-rose-700 transition-all"
          >
            Try Again
          </button>
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="ACTIVE USERS"
              value={stats.users || 0}
              icon={Users}
              index={3}
            />
            <StatsCard
              title="TOTAL ORDERS"
              value={stats.orders || 0}
              icon={FileText}
              index={5}
            />
            <StatsCard
              title="TOTAL LEADS"
              value={stats.leads || 0}
              icon={Briefcase}
              index={7}
            />
            <StatsCard
              title="SERVICES"
              value={stats.products || 0}
              icon={Package}
              index={1}
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Recent Orders
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider bg-slate-50/50">
                    <th className="py-3 px-5 text-center w-14">#</th>
                    <th className="py-3 px-5">Order ID</th>
                    <th className="py-3 px-5">Join Date</th>
                    <th className="py-3 px-5">Gross</th>
                    <th className="py-3 px-5">Monthly Sal.</th>
                    <th className="py-3 px-5">UPI ID</th>
                    <th className="py-3 px-5 text-right">Amount</th>
                    <th className="py-3 px-5">Status</th>
                  </tr>
                </thead>
                <tbody className="text-xs text-slate-700 divide-y divide-slate-50">
                  {stats.recentOrders?.length > 0 ? (
                    stats.recentOrders.map((order, index) => (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        <td className="py-3 px-5 text-center text-slate-400 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-3 px-5 font-bold text-slate-900">
                          #{order.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="py-3 px-5">
                          <div className="text-[11px] font-bold text-slate-900">
                            {new Date(order.createdAt).toLocaleDateString(
                              "en-GB",
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 font-medium">
                            {new Date(order.createdAt).toLocaleTimeString(
                              "en-IN",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-5 font-bold text-slate-900">
                          ₹{(order.User?.gross_salary || 0).toLocaleString()}
                        </td>
                        <td className="py-3 px-5 font-bold text-emerald-600">
                          ₹{Math.round((order.User?.gross_salary || 0) / 12).toLocaleString()}
                        </td>
                        <td className="py-3 px-5">
                          <div className="font-bold text-slate-800">
                            {order.User?.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {order.User?.email}
                          </div>
                        </td>
                        <td className="py-3 px-5 text-right font-bold text-slate-900">
                          ₹{order.amount}
                        </td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${order.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : order.status === "In Progress"
                                  ? "bg-blue-50 text-blue-700 border-blue-100"
                                  : "bg-amber-50 text-amber-700 border-amber-100"
                              }`}
                          >
                            {order.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        className="py-10 text-center text-slate-400 font-bold uppercase text-[10px] tracking-wider"
                      >
                        No Records Found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─── MAIN DASHBOARD ──────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("my");

  const isAdmin = ["admin", "super_admin"].includes(user?.role);

  return (
    <div className="space-y-4 md:space-y-5 font-sans p-2 md:p-0">
      {/* Tab Switcher */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-sm w-full md:w-fit overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("my")}
          className={`flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold transition-all ${activeTab === "my"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
        >
          <LayoutDashboard size={14} /> My Dashboard
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-5 py-2 rounded-md text-xs font-bold transition-all ${activeTab === "overview"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              }`}
          >
            <BarChart3 size={14} /> Business Overview
          </button>
        )}
      </div>

      {/* Tab Content */}
      {activeTab === "my" ? <MyDashboardTab /> : <BusinessOverviewTab />}
    </div>
  );
};

/* --- Global Styles --- */
const style = document.createElement("style");
style.textContent = `
  @keyframes scan {
    0% { top: 0%; opacity: 0; }
    30% { opacity: 1; }
    70% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
`;
document.head.appendChild(style);

export default AdminDashboard;
