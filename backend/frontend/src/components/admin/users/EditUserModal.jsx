import { useState, useEffect } from "react";
import { X, Save, Upload, User, Loader2, Shield, MapPin, Building2, Briefcase } from "lucide-react";
import { useToast } from "../../../context/ToastContext";

// Moved outside component to prevent re-creation on every render
const InputField = ({ label, name, type = "text", placeholder, options, required = false, ...props }) => {
    return (
        <div className="space-y-1">
            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            {type === "select" ? (
                <select
                    name={name}
                    {...props}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                >
                    {options.map(opt => (
                        <option key={opt.value || opt} value={opt.value || opt}>{opt.label || opt}</option>
                    ))}
                </select>
            ) : (
                <input
                    type={type}
                    name={name}
                    {...props}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all placeholder:text-slate-300"
                    placeholder={placeholder}
                />
            )}
        </div>
    );
};

const EditUserModal = ({ user, currentUser, isOpen, onClose, onSave, onCreate }) => {
    const toast = useToast();
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        mobile: "",
        employee_id: "",
        designation: "Select",
        role: "user",
        password: "",
        is_active: true,
        age: "",
        gender: "Select",
        qualification: "",
        state: "",
        city: "",
        pincode: "",
        address_line1: "",
        address_line2: "",
        work_mode: "Office",
        joining_date: "",
        gross_salary: "",
        upi_id: "",
        bank_holder: "",
        bank_account: "",
        bank_name: "",
        bank_ifsc: "",
        smartflo_agent_id: "",
        smartflo_caller_id: "",
        call_access: false,
        office_in_time: "",
        office_out_time: "",
        week_offs: [],
        sunday_in_time: "",
        sunday_out_time: ""
    });

    const [profilePhoto, setProfilePhoto] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("basic");
    const [customDesignation, setCustomDesignation] = useState("");

    const designations = [
        "Select", "Doctor", "Nurse", "Ward Boy", "Receptionist",
        "Graphic Designer", "HR", "Medical Staff", "CEO", "Director",
        "Frontend Developer", "Backend Developer", "Fullstack Developer",
        "Accountant", "CA", "Telecaller", "Sales Manager", "BDM",
        "Digital Marketing Manager", "Software Developer", "IT Admin", "Other"
    ];

    useEffect(() => {
        if (user) {
            let addr = { line1: "", line2: "" };
            try {
                if (user.address) {
                    addr = typeof user.address === 'string' ? JSON.parse(user.address) : user.address;
                }
            } catch (e) {}

            let bank = { account_holder: "", account_number: "", bank_name: "", ifsc: "" };
            try {
                if (user.bank_details) {
                    bank = typeof user.bank_details === 'string' ? JSON.parse(user.bank_details) : user.bank_details;
                }
            } catch (e) {}

            const isStandardDesignation = user.designation ? designations.includes(user.designation) : false;

            setFormData({
                full_name: user.full_name || "",
                email: user.email || "",
                mobile: user.mobile || "",
                employee_id: user.employee_id || "",
                designation: user.designation ? (isStandardDesignation ? user.designation : "Other") : "Select",
                role: user.role || "user",
                password: "",
                is_active: user.is_active !== false,
                age: user.age || "",
                gender: user.gender || "Select",
                qualification: user.qualification || "",
                state: user.state || "",
                city: user.city || "",
                pincode: user.pincode || "",
                address_line1: addr.line1 || addr.address || "",
                address_line2: addr.line2 || "",
                work_mode: user.work_mode || "Office",
                joining_date: user.joining_date || "",
                gross_salary: user.gross_salary || "",
                upi_id: user.upi_id || "",
                bank_holder: bank.account_holder || "",
                bank_account: bank.account_number || "",
                bank_name: bank.bank_name || "",
                bank_ifsc: bank.ifsc || "",
                smartflo_agent_id: user.smartflo_agent_id || "",
                smartflo_caller_id: user.smartflo_caller_id || "",
                call_access: !!user.call_access,
                office_in_time: user.office_in_time || "",
                office_out_time: user.office_out_time || "",
                week_offs: user.week_offs ? (Array.isArray(user.week_offs) ? user.week_offs : (typeof user.week_offs === 'string' ? JSON.parse(user.week_offs) : [])) : [],
                sunday_in_time: user.sunday_in_time || "",
                sunday_out_time: user.sunday_out_time || ""
            });

            setPreviewUrl(
                user.profile_photo?.startsWith("http") ||
                user.profile_photo?.startsWith("data:")
                    ? user.profile_photo
                    : user.profile_photo
                        ? `${import.meta.env.VITE_API_BASE_URL_IMG}${user.profile_photo}`
                        : null
            );

            if (user.designation && !isStandardDesignation) {
                setCustomDesignation(user.designation);
            } else {
                setCustomDesignation("");
            }
        }
    }, [user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePhoto(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.full_name?.trim()) {
            toast.error("Full name is required");
            return;
        }
        if (!formData.email?.trim()) {
            toast.error("Email is required");
            return;
        }
        if (!formData.mobile?.trim()) {
            toast.error("Mobile number is required");
            return;
        }
        // Employee ID is now optional - will be auto-generated if not provided
        // Password is optional - if not provided, a random one will be generated

        setLoading(true);
        try {
            const data = new FormData();

            const finalDesignation = formData.designation === "Other" ? customDesignation : formData.designation;

            // Basic & Identity
            data.append("full_name", formData.full_name);
            data.append("email", formData.email);
            data.append("mobile", formData.mobile);
            data.append("employee_id", formData.employee_id);
            data.append("designation", finalDesignation);
            data.append("role", formData.role);
            data.append("is_active", formData.is_active);
            data.append("age", formData.age);
            data.append("gender", formData.gender);
            data.append("qualification", formData.qualification);

            // Location
            data.append("state", formData.state);
            data.append("city", formData.city);
            data.append("pincode", formData.pincode);
            data.append("address", JSON.stringify({
                line1: formData.address_line1,
                line2: formData.address_line2,
                city: formData.city,
                state: formData.state,
                pincode: formData.pincode
            }));

            // Employment & Finance
            data.append("work_mode", formData.work_mode);
            data.append("joining_date", formData.joining_date);
            data.append("gross_salary", formData.gross_salary);
            data.append("upi_id", formData.upi_id);
            data.append("bank_details", JSON.stringify({
                account_holder: formData.bank_holder,
                account_number: formData.bank_account,
                bank_name: formData.bank_name,
                ifsc: formData.bank_ifsc
            }));

            // Call Settings
            data.append("smartflo_agent_id", formData.smartflo_agent_id);
            data.append("smartflo_caller_id", formData.smartflo_caller_id);
            data.append("call_access", formData.call_access);

            // Office Attendance Custom Settings
            data.append("office_in_time", formData.office_in_time);
            data.append("office_out_time", formData.office_out_time);
            data.append("week_offs", JSON.stringify(formData.week_offs));
            data.append("sunday_in_time", formData.sunday_in_time);
            data.append("sunday_out_time", formData.sunday_out_time);

            if (formData.password) {
                data.append("password", formData.password);
            }
            if (profilePhoto) {
                data.append("profile_photo", profilePhoto);
            }

            const isNewUser = user?.isNew === true;
            try {
                if (isNewUser) {
                    await onCreate(data);
                    toast.success("Worker created successfully");
                } else {
                    await onSave(user.id, data);
                    toast.success("Worker updated successfully");
                }
                onClose();
            } catch (error) {
                console.error("Failed to save user", error);
                const message = error.response?.data?.message || error.message || "Failed to save worker";
                toast.error(message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-md shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
                <div className="px-6 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">
                            {user?.isNew ? 'Add New Worker' : 'Update Employee Profile'}
                        </h3>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">
                            {user?.isNew ? 'Create new worker account' : `Editing: ${user.full_name}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-all active:scale-95"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Top Horizontal Tabs */}
                    <div className="w-full bg-slate-50 border-b border-slate-100 flex overflow-x-auto hide-scrollbar">
                        {[
                            { id: 'basic', label: 'Basic Info', icon: User },
                            { id: 'office', label: 'Office Details', icon: Briefcase },
                            { id: 'location', label: 'Location', icon: MapPin },
                            { id: 'finance', label: 'Finance & Bank', icon: Building2 },
                            { id: 'security', label: 'Security', icon: Shield }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap border-b-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100/50'}`}
                            >
                                <tab.icon size={12} className="shrink-0" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-y-auto p-5 bg-white">
                        <form onSubmit={handleSubmit} className="space-y-5">

                        {activeTab === 'basic' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="flex flex-col items-center justify-center bg-slate-50 p-4 rounded-md border border-dashed border-slate-300">
                                    <div className="relative group">
                                        <div className="w-16 h-16 rounded-md bg-white overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center">
                                            {previewUrl ? (
                                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={24} className="text-slate-300" />
                                            )}
                                        </div>
                                        <label className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md cursor-pointer">
                                            <Upload size={16} className="text-white" />
                                            <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                        </label>
                                    </div>
                                    <span className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest">Profile Photo</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField label="Full Name" name="full_name" placeholder="Suraj Kumar" required />
                                    <InputField label="Email Address" name="email" type="email" placeholder="example@mail.com" required />
                                    <InputField label="Mobile Number" name="mobile" placeholder="+91 0000000000" required />
                                    <InputField label="Employee ID (Auto-generated if empty)" name="employee_id" placeholder="EMP001" />
                                    {user?.isNew && (
                                        <InputField label="Password" name="password" type="password" placeholder="Set password" required />
                                    )}
                                    <InputField label="Age" name="age" type="number" placeholder="25" />
                                    <InputField label="Gender" name="gender" type="select" options={["Select", "Male", "Female", "Other"]} />
                                    <InputField label="Qualification" name="qualification" placeholder="B.Tech" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'office' && (
                            <div className="space-y-5 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <InputField label="Designation" name="designation" type="select" options={designations} />
                                        {formData.designation === "Other" && (
                                            <div className="mt-1 animate-in fade-in slide-in-from-top-1">
                                                <input
                                                    type="text"
                                                    value={customDesignation}
                                                    onChange={(e) => setCustomDesignation(e.target.value)}
                                                    className="w-full px-2 py-1 bg-amber-50 border border-amber-200 rounded-md text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all placeholder:text-amber-300"
                                                    placeholder="Enter custom designation"
                                                    autoFocus
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <InputField label="System Role" name="role" type="select" options={[
                                        { value: "user", label: "User" },
                                        { value: "admin", label: "Admin" },
                                        { value: "employee", label: "Employee" },
                                        ...(currentUser?.role === 'super_admin' ? [{ value: "super_admin", label: "Super Admin" }] : [])
                                    ]} />
                                    <InputField label="Work Mode" name="work_mode" type="select" options={["Office", "Remote"]} />
                                    <InputField label="Joining Date" name="joining_date" type="date" />
                                    <InputField label="Gross Salary" name="gross_salary" type="number" placeholder="480000" />
                                    <InputField label="In Time (Override)" name="office_in_time" type="time" />
                                    <InputField label="Out Time (Override)" name="office_out_time" type="time" />
                                </div>

                                <div className="space-y-1">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 whitespace-nowrap">
                                        Week Offs
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                                            <label key={day} className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.week_offs.includes(day)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFormData(p => ({ ...p, week_offs: [...p.week_offs, day] }));
                                                        } else {
                                                            setFormData(p => ({ ...p, week_offs: p.week_offs.filter(d => d !== day) }));
                                                        }
                                                    }}
                                                    className="w-3 h-3 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500"
                                                />
                                                <span className="text-[9px] font-bold text-slate-700">{day.substring(0, 3)}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Sunday Timing */}
                                {!formData.week_offs.includes("Sunday") && (
                                    <div className="p-3 bg-amber-50/50 border border-amber-100 rounded-md space-y-2">
                                        <h4 className="text-[9px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                                            ☀️ Sunday Timing (Optional)
                                        </h4>
                                        <p className="text-[8px] text-amber-600 font-medium m-0">Set separate in/out times for Sundays.</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <InputField label="Sunday In Time" name="sunday_in_time" type="time" />
                                            <InputField label="Sunday Out Time" name="sunday_out_time" type="time" />
                                        </div>
                                    </div>
                                )}

                                <div className="flex border border-slate-200 bg-slate-50 p-2.5 rounded-md items-center justify-between">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-800 uppercase tracking-widest">Account Active</p>
                                        <p className="text-[8px] text-slate-400 font-bold uppercase">Toggle Login Access</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setFormData(p => ({...p, is_active: !p.is_active}))}
                                        className={`w-10 h-5 rounded-full transition-all relative ${formData.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData.is_active ? 'left-5' : 'left-0.5'}`} />
                                    </button>
                                </div>

                                <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-md space-y-3">
                                    <h4 className="text-[9px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-1.5">
                                        <Shield size={12} /> Call Center Settings
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputField label="SmartFlo Agent ID" name="smartflo_agent_id" placeholder="AGENT123" />
                                        <InputField label="SmartFlo Caller ID" name="smartflo_caller_id" placeholder="91XXXXXXXXXX" />
                                    </div>
                                    <div className="flex items-center justify-between bg-white px-3 py-2 rounded-md border border-blue-100">
                                        <span className="text-[9px] font-black text-blue-800 uppercase">Live Call Access</span>
                                        <input type="checkbox" name="call_access" checked={formData.call_access} onChange={handleChange} className="w-3 h-3 rounded-sm text-blue-600 focus:ring-blue-500 cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'location' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <InputField label="State" name="state" placeholder="Bihar" />
                                    <InputField label="City / District" name="city" placeholder="Patna" />
                                    <InputField label="Pincode" name="pincode" placeholder="800001" />
                                </div>
                                <div className="space-y-3">
                                    <InputField label="Address Line 1" name="address_line1" placeholder="House No, Street Name" />
                                    <InputField label="Address Line 2 (Optional)" name="address_line2" placeholder="Landmark, Area" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'finance' && (
                            <div className="space-y-4 animate-in fade-in duration-300">
                                <div className="bg-emerald-50/50 p-4 rounded-md border border-emerald-100 space-y-4">
                                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                                        <Building2 size={12} /> Bank Account Details
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <InputField label="Account Holder Name" name="bank_holder" placeholder="As per bank record" />
                                        <InputField label="Account Number" name="bank_account" placeholder="XXXXXXXXXXXX" />
                                        <InputField label="Bank & Branch Name" name="bank_name" placeholder="SBI, Patna Main Branch" />
                                        <InputField label="IFSC Code" name="bank_ifsc" placeholder="SBIN000XXXX" />
                                    </div>
                                </div>
                                <div className="w-full sm:w-1/2">
                                    <InputField label="UPI ID" name="upi_id" placeholder="mobile@upi" />
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-4 animate-in fade-in duration-300 max-w-sm">
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                                    <p className="text-[10px] font-bold text-slate-900 mb-1 uppercase tracking-wide">Change Password</p>
                                    <p className="text-[9px] text-slate-500 font-medium mb-3 italic">Leave blank if you don't want to change the password.</p>
                                    <InputField label="New Password" name="password" type="password" placeholder="*************" />
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="pt-4 mt-2 border-t border-slate-100 flex gap-3 justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 bg-slate-100 text-slate-600 rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 bg-blue-600 text-white rounded-md text-[9px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm shadow-blue-200 disabled:opacity-70 flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {user?.isNew ? 'Create Worker' : 'Save Employee Information'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    );
};

export default EditUserModal;