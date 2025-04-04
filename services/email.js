const nodemailer = require('nodemailer');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// Create a transporter object
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate a verification token
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Send verification email
const sendVerificationEmail = async (email, token, userType) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  const verificationLink = `${baseUrl}/auth/verify-email?token=${token}&email=${email}&userType=${userType}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Email Verification - Uni Ride Sharing',
    html: `
      <h1>Verify Your Email</h1>
      <p>Thank you for registering with Uni Ride Sharing. Please verify your email by clicking the link below:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

// Send password reset email
const sendPasswordResetEmail = async (email, token, userType) => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3002';
  const resetLink = `${baseUrl}/auth/reset-password?token=${token}&email=${email}&userType=${userType}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset - Uni Ride Sharing',
    html: `
      <h1>Reset Your Password</h1>
      <p>You requested a password reset for your Uni Ride Sharing account. Please click the link below to reset your password:</p>
      <a href="${resetLink}">Reset Password</a>
      <p>This link will expire in 1 hour. If you did not request this reset, please ignore this email.</p>
    `
  };
  
  return transporter.sendMail(mailOptions);
};

module.exports = {
  generateToken,
  sendVerificationEmail,
  sendPasswordResetEmail
}; 