const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendWelcomeEmail = async (email, username) => {
  const mailOptions = {
    from: `"SaranKutty" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Welcome to RealEstate!",
    html: `<h2>Hi ${username},</h2><p>Welcome to our platform! We're glad to have you.</p>`,
  };

  return transporter.sendMail(mailOptions);
};

module.exports = sendWelcomeEmail;
