import express from "express";
import { protect, adminOnly } from "../middlewares/authMiddleware.js";
import {
    getMembershipPlans,
    getAllMembershipPlans,
    createMembershipPlan,
    updateMembershipPlan,
    deleteMembershipPlan
} from "../controllers/makMembershipController.js";

const router = express.Router();

// Public route to get active plans for the join page
router.get("/", getMembershipPlans);

// Admin routes to manage plans
router.get("/all", protect, adminOnly, getAllMembershipPlans);
router.post("/", protect, adminOnly, createMembershipPlan);
router.put("/:id", protect, adminOnly, updateMembershipPlan);
router.delete("/:id", protect, adminOnly, deleteMembershipPlan);

export default router;
