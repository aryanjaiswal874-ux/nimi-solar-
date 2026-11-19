import { useState, useEffect } from "react";
import API from "../../../api/axios";
import { useToast } from "../../../context/ToastContext";
import {
  Wifi,
  WifiOff,
  QrCode,
  Users,
  Save,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  LogOut,
  Smartphone,
} from "lucide-react";

const WhatsAppConnection = () => {
  const toast = useToast();
  const [status, setStatus] = useState({
    isConnected: false,
    connectionState: "disconnected",
    qr: null,
    user: null,
  });
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const [testMessage, setTestMessage] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
    // Poll for status changes (QR code, connection state)
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await API.get("/wa/status");
      setStatus(res.data);
      // If QR changed, we don't need to do anything - status will update
    } catch (error) {
      console.error("Error fetching WhatsApp status:", error);
    }
  };

  const fetchQR = async () => {
    setQrLoading(true);
    try {
      const res = await API.get("/wa/qr");
      if (res.data.qr) {
        setStatus(prev => ({ ...prev, qr: res.data.qr, connectionState: "connecting" }));
        toast.success("QR code generated. Scan with WhatsApp.");
      } else if (res.data.message) {
        toast.info(res.data.message);
      }
    } catch (error) {
      toast.error("Failed to generate QR code");
    } finally {
      setQrLoading(false);
    }
  };

  const fetchGroupsList = async () => {
    if (!status.isConnected) {
      toast.warning("Connect WhatsApp first");
      return;
    }
    setGroupLoading(true);
    try {
      const res = await API.get("/wa/groups");
      if (res.data.success) {
        setGroups(res.data.groups);
        toast.success(`Found ${res.data.groups.length} groups`);
      } else {
        toast.error(res.data.message || "Failed to fetch groups");
      }
    } catch (error) {
      toast.error("Failed to fetch groups");
    } finally {
      setGroupLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await API.post("/wa/logout");
      if (res.data.success) {
        toast.success("WhatsApp disconnected. New QR will be generated.");
        setStatus({ isConnected: false, connectionState: "disconnected", qr: null, user: null });
        setGroups([]);
        setSelectedGroup("");
        // QR will be generated automatically by backend
        setTimeout(fetchQR, 2000);
      } else {
        toast.error(res.data.message || "Failed to disconnect");
      }
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!selectedGroup) {
      toast.warning("Select a group first");
      return;
    }
    setSavingGroup(true);
    try {
      const res = await API.put("/erp/office-settings", { whatsapp_group_jid: selectedGroup });
      if (res.data.settings) {
        toast.success("WhatsApp group saved successfully");
      } else {
        toast.error("Failed to save group");
      }
    } catch (error) {
      toast.error("Failed to save group");
    } finally {
      setSavingGroup(false);
    }
  };

  const handleTestMessage = async () => {
    if (!selectedGroup || !testMessage.trim()) {
      toast.warning("Select group and enter message");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/wa/test-message", { jid: selectedGroup, message: testMessage });
      if (res.data.success) {
        toast.success("Test message sent!");
        setTestMessage("");
      } else {
        toast.error(res.data.message || "Failed to send");
      }
    } catch (error) {
      toast.error("Failed to send test message");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status.connectionState) {
      case "connected": return "text-emerald-600 bg-emerald-50 border-emerald-100";
      case "connecting": return "text-blue-600 bg-blue-50 border-blue-100";
      case "logged_out": return "text-rose-600 bg-rose-50 border-rose-100";
      default: return "text-slate-600 bg-slate-50 border-slate-100";
    }
  };

  const getStatusText = () => {
    switch (status.connectionState) {
      case "connected": return "Connected";
      case "connecting": return "Connecting...";
      case "logged_out": return "Logged Out";
      default: return "Disconnected";
    }
  };

  const getStatusIcon = () => {
    switch (status.connectionState) {
      case "connected": return <Wifi className="w-4 h-4 text-emerald-600" />;
      case "connecting": return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />;
      case "logged_out": return <WifiOff className="w-4 h-4 text-rose-600" />;
      default: return <WifiOff className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-50 rounded-xl border border-green-100">
            <Smartphone size={24} className="text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">WhatsApp Connection</h3>
            <p className="text-sm text-slate-500">Connect your WhatsApp and select notification group</p>
          </div>
        </div>
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="font-bold text-sm uppercase tracking-wider">{getStatusText()}</span>
        </div>
      </div>

      {/* Connected User Info */}
      {status.user && (
        <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-900">{status.user.name || "Connected"}</p>
              <p className="text-sm text-green-700">{status.user.number || status.user.id}</p>
            </div>
          </div>
          {status.connectionState !== "logged_out" && (
            <button
              onClick={handleLogout}
              disabled={loading}
              className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors flex items-center gap-2"
            >
              <LogOut size={14} /> Disconnect
            </button>
          )}
        </div>
      )}

      {/* QR Code Section */}
      {!status.isConnected && status.connectionState !== "logged_out" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode size={20} className="text-blue-600" />
              <span className="font-bold text-blue-900">Scan QR Code</span>
            </div>
            <p className="text-sm text-blue-700 mb-4">Open WhatsApp → Settings → Linked Devices → Link a Device</p>
          </div>

          {status.qr && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 text-center space-y-4">
              <div className="inline-block bg-white p-4 rounded border border-slate-200 shadow">
                <img
                  src={status.qr}
                  alt="WhatsApp QR Code"
                  className="w-64 h-64"
                />
              </div>
              <p className="text-sm text-slate-500">Scan this code with your WhatsApp</p>
            </div>
          )}

          {!status.qr && (
            <div className="text-center py-6">
              <button
                onClick={fetchQR}
                disabled={qrLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 mx-auto"
              >
                {qrLoading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                {qrLoading ? "Generating..." : "Generate QR Code"}
              </button>
              <p className="text-xs text-slate-400 mt-2">Click to generate a new QR code</p>
            </div>
          )}
        </div>
      )}

      {/* Groups Section - Only show when connected */}
      {status.isConnected && (
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={20} className="text-purple-600" />
              <span className="font-bold text-slate-900">WhatsApp Groups</span>
            </div>
            <button
              onClick={fetchGroupsList}
              disabled={groupLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              {groupLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              {groupLoading ? "Loading..." : "Fetch Groups"}
            </button>
          </div>

          {groups.length > 0 && (
            <div className="space-y-3">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Select a group for notifications</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} ({group.participants} members) {group.isOwner && "👑"}
                  </option>
                ))}
              </select>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveGroup}
                  disabled={savingGroup || !selectedGroup}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingGroup ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {savingGroup ? "Saving..." : "Save as Notification Group"}
                </button>
                <button
                  onClick={fetchGroupsList}
                  disabled={groupLoading}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} /> Refresh
                </button>
              </div>
            </div>

            {/* Test Message Section */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50/50 rounded-lg p-4 space-y-3">
              <span className="font-bold text-slate-700">Test Notification</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleTestMessage}
                  disabled={loading || !selectedGroup || !testMessage.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {loading ? "Sending..." : "Send Test"}
                </button>
              </div>
              <p className="text-xs text-slate-400">Sends a test message to the selected group</p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-sm text-slate-600 space-y-2">
        <p className="font-bold text-slate-700">How to use:</p>
        <ol className="list-decimal list-inside space-y-1 ml-4">
          <li>Click <strong>"Generate QR Code"</strong> and scan with your WhatsApp (Settings → Linked Devices → Link a Device)</li>
          <li>Once connected, click <strong>"Fetch Groups"</strong> to load your WhatsApp groups</li>
          <li>Select a group and click <strong>"Save as Notification Group"</strong></li>
          <li>Use <strong>"Send Test"</strong> to verify notifications work</li>
          <li>Attendance, work reports, and alerts will now go to this group</li>
        </ol>
      </div>
    </div>
  );
};

export default WhatsAppConnection;