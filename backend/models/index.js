import { Sequelize } from "sequelize";
import sequelize from "../config/db.js";
import User from "./User.js";
import Partner from "./Partner.js";
import Product from "./Product.js";
import Order from "./Order.js";
import Document from "./Document.js";
import Customer from "./Customer.js";
import Payment from "./Payment.js";
import Ticket from "./Ticket.js";
import ServiceGroup from "./ServiceGroup.js";
import ProductType from "./ProductType.js";
import Job from "./Job.js";
import Application from "./Application.js";
import Company from "./Company.js";
import TicketMessage from "./TicketMessage.js";
import Setting from "./Setting.js";
import DocumentType from "./DocumentType.js";
import PartnerCertificate from "./PartnerCertificate.js";
import Lead from "./Lead.js";
import LeadHistory from "./LeadHistory.js";
import MAKLead from "./MAKLead.js";
import MAKLeadHistory from "./MAKLeadHistory.js";
import MessageTemplate from "./MessageTemplate.js";
import Location from "./Location.js";
import SmartfloCaller from "./SmartfloCaller.js";
import MAKMember from "./MAKMember.js";
import MAKDocument from "./MAKDocument.js";
import MAKEvent from "./MAKEvent.js";
import Blog from "./Blog.js";
import Review from "./Review.js";
import ERP_Attendance from "./ERP_Attendance.js";
import ERP_OfficeSetting from "./ERP_OfficeSetting.js";
import ERP_ToDo from "./ERP_ToDo.js";
import ERP_WorkReport from "./ERP_WorkReport.js";
import ERP_Payroll from "./ERP_Payroll.js";
import ERP_EmployeeLocation from "./ERP_EmployeeLocation.js";
import ERP_LiveLocation from "./ERP_LiveLocation.js";
import ERP_LocationHistory from "./ERP_LocationHistory.js";
import ERP_Holiday from "./ERP_Holiday.js";
import MAK_MembershipPlan from "./MAK_MembershipPlan.js";
import WhatsAppMessage from "./WhatsAppMessage.js";
import WhatsAppChat from "./WhatsAppChat.js";
import ERP_OfferLetter from "./ERP_OfferLetter.js";



// User & Partner
// ... existing associations (I will use multi_replace if needed, but let's keep it simple)

// Job & Application
Job.hasMany(Application, { foreignKey: "jobId" });
Application.belongsTo(Job, { foreignKey: "jobId" });

User.hasMany(Application, { foreignKey: "userId" });
Application.belongsTo(User, { foreignKey: "userId" });

// User & Partner
User.hasOne(Partner, { foreignKey: "userId" });
Partner.belongsTo(User, { foreignKey: "userId" });

// Partner & PartnerCertificate
Partner.hasMany(PartnerCertificate, { foreignKey: "partnerId" });
PartnerCertificate.belongsTo(Partner, { foreignKey: "partnerId" });
User.hasMany(PartnerCertificate, { foreignKey: "userId" });
PartnerCertificate.belongsTo(User, { foreignKey: "userId" });

// User & Order
User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

// User & Document
User.hasMany(Document, { foreignKey: "userId" });
Document.belongsTo(User, { foreignKey: "userId" });

// User & Payment
User.hasMany(Payment, { foreignKey: "userId" });
Payment.belongsTo(User, { foreignKey: "userId" });

// User & Ticket
User.hasMany(Ticket, { foreignKey: "userId" });
Ticket.belongsTo(User, { foreignKey: "userId" });

// User & Company
User.hasMany(Company, { foreignKey: "userId" });
Company.belongsTo(User, { foreignKey: "userId" });

// Partner & Customer
Partner.hasMany(Customer, { foreignKey: "partnerId" });
Customer.belongsTo(Partner, { foreignKey: "partnerId" });

// Customer & Document
Customer.hasMany(Document, { foreignKey: "customerId" });
Document.belongsTo(Customer, { foreignKey: "customerId" });

// Customer & Order
Customer.hasMany(Order, { foreignKey: "customerId" });
Order.belongsTo(Customer, { foreignKey: "customerId" });

