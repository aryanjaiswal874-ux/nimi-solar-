import express from "express";
import {
    registerUser,
    loginUser,
    getUserProfile,
    updateUserProfile,
    updateProfilePhoto,
    forgotPassword,
    changePassword,
    getPublicUsers,
    superAdminSetup,
    superAdminSetupStatus
} from "../controllers/authController.js";
import {
    getCompanies,
    createCompany,
    updateCompany,
    deleteCompany,
    setDefaultCompany
} from "../controllers/companyController.js";
import { protect } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: User authentication and profile management
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [full_name, mobile, email]
 *             properties:
 *               full_name: { type: string }
 *               mobile: { type: string }
 *               email: { type: string }
 *               address: { type: string }
 *               is_partner: { type: boolean }
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: User already exists
 */
router.post("/register", registerUser);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 _id: { type: string }
 *                 full_name: { type: string }
 *                 email: { type: string }
 *                 role: { type: string }
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", loginUser);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request temporary password via email
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Temporary password sent
 */
router.post("/forgot-password", forgotPassword);

/**
 * @swagger
 * /api/auth/super-admin-setup/status:
 *   get:
 *     summary: Check if Super Admin setup is required
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: Setup status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 setupRequired: { type: boolean }
 *                 message: { type: string }
 */
router.get("/super-admin-setup/status", superAdminSetupStatus);

/**
 * @swagger
 * /api/auth/super-admin-setup:
 *   post:
 *     summary: One-time Super Admin initial setup
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [password]
 *             properties:
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       201:
 *         description: Super Admin created successfully
 *       403:
 *         description: Super Admin already exists
 *       400:
 *         description: Invalid password or user exists
 */
router.post("/super-admin-setup", superAdminSetup);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword: { type: string }
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post("/change-password", protect, changePassword);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *   put:
 *     summary: Update user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name: { type: string }
 *               email: { type: string }
 *     responses:
 *       200:
 *         description: Profile updated
 */
// Use upload.none() to allow multipart/form-data (text fields only) or JSON
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);
router.put("/profile/photo", protect, upload.single('file'), updateProfilePhoto);

/**
 * @swagger
 * /api/auth/companies:
 *   get:
 *     summary: Get user companies
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *   post:
 *     summary: Add new company
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 */
router.route("/companies")
    .get(protect, getCompanies)
    .post(protect, createCompany);

router.route("/companies/:id")
    .put(protect, updateCompany)
    .delete(protect, deleteCompany);

router.put("/companies/:id/default", protect, setDefaultCompany);



/**
 * @swagger
 * /api/auth/public-users:
 *   get:
 *     summary: Get public list of users
 *     description: Retrieve a list of users with public information. Can be filtered by role, designation, state, and city.
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by user role (e.g., user, partner, admin)
 *       - in: query
 *         name: designation
 *         schema:
 *           type: string
 *         description: Filter by user designation
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: Filter by state
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: User ID
 *                   full_name:
 *                     type: string
 *                     description: User's full name
 *                   email:
 *                     type: string
 *                     description: User's email address
 *                   profile_photo:
 *                     type: string
 *                     description: URL or path to user's profile photo
 *                   role:
 *                     type: string
 *                     description: User's role
 *                   designation:
 *                     type: string
 *                     description: User's designation
 *                   state:
 *                     type: string
 *                     description: User's state
 *                   city:
 *                     type: string
 *                     description: User's city
 *                   pincode:
 *                     type: string
 *                     description: User's pincode
 *                   qualification:
 *                     type: string
 *                     description: User's qualification
 *                   age:
 *                     type: integer
 *                     description: User's age
 *                   gender:
 *                     type: string
 *                     description: User's gender
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                     description: Timestamp when the user was created
 *       500:
 *         description: Server Error
 */
router.get("/public-users", getPublicUsers);

export default router;
