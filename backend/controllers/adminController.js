import { User, Order, Lead, Product, sequelize } from "../models/index.js";
import { Op } from "sequelize";
import { sendWhatsAppText, sendWhatsAppImage, sendWhatsAppVideo, sendWhatsAppDoc } from "../utils/whatsappService.js";
import fs from "fs";
import bcrypt from "bcryptjs";

// @desc    Get admin statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getAdminStats = async (req, res) => {
    try {
        const userCount = await User.count();
        const orderCount = await Order.count();
        const leadCount = await Lead.count();
        const productCount = await Product.count();

        const recentOrders = await Order.findAll({
            limit: 5,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: User,
                    attributes: ["full_name", "email"]
                },
                {
                    model: Product,
                    attributes: ["title"]
                }
            ]
        });

        res.json({
            users: userCount,
            orders: orderCount,
            leads: leadCount,
            products: productCount,
            recentOrders: recentOrders
        });
    } catch (error) {
        console.error("❌ Admin Stats Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};// @desc    Get all users for management
// @route   GET /api/admin/users
// @access  Private/Admin
export const getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ["password"] },
            order: [["createdAt", "DESC"]]
        });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Error fetching users", error: error.message });
    }
};

// @desc    Send WhatsApp message from connected bot
// @route   POST /api/admin/send-whatsapp
// @access  Private/Admin
export const sendWhatsAppMessage = async (req, res) => {
    try {
        const { number, message, messageType, mediaUrl, fileName } = req.body;
        if (!number) return res.status(400).json({ message: "Number is required" });

        let result;
        switch (messageType) {
            case "image":
                result = await sendWhatsAppImage(number, message, mediaUrl);
                break;
            case "video":
                result = await sendWhatsAppVideo(number, message, mediaUrl);
                break;
            case "document":
                result = await sendWhatsAppDoc(number, mediaUrl, fileName);
                break;
            case "text":
            default:
                result = await sendWhatsAppText(number, message);
                break;
        }

        if (result.success) {
            res.status(200).json({ status: "sent", result: result.result });
        } else {
            res.status(500).json({ status: "failed", error: result.error });
        }
    } catch (error) {
        console.error("❌ Send WhatsApp Error:", error);
        res.status(500).json({ status: "failed", message: error.message });
    }
};


