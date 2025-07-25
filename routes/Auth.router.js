const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const passport = require('passport');
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require('../models/User.model');
const sendWelcomeEmail = require("../middleware/mailer"); 
const sendOtpEmail = require('../middleware/mailerOTP'); 
const { authenticate } = require('../middleware/auth');
const router = express.Router();
require('dotenv').config();

const resetTokens = {}; 

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?#&_])[A-Za-z\d@$!%*?#&_]{6,30}$/;

const JWT_SECRET = process.env.JWT_SECRET ;
const JWT_EXPIRES_IN = '7d';

const createToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Signup 
router.post('/signup', async (req, res) => {
  try {
    const { name, username, email, password, phone } = req.body;

    if (!name || !username || !email || !password || !phone) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email, username, or phone already in use' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); 

    const newUser = new User({
      name,
      username,
      email,
      phone,
      password: hashedPassword,
      role: 'user',
      otp,
      otpExpires,
      emailVerified: false
    });

    await newUser.save();
    await sendOtpEmail(email, username, otp);
    // await sendWelcomeEmail(email, username);

    res.status(200).json({
      message: 'Signup successful. OTP sent to email.',
      userId: newUser._id
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
});

router.post('/resend-otp', async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    await sendOtpEmail(user.email, user.username, otp);

    res.status(200).json({ message: 'OTP resent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to resend OTP', error: error.message });
  }
});


router.post('/verify-otp', async (req, res) => {
  const { userId, otp } = req.body;

  try {
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.emailVerified) return res.status(400).json({ message: 'Email already verified' });
    if (user.otp !== otp || new Date() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.emailVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    const token = createToken(user);

    res.status(200).json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
});



// Login (email or username)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }
    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });
    if (!user || !user.isActive) {
      return res.status(404).json({ message: 'User not found or inactive' });
    }
    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Google sign-in/sign-up
router.post("/google", async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code from frontend" });

  try {
    const { tokens } = await client.getToken(code);
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const socialId = payload.sub;

    if (!email || !socialId) {
      return res.status(400).json({ error: "Google account data missing" });
    }

    let user = await User.findOne({ email });

    if (!user) {
      let baseUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      let uniqueUsername = baseUsername;
      let count = 1;
      while (await User.findOne({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}${count}`;
        count++;
      }

      user = new User({
        email,
        socialId,
        username: uniqueUsername,
        isApproved: false,
        role: "Student",
      });

      await user.save();
      await sendWelcomeEmail(email, uniqueUsername);

      return res.status(201).json({
        message: "Registered successfully. Waiting for approval.",
        user,
      });
    }

    if (user.socialId !== socialId) {
      return res.status(401).json({ error: "Invalid social ID" });
    }

    if (!user.isApproved) {
      return res.status(403).json({ error: "Account not approved by admin" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    user.token = token;
    await user.save();

    res.json({ message: "Login successful", token, user });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({ error: "Failed to verify Google login" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour

    user.resetToken = token;
    user.resetTokenExpiry = expiry;
    await user.save();

    const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS.replace(/\s/g, '') 
      }
    });

    await transporter.sendMail({
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.username || ''},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">${resetLink}</a>
        <p>This link will expire in 1 hour.</p>
      `
    });

    res.json({ message: "Password reset email sent" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Reset Password Route
router.post("/reset-password/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error: "Password must be 6–30 characters long, include uppercase, lowercase, number, and special character."
      });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Server error" });
  }
});



// Logout
router.post('/logout', authenticate, (req, res) => {
  res.status(200).json({ message: 'Logout successful (client should clear token)' });
});



module.exports = router;
