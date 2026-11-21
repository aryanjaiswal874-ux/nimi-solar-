import jwt from "jsonwebtoken";
import crypto from "crypto";

// Access token: short-lived (15 minutes)
const generateAccessToken = (id, role) => {
    return jwt.sign({ id, role, type: "access" }, process.env.JWT_SECRET, {
        expiresIn: "15m",
    });
};

// Refresh token: long-lived (30 days)
const generateRefreshToken = () => {
    return crypto.randomBytes(64).toString("hex");
};

// Generate both tokens
const generateTokens = (id, role) => {
    const accessToken = generateAccessToken(id, role);
    const refreshToken = generateRefreshToken();
    const refreshTokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return { accessToken, refreshToken, refreshTokenExpires };
};

// Verify access token
const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.type !== "access") {
            throw new Error("Invalid token type");
        }
        return decoded;
    } catch (error) {
        return null;
    }
};

// Verify refresh token (just checks if it's a valid format, actual validation is against DB)
const verifyRefreshTokenFormat = (token) => {
    return token && typeof token === "string" && token.length === 128; // 64 bytes = 128 hex chars
};

export { generateAccessToken, generateRefreshToken, generateTokens, verifyAccessToken, verifyRefreshTokenFormat };