// @desc    Update user details
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Prevent updating super_admin role unless requester is also super_admin
        if (req.body.role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ message: "Only super admins can assign super admin role" });
        }

        // Handle file upload for profile photo
        if (req.file) {
            // Delete old photo
            if (user.profile_photo) {
                const oldPath = user.profile_photo.startsWith('/') ? user.profile_photo.substring(1) : user.profile_photo;
                try {
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                } catch (e) {}
            }
            user.profile_photo = `/uploads/${req.file.filename}`;
        }

        // Fields that store JSON and arrive as strings from FormData
        const jsonFields = ["address", "bank_details", "week_offs"];
        
        // Boolean fields
        const booleanFields = ["is_active", "call_access"];
        
        // Integer fields  
        const integerFields = ["gross_salary", "age"];

        // Update other fields
        const fieldsToUpdate = [
            "full_name", "email", "mobile", "role", "designation",
            "is_active", "smartflo_agent_id", "smartflo_caller_id",
            "call_access", "state", "city", "pincode", "address", "gross_salary",
            "joining_date", "upi_id", "work_mode", "age", "gender",
            "qualification", "bank_details", "office_in_time", "office_out_time", "week_offs",
            "sunday_in_time", "sunday_out_time"
        ];

        // Handle mobile standardization and uniqueness check
        if (req.body.mobile !== undefined && req.body.mobile !== user.mobile) {
            let standardizedMobile = req.body.mobile.toString().replace(/\D/g, '');
            if (standardizedMobile.length > 10) {
                standardizedMobile = standardizedMobile.slice(-10);
            }

            // Check if mobile already exists for another user
            const mobileExists = await User.findOne({
                where: {
                    mobile: standardizedMobile,
                    id: { [Op.ne]: user.id }
                }
            });
            if (mobileExists) {
                return res.status(400).json({ message: "Mobile number already in use by another user" });
            }
            user.mobile = standardizedMobile;
        }

        fieldsToUpdate.forEach(field => {
            if (field === 'mobile') return; // Already handled above
            if (req.body[field] !== undefined) {
                const val = req.body[field];

                if (booleanFields.includes(field)) {
                    // Handle booleans from FormData (arrive as strings)
                    user[field] = val === 'true' || val === true;
                } else if (jsonFields.includes(field)) {
                    // Parse JSON strings from FormData
                    if (typeof val === 'string' && val.trim() !== '') {
                        try {
                            user[field] = JSON.parse(val);
                        } catch (e) {
                            user[field] = val;
                        }
                    } else if (typeof val === 'object') {
                        user[field] = val;
                    } else {
                        user[field] = null;
                    }
                } else if (integerFields.includes(field)) {
                    // Parse integers
                    if (val === '' || val === null) {
                        user[field] = null;
                    } else {
                        const parsed = parseInt(val, 10);
                        user[field] = isNaN(parsed) ? null : parsed;
                    }
                } else if (val === '') {
                    user[field] = null;
                } else {
                    user[field] = val;
                }
            }
        });

        // Handle password change with hashing
        if (req.body.password && req.body.password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(req.body.password, salt);
        }

        await user.save();
        
        // Return user without password
        const updatedUser = user.toJSON();
        delete updatedUser.password;
        
        res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
        console.error("❌ Update User Error:", error);
        res.status(500).json({ message: "Error updating user", error: error.message });
    }
};

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private/Admin
export const createUser = async (req, res) => {
    try {
        const {
            full_name, email, mobile, employee_id, role, designation,
            is_active, smartflo_agent_id, smartflo_caller_id, call_access,
            state, city, pincode, address, gross_salary,
            joining_date, upi_id, work_mode, age, gender,
            qualification, bank_details, office_in_time, office_out_time,
            week_offs, sunday_in_time, sunday_out_time, password
        } = req.body;

        // Validation
        if (!full_name || !email || !mobile || !employee_id) {
            return res.status(400).json({
                message: "Full name, email, mobile, and employee_id are required"
            });
        }

        // Standardize mobile number (same as registerUser)
        let standardizedMobile = mobile.toString().replace(/\D/g, '');
        if (standardizedMobile.length > 10) {
            standardizedMobile = standardizedMobile.slice(-10);
        }

        // Check if email already exists
        const emailExists = await User.findOne({ where: { email: email.toLowerCase() } });
        if (emailExists) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        // Check if mobile already exists
        const mobileExists = await User.findOne({ where: { mobile: standardizedMobile } });
        if (mobileExists) {
            return res.status(400).json({ message: "User already exists with this mobile number" });
        }

        // Check if employee_id already exists
        const empIdExists = await User.findOne({ where: { employee_id } });
        if (empIdExists) {
            return res.status(400).json({ message: "User already exists with this employee ID" });
        }

        // Hash password - generate random password if not provided (required for worker login)
        let hashedPassword;
        if (password && password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        } else {
            // Generate a random password for workers who don't provide one
            const { generatePassword } = await import("../utils/generatePassword.js");
            const randomPassword = generatePassword(10);
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(randomPassword, salt);
        }

        // Parse JSON fields
        let parsedAddress = null;
        if (address) {
            try {
                parsedAddress = typeof address === 'string' ? JSON.parse(address) : address;
            } catch (e) {
                parsedAddress = address;
            }
        }

        let parsedBankDetails = null;
        if (bank_details) {
            try {
                parsedBankDetails = typeof bank_details === 'string' ? JSON.parse(bank_details) : bank_details;
            } catch (e) {
                parsedBankDetails = bank_details;
            }
        }

        let parsedWeekOffs = null;
        if (week_offs) {
            try {
                parsedWeekOffs = typeof week_offs === 'string' ? JSON.parse(week_offs) : week_offs;
            } catch (e) {
                parsedWeekOffs = week_offs;
            }
        }

        // Create user
        const user = await User.create({
            full_name,
            email: email.toLowerCase(),
            mobile: standardizedMobile,
            employee_id,
            role: role || 'employee',
            designation,
            is_active: is_active !== false,
            smartflo_agent_id,
            smartflo_caller_id,
            call_access: call_access === 'true' || call_access === true,
            state,
            city,
            pincode,
            address: parsedAddress,
            gross_salary: gross_salary ? parseInt(gross_salary) : null,
            joining_date,
            upi_id,
            work_mode,
            age: age ? parseInt(age) : null,
            gender,
            qualification,
            bank_details: parsedBankDetails,
            office_in_time,
            office_out_time,
            week_offs: parsedWeekOffs,
            sunday_in_time,
            sunday_out_time,
            password: hashedPassword
        });

        // Return user without password
        const newUser = user.toJSON();
        delete newUser.password;

        res.status(201).json({ message: "User created successfully", user: newUser });
    } catch (error) {
        console.error("❌ Create User Error:", error);
        res.status(500).json({ message: "Error creating user", error: error.message });
    }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private/SuperAdmin
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Only super_admin can delete
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ message: "Unauthorized. Super Admin access required." });
        }

        await user.destroy();
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("❌ Delete User Error:", error);
        res.status(500).json({ message: "Error deleting user", error: error.message });
    }
};
