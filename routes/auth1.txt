const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const passport = require('passport');
const nodemailer = require("nodemailer");
const User = require('../models/User.model');
const sendWelcomeEmail = require("../middleware/mailer"); 
const { authenticate } = require('../middleware/auth');
const router = express.Router();


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
      return res.status(400).json({ message: 'All fields are required including phone' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email, username, or phone already in use' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      username,
      email,
      phone,
      password: hashedPassword,
      role: 'user'
    });

    await newUser.save();
    await sendWelcomeEmail(email, username); // Optional

    const token = createToken(newUser); // Assumes JWT function

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup failed', error: error.message });
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

// Forgot password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "User not found" });

  const token = crypto.randomBytes(32).toString("hex");
  resetTokens[token] = user._id;

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;

  await transporter.sendMail({
    to: email,
    subject: "Password Reset",
    html: `<p>Click here to reset password: <a href="${resetLink}">${resetLink}</a></p>`
  });

  res.json({ message: "Password reset email sent" });
});

// Reset password
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({
      error: "Password must be 6-30 characters long, include at least one uppercase letter, one lowercase letter, one number, and one special character."
    });
  }

  const userId = resetTokens[token];
  if (!userId) return res.status(400).json({ error: "Invalid or expired token" });

  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(newPassword, salt);
  await User.findByIdAndUpdate(userId, { password: hashed });

  delete resetTokens[token];
  res.json({ message: "Password updated successfully" });
});


// Logout
router.post('/logout', authenticate, (req, res) => {
  res.status(200).json({ message: 'Logout successful (client should clear token)' });
});



module.exports = router;
