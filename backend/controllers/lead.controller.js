import { Lead, LeadHistory, User, ERP_OfficeSetting } from "../models/index.js";
import { Op } from "sequelize";
import { sendWhatsAppText } from "../utils/whatsappService.js";

// Create a new lead
export const createLead = async (req, res) => {
    try {
        const { name, status, contact, email, city, state, whatsapp, occupation, additionalInfo, assignedTo, source, interested_for } = req.body;
        const addedBy = req.user.id; // From auth middleware

        // Basic validation
        if (!name || !contact) {
            return res.status(400).json({ message: "Name and Contact number are required." });
        }

        // Duplicate Check
        const existingLead = await Lead.findOne({ where: { contact } });
        if (existingLead) {
            return res.status(400).json({ message: `A lead with this contact number (${contact}) is already added.` });
        }

        const newLead = await Lead.create({
            name,
            contact,
            email,
            city,
            state,
            whatsapp,
            occupation,
            additionalInfo,
            addedBy,
            assignedTo: assignedTo || addedBy, // Auto-assign to creator if not specified
            status: status || "New",
            source: source || "Meta Ad",
            interested_for: interested_for || null
        });

        // WhatsApp Notification to Assignee
        const assigneeId = newLead.assignedTo;
        if (assigneeId) {
            const assignee = await User.findByPk(assigneeId);
            if (assignee && assignee.mobile) {
                const message = `📋 *New Lead Assigned*\n\n*Name:* ${newLead.name}\n*Contact:* ${newLead.contact}\n*Source:* ${newLead.source}\n\nPlease check your dashboard for details.`;
                await sendWhatsAppText(assignee.mobile, message);
            }
        }

        res.status(201).json({ message: "Lead created successfully", lead: newLead });
    } catch (error) {
        console.error("Error creating lead:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get all leads with filters
export const getAllLeads = async (req, res) => {
    try {
        const { status, search, assignedTo, startDate, endDate, myLeads, interested_for } = req.query;
        let where = {};

        // Filter by status
        if (status && status !== 'All') {
            where.status = status;
        }

        // Filter by interested_for
        if (interested_for && interested_for !== 'All') {
            where.interested_for = interested_for;
        }

        // Search by name, contact, email, additional info, occupation, location, interested_for or remark in history
        if (search) {
            where[Op.or] = [
                { name: { [Op.like]: `%${search}%` } },
                { contact: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
                { additionalInfo: { [Op.like]: `%${search}%` } },
                { occupation: { [Op.like]: `%${search}%` } },
                { city: { [Op.like]: `%${search}%` } },
                { state: { [Op.like]: `%${search}%` } },
                { interested_for: { [Op.like]: `%${search}%` } },
                { '$LeadHistories.remark$': { [Op.like]: `%${search}%` } }
            ];
        }

        // Filter by Assigned User
        if (assignedTo) {
            where.assignedTo = assignedTo;
        }

        // If "myLeads" is true, only show leads assigned to the current user
        if (myLeads === 'true') {
            where.assignedTo = req.user.id;
        }

        // Date Range Filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt[Op.gte] = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt[Op.lte] = end;
            }
        }

        const leads = await Lead.findAll({
            where,
            include: [
                { model: User, as: 'Assignee', attributes: ['id', 'full_name', 'profile_photo'] },
                { model: User, as: 'Creator', attributes: ['id', 'full_name', 'profile_photo'] },
                {
                    model: LeadHistory,
                    as: 'LeadHistories',
                    include: [{ model: User, as: 'Actor', attributes: ['id', 'full_name', 'profile_photo'] }],
                }
            ],
            order: [['createdAt', 'DESC'], [{ model: LeadHistory, as: 'LeadHistories' }, 'createdAt', 'DESC']],
            subQuery: false
        });

        res.status(200).json(leads);
    } catch (error) {
        console.error("Error fetching leads:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Single Lead with History
export const getLeadById = async (req, res) => {
    try {
        const { id } = req.params;
        const lead = await Lead.findByPk(id, {
            include: [
                { model: User, as: 'Assignee', attributes: ['id', 'full_name', 'profile_photo'] },
                { model: User, as: 'Creator', attributes: ['id', 'full_name', 'profile_photo'] },
                {
                    model: LeadHistory,
                    as: 'LeadHistories',
                    include: [{ model: User, as: 'Actor', attributes: ['id', 'full_name', 'profile_photo'] }],
                }
            ],
            order: [[{ model: LeadHistory, as: 'LeadHistories' }, 'createdAt', 'DESC']]
        });

        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        res.status(200).json(lead);
    } catch (error) {
        console.error("Error fetching lead:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Update Lead (Status, Assign, Edit Info)
export const updateLead = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const lead = await Lead.findByPk(id);
        if (!lead) {
            return res.status(404).json({ message: "Lead not found" });
        }

        // Enforce assignment locking for converted leads
        if (lead.status === "Converted as Customer" && updateData.assignedTo && updateData.assignedTo !== lead.assignedTo) {
            return res.status(400).json({ message: "Assignment cannot be changed once a lead is converted." });
        }

        // Duplicate Check (if contact is being updated)
        if (updateData.contact && updateData.contact !== lead.contact) {
            const existingLead = await Lead.findOne({
                where: {
                    contact: updateData.contact,
                    id: { [Op.ne]: id }
                }
            });
            if (existingLead) {
                return res.status(400).json({ message: `Another lead with the contact number (${updateData.contact}) already exists.` });
            }
        }

        const oldAssigneeId = lead.assignedTo;
        const oldAppointmentDate = lead.appointment_date;
        const oldFollowupDate = lead.followup_date;

        // Reset followup_notified if followup_date changes
        if (updateData.followup_date && new Date(updateData.followup_date).getTime() !== new Date(oldFollowupDate).getTime()) {
            updateData.followup_notified = false;
        }

        await lead.update(updateData);

        // If assignment changed, notify new assignee
        if (updateData.assignedTo && updateData.assignedTo !== oldAssigneeId) {
            const assignee = await User.findByPk(updateData.assignedTo);
            if (assignee && assignee.mobile) {
                const message = `📋 *New Lead Assigned*\n\n*Name:* ${lead.name}\n*Contact:* ${lead.contact}\n\nPlease check your dashboard.`;
                await sendWhatsAppText(assignee.mobile, message);
            }
        }

        // Check if appointment_date was just set/updated or status changed to Interested
        const isAppointmentNewOrChanged = updateData.appointment_date && updateData.appointment_date !== oldAppointmentDate;
        const isStatusInterested = (updateData.status === "Interested" || lead.status === "Interested");

        if (isAppointmentNewOrChanged && isStatusInterested) {
            const settings = await ERP_OfficeSetting.findOne();
            if (settings && settings.admin_whatsapp_number) {
                const adminNumber = settings.admin_whatsapp_number;
                const formattedDate = new Date(updateData.appointment_date).toLocaleDateString('en-IN', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                });
                
                let message = `🎯 *Hot Lead Alert!*\n\n`;
                message += `*Name:* ${lead.name}\n`;
                message += `*Contact:* ${lead.contact}\n`;
                message += `*Location:* ${lead.city || 'N/A'}\n`;
                message += `*Interested For:* ${lead.interested_for || 'N/A'}\n`;
                message += `*Appointment Date:* ${formattedDate}\n\n`;
                message += `This lead is interested and ready to visit on the above date.`;
                
                await sendWhatsAppText(adminNumber, message);
            }
        }

        res.status(200).json({ message: "Lead updated successfully", lead });
    } catch (error) {
        console.error("Error updating lead:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Add Follow-up / History
export const addFollowUp = async (req, res) => {
    try {
        const { leadId } = req.params;
        const { remark, type } = req.body;
        const actionBy = req.user.id;

        // Handle file uploads
        let attachments = [];
        let audioRecording = null;

        if (req.files) {
            if (req.files.attachments) {
                attachments = req.files.attachments.map(file => `/uploads/${file.filename}`);
            }
            if (req.files.audio) {
                // Ensure we don't double prefix if filename already has path context from multer storage
                const filename = req.files.audio[0].filename;
                audioRecording = `/uploads/${filename}`;
            }
        }

        const historyRecord = await LeadHistory.create({
            leadId,
            actionBy,
            remark,
            type,
            status: req.body.status,
            attachments,
            audioRecording
        });

        // Fetch the created history with Actor details
        const history = await LeadHistory.findByPk(historyRecord.id, {
            include: [{ model: User, as: 'Actor', attributes: ['id', 'full_name', 'profile_photo'] }]
        });

        // Optionally update lead status or followup info if provided in body
        let leadUpdateData = {};
        if (req.body.status) leadUpdateData.status = req.body.status;
        
        if (req.body.followup_required !== undefined) {
            leadUpdateData.followup_required = req.body.followup_required === 'true' || req.body.followup_required === true;
        }
        if (req.body.followup_date) {
            leadUpdateData.followup_date = req.body.followup_date;
            leadUpdateData.followup_notified = false; // Reset notification flag for new date
        }

        if (Object.keys(leadUpdateData).length > 0) {
            await Lead.update(leadUpdateData, { where: { id: leadId } });
        }

        res.status(201).json({ message: "Follow-up added successfully", history });
    } catch (error) {
        console.error("Error adding follow-up:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

// Get Daily Report
export const getDailyReport = async (req, res) => {
    try {
        const { date } = req.query;
        const selectedDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(selectedDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(selectedDate.setHours(23, 59, 59, 999));

        const reports = await LeadHistory.findAll({
            where: {
                createdAt: {
                    [Op.between]: [startOfDay, endOfDay]
                }
            },
            include: [
                { model: User, as: 'Actor', attributes: ['id', 'full_name', 'profile_photo'] },
                { model: Lead, attributes: ['id', 'name', 'contact', 'city', 'status'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        // Group by User
        const userReports = {};
        reports.forEach(report => {
            const userName = report.Actor?.full_name || 'Unknown';
            if (!userReports[userName]) {
                userReports[userName] = [];
            }
            userReports[userName].push(report);
        });

        res.status(200).json(userReports);

    } catch (error) {
        console.error("Error fetching report:", error);
        res.status(500).json({ message: "Server error", error: error.message });
    }
};

export const sendDailyReportEmail = async (req, res) => {
    try {
        const { date, userReports, userName } = req.body;
        const targetEmail = process.env.COMPANY_EMAIL || "admin@company.com";
        const selectedDate = new Date(date);
        const dateString = selectedDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });

        const { transporter } = await import("../config/mailer.js");

        let tableRows = "";
        let serial = 1;

        const histories = Array.isArray(userReports) ? userReports : Object.values(userReports).flat();

        histories.forEach(h => {
            const timeStr = h.createdAt ? new Date(h.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--';
            const handledBy = h.Actor?.full_name || 'System';

            const attachmentLinks = h.attachments?.length
                ? h.attachments.map((a, i) => `<a href="${process.env.VITE_API_BASE_URL_IMG || 'http://localhost:5577'}${a}" style="display:inline-block;padding:2px 8px;background:#eef2ff;color:#4f46e5;text-decoration:none;border-radius:4px;font-size:10px;font-weight:bold;margin:2px;">Doc ${i + 1}</a>`).join("")
                : `<span style="color:#d1d5db;font-size:10px;">None</span>`;

            const audioLink = h.audioRecording
                ? `<a href="${process.env.VITE_API_BASE_URL_IMG || 'http://localhost:5577'}${h.audioRecording}" style="display:inline-block;padding:2px 8px;background:#fff7ed;color:#ea580c;text-decoration:none;border-radius:4px;font-size:10px;font-weight:bold;">Play Call</a>`
                : `<span style="color:#d1d5db;font-size:10px;">No Audio</span>`;

            tableRows += `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px 8px; font-size: 10px; color: #94a3b8; text-align: center;">${(serial++).toString().padStart(2, '0')}</td>
                    <td style="padding: 10px 8px; font-size: 11px;">
                        <div style="font-weight: bold; color: #1e293b;">${h.Lead?.name || 'Test Lead'}</div>
                        <div style="font-size: 10px; color: #94a3b8;">${h.Lead?.contact || '--'}</div>
                    </td>
                    <td style="padding: 10px 8px; font-size: 11px; color: #64748b;">${h.Lead?.city || '--'}</td>
                    <td style="padding: 10px 8px; font-size: 11px; color: #475569; font-style: italic;">"${h.remark || '--'}"</td>
                    <td style="padding: 10px 8px; font-size: 10px; text-align: center;">
                        <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-weight:bold;font-size:9px;background:${h.status === 'Interested' || h.Lead?.status === 'Interested' ? '#f0fdf4;color:#166534' : h.status === 'Not Interested' || h.Lead?.status === 'Not Interested' ? '#fef2f2;color:#991b1b' : '#f8fafc;color:#64748b'};">
                            ${h.status || h.Lead?.status || 'Active'}
                        </span>
                    </td>
                    <td style="padding: 10px 8px; font-size: 10px; text-align: center;">${attachmentLinks}</td>
                    <td style="padding: 10px 8px; font-size: 10px; text-align: center;">${audioLink}</td>
                    <td style="padding: 10px 8px; font-size: 11px; font-weight: bold; color: #1e293b; text-align: center;">${timeStr}</td>
                    <td style="padding: 10px 8px; font-size: 10px; color: #64748b; font-weight: bold; text-align: center;">${handledBy}</td>
                </tr>
            `;
        });

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #334155; }
                    table { width: 100%; border-collapse: collapse; }
                </style>
            </head>
            <body style="margin: 0; padding: 15px; background-color: #f8fafc;">
                <div style="max-width: 1100px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 25px; text-align: center;">
                        <h2 style="margin: 0; color: #ffffff; font-size: 18px;">${process.env.COMPANY_NAME || "ERP System"}</h2>
                        <h1 style="margin: 0; font-size: 22px; color: #ffffff; letter-spacing: -0.025em; font-weight: 800; font-style: italic;">Performance Analytics Report</h1>
                        <p style="margin: 5px 0 0; font-size: 11px; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em;">${dateString}</p>
                    </div>

                    <!-- Summary Area -->
                    <div style="padding: 20px; display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #f1f5f9;">
                        <div>
                            <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 4px;">Authorization Context</span>
                            <span style="font-size: 16px; font-weight: 800; color: #0f172a;">${userName}</span>
                        </div>
                        <div style="text-align: right;">
                            <div style="background: #f8fafc; padding: 8px 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                                <span style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 2px;">Total Interactions</span>
                                <span style="font-size: 20px; font-weight: 900; color: #1e40af;">${histories.length}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Table Area -->
                    <div style="padding: 15px;">
                        <table>
                            <thead style="background: #f8fafc;">
                                <tr>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: center;">#</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: left;">Lead Details</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: left;">City</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: left;">Follow-up Remark</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: center;">Disposition</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: center;">Proof</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: center;">Call</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: center;">Time</th>
                                    <th style="padding: 10px 8px; font-size: 9px; color: #94a3b8; text-transform: uppercase; text-align: center;">Handled By</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows || '<tr><td colspan="9" style="padding: 40px; text-align: center; color: #94a3b8; font-style: italic; font-size: 12px;">No activity logged.</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <!-- Footer -->
                    <div style="background: #f8fafc; padding: 15px; border-top: 1px solid #e2e8f0; text-align: center;">
                        <p style="margin: 0; font-size: 11px; font-weight: bold; color: #64748b;">${process.env.COMPANY_NAME || "ERP System"} | Automated Reporting System</p>
                        <p style="margin: 5px 0 0; font-size: 10px; color: #94a3b8;">Reply for manual verification. This is a system-generated document.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await transporter.sendMail({
            from: `"${process.env.COMPANY_NAME || "ERP"} Reporting" <${process.env.DEFAULT_FROM_EMAIL}>`,
            to: targetEmail,
            subject: `Work Report [${date}]: ${userName}`,
            html: html,
            replyTo: process.env.COMPANY_EMAIL || "noreply@company.com"
        });

        // WhatsApp Notification to Group
        try {
            const { ERP_OfficeSetting } = await import("../models/index.js");
            const { sendToGroup } = await import("../utils/waBot.js");
            const settings = await ERP_OfficeSetting.findOne();
            if (settings && settings.whatsapp_group_jid) {
                const message = `📊 *Daily Work Report Submitted*\n\n👤 *Submitted By:* ${userName}\n📅 *Date:* ${date}\n✅ *Total Interactions:* ${histories.length}\n\n*The detailed report has been sent via email to admin.*`;
                await sendToGroup(settings.whatsapp_group_jid, message);
            }
        } catch (waErr) {
            console.error("WA Group Notify Error in Daily Report:", waErr.message);
        }

        // ... existing code
        res.status(200).json({ message: "Report sent successfully to admin." });
    } catch (error) {
        console.error("Mail Error:", error);
        res.status(500).json({ message: "Error sending report.", error: error.message });
    }
};

export const bulkCreateLeads = async (req, res) => {
    try {
        const { leads } = req.body;
        const addedBy = req.user.id;

        if (!leads || !Array.isArray(leads) || leads.length === 0) {
            return res.status(400).json({ message: "No leads provided." });
        }

        // 1. Extract contacts
        // Ensure contacts are strings and cleaned (last 10 digits)
        const leadsWithContacts = leads.filter(l => l.contact).map(l => {
            let cleanContact = String(l.contact).replace(/\D/g, '');
            if (cleanContact.length > 10) cleanContact = cleanContact.slice(-10);
            return { ...l, contact: cleanContact };
        });
        const contacts = leadsWithContacts.map(l => l.contact);

        // 2. Find existing
        const existingLeads = await Lead.findAll({
            where: { contact: { [Op.in]: contacts } },
            attributes: ['contact']
        });
        const existingContacts = new Set(existingLeads.map(l => l.contact));

        // 3. Filter New
        const newLeads = leadsWithContacts
            .filter(l => l.name && l.contact && l.contact.length >= 10 && !existingContacts.has(l.contact))
            .map(l => ({
                name: l.name,
                contact: l.contact,
                email: l.email || null,
                city: l.city || null,
                state: l.state || null,
                addedBy,
                assignedTo: l.assignedTo || null,
                status: "New",
                source: "Excel Import",
                interested_for: l.interested_for || null
            }));

        if (newLeads.length > 0) {
            await Lead.bulkCreate(newLeads);
        }

        res.status(201).json({
            message: `Successfully imported ${newLeads.length} leads. ${leads.length - newLeads.length} duplicates skipped.`,
            count: newLeads.length,
            skipped: leads.length - newLeads.length
        });

    } catch (error) {
        console.error("Bulk Import Error:", error);
        res.status(500).json({ message: "Server error during bulk import." });
    }
};

// Bulk Assign Leads
export const bulkAssignLeads = async (req, res) => {
    try {
        const { leadIds, userId } = req.body;

        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0 || !userId) {
            return res.status(400).json({ message: "Invalid lead selection or user." });
        }

        // Exclude converted leads from reassignment to preserve record of who converted them
        const convertedLeads = await Lead.findAll({
            where: { id: { [Op.in]: leadIds }, status: "Converted as Customer" },
            attributes: ['id']
        });
        const convertedIds = new Set(convertedLeads.map(l => l.id));
        const finalIds = leadIds.filter(id => !convertedIds.has(id));

        if (finalIds.length === 0) {
            return res.status(400).json({ message: "Selected leads are already converted and cannot be reassigned." });
        }

        // Update leads
        await Lead.update(
            { assignedTo: userId },
            { where: { id: { [Op.in]: finalIds } } }
        );

        // Notify Assignee (Single Message)
        const assignee = await User.findByPk(userId);
        if (assignee && assignee.mobile) {
            const message = `📋 *Bulk Leads Assigned*\n\nYou have been assigned a total of *${leadIds.length}* new leads.\n\nPlease check your dashboard for details.`;
            await sendWhatsAppText(assignee.mobile, message);
        }

        res.status(200).json({ message: `Successfully assigned ${leadIds.length} leads.` });
    } catch (error) {
        console.error("Bulk Assign Error:", error);
        res.status(500).json({ message: "Server error during bulk assignment.", error: error.message });
    }
};
