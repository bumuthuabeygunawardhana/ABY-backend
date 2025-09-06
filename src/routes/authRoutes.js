import express from "express";
import { registerUser,verifyOtp,loginUser, forgotPassword, resetPassword } from "../controllers/authController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", registerUser);
router.post("/verify-otp", verifyOtp); 
router.post("/login", loginUser);
router.post("/forgot-password",forgotPassword);
router.put("/reset-password/:token", resetPassword);

// ✅ New protected route for Admin Dashboard
router.get("/admin/dashboard", protect, adminOnly, (req, res) => {
  res.json({
    message: "Welcome to Admin Dashboard",
    user: req.user  // contains id, role, email, name
  });
});

// ✅ New protected route for User Dashboard (if needed)
router.get("/user/dashboard", protect, (req, res) => {
  res.json({
    message: "Welcome to User Dashboard",
    user: req.user
  });
});

export default router;
