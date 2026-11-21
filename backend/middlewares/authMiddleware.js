import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../utils/generateToken.js";

export const protect = (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer")
    ) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = verifyAccessToken(token);

            if (!decoded) {
                return res.status(401).json({ message: "Not authorized, token invalid or expired" });
            }

            req.user = decoded; // { id, role, ... }
            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: "Not authorized, token failed" });
        }
    }

    if (!token) {
        res.status(401).json({ message: "Not authorized, no token" });
    }
};

export const adminOnly = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin")) {
        next();
    } else {
        res.status(401).json({ message: "Not authorized as an admin" });
    }
};

// Aliases for compatibility
export const authenticate = protect;
export const authorizeAdmin = adminOnly;
export const admin = adminOnly;

export const staffOnly = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin" || req.user.role === "employee")) {
        next();
    } else {
        res.status(401).json({ message: "Not authorized as staff member" });
    }
};

export const superAdminOnly = (req, res, next) => {
    if (req.user && req.user.role === "super_admin") {
        next();
    } else {
        res.status(401).json({ message: "Not authorized as a super admin" });
    }
};

export const partnerOnly = (req, res, next) => {
    if (req.user && (req.user.role === "partner" || req.user.role === "admin" || req.user.role === "super_admin")) {
        next();
    } else {
        res.status(401).json({ message: "Not authorized as a partner" });
    }
};

// Worker-only middleware - for routes that only employees/workers can access
export const workerOnly = (req, res, next) => {
    if (req.user && req.user.role === "employee") {
        next();
    } else {
        res.status(401).json({ message: "Not authorized as a worker" });
    }
};

// Self or Admin middleware - allows user to access their own data or admin/super_admin to access any
export const selfOrAdmin = (req, res, next) => {
    const targetUserId = req.params.id || req.params.employeeId || req.body.employee_id;
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin" || req.user.id === targetUserId)) {
        next();
    } else {
        res.status(403).json({ message: "Not authorized to access this resource" });
    }
};

// Admin or Worker middleware - for routes accessible by both admin/super_admin and employee
export const adminOrWorker = (req, res, next) => {
    if (req.user && (req.user.role === "admin" || req.user.role === "super_admin" || req.user.role === "employee")) {
        next();
    } else {
        res.status(401).json({ message: "Not authorized" });
    }
};
