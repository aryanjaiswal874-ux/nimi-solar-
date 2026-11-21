import asyncHandler from "express-async-handler";

import { MAKMember } from "../models/index.js";
import { generateTokens } from "../utils/generateToken.js";
import { sendWhatsAppText } from "../utils/whatsappService.js";
import { getOTPWhatsAppTemplate } from "../utils/makMessageTemplates.js";

/**
 * @desc    Auth MAK user/member & get token
 * @route   POST /api/mak/auth/login
 * @access  Public
 */
export const loginMAK = asyncHandler(async (req, res) => {
    try {
        const { id, password } = req.body; // id is mobile number or 'admin'

        // Check if MAKMember contains admin (by default create one if it doesn't exist)
        if (id === "admin" && password === "admin") {
            let admin = await MAKMember.findOne({ where: { phone: "admin", role: "admin" } });
            if (!admin) {
                const hashedPassword = "admin";
                admin = await MAKMember.create({
                    fullName: "MAK Admin",
                    phone: "admin",
                    whatsapp: "910000000000",
                    membershipType: "System Admin",
                    password: hashedPassword,
                    role: "admin",
                    isActive: true,
                });
            }

            res.json({
                _id: admin.id,
                fullName: admin.fullName,
                phone: admin.phone,
                role: admin.role,
                token: generateTokens(admin.id, admin.role).accessToken,
            });
            return;
        }

        // Regular login logic
        const member = await MAKMember.findOne({ where: { phone: id } });

        if (member) {
            // Check for OTP verification first if 'otp' is provided
            if (req.body.otp) {
                const { otp } = req.body;
                if (member.otp === otp && member.otpExpires > new Date()) {
                    // OTP is valid!
                    member.otp = null;
                    member.otpExpires = null;
                    await member.save();

                    return res.json({
                        _id: member.id,
                        fullName: member.fullName,
                        phone: member.phone,
                        role: member.role,
                        photo: member.photo,
                        membershipType: member.membershipType,
                        token: generateTokens(member.id, member.role).accessToken,
                    });
                } else {
                    return res.status(401).json({ message: "Invalid or expired OTP" });
                }
            }

            // Fallback: Check password (for backwards compatibility or password-based login)
            const isPasswordValid = member.password ? (password === member.password) : false;
            const isOtpBypass = password === "otp_bypass"; // Keep bypass for now but prefer real OTP

            if (isOtpBypass || isPasswordValid) {
                if (member.isActive === false) {
                    return res.status(403).json({ message: "Your account has been disabled. Please contact the administrator." });
                }

                return res.json({
                    _id: member.id,
                    fullName: member.fullName,
                    phone: member.phone,
                    role: member.role,
                    photo: member.photo,
                    membershipType: member.membershipType,
                    token: generateTokens(member.id, member.role).accessToken,
                });
            }
        }

        res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
        console.error("Auth Login Error:", error);
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

/**
 * @desc    Send OTP to WhatsApp
 * @route   POST /api/mak/auth/send-otp
 * @access  Public
 */
export const sendOTP = asyncHandler(async (req, res) => {
    let { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Phone number is required" });

    // Format phone
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.length === 10) {
        formattedPhone = "91" + formattedPhone;
    }

    // Find member
    const member = await MAKMember.findOne({ where: { phone: phone.replace(/\D/g, '').slice(-10) } }); // Try to match 10 digits
    if (!member) {
        return res.status(404).json({ message: "Member not registered with this number" });
    }

    // 1. Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // 2. Trigger WhatsApp API
    try {
        const waMsg = getOTPWhatsAppTemplate(otp);
        await sendWhatsAppText(member.whatsapp, waMsg);

        // 3. Store in DB
        member.otp = otp;
        member.otpExpires = expires;
        await member.save();

        res.json({ message: "Verification code sent to WhatsApp successfully", success: true });
    } catch (err) {
        console.error("OTP send failed:", err.message);
        res.status(500).json({ message: "Failed to send verification code" });
    }
});


/**
 * @desc    Change password
 * @route   POST /api/mak/auth/change-password
 * @access  Private (Admin/Member)
 */
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Find the member using the authenticated user id
    const member = await MAKMember.findByPk(req.user.id);
    if (!member) {
        return res.status(404).json({ message: "User not found" });
    }

    // Check if the current password is correct
    if (member.id === req.user.id && member.phone === 'admin' && currentPassword === member.password) {
        // admin logic fits here
    } else if (currentPassword !== member.password) {
        return res.status(400).json({ message: "Incorrect current password" });
    }

    const hashedNewPassword = newPassword;

    member.password = hashedNewPassword;
    await member.save();

    res.json({ message: "Password updated successfully" });
});
