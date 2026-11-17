import asyncHandler from "express-async-handler";

import fs from "fs";
import path from "path";
import { User } from "../models/index.js";
import generateToken from "../utils/generateToken.js";
import { generatePassword } from "../utils/generatePassword.js";
import { transporter } from "../config/mailer.js";
import { companyName } from "../config/company.js";
import bcrypt from "bcryptjs";

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
    try {
        let { full_name, mobile, email, address, state, city, pincode } = req.body;

        // Standardization Logic
        if (full_name) {
            full_name = full_name
                .toLowerCase()
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
        }

        if (mobile) {
            // Remove non-digit characters
            mobile = mobile.toString().replace(/\D/g, '');
            // Take last 10 digits (removes +91 or 0 prefix)
            if (mobile.length > 10) {
                mobile = mobile.slice(-10);
            }
            // Ensure strict 10 digit rule for Indian numbers after cleanup 
            // (If user entered just 098..., slice(-10) fixes it. If they entered 789... it stays 789...)
        }

        const lowerEmail = email.toLowerCase();
        const userExists = await User.findOne({ where: { email: lowerEmail } });
        if (userExists) {
            return res.status(400).json({ message: "User already exists with this email" });
        }

        const mobileExists = await User.findOne({ where: { mobile } });
        if (mobileExists) {
            return res.status(400).json({ message: "User already exists with this mobile number" });
        }

        const password = generatePassword(10);
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            full_name,
            mobile,
            email: lowerEmail,
            password: hashedPassword,
            address,
            state,
            city,
            pincode,
        });

        const brand = companyName();
        const mailOptions = {
            from: process.env.DEFAULT_FROM_EMAIL,
            to: lowerEmail,
            subject: `Welcome to ${brand} - Your Account Credentials`,
            html: `
            <h3>Welcome ${full_name},</h3>
            <p>Your account has been successfully created on ${brand}.</p>
            <p><strong>Username/Email:</strong> ${email}</p>
            <p><strong>Password:</strong> ${password}</p>
            <p>Please login and change your password immediately.</p>
            <br/>
            <p>Regards,<br/>${brand} Team</p>
        `
        };

        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Don't fail registration if email fails, but log it.
        }

        if (user) {
            res.status(201).json({
                _id: user.id,
                full_name: user.full_name,
                email: user.email,
                token: generateToken(user.id, user.role),
                role: user.role,
                profile_photo: user.profile_photo,
            });
        } else {
            res.status(400).json({ message: "Invalid user data" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email/Employee ID and password are required" });
        }

        let user;
        const isEmail = email.includes('@');

        if (isEmail) {
            // Admin/Super Admin login with email
            const lowerEmail = email.toLowerCase();
            user = await User.findOne({
                where: { email: lowerEmail },
            });
        } else {
            // Worker login with Employee ID
            user = await User.findOne({
                where: { employee_id: email },
            });
        }

        if (user && await bcrypt.compare(password, user.password)) {
            if (user.is_active === false) {
                return res.status(403).json({ message: "Your account has been disabled. Please contact the administrator." });
            }

            // Validate role-based login
            if (isEmail && user.role === 'employee') {
                return res.status(403).json({ message: "Workers must login with Employee ID, not email" });
            }
            if (!isEmail && user.role !== 'employee') {
                return res.status(403).json({ message: "Admins must login with email, not Employee ID" });
            }

            res.json({
                _id: user.id,
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                designation: user.designation,
                employee_id: user.employee_id,
                profile_photo: user.profile_photo,
                token: generateToken(user.id, user.role),
            });
        } else {
            res.status(401).json({ message: "Invalid credentials" });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] },
        });

        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (user) {
            user.full_name = req.body.full_name !== undefined ? req.body.full_name : user.full_name;
            user.mobile = req.body.mobile !== undefined ? req.body.mobile : user.mobile;
            user.address = req.body.address !== undefined ? req.body.address : user.address;
            user.secondary_mobiles = req.body.secondary_mobiles !== undefined ? req.body.secondary_mobiles : user.secondary_mobiles;
            user.secondary_emails = req.body.secondary_emails !== undefined ? req.body.secondary_emails : user.secondary_emails;
            user.bank_details = req.body.bank_details !== undefined ? req.body.bank_details : user.bank_details;

            // New fields
            user.designation = req.body.designation !== undefined ? req.body.designation : user.designation;
            user.state = req.body.state !== undefined ? req.body.state : user.state;
            user.city = req.body.city !== undefined ? req.body.city : user.city;
            user.pincode = req.body.pincode !== undefined ? req.body.pincode : user.pincode;
            user.qualification = req.body.qualification !== undefined ? req.body.qualification : user.qualification;
            user.age = (req.body.age !== undefined && req.body.age !== "") ? req.body.age : null;
            user.gender = req.body.gender !== undefined ? req.body.gender : user.gender;


            if (req.body.password) {
                user.password = await bcrypt.hash(req.body.password, 10);
            }

            const updatedUser = await user.save();

            const fullUser = await User.findByPk(updatedUser.id);

            res.json({
                _id: fullUser.id,
                full_name: fullUser.full_name,
                email: fullUser.email,
                role: fullUser.role,
                token: generateToken(fullUser.id, fullUser.role),
                // Return updated fields too just in case
                designation: fullUser.designation,
                state: fullUser.state,
                city: fullUser.city
            });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        console.error("❌ Profile Update Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Get public users list (Combined User & MAKMember)
// @route   GET /api/auth/public-users
// @access  Public
export const getPublicUsers = async (req, res) => {
    try {
        const { role, designation, state, city } = req.query;
        const userWhere = {};

        if (role) userWhere.role = role;
        if (designation) userWhere.designation = designation;
        if (state) userWhere.state = state;
        if (city) userWhere.city = city;

        const users = await User.findAll({
            where: userWhere,
            attributes: [
                'id',
                'full_name',
                'email',
                'profile_photo',
                'role',
                'designation',
                'state',
                'city',
                'pincode',
                'qualification',
                'age',
                'gender',
                'address',
                'createdAt'
            ]
        });

        // Also fetch MAK Members
        const { MAKMember } = await import("../models/index.js");
        const makMembers = await MAKMember.findAll({
            where: { isActive: true },
            attributes: [
                'id',
                ['fullName', 'full_name'],
                ['photo', 'profile_photo'],
                ['membershipType', 'designation'],
                'address',
                'createdAt'
            ]
        });

        // Normalize MAK members to match User structure
        const normalizedMAK = makMembers.map(m => {
            const data = m.get({ plain: true });

            let memberCity = "India";
            if (data.address && typeof data.address === 'string') {
                const parts = data.address.split(',');
                if (parts.length > 1) {
                    memberCity = parts[parts.length - 2].trim();
                }
            }

            return {
                ...data,
                role: 'member',
                email: null,
                city: memberCity,
                state: null,
                pincode: null,
                qualification: null,
                age: null,
                gender: null
            };
        });

        // Combine and sort
        const combined = [...users, ...normalizedMAK].sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );

        res.status(200).json(combined);
    } catch (error) {
        console.error("Public Users Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email is required" });
        
        const lowerEmail = email.toLowerCase();
        const user = await User.findOne({ where: { email: lowerEmail } });
        if (!user) return res.status(404).json({ message: "User not found with this email" });

        // Generate temporary password
        const newPassword = generatePassword(10);
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const mailOptions = {
            from: process.env.DEFAULT_FROM_EMAIL,
            to: lowerEmail,
            subject: `${companyName()} - Password Reset`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #2563eb;">Password Reset Successful</h2>
                    <p>Hello ${user.full_name},</p>
                    <p>Your password has been reset to a temporary one as per your request.</p>
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; font-weight: bold; font-family: monospace; text-align: center; font-size: 20px; letter-spacing: 2px;">
                        ${newPassword}
                    </div>
                    <p>Please log in and change your password from your profile settings immediately.</p>
                    <p>Regards,<br/>${companyName()} Support Team</p>
                </div>
            `
        };

        // Try to send email FIRST before updating DB
        try {
            await transporter.sendMail(mailOptions);
        } catch (emailError) {
            console.error("❌ Forgot Password Email failed:", emailError);
            return res.status(500).json({
                message: "Failed to send reset email. Please try again later or contact support.",
                error: emailError.message
            });
        }

        // Only update DB if email sent successfully
        user.password = hashedPassword;
        await user.save();

        res.json({ message: "Temporary password sent to your email successfully" });
    } catch (error) {
        console.error("❌ Forgot Password Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * @desc    Change Password
 * @route   POST /api/auth/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findByPk(req.user.id);

        if (user && await bcrypt.compare(currentPassword, user.password)) {
            user.password = await bcrypt.hash(newPassword, 10);
            await user.save();
            res.json({ message: "Password changed successfully" });
        } else {
            res.status(401).json({ message: "Invalid current password" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// @desc    Update profile photo
// @route   PUT /api/auth/profile/photo
// @access  Private
export const updateProfilePhoto = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const user = await User.findByPk(req.user.id);
        if (user) {
            // Delete old photo if exists
            if (user.profile_photo) {
                const oldPath = user.profile_photo.startsWith('/') ? user.profile_photo.substring(1) : user.profile_photo;
                try {
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                } catch (e) {
                    console.error("Old photo delete failed", e);
                }
            }

            user.profile_photo = `/uploads/${req.file.filename}`;
            await user.save();
            res.json({ profile_photo: user.profile_photo });
        } else {
            res.status(404).json({ message: "User not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * @desc    Super Admin Initial Setup - One-time secure setup
 * @route   POST /api/auth/super-admin-setup
 * @access  Public (but only works if no super_admin exists)
 */
export const superAdminSetup = async (req, res) => {
    try {
        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters long" });
        }

        // Check if any super_admin already exists
        const existingSuperAdmin = await User.findOne({ where: { role: 'super_admin' } });
        if (existingSuperAdmin) {
            return res.status(403).json({ message: "Super Admin already exists. Setup can only be performed once." });
        }

        // Check if the specific email already exists
        const email = "wariskhan007@gmail.com";
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the Super Admin user
        const superAdmin = await User.create({
            full_name: "Super Admin",
            mobile: "0000000000",
            email: email,
            password: hashedPassword,
            role: "super_admin",
            is_active: true,
            designation: "Super Admin",
        });

        res.status(201).json({
            message: "Super Admin created successfully",
            user: {
                _id: superAdmin.id,
                full_name: superAdmin.full_name,
                email: superAdmin.email,
                role: superAdmin.role,
                token: generateToken(superAdmin.id, superAdmin.role),
            }
        });
    } catch (error) {
        console.error("❌ Super Admin Setup Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

/**
 * @desc    Check if Super Admin setup is needed
 * @route   GET /api/auth/super-admin-setup/status
 * @access  Public
 */
export const superAdminSetupStatus = async (req, res) => {
    try {
        const existingSuperAdmin = await User.findOne({ where: { role: 'super_admin' } });
        res.json({
            setupRequired: !existingSuperAdmin,
            message: existingSuperAdmin ? "Super Admin already exists" : "Super Admin setup required"
        });
    } catch (error) {
        console.error("❌ Super Admin Setup Status Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};
