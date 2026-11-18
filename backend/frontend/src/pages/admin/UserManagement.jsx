import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axios";
import {
  Trash2,
  Search,
  FileText,
  UserX,
  UserCheck,
  Eye,
  ArrowLeft,
  Building2,
  ShoppingBag,
  Shield,
  Mail,
  Phone,
  Download,
  Edit3,
  UserPlus,
} from "lucide-react";
import EditUserModal from "../../components/admin/users/EditUserModal";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import DashboardLoader from "../../components/layout/DashboardLoader";
import DataTable from "../../components/shared/DataTable";

const UserManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === "super_admin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;
  const isEmployee = user?.role === "employee";
  const [actionLoading, setActionLoading] = useState(null);
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active"); // Default to active
  const [designationFilter, setDesignationFilter] = useState("all");
  const [viewMode, setViewMode] = useState("staff"); // New: staff (default), all, users
  const [editUser, setEditUser] = useState(null);

  // Detail View State
  const [selectedUser, setSelectedUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [userOrders, setUserOrders] = useState([]);
  const [smartfloCallers, setSmartfloCallers] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    fetchUsers();
    fetchCallers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await API.get("/admin/users");
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const fetchCallers = async () => {
    try {
      const { data } = await API.get("/smartflo/callers");
      setSmartfloCallers(data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await API.get("/admin/export/users", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `users_export_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export users. Please try again.");
    }
  };

  const handleViewUser = async (user) => {
    setSelectedUser(user);
    setDetailLoading(true);
    setActiveTab("profile");

    try {
      let ordersData = [];
      try {
        const ordersRes = await API.get("/orders");
        ordersData = ordersRes.data.filter((o) => o.userId === user.id);
      } catch (e) {
        console.warn("Could not fetch orders", e);
      }
      setUserOrders(ordersData);
      setUserDetails(user);
    } catch (error) {
      console.error(error);
    } finally {
      setDetailLoading(false);
    }
  };



  const handleToggleUserStatus = async (user) => {
    const currentStatus = user.is_active !== false;
    const nextStatus = !currentStatus;

    try {
      await API.put(`/admin/users/${user.id}`, { is_active: nextStatus });
      toast.success(`User ${nextStatus ? "enabled" : "disabled"} successfully`);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user status");
    }
  };

  const handleEditUser = (user) => {
    setEditUser(user);
  };

  const handleCreateUser = async (formData) => {
    try {
      const response = await API.post("/admin/users", formData);
      toast.success("Worker created successfully");
      fetchUsers();
      setEditUser(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create worker");
    }
  };

  const handleSaveUser = async (userId, formData) => {
    try {
      const response = await API.put(`/admin/users/${userId}`, formData);
      toast.success("User updated successfully");
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(response.data.user);
      }
      setEditUser(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update user");
    }
  };

  const handleRoleChange = async (user, newRole) => {
    try {
      const formData = new FormData();
      formData.append("role", newRole);
      await API.put(`/admin/users/${user.id}`, formData);

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: newRole } : u))
      );
      toast.success("Role updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update role");
      fetchUsers();
    }
  };

  const handleDesignationChange = async (user, newDesignation) => {
    try {
      const formData = new FormData();
      formData.append("designation", newDesignation);
      await API.put(`/admin/users/${user.id}`, formData);

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, designation: newDesignation } : u))
      );
      toast.success("Designation updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update designation");
      fetchUsers();
    }
  };

  const handleAgentIdChange = async (user, newAgentId) => {
    try {
      await API.put(`/admin/users/${user.id}`, { smartflo_agent_id: newAgentId });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, smartflo_agent_id: newAgentId } : u))
      );
      toast.success("Agent ID updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update Agent ID");
    }
  };

  const handleCallerIdChange = async (user, newCallerId) => {
    try {
      // Use JSON for simple field updates for better reliability when no file is involved
      await API.put(`/admin/users/${user.id}`, { smartflo_caller_id: newCallerId });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, smartflo_caller_id: newCallerId } : u))
      );
      toast.success("Caller ID updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update Caller ID");
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete ${user.full_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(user.id);
      await API.delete(`/admin/users/${user.id}`);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to delete user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCallAccessToggle = async (user) => {
    const newStatus = !user.call_access;
    try {
      const formData = new FormData();
      formData.append("call_access", newStatus);
      // Assuming your backend handles boolean conversion correctly for FormData or use JSON
      // Since other updates use FormData, we might need to be careful. 
      // Let's stick to JSON for boolean specific toggle if possible, 
      // but typically the general update endpoint expects FormData if it handles file uploads.
      // If it accepts JSON too, that's better. For now assuming consistent use of API.put which might rely on backend parsing.
      // Actually, let's use a dedicated object if the backend supports it, but checking handleSaveUser uses FormData.

      // Let's send it as JSON to ensure boolean type is clear if backend supports it, 
      // OR as string 'true'/'false' if using FormData.
      // Based on `handleToggleUserStatus`, it uses JSON: await API.put(..., { is_active: nextStatus });
      // So we should try JSON first for simple updates.

      await API.put(`/admin/users/${user.id}`, { call_access: newStatus });

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, call_access: newStatus } : u))
      );
      toast.success(`Call access ${newStatus ? "granted" : "revoked"}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update call access");
    }
  };



  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Check Status (Active/Inactive)
      const matchesStatus = statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? u.is_active !== false
          : u.is_active === false;

      if (!matchesStatus) return false;

      // 2. Check View Mode
      // staff: admin, super_admin, employee
      // users: role === 'user'
      // all: no role check (except roleFilter)
      if (viewMode === "staff") {
        if (!["admin", "super_admin", "employee"].includes(u.role)) return false;
      } else if (viewMode === "users") {
        if (u.role !== "user") return false;
      }

      // 3. Check specific Role Filter (if not 'all')
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      if (!matchesRole) return false;

      // 4. Check Designation
      const matchesDesignation = designationFilter === "all" || u.designation === designationFilter;
      
      return matchesDesignation;
    });
  }, [users, roleFilter, statusFilter, designationFilter, viewMode]);

  const userColumns = [
    {
      header: 'User',
      key: 'full_name',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white overflow-hidden ring-2 ring-orange-200 shadow-sm shrink-0">
            {row.profile_photo ? (
              <img
                src={
                  row.profile_photo.startsWith("http") ||
                    row.profile_photo.startsWith("data:")
                    ? row.profile_photo
                    : `${import.meta.env.VITE_API_BASE_URL_IMG}${row.profile_photo}`
                }
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `<span class="font-bold text-sm">${row.full_name?.charAt(0)}</span>`;
                }}
              />
            ) : (
              <span className="font-bold text-sm">
                {row.full_name?.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <div className="font-bold text-slate-900">{row.full_name}</div>
            <div className="text-[10px] text-slate-400 font-medium">{row.email}</div>
            {row.employee_id && (
              <div className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">ID: {row.employee_id}</div>
            )}
          </div>
        </div>
      )
    },
    {
      header: 'Contact',
      key: 'mobile',
      render: (row) => (
        <div className="text-xs text-slate-500 font-medium">{row.mobile || "N/A"}</div>
      )
    },
    {
      header: 'Reporting Time',
      key: 'office_in_time',
      render: (row) => (
        <div className="text-[10px] font-bold text-emerald-600 uppercase">
          {row.office_in_time ? new Date(`1970-01-01T${row.office_in_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "--"}
        </div>
      )
    },
    {
      header: 'End Time',
      key: 'office_out_time',
      render: (row) => (
        <div className="text-[10px] font-bold text-rose-600 uppercase">
          {row.office_out_time ? new Date(`1970-01-01T${row.office_out_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : "--"}
        </div>
      )
    },
    {
      header: 'SmartFlo Settings',
      key: 'smartflo_agent_id',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex flex-col gap-1.5 min-w-[170px]">
          <input
            type="text"
            className="w-full px-2 py-1 text-[9px] font-bold border border-slate-200 rounded focus:outline-none focus:border-blue-400 bg-slate-50"
            placeholder="Agent ID"
            defaultValue={row.smartflo_agent_id || ""}
            onBlur={(e) => {
              if (e.target.value !== row.smartflo_agent_id) {
                handleAgentIdChange(row, e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.target.blur();
              }
            }}
          />
          <select
            value={row.smartflo_caller_id || ""}
            onChange={(e) => handleCallerIdChange(row, e.target.value)}
            className="w-full px-2 py-1 text-[9px] font-bold border border-slate-200 rounded focus:outline-none focus:border-blue-400 bg-slate-50 cursor-pointer"
          >
            <option value="">Select Caller ID</option>
            {smartfloCallers.map(c => (
              <option key={c.id} value={c.caller_number}>{c.company_name} - {c.caller_number}</option>
            ))}
          </select>
        </div>
      )
    },
    {
      header: 'Call Access',
      key: 'call_access',
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
          <button
            onClick={() => handleCallAccessToggle(row)}
            className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${row.call_access ? 'bg-emerald-500' : 'bg-slate-200'}`}
          >
            <span
              className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${row.call_access ? 'translate-x-5' : 'translate-x-1'}`}
            />
          </button>
        </div>
      )
    },
    {
      header: 'Role',
      key: 'role',
      sortable: true,
      render: (row) => (
        <div onClick={(e) => e.stopPropagation()}>
          {isAdmin ? (
            <select
              value={row.role}
              onChange={(e) => handleRoleChange(row, e.target.value)}
              className={`px-2 py-1 rounded text-[10px] font-black capitalize tracking-wider border cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-900 ${row.role === "super_admin"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : row.role === "admin"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
            >
              <option value="user" className="text-slate-600 bg-white">User</option>
              <option value="admin" className="text-slate-900 bg-white">Admin</option>
              <option value="employee" className="text-blue-600 bg-white">Employee</option>
              {isSuperAdmin && (
                <option value="super_admin" className="text-amber-600 bg-white">Super Admin</option>
              )}
            </select>
          ) : (
            <span className={`px-2 py-1 rounded text-[10px] font-black capitalize tracking-wider border ${row.role === "super_admin"
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : row.role === "admin"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-slate-50 text-slate-600 border-slate-200"
              }`}>
              {row.role}
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      key: 'status',
      render: (row) => (
        <div className="flex flex-col items-start gap-1.5">
          {/* User Account Status */}
          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${row.is_active === false
            ? "bg-rose-50 text-rose-500 border-rose-100"
            : "bg-emerald-50 text-emerald-500 border-emerald-100"
            }`}>
            {row.is_active === false ? "Disabled" : "Active"}
          </span>
        </div>
      )
    },
    {
      header: 'Joined',
      key: 'createdAt',
      sortable: true,
      className: 'text-center',
      render: (row) => (
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
          {new Date(row.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      className: 'text-right w-40',
      render: (row) => (
        <div className="flex items-center justify-end gap-2 transition-opacity">
          <button
            onClick={() => handleViewUser(row)}
            className="bg-white text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all border border-slate-200 shadow-sm"
            title="View Full Profile"
          >
            <Eye size={16} />
          </button>
          {isAdmin && (
            <button
              onClick={() => handleEditUser(row)}
              className="bg-white text-slate-600 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all border border-slate-200 shadow-sm"
              title="Edit User"
            >
              <Edit3 size={16} />
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => handleToggleUserStatus(row)}
              className={`p-2 rounded-lg transition-all border shadow-sm ${row.is_active === false
                ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-200"
                : "bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200"
                }`}
              title={row.is_active === false ? "Enable User" : "Disable User"}
            >
              {row.is_active === false ? <UserCheck size={16} /> : <UserX size={16} />}
            </button>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => handleDeleteUser(row)}
              className="bg-white text-slate-600 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all border border-slate-200 shadow-sm"
              title="Delete User"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  if (loading) return <DashboardLoader loading={true} title="Loading Users" />;

  if (selectedUser) {
    return (
      <div className="space-y-6 pb-20 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-all border border-slate-200"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white overflow-hidden shadow-lg border-2 border-white ring-1 ring-slate-100">
                {selectedUser.profile_photo ? (
                  <img
                    src={selectedUser.profile_photo.startsWith("http") || selectedUser.profile_photo.startsWith("data:") ? selectedUser.profile_photo : `${import.meta.env.VITE_API_BASE_URL_IMG}${selectedUser.profile_photo}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="font-bold text-2xl">{selectedUser.full_name?.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900 leading-none mb-1">{selectedUser.full_name}</h1>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${selectedUser.is_active === false ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
                    {selectedUser.is_active === false ? "Inactive Account" : "Active Member"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">ID: {selectedUser.id.substring(0, 8)}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => handleEditUser(selectedUser)} className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2">
              <Edit3 size={14} /> Edit User Professional Details
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Key Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            {/* Account Status Card */}
            <div className="bg-white rounded-xl border-l-4 border-l-blue-500 border border-slate-200 p-5 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Shield size={12} className="text-blue-500" /> Employment Details
                </p>
                <div className="space-y-4">
                  {selectedUser.employee_id && (
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Employee ID</p>
                      <p className="text-sm font-black text-blue-600">{selectedUser.employee_id}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">System Role</p>
                    <p className="text-sm font-black text-slate-800 capitalize">{selectedUser.role.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Designation</p>
                    <p className="text-sm font-black text-slate-800">{selectedUser.designation || 'Not Assigned'}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase">Member Since</p>
                    <p className="text-sm font-black text-slate-800">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
            </div>

            {/* Quick Contact Card */}
            <div className="bg-orange-50/50 rounded-xl p-5 border border-orange-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100/30 rounded-full -mr-8 -mt-8" />
                <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                   Contact Information
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Phone size={14} />
                    </div>
                    <div>
                      <p className="text-[8px] font-bold text-orange-400 uppercase">Primary Mobile</p>
                      <p className="text-xs font-black text-slate-800 tracking-tight">{selectedUser.mobile}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Mail size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold text-orange-400 uppercase">Registry Email</p>
                      <p className="text-xs font-black text-slate-800 truncate tracking-tight">{selectedUser.email}</p>
                    </div>
                  </div>
                </div>
            </div>

            {/* SmartFlo Card */}
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-5 shadow-sm">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3">Call Settings</p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-emerald-200/50 pb-2">
                    <span className="text-[9px] font-bold text-emerald-800/60 uppercase">Agent ID</span>
                    <span className="text-[10px] font-black text-emerald-700">{selectedUser.smartflo_agent_id || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-emerald-200/50 pb-2">
                    <span className="text-[9px] font-bold text-emerald-800/60 uppercase">Caller ID</span>
                    <span className="text-[10px] font-black text-emerald-700">{selectedUser.smartflo_caller_id || '---'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-emerald-800/60 uppercase">Live Access</span>
                    <span className={`w-2 h-2 rounded-full ${selectedUser.call_access ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                </div>
            </div>
          </div>

          {/* Center/Right Section - Dynamic Tabs & Wide Info */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-1.5 flex overflow-x-auto gap-1">
              {["profile", "work", "financial", "secondary", "orders"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab ? "bg-slate-900 text-white shadow-md scale-105 z-10" : "text-slate-400 hover:text-slate-800 hover:bg-slate-50"}`}
                >
                  {tab === "profile" ? "Identity & Location" : tab}
                </button>
              ))}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl shadow-sm min-h-[450px] p-6 lg:p-8 animate-in fade-in duration-300">
              {activeTab === "profile" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-8">
                    <section className="bg-cyan-50/50 p-5 rounded-lg border border-cyan-100">
                      <h3 className="text-[11px] font-black text-cyan-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" /> Basic Details
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Gender</p>
                            <p className="text-sm font-bold text-slate-700">{selectedUser.gender || 'Not Specified'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Age</p>
                            <p className="text-sm font-bold text-slate-700">{selectedUser.age || '---'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Qualification</p>
                          <p className="text-sm font-bold text-slate-700">{selectedUser.qualification || '---'}</p>
                        </div>
                      </div>
                    </section>

                    <section className="bg-amber-50/50 p-5 rounded-lg border border-amber-100">
                      <h3 className="text-[11px] font-black text-amber-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                         <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Location Details
                      </h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">State</p>
                            <p className="text-sm font-bold text-slate-700">{selectedUser.state || '---'}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">City / District</p>
                            <p className="text-sm font-bold text-slate-700">{selectedUser.city || '---'}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">Pincode</p>
                          <p className="text-sm font-bold text-slate-700 tracking-widest">{selectedUser.pincode || '---'}</p>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                     <section className="bg-blue-50/50 p-5 rounded-lg border border-blue-100 flex-1 h-full">
                        <h3 className="text-[11px] font-black text-blue-700 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" /> Permanent Address
                        </h3>
                        <div className="p-4 bg-white rounded border border-blue-100/50 shadow-inner min-h-[150px]">
                           {(() => {
                             if (!selectedUser.address) return <p className="text-xs text-slate-400 italic">No address recorded in system.</p>;
                             
                             let addr = selectedUser.address;
                             
                             // Handle stringified JSON
                             if (typeof addr === 'string' && addr.startsWith('{')) {
                               try {
                                 addr = JSON.parse(addr);
                               } catch (e) {
                                 return <p className="text-sm text-slate-600 italic">{addr}</p>;
                               }
                             }

                             // Handle Object
                             if (typeof addr === 'object' && addr !== null) {
                               return (
                                 <div className="text-sm text-slate-600 space-y-2">
                                   <p className="font-bold">{addr.line1 || addr.address || '---'}</p>
                                   {addr.line2 && <p className="font-medium">{addr.line2}</p>}
                                   <p className="text-xs uppercase tracking-wide text-slate-400">
                                      {addr.city || '---'}, {addr.state || '---'} - {addr.pincode || '---'}
                                   </p>
                                 </div>
                               );
                             }

                             // Handle plain string
                             return <p className="text-sm text-slate-600 italic">{addr}</p>;
                           })()}
                        </div>
                     </section>
                  </div>
                </div>
              )}

              {activeTab === "work" && (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-indigo-50 p-6 rounded-lg border border-indigo-100">
                         <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">Work Mode</p>
                         <p className="text-lg font-black text-indigo-900">{selectedUser.work_mode || 'Office'}</p>
                      </div>
                      <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
                         <p className="text-[10px] font-bold text-purple-400 uppercase mb-1">Joining Date</p>
                         <p className="text-lg font-black text-purple-900">{selectedUser.joining_date || '---'}</p>
                      </div>
                      <div className="bg-emerald-50 p-6 rounded-lg border border-emerald-100">
                         <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Gross CTC (Yearly)</p>
                         <p className="text-lg font-black text-emerald-900">₹ {(selectedUser.gross_salary || 0).toLocaleString()}</p>
                      </div>
                   </div>
                   
                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-800 mb-4 uppercase tracking-widest">Digital Signature & UPI</h4>
                      <div className="flex items-center gap-4">
                         <div className="p-4 bg-white rounded-lg border border-slate-200">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">UPI ID</span>
                            <span className="text-sm font-medium text-slate-800 font-mono tracking-tight">{selectedUser.upi_id || 'Not Provided'}</span>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "financial" && (
                 <section className="bg-rose-50/50 p-8 rounded-xl border border-rose-100 max-w-2xl mx-auto">
                    <h3 className="text-sm font-black text-rose-700 uppercase tracking-widest mb-6 flex items-center gap-3">
                       <Building2 size={18} /> Banking & Settlement Details
                    </h3>
                    {(() => {
                      let bank = { account_holder: '', account_number: '', bank_name: '', ifsc: '' };
                      try {
                        if (selectedUser.bank_details) {
                          bank = typeof selectedUser.bank_details === 'string' ? JSON.parse(selectedUser.bank_details) : selectedUser.bank_details;
                        }
                      } catch (e) {}
                      
                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="space-y-6">
                              <div>
                                 <p className="text-[9px] font-bold text-rose-400 uppercase mb-1">Account Holder</p>
                                 <p className="text-sm font-bold text-slate-800 border-b border-rose-100 pb-2">{bank.account_holder || '---'}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-bold text-rose-400 uppercase mb-1">Account Number</p>
                                 <p className="text-sm font-bold text-slate-800 border-b border-rose-100 pb-2 tracking-widest">{bank.account_number || '---'}</p>
                              </div>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <p className="text-[9px] font-bold text-rose-400 uppercase mb-1">Bank Name</p>
                                 <p className="text-sm font-bold text-slate-800 border-b border-rose-100 pb-2">{bank.bank_name || '---'}</p>
                              </div>
                              <div>
                                 <p className="text-[9px] font-bold text-rose-400 uppercase mb-1">IFSC Code</p>
                                 <p className="text-sm font-bold text-slate-800 border-b border-rose-100 pb-2 font-mono">{bank.ifsc || '---'}</p>
                              </div>
                           </div>
                        </div>
                      );
                    })()}
                 </section>
              )}

              {activeTab === "secondary" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <Phone size={14} /> Secondary Mobiles
                      </h4>
                      <div className="space-y-2">
                         {(() => {
                           try {
                             const list = JSON.parse(selectedUser.secondary_mobiles || '[]');
                             return list.length > 0 ? list.map((m, i) => (
                               <div key={i} className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700">{m}</div>
                             )) : <p className="text-xs text-slate-400 italic">No secondary numbers registered.</p>
                           } catch(e) { return <p className="text-xs text-slate-400 italic">Format error.</p> }
                         })()}
                      </div>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                      <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                         <Mail size={14} /> Secondary Emails
                      </h4>
                      <div className="space-y-2">
                         {(() => {
                           try {
                             const list = JSON.parse(selectedUser.secondary_emails || '[]');
                             return list.length > 0 ? list.map((m, i) => (
                               <div key={i} className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700">{m}</div>
                             )) : <p className="text-xs text-slate-400 italic">No secondary emails registered.</p>
                           } catch(e) { return <p className="text-xs text-slate-400 italic">Format error.</p> }
                         })()}
                      </div>
                   </div>
                </div>
              )}

              {activeTab === "orders" && (
                <div className="-m-6">
                   <DataTable
                    title="User Financial History"
                    columns={[
                      { header: 'Order ID', key: 'id', render: (row) => <span className="font-bold text-[10px]">#{row.id.substring(0, 8)}</span> },
                      { header: 'Service Type', key: 'productTitle', render: (row) => <span className="text-[10px] font-bold uppercase">{row.Product?.title || 'General Service'}</span> },
                      { header: 'Deployment Date', key: 'createdAt', render: (row) => <span className="text-[10px] font-medium">{new Date(row.createdAt).toLocaleDateString('en-IN')}</span> },
                      { header: 'Revenue', key: 'amount', render: (row) => <span className="font-black text-slate-900">₹{row.amount}</span> },
                      { header: 'Status', key: 'status', render: (row) => (
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase font-black tracking-widest border ${row.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {row.status}
                        </span>
                      )}
                    ]}
                    data={userOrders}
                    pageSize={8}
                    fileName={`${selectedUser.full_name}_Orders`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans pb-20">
      <div className="flex justify-between items-center bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Users</h1>
          <p className="text-xs font-medium text-slate-500 mt-1">Manage users and their account details.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Segmented Control */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
            <button
              onClick={() => setViewMode("staff")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "staff" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Staff
            </button>
            <button
              onClick={() => setViewMode("users")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "users" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              Platform Users
            </button>
            <button
              onClick={() => setViewMode("all")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              All
            </button>
          </div>

          <div className="h-8 w-px bg-slate-200 mx-1 hidden lg:block" />

          {/* Status Filter */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 py-1.5 px-3 rounded-xl shadow-sm">
             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Show Inactive</span>
             <button
                onClick={() => setStatusFilter(prev => prev === "active" ? "all" : "active")}
                className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none ${statusFilter === "all" ? 'bg-orange-500' : 'bg-slate-200'}`}
              >
                <span
                  className={`inline-block w-3 h-3 transform bg-white rounded-full transition-transform ${statusFilter === "all" ? 'translate-x-5' : 'translate-x-1'}`}
                />
              </button>
          </div>

          {/* Role Filter */}
          <select
            className="text-[10px] font-black uppercase tracking-widest border border-slate-200 py-2.5 px-3 rounded-lg bg-white focus:outline-none focus:border-slate-900 shadow-sm w-32 cursor-pointer"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="employee">Employee</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Designation Filter */}
          <select
            className="text-[10px] font-black uppercase tracking-widest border border-slate-200 py-2.5 px-3 rounded-lg bg-white focus:outline-none focus:border-slate-900 shadow-sm w-40 cursor-pointer"
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
          >
            <option value="all">All Designations</option>
            {[
              "CEO",
              "Director",
              "Frontend Developer",
              "Backend Developer",
              "Fullstack Developer",
              "Graphic Designer",
              "Accountant",
              "CA",
              "Telecaller",
              "Sales Manager",
              "BDM",
              "HR",
              "Digital Marketing Manager",
              "Software Developer",
              "IT Admin",
              "Other"
            ].map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          {(isAdmin || isSuperAdmin) && (
            <>
              <button
                onClick={() => setEditUser({
                  role: 'employee',
                  is_active: true,
                  isNew: true
                })}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <UserPlus size={14} /> Add Worker
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm transition-all flex items-center gap-2"
              >
                <Download size={14} /> Export XLS
              </button>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={userColumns}
        data={filteredUsers}
        fileName="Platform_Users"
        pageSize={10}
        rowClassName={(row) => `
            ${row.is_active === false ? 'bg-red-50 hover:bg-red-100/50' : 'odd:bg-white even:bg-slate-50/30'}
        `}
      />

      {
        editUser && (
          <EditUserModal
            user={editUser}
            currentUser={user}
            isOpen={true}
            onClose={() => setEditUser(null)}
            onSave={handleSaveUser}
            onCreate={handleCreateUser}
          />
        )
      }
    </div >
  );
};

export default UserManagement;