// Product & ServiceGroup / ProductType
ServiceGroup.hasMany(ProductType, { foreignKey: "serviceGroupId" });
ProductType.belongsTo(ServiceGroup, { foreignKey: "serviceGroupId" });

ServiceGroup.hasMany(Product, { foreignKey: "serviceGroupId" });
Product.belongsTo(ServiceGroup, { foreignKey: "serviceGroupId" });

ProductType.hasMany(Product, { foreignKey: "productTypeId" });
Product.belongsTo(ProductType, { foreignKey: "productTypeId" });

// Product & Order
Product.hasMany(Order, { foreignKey: "productId" });
Order.belongsTo(Product, { foreignKey: "productId" });

// Order & Payment
Order.hasMany(Payment, { foreignKey: "orderId" });
Payment.belongsTo(Order, { foreignKey: "orderId" });

// Ticket & TicketMessage
Ticket.hasMany(TicketMessage, { foreignKey: "ticketId" });
TicketMessage.belongsTo(Ticket, { foreignKey: "ticketId" });

// Lead & User
User.hasMany(Lead, { foreignKey: "addedBy", as: "CreatedLeads" });
Lead.belongsTo(User, { foreignKey: "addedBy", as: "Creator" });

User.hasMany(Lead, { foreignKey: "assignedTo", as: "AssignedLeads" });
Lead.belongsTo(User, { foreignKey: "assignedTo", as: "Assignee" });

// Lead & LeadHistory
Lead.hasMany(LeadHistory, { foreignKey: "leadId" });
LeadHistory.belongsTo(Lead, { foreignKey: "leadId" });

// LeadHistory & User
User.hasMany(LeadHistory, { foreignKey: "actionBy", as: "LeadActions" });
LeadHistory.belongsTo(User, { foreignKey: "actionBy", as: "Actor" });

// MAKLead & User
User.hasMany(MAKLead, { foreignKey: "addedBy", as: "CreatedMAKLeads" });
MAKLead.belongsTo(User, { foreignKey: "addedBy", as: "Creator" });

User.hasMany(MAKLead, { foreignKey: "assignedTo", as: "AssignedMAKLeads" });
MAKLead.belongsTo(User, { foreignKey: "assignedTo", as: "Assignee" });

// MAKLead & MAKLeadHistory
MAKLead.hasMany(MAKLeadHistory, { foreignKey: "makLeadId" });
MAKLeadHistory.belongsTo(MAKLead, { foreignKey: "makLeadId" });

// MAKLeadHistory & User
User.hasMany(MAKLeadHistory, { foreignKey: "actionBy", as: "MAKLeadActions" });
MAKLeadHistory.belongsTo(User, { foreignKey: "actionBy", as: "Actor" });

// MessageTemplate & User
User.hasMany(MessageTemplate, { foreignKey: "createdBy" });
MessageTemplate.belongsTo(User, { foreignKey: "createdBy" });

// MAK Member Associations
MAKMember.hasMany(MAKDocument, { foreignKey: "memberId", as: "Documents" });
MAKDocument.belongsTo(MAKMember, { foreignKey: "memberId" });

// ERP Associations
User.hasMany(ERP_Attendance, { foreignKey: "employee_id" });
ERP_Attendance.belongsTo(User, { foreignKey: "employee_id" });

User.hasMany(ERP_ToDo, { foreignKey: "employee_id" });
ERP_ToDo.belongsTo(User, { foreignKey: "employee_id" });

User.hasMany(ERP_WorkReport, { foreignKey: "employee_id" });
ERP_WorkReport.belongsTo(User, { foreignKey: "employee_id" });

User.hasMany(ERP_Payroll, { foreignKey: "employee_id" });
ERP_Payroll.belongsTo(User, { foreignKey: "employee_id" });

User.hasMany(ERP_EmployeeLocation, { foreignKey: "employee_id" });
ERP_EmployeeLocation.belongsTo(User, { foreignKey: "employee_id" });

User.hasOne(ERP_LiveLocation, { foreignKey: "employee_id" });
ERP_LiveLocation.belongsTo(User, { foreignKey: "employee_id" });

User.hasMany(ERP_LocationHistory, { foreignKey: "employee_id" });
ERP_LocationHistory.belongsTo(User, { foreignKey: "employee_id" });

