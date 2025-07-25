const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,         
    pass: process.env.GMAIL_APP_PASSWORD 
  }
});

const sendOtpEmail = async (email, username, otp) => {
  const mailOptions = {
    from: `"Your App" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email - OTP',
    html: `
      <h3>Hello ${username},</h3>
      <p>Use the OTP below to verify your email:</p>
      <h2>${otp}</h2>
      <p>This OTP is valid for 10 minutes.</p>
    `
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendOtpEmail;
