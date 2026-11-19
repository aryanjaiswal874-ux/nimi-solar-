import { ERP_Attendance, ERP_OfficeSetting, ERP_ToDo, ERP_WorkReport, ERP_Payroll, ERP_EmployeeLocation, ERP_Holiday, User, Lead, ERP_LiveLocation, ERP_LocationHistory, WhatsAppMessage, WhatsAppChat } from "../models/index.js";

import { Op } from "sequelize";
import { sendWhatsAppText, sendWhatsAppImage, sendWhatsAppVideo, sendWhatsAppDoc } from "../utils/whatsappService.js";
import { sendToGroup, sendImageToGroup } from "../utils/waBot.js";

import path from "path";
import moment from "moment";
import { saveBase64Image } from "../utils/imageHandler.js";
import { getWhatsAppStatus as checkWAStatus, logoutWhatsApp } from "../utils/waBot.js";
import { companyName } from "../config/company.js";

// --- Office Settings ---
export const getOfficeSettings = async (req, res) => {
    try {
        let settings = await ERP_OfficeSetting.findOne();
        if (!settings) {
            settings = await ERP_OfficeSetting.create({
                office_in_time: "09:00:00",
                office_out_time: "18:00:00",
                holidays: [],
                week_offs: ["Sunday"]
            });
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateOfficeSettings = async (req, res) => {
    try {
        const { office_in_time, office_out_time, holidays, week_offs, max_allowed_late, max_allowed_early, whatsapp_group_jid } = req.body;
        let settings = await ERP_OfficeSetting.findOne();
        if (settings) {
            await settings.update({ office_in_time, office_out_time, holidays, week_offs, max_allowed_late, max_allowed_early, whatsapp_group_jid });
        } else {
            settings = await ERP_OfficeSetting.create({ office_in_time, office_out_time, holidays, week_offs, max_allowed_late, max_allowed_early, whatsapp_group_jid });
        }
        res.status(200).json({ message: "Settings updated", settings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Holidays ---
export const getHolidays = async (req, res) => {
    try {
        const holidays = await ERP_Holiday.findAll({ order: [['from_date', 'ASC']] });
        res.status(200).json(holidays);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createHoliday = async (req, res) => {
    try {
        const { title, from_date, to_date, description } = req.body;
        
        if (!title || !from_date || !to_date) {
            return res.status(400).json({ message: "Title, From Date and To Date are required." });
        }

        const start = moment(from_date);
        const end = moment(to_date);

        if (!start.isValid() || !end.isValid()) {
            return res.status(400).json({ message: "Invalid date format. Please select valid dates." });
        }

        let total_days = end.diff(start, 'days') + 1;
        if (total_days < 1) total_days = 1;

        const holiday = await ERP_Holiday.create({ 
            title, 
            from_date: start.format("YYYY-MM-DD"), 
            to_date: end.format("YYYY-MM-DD"), 
            total_days: parseInt(total_days), 
            description: description || "",
            is_active: true
        });

        console.log(`✅ Holiday Created: ${title} (${total_days} days)`);
        res.status(201).json(holiday);
    } catch (error) {
        console.error("❌ Holiday Create Error:", error);
        res.status(500).json({ message: error.message || "Failed to save holiday. Please try again." });
    }
};

export const deleteHoliday = async (req, res) => {
    try {
        const { id } = req.params;
        await ERP_Holiday.destroy({ where: { id } });
        res.status(200).json({ message: "Holiday deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Attendance ---
export const markIn = async (req, res) => {
    try {
        const { location, photo, lat, lng, force, force_reason } = req.body;
        const employee_id = req.user.id;
        const today = moment().format("YYYY-MM-DD");
        const now = moment().format("HH:mm:ss");

        const employee = await User.findByPk(employee_id);
        const empName = employee?.full_name || "Unknown Staff";

        // 1. Check office timing for remark & blocking
        const settings = await ERP_OfficeSetting.findOne();
        console.log(`🔍 [ATTENDANCE SETTINGS] Group JID: ${settings?.whatsapp_group_jid || 'NONE'}`);
        let system_remark = "Punch In";

        // --- Holiday Check ---
        const holiday = await ERP_Holiday.findOne({
            where: {
                from_date: { [Op.lte]: today },
                to_date: { [Op.gte]: today },
                is_active: true
            }
        });

        if (holiday) {
            return res.status(403).json({ 
                message: `Today is a holiday: ${holiday.title}. Attendance cannot be marked.` 
            });
        }

        // 2. Check for existing attendance today
        let attendance;
        const existing = await ERP_Attendance.findOne({ where: { employee_id, date: today } });

        if (existing) {
            // Case A: If already punched out, cannot re-punch in
            if (existing.out_time) {
                return res.status(403).json({ message: "You have already completed your shift for today." });
            }

            // Case B: If session is already active (present + start)
            if (existing.status === 'present' && existing.current_work_status === 'start') {
                return res.status(400).json({ message: "Attendance session is already active." });
            }

            // Case C: If on break
            if (existing.current_work_status === 'break') {
                return res.status(400).json({ message: "You are currently on break. Please use the Resume option." });
            }

            // Case D: If it was marked ABSENT (manual or auto), OVERRIDE it
            if (existing.status === 'absent') {
                const photoPath = saveBase64Image(photo, "attendance");
                await existing.update({
                    in_time: now,
                    current_work_status: "start",
                    status: "present",
                    location,
                    photo: photoPath,
                    remarks: `Absent Override | ${system_remark}`
                });
                attendance = existing;
            } else {
                // Any other state (e.g. already present), return it instead of creating new
                return res.status(200).json({ message: "Attendance already marked", attendance: existing });
            }
        } else {
            // 3. Save photo to disk if it's base64
            const photoPath = saveBase64Image(photo, "attendance");

            // 4. Create record (only if NO existing record)
            attendance = await ERP_Attendance.create({
                employee_id,
                date: today,
                in_time: now,
                current_work_status: "start",
                status: "present",
                location,
                photo: photoPath,
                remarks: system_remark
            });
        }

        // 5. Sync with Location Tracking... (Enhanced)
        try {
            let finalLat = lat;
            let finalLng = lng;

            // Fallback for string parsing if lat/lng not direct
            if (!finalLat && location && location.includes(",")) {
                const parts = location.split(",").map(s => s.trim());
                finalLat = parseFloat(parts[0]);
                finalLng = parseFloat(parts[1]);
            }

            if (finalLat && finalLng && !isNaN(finalLat) && !isNaN(finalLng)) {
                await ERP_LiveLocation.upsert({
                    employee_id, latitude: finalLat, longitude: finalLng, gps_status: 'on', last_update: new Date()
                });
                await ERP_LocationHistory.create({
                    employee_id, latitude: finalLat, longitude: finalLng, gps_status: 'on', recorded_at: new Date()
                });
            }
        } catch (locErr) {
            console.error("Location tracking update error:", locErr.message);
        }

        // 4. WhatsApp Notification
        try {
            if (settings && settings.whatsapp_group_jid) {
                const displayDate = moment(today).format("DD MMMM YYYY (dddd)");
                const displayTime = moment(now, "HH:mm:ss").format("hh:mm A");

                const caption = `✅ *Attendance Marked*\n\n👤 *${empName}*\n📅 ${displayDate}\n🕒 ${displayTime}\n📍 ${location || 'N/A'}`;

                if (photo && photo.startsWith("data:image")) {
                    await sendImageToGroup(settings.whatsapp_group_jid, caption, photo);
                } else {
                    await sendToGroup(settings.whatsapp_group_jid, caption);
                }
            }
        } catch (waErr) {
            console.error("WA Group Notify Error:", waErr.message);
        }

        res.status(201).json({ message: "Marked in successfully", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const markOut = async (req, res) => {
    try {
        const { force, force_reason, location, lat, lng } = req.body;
        const employee_id = req.user.id;
        const today = moment().format("YYYY-MM-DD");
        const now = moment().format("HH:mm:ss");

        const employee = await User.findByPk(employee_id);
        const empName = employee?.full_name || "Unknown Staff";

        const attendance = await ERP_Attendance.findOne({ where: { employee_id, date: today } });
        if (!attendance) return res.status(404).json({ message: "No active session found for today" });
        if (attendance.current_work_status === "stop") return res.status(400).json({ message: "Already marked out" });

        const settings = await ERP_OfficeSetting.findOne();
        let exit_remark = "Punch Out";

        const duration = moment.duration(moment(now, "HH:mm:ss").diff(moment(attendance.in_time, "HH:mm:ss")));
        const hours = Math.floor(duration.asHours());
        const minutes = duration.minutes();
        const total_work_hours = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

        await attendance.update({
            out_time: now,
            current_work_status: "stop",
            total_work_hours,
            remarks: attendance.remarks ? `${attendance.remarks} | Out: ${exit_remark}` : exit_remark
        });

        // 3. Sync with Location Tracking (Enhanced for Punch-Out)
        try {
            let finalLat = lat;
            let finalLng = lng;

            if (!finalLat && location && location.includes(",")) {
                const parts = location.split(",").map(s => s.trim());
                finalLat = parseFloat(parts[0]);
                finalLng = parseFloat(parts[1]);
            }

            if (finalLat && finalLng && !isNaN(finalLat) && !isNaN(finalLng)) {
                await ERP_LiveLocation.upsert({
                    employee_id, latitude: finalLat, longitude: finalLng, gps_status: 'on', last_update: new Date()
                });
                await ERP_LocationHistory.create({
                    employee_id, latitude: finalLat, longitude: finalLng, gps_status: 'on', recorded_at: new Date()
                });
            }
        } catch (locErr) {
            console.error("Location tracking update error (Out):", locErr.message);
        }

        // WhatsApp Notification - Enhanced
        try {
            if (settings && settings.whatsapp_group_jid) {
                const displayDate = moment(today).format("DD MMMM YYYY (dddd)");
                const outTimeFormatted = moment(now, "HH:mm:ss").format("hh:mm A");

                let message = `✔️ *${empName}* logged out from work at ${outTimeFormatted}`;

                await sendToGroup(settings.whatsapp_group_jid, message);
            }
        } catch (waErr) {
            console.error("WA Group Notify Error:", waErr.message);
        }

        res.status(200).json({ message: "Marked out successfully", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const takeBreak = async (req, res) => {
    try {
        const { reason } = req.body;
        const employee_id = req.user.id;
        const today = moment().format("YYYY-MM-DD");
        const now = moment().format("HH:mm:ss");

        const attendance = await ERP_Attendance.findOne({ where: { employee_id, date: today } });
        if (!attendance) return res.status(404).json({ message: "No active attendance found today." });
        if (attendance.current_work_status !== 'start') return res.status(400).json({ message: "Must be working to take a break." });

        await attendance.update({
            current_work_status: 'break',
            // Pre-simplifying remarks to avoid truncation error from excessive concatenation
            remarks: attendance.remarks?.substring(0, 50) + ` | Break: ${reason || 'N/A'}`
        });

        // WhatsApp Notification
        try {
            const settings = await ERP_OfficeSetting.findOne();
            const employee = await User.findByPk(employee_id);
            if (settings && settings.whatsapp_group_jid) {
                const message = `🔴 *${employee?.full_name}* took a break at ${now.substring(0, 5)}\nReason: ${reason || 'Not specified'}`;
                await sendToGroup(settings.whatsapp_group_jid, message);
            }
        } catch (waErr) {
            console.error("WA Group Notify Error in takeBreak:", waErr.message);
        }

        res.status(200).json({ message: "Break started", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const resumeWork = async (req, res) => {
    try {
        const employee_id = req.user.id;
        const today = moment().format("YYYY-MM-DD");
        const now = moment().format("HH:mm:ss");

        const attendance = await ERP_Attendance.findOne({ where: { employee_id, date: today } });
        if (!attendance) return res.status(404).json({ message: "No attendance found today." });
        if (attendance.current_work_status !== 'break') return res.status(400).json({ message: "You are not on break." });

        await attendance.update({
            current_work_status: 'start',
            remarks: attendance.remarks?.substring(0, 100) + ` | Resumed: ${now}`
        });

        // WhatsApp Notification
        try {
            const settings = await ERP_OfficeSetting.findOne();
            const employee = await User.findByPk(employee_id);
            if (settings && settings.whatsapp_group_jid) {
                const message = `✅ *${employee?.full_name}* is back to work now.`;
                await sendToGroup(settings.whatsapp_group_jid, message);
            }
        } catch (waErr) {
            console.error("WA Group Notify Error in resumeWork:", waErr.message);
        }

        res.status(200).json({ message: "Work resumed", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getEmployeeAttendance = async (req, res) => {
    try {
        const { employee_id, userId, startDate, endDate } = req.query;
        let queryId = employee_id || userId;
        let where = {};

        // Security: Non-admins can ONLY see their own data
        if (req.user.role === 'employee' || !queryId) {
            where.employee_id = req.user.id;
        } else {
            // Admin/Super Admin providing an ID
            where.employee_id = queryId;
        }

        if (!where.employee_id) {
            return res.status(401).json({ message: "Not authorized - User ID missing" });
        }

        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        const data = await ERP_Attendance.findAll({
            where,
            include: [{ model: User, attributes: ['full_name', 'designation', 'profile_photo'] }],
            order: [['date', 'DESC']]
        });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getDailyAttendanceSummary = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || moment().format("YYYY-MM-DD");

        // 1. Get all staff (Admin, Super Admin, Employee) - Exclude 'user'
        const staff = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'super_admin', 'employee'] }
            },

        });

        // 2. Get attendance for the date
        const attendance = await ERP_Attendance.findAll({
            where: { date: targetDate }
        });

        // 3. Merge
        const summary = staff.map(s => {
            const user = s.toJSON();
            // Case-insensitive ID string comparison is safer
            const att = attendance.find(a => a.employee_id.toString().toLowerCase() === s.id.toString().toLowerCase());
            return {
                id: user.id || s.id,
                full_name: user.full_name || s.full_name,
                mobile: user.mobile || s.mobile,
                email: user.email || s.email,
                designation: user.designation || s.designation,
                profile_photo: user.profile_photo || s.profile_photo,
                gross_salary: user.gross_salary || s.gross_salary,
                joining_date: user.joining_date || s.joining_date,
                upi_id: user.upi_id || s.upi_id,
                attendance: att || null,
                User: user
            };
        });

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// --- ToDo List ---
export const getMyToDo = async (req, res) => {
    try {
        const { date } = req.query;
        let where = { employee_id: req.user.id };
        if (req.user.role === 'super_admin' && req.query.employee_id) {
            where = { employee_id: req.query.employee_id };
        }
        if (date) where.date = date;
        
        // Use eager loading to get assignee/assigner details if needed, but since it's just ID we can fetch User
        const tasks = await ERP_ToDo.findAll({ 
            where, 
            order: [['createdAt', 'DESC']],
        });
        res.status(200).json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const createToDo = async (req, res) => {
    try {
        const { task, date, deadline, assigned_to } = req.body;
        
        const isSuperAdmin = req.user.role === 'super_admin';
        const targetEmployeeId = (isSuperAdmin && assigned_to) ? assigned_to : req.user.id;
        const assignedBy = (isSuperAdmin && assigned_to && assigned_to !== req.user.id) ? req.user.id : null;

        const newTask = await ERP_ToDo.create({
            employee_id: targetEmployeeId,
            task,
            date: date || moment().format("YYYY-MM-DD"),
            deadline: deadline || null,
            assigned_by: assignedBy
        });

        // Send WhatsApp Notification if assigned by Super Admin
        if (assignedBy) {
            const assignee = await User.findByPk(targetEmployeeId);
            const settings = await ERP_OfficeSetting.findOne();
            
            const deadlineText = deadline ? moment(deadline).format("DD MMM YYYY, hh:mm A") : "No Deadline";
            const msg = `📝 *New Task Assigned*\n\n*Task:* ${task}\n*Deadline:* ${deadlineText}\n\nPlease check your task board.`;
            
            if (assignee && assignee.mobile) {
                await sendWhatsAppText(assignee.mobile, msg);
            }
            if (settings && settings.admin_whatsapp_number) {
                await sendWhatsAppText(settings.admin_whatsapp_number, `Task assigned to ${assignee ? assignee.full_name : 'Employee'}:\n\n*Task:* ${task}\n*Deadline:* ${deadlineText}`);
            }
        }

        res.status(201).json(newTask);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateToDoStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        // Anyone can update status if it's their task or if they are super admin
        let where = { id };
        if (req.user.role !== 'super_admin') {
            where.employee_id = req.user.id;
        }
        const taskRecord = await ERP_ToDo.findOne({ where });
        if (!taskRecord) return res.status(404).json({ message: "Task not found" });
        await taskRecord.update({ status });
        res.status(200).json(taskRecord);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const updateToDoTask = async (req, res) => {
    try {
        const { id } = req.params;
        const { task, deadline } = req.body;
        const isSuperAdmin = req.user.role === 'super_admin';
        
        let where = { id };
        if (!isSuperAdmin) {
            where.employee_id = req.user.id;
        }
        
        const existing = await ERP_ToDo.findOne({ where });
        if (!existing) return res.status(404).json({ message: "Task not found" });
        
        if (!isSuperAdmin && existing.assigned_by) {
            return res.status(403).json({ message: "You cannot edit a task assigned by Super Admin." });
        }
        
        await existing.update({ 
            task: task || existing.task, 
            deadline: deadline !== undefined ? deadline : existing.deadline 
        });
        res.status(200).json(existing);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const deleteToDo = async (req, res) => {
    try {
        const { id } = req.params;
        const isSuperAdmin = req.user.role === 'super_admin';

        let where = { id };
        if (!isSuperAdmin) {
            where.employee_id = req.user.id;
        }
        
        const taskRecord = await ERP_ToDo.findOne({ where });
        if (!taskRecord) return res.status(404).json({ message: "Task not found" });
        
        if (!isSuperAdmin && taskRecord.assigned_by) {
            return res.status(403).json({ message: "You cannot delete a task assigned by Super Admin." });
        }

        await taskRecord.destroy();
        res.status(200).json({ message: "Task deleted" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Work Reports ---
export const createWorkReport = async (req, res) => {
    try {
        const { report_content, date } = req.body;
        const targetDate = date || moment().format("YYYY-MM-DD");

        // Check if already submitted for today
        const existing = await ERP_WorkReport.findOne({
            where: { employee_id: req.user.id, date: targetDate }
        });
        if (existing) {
            return res.status(400).json({ message: "Work report already submitted for today. Only one submission per day is allowed." });
        }

        const report = await ERP_WorkReport.create({
            employee_id: req.user.id,
            date: targetDate,
            report_content
        });

        // WhatsApp Notification
        try {
            const settings = await ERP_OfficeSetting.findOne();
            const employee = await User.findByPk(req.user.id);
            const empName = employee?.full_name || "Unknown Staff";

            console.log(`🔍 [WORK REPORT SETTINGS] Group JID: ${settings?.whatsapp_group_jid || 'NONE'}`);
            const isToday = moment(targetDate).isSame(moment(), 'day');
            if (isToday && settings && settings.whatsapp_group_jid) {
                const dateHeader = moment(targetDate).format("DD MMM YYYY (ddd)");
                const lines = report_content.split('\n').map(l => l.trim()).filter(l => l);
                const bulletList = lines.map(line => line.startsWith('•') || line.startsWith('-') ? line : `• ${line}`).join('\n');

                const message = `📋 *Work Report of ${empName}*\n📅 *Date:* ${dateHeader}\n✅ *Tasks Completed Today:*\n${bulletList}`;
                await sendToGroup(settings.whatsapp_group_jid, message);
            }
        } catch (waErr) {
            console.error("WA Work Report Notify Error:", waErr.message);
        }

        res.status(201).json({ message: "Work report submitted successfully", report });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getWorkReports = async (req, res) => {
    try {
        const { employee_id, date, startDate, endDate } = req.query;
        const where = {};

        // Admins can see all reports for a date/range if no specific employee_id is provided
        const isAdmin = ['admin', 'super_admin'].includes(req.user.role);

        if (employee_id) {
            where.employee_id = employee_id;
        } else if (!isAdmin) {
            // Non-admins only see their own
            where.employee_id = req.user.id;
        }
        // If isAdmin and no employee_id, fetches all for the date/range

        if (date) where.date = date;
        if (startDate && endDate) {
            where.date = { [Op.between]: [startDate, endDate] };
        }

        const reports = await ERP_WorkReport.findAll({
            where,
            include: [{ model: User, attributes: ['full_name', 'designation', 'profile_photo'] }],
            order: [['date', 'DESC']]
        });
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getWorkReportDates = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM format
        const targetMonth = month || moment().format("YYYY-MM");
        const startDate = moment(targetMonth, "YYYY-MM").startOf('month').format("YYYY-MM-DD");
        const endDate = moment(targetMonth, "YYYY-MM").endOf('month').format("YYYY-MM-DD");

        const reports = await ERP_WorkReport.findAll({
            where: {
                employee_id: req.user.id,
                date: { [Op.between]: [startDate, endDate] }
            },
            attributes: ['date'],
            order: [['date', 'ASC']]
        });

        const dates = reports.map(r => r.date);
        res.status(200).json(dates);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Tracking ---
export const saveLocation = async (req, res) => {
    try {
        const { latitude, longitude, address } = req.body;
        const loc = await ERP_EmployeeLocation.create({
            employee_id: req.user.id,
            latitude,
            longitude,
            address
        });
        res.status(201).json(loc);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Employees ---
export const getEmployees = async (req, res) => {
    try {
        const data = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'super_admin', 'employee'] }
            },
            order: [['full_name', 'ASC']]
        });
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Payroll ---
export const updatePayrollConfig = async (req, res) => {
    try {
        const { id } = req.params;
        const { gross_salary, joining_date, upi_id } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        await user.update({ gross_salary, joining_date, upi_id });
        res.status(200).json({ message: "Payroll configuration updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Helper: Calculate Working Days (Excluding Week-offs & Holidays) ---
const calculateWorkingDays = async (startDate, endDate) => {
    try {
        const settings = await ERP_OfficeSetting.findOne();
        const weekOffs = settings?.week_offs || ["Sunday"];

        const holidays = await ERP_Holiday.findAll({
            where: {
                [Op.or]: [
                    { from_date: { [Op.between]: [startDate, endDate] } },
                    { to_date: { [Op.between]: [startDate, endDate] } },
                    {
                        [Op.and]: [
                            { from_date: { [Op.lte]: startDate } },
                            { to_date: { [Op.gte]: endDate } }
                        ]
                    }
                ],
                is_active: true
            }
        });

        let count = 0;
        let cur = moment(startDate);
        const end = moment(endDate);

        while (cur <= end) {
            const dayName = cur.format("dddd");
            const isWeekOff = weekOffs.includes(dayName);
            const isHoliday = holidays.some(h => {
                const s = moment(h.from_date);
                const e = moment(h.to_date);
                return cur.isBetween(s, e, 'day', '[]');
            });

            if (!isWeekOff && !isHoliday) {
                count++;
            }
            cur.add(1, 'days');
        }
        return count;
    } catch (err) {
        console.error("Error calculating working days:", err);
        return moment(endDate).diff(moment(startDate), 'days') + 1; // Fallback to calendar days
    }
};

export const generateSalarySheet = async (req, res) => {
    try {
        const { month } = req.body; // e.g., "2026-04"
        if (!month) return res.status(400).json({ message: "Month is required (YYYY-MM)" });

        const startOfMonth = moment(month, "YYYY-MM").startOf('month').format("YYYY-MM-DD");
        const endOfMonth = moment(month, "YYYY-MM").endOf('month').format("YYYY-MM-DD");
        const monthLabel = moment(month, "YYYY-MM").format("MMMM YYYY");

        // Use helper to get REAL working days (excluding Sundays/Holidays)
        const totalWorkingDays = await calculateWorkingDays(startOfMonth, endOfMonth);

        // CLEANUP: Remove old generated records for this month to ensure fresh calculation & no column mismatch
        await ERP_Payroll.destroy({ where: { month: monthLabel, status: 'generated' } });

        const employees = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'employee', 'super_admin'] },
                is_active: true
            }
        });

        const results = [];

        for (const emp of employees) {
            // Count Attendance
            const presentCount = await ERP_Attendance.count({
                where: {
                    employee_id: emp.id,
                    date: { [Op.between]: [startOfMonth, endOfMonth] },
                    status: 'present'
                }
            });

            const absentCount = await ERP_Attendance.count({
                where: {
                    employee_id: emp.id,
                    date: { [Op.between]: [startOfMonth, endOfMonth] },
                    status: 'absent'
                }
            });

            // Gross Salary in User is Annual (Per Annum), we calculate monthly
            const annualGross = emp.gross_salary || 0;
            const monthlyGross = Math.round(annualGross / 12);

            // Salary calculation based on REAL working days
            const netPayable = totalWorkingDays > 0 ? (monthlyGross / totalWorkingDays) * presentCount : 0;

            await ERP_Payroll.upsert({
                employee_id: emp.id,
                month: monthLabel,
                gross_salary: monthlyGross, // Store Monthly Gross
                total_present: presentCount,
                total_absent: absentCount,
                total_working_days: totalWorkingDays,
                earned_salary: netPayable,
                net_payable: netPayable,
                status: 'generated'
            });

            results.push({
                id: emp.id,
                full_name: emp.full_name,
                designation: emp.designation,
                profile_photo: emp.profile_photo,
                mobile: emp.mobile,
                upi_id: emp.upi_id,
                gross_salary: monthlyGross,
                total_working_days: totalWorkingDays,
                total_present: presentCount,
                total_absent: absentCount,
                net_payable: netPayable
            });
        }

        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getPayrollReports = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        const monthLabel = month ? moment(month, "YYYY-MM").format("MMMM YYYY") : moment().format("MMMM YYYY");

        const data = await ERP_Payroll.findAll({
            where: { month: monthLabel },
            include: [{
                model: User,
                attributes: ['full_name', 'designation', 'profile_photo', 'mobile', 'upi_id']
            }],
        });

        // Flatten for frontend
        const reports = data.map(p => ({
            id: p.id,
            employee_id: p.employee_id,
            full_name: p.User?.full_name,
            designation: p.User?.designation,
            profile_photo: p.User?.profile_photo,
            mobile: p.User?.mobile,
            upi_id: p.User?.upi_id,
            gross_salary: p.gross_salary,
            total_working_days: p.total_working_days,
            total_present: p.total_present,
            total_absent: p.total_absent,
            net_payable: p.net_payable,
            status: p.status,
            createdAt: p.createdAt
        }));

        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMonthlyAttendanceSummary = async (req, res) => {
    try {
        const { month } = req.query; // YYYY-MM
        const targetMonth = month || moment().format("YYYY-MM");

        const startOfMonth = moment(targetMonth, "YYYY-MM").startOf('month').format("YYYY-MM-DD");
        const endOfMonth = moment(targetMonth, "YYYY-MM").endOf('month').format("YYYY-MM-DD");

        // 1. Calculate REAL working days for the range (excluding Sundays/Holidays)
        const totalWorkingDays = await calculateWorkingDays(startOfMonth, endOfMonth);

        // 2. Get all active staff
        const employees = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'employee', 'super_admin'] },
                is_active: true
            },
            order: [['full_name', 'ASC']]
        });

        // 3. Count Present/Absent for each employee in real-time
        const summary = [];
        for (const emp of employees) {
            const present = await ERP_Attendance.count({
                where: {
                    employee_id: emp.id,
                    date: { [Op.between]: [startOfMonth, endOfMonth] },
                    status: 'present'
                }
            });

            const absent = await ERP_Attendance.count({
                where: {
                    employee_id: emp.id,
                    date: { [Op.between]: [startOfMonth, endOfMonth] },
                    status: 'absent'
                }
            });

            summary.push({
                id: emp.id,
                full_name: emp.full_name,
                designation: emp.designation,
                profile_photo: emp.profile_photo,
                mobile: emp.mobile,
                email: emp.email,
                total_working_days: totalWorkingDays,
                total_present: present || 0,
                total_absent: absent || 0
            });
        }

        res.status(200).json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const markAllAbsent = async (req, res) => {
    try {
        const { date } = req.query;
        const targetDate = date || moment().format("YYYY-MM-DD");
        const dayName = moment(targetDate).format("dddd");

        // 1. Check Office Settings & Holidays
        const settings = await ERP_OfficeSetting.findOne();

        // Skip if its a Holiday
        const holiday = await ERP_Holiday.findOne({
            where: {
                from_date: { [Op.lte]: targetDate },
                to_date: { [Op.gte]: targetDate },
                is_active: true
            }
        });
        if (holiday) {
            return res.status(200).json({ success: true, message: `Skipping: ${targetDate} is a Holiday (${holiday.title}).` });
        }

        // 2. Process Absence for employees with no record (respecting per-employee week_offs)
        const employees = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'super_admin', 'employee'] },
                is_active: true
            }
        });
        const existing = await ERP_Attendance.findAll({ where: { date: targetDate } });
        const existingEmpIds = new Set(existing.map(a => a.employee_id));

        let absentCount = 0;
        let absentList = [];
        for (const emp of employees) {
            // Check per-employee week_offs first, then fallback to global
            const empWeekOffs = emp.week_offs || settings?.week_offs || ["Sunday"];
            if (empWeekOffs.includes(dayName)) {
                continue; // Skip - it's this employee's week-off
            }

            if (!existingEmpIds.has(emp.id)) {
                await ERP_Attendance.create({
                    employee_id: emp.id,
                    date: targetDate,
                    status: 'absent',
                    remarks: 'Marked Absent by System'
                });
                absentList.push(emp.full_name || "Unknown");
                absentCount++;
            }
        }

        // WhatsApp Notification to Group
        try {
            if (absentCount > 0 && settings && settings.whatsapp_group_jid) {
                const dateHeader = moment(targetDate).format("DD MMMM YYYY");
                const timeNow = moment().format("hh:mm A");
                const list = absentList.map(name => `❌ ${name}`).join("\n");

                const message = `🚨 *Attendance Alert – Absent Employees*\n\n📅 Date: ${dateHeader}\n🕒 Checked At: ${timeNow}\n\nThe following employees are marked *Absent* today:\n\n${list}\n\n⚠️ *Note:*\nIf any of the above employees have a valid reason (leave / late entry / technical issue), please contact HR Department.`;

                await sendToGroup(settings.whatsapp_group_jid, message);
            }
        } catch (waErr) {
            console.error("WA Absent notify error:", waErr.message);
        }

        res.status(200).json({ success: true, message: `Processed absence for ${absentCount} employees for ${targetDate}.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// --- Automated Notifications (CRON) ---

export const sendWorkReportReminder = async (req, res) => {
    try {
        const today = moment().format("YYYY-MM-DD");
        const dayName = moment(today).format("dddd");

        // 1. Check if it's a work day
        const settings = await ERP_OfficeSetting.findOne();
        if (settings?.week_offs?.includes(dayName)) {
            return res.status(200).json({ message: `Skipped: Today is a week-off (${dayName})` });
        }

        const holiday = await ERP_Holiday.findOne({
            where: {
                from_date: { [Op.lte]: today },
                to_date: { [Op.gte]: today }
            }
        });
        if (holiday) {
            return res.status(200).json({ message: `Skipped: Today is a holiday (${holiday.title})` });
        }

        // 2. Get all active staff
        const employees = await User.findAll({
            where: {
                role: { [Op.in]: ['admin', 'employee', 'super_admin'] },
                is_active: true
            }
        });

        // 3. Get employees who already submitted report today
        const submittedReports = await ERP_WorkReport.findAll({
            where: { date: today },
            attributes: ['employee_id']
        });
        const submittedIds = submittedReports.map(r => r.employee_id.toString());

        // 4. Send reminders to those who haven't
        let sentCount = 0;
        for (const emp of employees) {
            if (!submittedIds.includes(emp.id.toString()) && emp.mobile) {
                const message = `🔔 *Quick Reminder!*\n\nHi *${emp.full_name}*,\nBefore you log out, don’t forget to submit your *Work Report* for today in the ${companyName()} ERP app.\n\nYour report helps us track daily progress and ensures smooth operations.\n\n*${companyName()}*`;
                await sendWhatsAppText(emp.mobile, message);
                sentCount++;
            }
        }

        res.status(200).json({ message: `Sent ${sentCount} work report reminders.` });
    } catch (error) {
        console.error("Work Report Reminder Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const sendPunchOutReminder = async (req, res) => {
    try {
        const today = moment().format("YYYY-MM-DD");
        const dayName = moment(today).format("dddd");

        // 1. Check if it's a work day
        const settings = await ERP_OfficeSetting.findOne();
        if (settings?.week_offs?.includes(dayName)) {
            return res.status(200).json({ message: `Skipped: Today is a week-off (${dayName})` });
        }

        const holiday = await ERP_Holiday.findOne({
            where: {
                from_date: { [Op.lte]: today },
                to_date: { [Op.gte]: today },
                is_active: true
            }
        });
        if (holiday) {
            return res.status(200).json({ message: `Skipped: Today is a holiday (${holiday.title})` });
        }

        // 2. Get all active staff who punched in today but haven't punched out
        const attendances = await ERP_Attendance.findAll({
            where: {
                date: today,
                out_time: null,
                current_work_status: { [Op.ne]: 'stop' }
            },
            include: [{ model: User, where: { is_active: true } }]
        });

        let sentCount = 0;
        for (const att of attendances) {
            const emp = att.User;
            if (emp && emp.mobile) {
                const message = `🕒 *Punch-Out Reminder*\n\nHi *${emp.full_name}*,\nIt seems you haven't marked your *Punch-Out* yet for today.\n\nPlease remember to finalize your attendance before leaving to ensure accurate payroll calculation.\n\nThank you,\n*${companyName()} Operations*`;
                await sendWhatsAppText(emp.mobile, message);
                sentCount++;
            }
        }

        res.status(200).json({ message: `Sent ${sentCount} punch-out reminders.` });
    } catch (error) {
        console.error("Punch Out Reminder Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const autoPunchOut = async (req, res) => {
    try {
        const today = moment().format("YYYY-MM-DD");
        const now = moment().format("HH:mm:ss");

        // 1. Get all active staff who punched in today but haven't punched out yet
        const attendances = await ERP_Attendance.findAll({
            where: {
                date: today,
                out_time: null,
                current_work_status: { [Op.ne]: 'stop' }
            }
        });

        let punchedOutCount = 0;
        for (const att of attendances) {
            // Calculate total duration
            const duration = moment.duration(moment(now, "HH:mm:ss").diff(moment(att.in_time, "HH:mm:ss")));
            const hours = Math.floor(duration.asHours());
            const minutes = duration.minutes();
            const total_work_hours = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;

            await att.update({
                out_time: now,
                current_work_status: "stop",
                total_work_hours,
                remarks: att.remarks ? `${att.remarks} | Auto-Punch Out` : "Auto-Punch Out"
            });
            punchedOutCount++;
        }

        res.status(200).json({ message: `Auto-punched out ${punchedOutCount} employees.` });
    } catch (error) {
        console.error("Auto Punch Out Error:", error);
        res.status(500).json({ message: error.message });
    }
};

export const markAbsent = async (req, res) => {
    try {
        const { employee_id, date } = req.query;
        const targetDate = date || moment().format("YYYY-MM-DD");

        const existing = await ERP_Attendance.findOne({ where: { employee_id, date: targetDate } });
        if (existing) return res.status(400).json({ message: "Attendance already exists" });

        const attendance = await ERP_Attendance.create({
            employee_id,
            date: targetDate,
            status: 'absent',
            current_work_status: 'stop',
            remarks: "Marked Absent by Admin"
        });

        res.status(201).json({ message: "Marked absent", attendance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getWhatsAppStatus = async (req, res) => {
    try {
        const status = checkWAStatus();
        res.status(200).json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const resetWhatsApp = async (req, res) => {
    try {
        const result = await logoutWhatsApp();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getWAChats = async (req, res) => {
    try {
        const chats = await WhatsAppChat.findAll({
            order: [['timestamp', 'DESC']]
        });
        res.status(200).json(chats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getWAMessages = async (req, res) => {
    try {
        const { jid } = req.params;
        const messages = await WhatsAppMessage.findAll({
            where: { jid },
            order: [['timestamp', 'ASC']],
            limit: 100
        });
        res.status(200).json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendWASingleMessage = async (req, res) => {
    try {
        const { jid, number, message } = req.body;
        const target = jid || number;
        if (!target || !message) return res.status(400).json({ error: "Target and message are required" });
        
        const result = await sendWhatsAppText(target, message);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export const sendWAImage = async (req, res) => {
    try {
        const { jid, number, caption } = req.body;
        const target = jid || number;
        if (!target || !req.file) return res.status(400).json({ error: "Target and image are required" });
        
        const result = await sendWhatsAppImage(target, caption, req.file.path);
        // Clean up temp file if needed (sendWhatsAppImage uses the path)
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const sendWAMedia = async (req, res) => {
    try {
        const { jid, number, caption, type } = req.body; // type: 'video' | 'document'
        const target = jid || number;
        if (!target || !req.file) return res.status(400).json({ error: "Target and file are required" });
        
        let result;
        if (type === 'video') {
            result = await sendWhatsAppVideo(target, caption, req.file.path);
        } else {
            result = await sendWhatsAppDoc(target, req.file.path, req.file.originalname);
        }
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Cron Job API: Check Holiday for tomorrow and notify on WhatsApp ---
export const checkTomorrowHoliday = async (req, res) => {
    try {
        const tomorrow = moment().add(1, 'day').format("YYYY-MM-DD");
        const holiday = await ERP_Holiday.findOne({
            where: {
                from_date: { [Op.lte]: tomorrow },
                to_date: { [Op.gte]: tomorrow },
                is_active: true
            }
        });

        if (holiday) {
            const settings = await ERP_OfficeSetting.findOne();
            if (settings && settings.whatsapp_group_jid) {
                let message = "";
                const occasions = holiday.title;
                const from = moment(holiday.from_date).format("DD/MM/YYYY");
                const to = moment(holiday.to_date).format("DD/MM/YYYY");
                const tomorrowDateFormatted = moment(tomorrow).format("DD/MM/YYYY");
                const tomorrowDay = moment(tomorrow).format("dddd");

                if (holiday.total_days > 1) {
                    message = `🚨 *${companyName()} ERP: Holiday Announcement* 🚨\n\nOffices will remain closed from *${from}* to *${to}* on occasion of *${occasions}*.\n\n_System Broadcast_`;
                } else {
                    message = `🚨 *${companyName()} ERP: Holiday Announcement* 🚨\n\nTomorrow on *${tomorrowDateFormatted} (${tomorrowDay})* is a holiday on occasion of *${occasions}*.\n\n_System Broadcast_`;
                }

                await sendToGroup(settings.whatsapp_group_jid, message);
                return res.status(200).json({ message: "Notification sent", holiday: holiday.title });
            }
            return res.status(200).json({ message: "Holiday found but JID not set", holiday: holiday.title });
        }

        res.status(200).json({ message: "No holiday scheduled for tomorrow" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