// ERP OfferLetter Associations
User.hasMany(ERP_OfferLetter, { foreignKey: "employee_id", as: "OfferLettersReceived" });
ERP_OfferLetter.belongsTo(User, { foreignKey: "employee_id", as: "Employee" });
User.hasMany(ERP_OfferLetter, { foreignKey: "generated_by", as: "OfferLettersGenerated" });
ERP_OfferLetter.belongsTo(User, { foreignKey: "generated_by", as: "GeneratedBy" });


const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("✅ Database connected successfully.");

        // Sync models - standard sync, manual patches below handle changes
        await sequelize.sync();

        // Manual check/patch for missing columns in existing tables
        // Sequelize sync({force:false}) doesn't add new columns to existing tables
        try {
            const queryInterface = sequelize.getQueryInterface();

            // Patch Users table
            const userTableInfo = await queryInterface.describeTable('Users');
            const userColumnsToAdd = [
                { name: 'designation', type: Sequelize.STRING },
                { name: 'state', type: Sequelize.STRING },
                { name: 'city', type: Sequelize.STRING },
                { name: 'pincode', type: Sequelize.STRING },
                { name: 'qualification', type: Sequelize.STRING },
                { name: 'age', type: Sequelize.INTEGER },
                { name: 'gender', type: Sequelize.STRING },
                { name: 'secondary_mobiles', type: Sequelize.JSON },
                { name: 'secondary_emails', type: Sequelize.JSON },
                { name: 'bank_details', type: Sequelize.JSON },
                { name: 'is_partner_application_sent', type: Sequelize.BOOLEAN },
                { name: 'is_active', type: Sequelize.BOOLEAN },
                { name: 'smartflo_agent_id', type: Sequelize.STRING },
                { name: 'call_access', type: Sequelize.BOOLEAN },
                { name: 'smartflo_caller_id', type: Sequelize.STRING },
                { name: 'work_mode', type: Sequelize.ENUM('Remote', 'Office') },
                { name: 'gross_salary', type: Sequelize.INTEGER },
                { name: 'joining_date', type: Sequelize.DATEONLY },
                { name: 'upi_id', type: Sequelize.STRING },
                { name: 'office_in_time', type: Sequelize.TIME },
                { name: 'office_out_time', type: Sequelize.TIME },
                { name: 'week_offs', type: Sequelize.JSON },
                { name: 'sunday_in_time', type: Sequelize.TIME },
                { name: 'sunday_out_time', type: Sequelize.TIME },
                { name: 'employee_id', type: Sequelize.STRING },
            ];

            for (const col of userColumnsToAdd) {
                if (!userTableInfo[col.name]) {
                    console.log(`🛠️  Adding missing column '${col.name}' to Users...`);
                    await queryInterface.addColumn('Users', col.name, {
                        type: col.type,
                        allowNull: true
                    });
                    console.log(`✅ Column '${col.name}' added successfully.`);
                }
            }

            // Manually update ENUM for role
            try {
                await sequelize.query("ALTER TABLE Users MODIFY COLUMN role ENUM('user', 'admin', 'partner', 'employee', 'super_admin') DEFAULT 'user';");
                console.log("✅ Role ENUM updated successfully.");
            } catch (enumErr) {
                console.log("ℹ️ Role ENUM update skipped or failed (might already exist):", enumErr.message);
            }

            // Patch PartnerCertificates
            const certTableInfo = await queryInterface.describeTable('PartnerCertificates');
            if (!certTableInfo.templateVersion) {
                console.log("🛠️  Adding missing column 'templateVersion' to PartnerCertificates...");
                await queryInterface.addColumn('PartnerCertificates', 'templateVersion', {
                    type: Sequelize.STRING,
                    allowNull: false,
                    defaultValue: 'v2-landscape-vintage'
                });
                console.log("✅ Column 'templateVersion' added successfully.");
            }

            // Patch LeadHistories status column
            const historyTableInfo = await queryInterface.describeTable('LeadHistories');
            if (!historyTableInfo.status) {
                console.log("🛠️  Adding missing column 'status' to LeadHistories...");
                await queryInterface.addColumn('LeadHistories', 'status', {
                    type: Sequelize.STRING,
                    allowNull: true
                });
                console.log("✅ Column 'status' added successfully.");
            }

            // Patch Leads columns
            const leadTableInfo = await queryInterface.describeTable('Leads');
            if (!leadTableInfo.source) {
                console.log("🛠️  Adding missing column 'source' to Leads...");
                await queryInterface.addColumn('Leads', 'source', {
                    type: Sequelize.STRING,
                    allowNull: true,
                    defaultValue: 'Meta Ad'
                });
                console.log("✅ Column 'source' added successfully.");
            }
            if (!leadTableInfo.interested_for) {
                console.log("🛠️  Adding missing column 'interested_for' to Leads...");
                await queryInterface.addColumn('Leads', 'interested_for', {
                    type: Sequelize.STRING,
                    allowNull: true
                });
                console.log("✅ Column 'interested_for' added successfully.");
            }
            if (!leadTableInfo.appointment_date) {
                console.log("🛠️  Adding missing column 'appointment_date' to Leads...");
                await queryInterface.addColumn('Leads', 'appointment_date', {
                    type: Sequelize.DATEONLY,
                    allowNull: true
                });
                console.log("✅ Column 'appointment_date' added successfully.");
            }
            if (!leadTableInfo.followup_required) {
                console.log("🛠️  Adding missing column 'followup_required' to Leads...");
                await queryInterface.addColumn('Leads', 'followup_required', {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                });
                console.log("✅ Column 'followup_required' added successfully.");
            }
            if (!leadTableInfo.followup_date) {
                console.log("🛠️  Adding missing column 'followup_date' to Leads...");
                await queryInterface.addColumn('Leads', 'followup_date', {
                    type: Sequelize.DATE,
                    allowNull: true
                });
                console.log("✅ Column 'followup_date' added successfully.");
            }
            if (!leadTableInfo.followup_notified) {
                console.log("🛠️  Adding missing column 'followup_notified' to Leads...");
                await queryInterface.addColumn('Leads', 'followup_notified', {
                    type: Sequelize.BOOLEAN,
                    defaultValue: false
                });
                console.log("✅ Column 'followup_notified' added successfully.");
            }

            // Update ENUM for Status to include 'Converted as Customer'
            try {
                await sequelize.query("ALTER TABLE Leads MODIFY COLUMN status ENUM('Interested', 'Not Interested', 'May be Interested', 'New', 'Converted as Customer') DEFAULT 'New';");
                console.log("✅ Leads Status ENUM updated successfully.");
            } catch (enumErr) {
                console.log("ℹ️ Leads Status ENUM update failed:", enumErr.message);
            }

            // Patch Blogs table
            try {
                const blogTableInfo = await queryInterface.describeTable('Blogs');
                if (!blogTableInfo.category) {
                    console.log("🛠️  Adding missing column 'category' to Blogs...");
                    await queryInterface.addColumn('Blogs', 'category', {
                        type: Sequelize.ENUM("SBGM", "CSP", "MAK"),
                        defaultValue: "SBGM",
                        allowNull: false
                    });
                    console.log("✅ Column 'category' added successfully.");
                }
            } catch (err) {
                console.log("Blogs check skipped or failed:", err.message);
            }

            // Patch MAKLeads columns
            try {
                const makLeadTableInfo = await queryInterface.describeTable('MAKLeads');
                if (!makLeadTableInfo.interested_for) {
                    console.log("🛠️  Adding missing column 'interested_for' to MAKLeads...");
                    await queryInterface.addColumn('MAKLeads', 'interested_for', {
                        type: Sequelize.STRING,
                        allowNull: true
                    });
                    console.log("✅ Column 'interested_for' added successfully.");
                }

                // Update ENUM for Status to include 'Converted as Customer'
                try {
                    await sequelize.query("ALTER TABLE MAKLeads MODIFY COLUMN status ENUM('Interested', 'Not Interested', 'May be Interested', 'New', 'Converted as Customer') DEFAULT 'New';");
                    console.log("✅ MAKLeads Status ENUM updated successfully.");
                } catch (enumErr) {
                    console.log("ℹ️ MAKLeads Status ENUM update failed:", enumErr.message);
                }
            } catch (err) {
                console.log("MAKLeads might not exist yet:", err.message);
            }
            // Patch Partner plan_type column
            const partnerTableInfo = await queryInterface.describeTable('Partners');
            if (!partnerTableInfo.plan_type) {
                console.log("🛠️  Adding missing column 'plan_type' to Partners...");
                await queryInterface.addColumn('Partners', 'plan_type', {
                    type: Sequelize.STRING,
                    allowNull: true,
                    defaultValue: 'Member'
                });
                console.log("✅ Column 'plan_type' added successfully.");
            }

            // Patch Payments remarks column
            const paymentTableInfo = await queryInterface.describeTable('Payments');
            if (!paymentTableInfo.remarks) {
                console.log("🛠️  Adding missing column 'remarks' to Payments...");
                await queryInterface.addColumn('Payments', 'remarks', {
                    type: Sequelize.TEXT,
                    allowNull: true
                });
                console.log("✅ Column 'remarks' added successfully.");
            }

            // Patch Payments userId to allow null
            if (paymentTableInfo.userId && paymentTableInfo.userId.allowNull === false) {
                console.log("🛠️  Updating 'userId' to allow null in Payments...");
                await queryInterface.changeColumn('Payments', 'userId', {
                    type: Sequelize.UUID,
                    allowNull: true
                });
                console.log("✅ Column 'userId' updated successfully.");
            }

            // Patch ERP_holidays table
            try {
                const holidayTableInfo = await queryInterface.describeTable('ERP_holidays');
                const holidayCols = [
                    { name: 'title', type: Sequelize.STRING },
                    { name: 'from_date', type: Sequelize.DATEONLY },
                    { name: 'to_date', type: Sequelize.DATEONLY },
                    { name: 'total_days', type: Sequelize.INTEGER },
                    { name: 'description', type: Sequelize.TEXT },
                    { name: 'is_active', type: Sequelize.BOOLEAN }
                ];
                for (const col of holidayCols) {
                    if (!holidayTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to ERP_holidays...`);
                        await queryInterface.addColumn('ERP_holidays', col.name, {
                            type: col.type,
                            allowNull: true
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }

                // FIX: Legacy 'date' column might be NOT NULL causing errors
                if (holidayTableInfo['date'] && holidayTableInfo['date'].allowNull === false) {
                    console.log(`🛠️  Setting legacy column 'date' to NULLABLE in ERP_holidays...`);
                    await queryInterface.changeColumn('ERP_holidays', 'date', {
                        type: Sequelize.DATEONLY,
                        allowNull: true
                    });
                    console.log(`✅ Column 'date' is now nullable.`);
                }
            } catch (err) {
                console.log("ERP_holidays check skipped:", err.message);
            }

            // Patch ERP_office_settings table
            try {
                const settingTableInfo = await queryInterface.describeTable('ERP_office_settings');
                const settingCols = [
                    { name: 'max_allowed_late', type: Sequelize.INTEGER, defaultValue: 15 },
                    { name: 'max_allowed_early', type: Sequelize.INTEGER, defaultValue: 15 },
                    { name: 'whatsapp_group_jid', type: Sequelize.STRING, defaultValue: '120363426215512132@g.us' },
                    { name: 'week_offs', type: Sequelize.JSON, defaultValue: ["Sunday"] },
                    { name: 'absent_notification_time', type: Sequelize.TIME, defaultValue: '11:00:00' },
                    { name: 'absent_notification_enabled', type: Sequelize.BOOLEAN, defaultValue: true },
                    { name: 'admin_whatsapp_number', type: Sequelize.STRING, defaultValue: null }
                ];
                for (const col of settingCols) {
                    if (!settingTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to ERP_office_settings...`);
                        await queryInterface.addColumn('ERP_office_settings', col.name, {
                            type: col.type,
                            allowNull: true,
                            defaultValue: col.defaultValue
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }
            } catch (err) {
                console.log("ERP_office_settings check skipped:", err.message);
            }

            // Patch ERP_todo_list table
            try {
                const todoTableInfo = await queryInterface.describeTable('ERP_todo_list');
                const todoCols = [
                    { name: 'deadline', type: Sequelize.DATE },
                    { name: 'assigned_by', type: Sequelize.UUID }
                ];
                for (const col of todoCols) {
                    if (!todoTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to ERP_todo_list...`);
                        await queryInterface.addColumn('ERP_todo_list', col.name, {
                            type: col.type,
                            allowNull: true
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }
            } catch (err) {
                console.log("ERP_todo_list check skipped:", err.message);
            }

            // Patch ERP_employee_attendance table
            try {
                const attendanceTableInfo = await queryInterface.describeTable('ERP_employee_attendance');
                if (attendanceTableInfo.location && attendanceTableInfo.location.type !== 'TEXT') {
                    console.log(`🛠️  Updating 'location' column to TEXT in ERP_employee_attendance...`);
                    await queryInterface.changeColumn('ERP_employee_attendance', 'location', {
                        type: Sequelize.TEXT,
                        allowNull: true
                    });
                    console.log(`✅ Column 'location' updated successfully.`);
                }
                if (attendanceTableInfo.photo && (attendanceTableInfo.photo.type !== 'TEXT' && attendanceTableInfo.photo.type !== 'LONGTEXT')) {
                    console.log(`🛠️  Updating 'photo' column to LONGTEXT in ERP_employee_attendance...`);
                    await queryInterface.changeColumn('ERP_employee_attendance', 'photo', {
                        type: Sequelize.TEXT('long'),
                        allowNull: true
                    });
                    console.log(`✅ Column 'photo' added/updated successfully.`);
                }
                // Ensure current_work_status is VARCHAR(50) and not a restrictive ENUM
                if (attendanceTableInfo.current_work_status) {
                    console.log(`🛠️  Ensuring 'current_work_status' column is STRING(50) in ERP_employee_attendance...`);
                    await queryInterface.changeColumn('ERP_employee_attendance', 'current_work_status', {
                        type: Sequelize.STRING(50),
                        allowNull: true,
                        defaultValue: 'stop'
                    });
                    console.log(`✅ Column 'current_work_status' verified/updated.`);
                }

                // Add unique index for (employee_id, date) to prevent duplicates
                try {
                    await queryInterface.addIndex('ERP_employee_attendance', ['employee_id', 'date'], {
                        unique: true,
                        name: 'emp_date_unique'
                    });
                    console.log("✅ Unique index 'emp_date_unique' added to ERP_employee_attendance.");
                } catch (idxErr) {
                    // This error is expected if the index already exists
                }
            } catch (err) {
                console.log("ERP_employee_attendance check skipped:", err.message);
            }

            // Patch ERP_payrolls table
            try {
                const payrollTableInfo = await queryInterface.describeTable('ERP_payrolls');
                const payrollCols = [
                    { name: 'gross_salary', type: Sequelize.DECIMAL(10, 2), defaultValue: 0 },
                    { name: 'total_absent', type: Sequelize.INTEGER, defaultValue: 0 },
                    { name: 'total_working_days', type: Sequelize.INTEGER, defaultValue: 0 },
                    { name: 'net_payable', type: Sequelize.DECIMAL(10, 2), defaultValue: 0 }
                ];
                for (const col of payrollCols) {
                    if (!payrollTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to ERP_payrolls...`);
                        await queryInterface.addColumn('ERP_payrolls', col.name, {
                            type: col.type,
                            allowNull: true, // Allow null for safety in existing rows
                            defaultValue: col.defaultValue
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }

                // Add unique index for upsert compatibility
                try {
                    await queryInterface.addIndex('ERP_payrolls', ['employee_id', 'month'], {
                        unique: true,
                        name: 'emp_month_unique'
                    });
                    console.log("✅ Unique index 'emp_month_unique' added to ERP_payrolls.");
                } catch (idxErr) {
                    // This error is expected if the index already exists
                }
            } catch (err) {
                console.log("ERP_payrolls table might not exist yet:", err.message);
            }

            // Patch MAKMembers columns
            try {
                const makMemberTableInfo = await queryInterface.describeTable('MAKMembers');
                const makCols = [
                    { name: 'occupation', type: Sequelize.STRING },
                    { name: 'password', type: Sequelize.STRING },
                    { name: 'otp', type: Sequelize.STRING },
                    { name: 'otpExpires', type: Sequelize.DATE },
                    { name: 'idCardUrl', type: Sequelize.STRING },
                    { name: 'certificateUrl', type: Sequelize.STRING },
                ];

                for (const col of makCols) {
                    if (!makMemberTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to MAKMembers...`);
                        await queryInterface.addColumn('MAKMembers', col.name, {
                            type: col.type,
                            allowNull: true
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }
            } catch (err) {
                console.log("MAKMembers update error:", err.message);
            }

            // Patch whatsapp_messages table
            try {
                const waTableInfo = await queryInterface.describeTable('whatsapp_messages');
                const waCols = [
                    { name: 'fromMe', type: Sequelize.BOOLEAN },
                    { name: 'pushName', type: Sequelize.STRING },
                    { name: 'content', type: Sequelize.TEXT },
                    { name: 'timestamp', type: Sequelize.BIGINT },
                    { name: 'type', type: Sequelize.STRING(50) },
                    { name: 'status', type: Sequelize.INTEGER },
                    { name: 'jid', type: Sequelize.STRING(100) }
                ];

                for (const col of waCols) {
                    if (!waTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to whatsapp_messages...`);
                        await queryInterface.addColumn('whatsapp_messages', col.name, {
                            type: col.type,
                            allowNull: true
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }
            } catch (err) {
                console.log("whatsapp_messages update error:", err.message);
            }

            // Patch whatsapp_chats table
            try {
                const chatTableInfo = await queryInterface.describeTable('whatsapp_chats');
                const chatCols = [
                    { name: 'name', type: Sequelize.STRING },
                    { name: 'lastMessage', type: Sequelize.TEXT },
                    { name: 'timestamp', type: Sequelize.BIGINT },
                    { name: 'unreadCount', type: Sequelize.INTEGER }
                ];

                for (const col of chatCols) {
                    if (!chatTableInfo[col.name]) {
                        console.log(`🛠️  Adding missing column '${col.name}' to whatsapp_chats...`);
                        await queryInterface.addColumn('whatsapp_chats', col.name, {
                            type: col.type,
                            allowNull: true
                        });
                        console.log(`✅ Column '${col.name}' added successfully.`);
                    }
                }
            } catch (err) {
                console.log("whatsapp_chats update error:", err.message);
            }

        } catch (patchError) {
            console.warn("⚠️  Schema patch warning:", patchError.message);
        }

        // Patch ERP_offer_letters table
        try {
            const queryInterface = sequelize.getQueryInterface();
            const offerTableInfo = await queryInterface.describeTable('ERP_offer_letters');
            if (!offerTableInfo['responsibilities']) {
                console.log(`🛠️  Adding missing column 'responsibilities' to ERP_offer_letters...`);
                await queryInterface.addColumn('ERP_offer_letters', 'responsibilities', {
                    type: Sequelize.TEXT,
                    allowNull: true
                });
                console.log(`✅ Column 'responsibilities' added successfully.`);
            }
        } catch (err) {
            console.log("ERP_offer_letters update error:", err.message);
        }


        console.log("✅ Database synced and patched successfully.");
    } catch (error) {
        console.error("❌ Database sync error:", error.message);
        // Don't crash the server, just log the error
    }
};

export {
    sequelize,
    Sequelize,
    syncDatabase,
    User,
    Partner,
    PartnerCertificate,
    Product,
    Order,
    Document,
    Customer,
    Payment,
    Ticket,
    ServiceGroup,
    ProductType,
    Job,
    Application,
    Company,
    TicketMessage,
    Setting,
    DocumentType,
    Lead,

    LeadHistory,
    MAKLead,
    MAKLeadHistory,
    MessageTemplate,
    Location,
    SmartfloCaller,
    MAKMember,
    MAKDocument,
    MAKEvent,
    Blog,
    Review,
    ERP_Attendance,
    ERP_OfficeSetting,
    ERP_ToDo,
    ERP_WorkReport,
    ERP_Payroll,
    ERP_EmployeeLocation,
    ERP_LiveLocation,
    ERP_LocationHistory,
    ERP_Holiday,
    MAK_MembershipPlan,
    WhatsAppMessage,
    WhatsAppChat,
    ERP_OfferLetter
};

