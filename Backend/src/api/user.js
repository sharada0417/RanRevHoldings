import express from "express";
import { signIn, signUp, verifyEmail, resendOTP } from "../application/user.js";

const router = express.Router();

// ✅ SIGNUP
// body: { name, email, password, confirmPassword }
router.post("/signup", async (req, res) => {
  try {
    const result = await signUp(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    console.error("signup error:", err.message);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

// ✅ SIGNIN
// body: { email, password }
router.post("/signin", async (req, res) => {
  try {
    const result = await signIn(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    console.error("signin error:", err.message);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

// ✅ VERIFY EMAIL
// body: { email, otp }
router.post("/verify-email", async (req, res) => {
  try {
    const result = await verifyEmail(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    console.error("verify-email error:", err.message);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

// ✅ RESEND OTP
// body: { email }
router.post("/resend-otp", async (req, res) => {
  try {
    const result = await resendOTP(req.body);
    return res.status(result.status).json(result);
  } catch (err) {
    console.error("resend-otp error:", err.message);
    return res.status(500).json({ ok: false, message: "Internal server error" });
  }
});

export default router;
