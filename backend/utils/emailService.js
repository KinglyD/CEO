import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter with configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Email templates
const emailTemplates = {
  verification: (token) => ({
    subject: 'Verify Your Email',
    html: `
      <h1>Welcome to CEO!</h1>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
      <p>If you didn't create this account, please ignore this email.</p>
    `,
  }),
  passwordReset: (token) => ({
    subject: 'Reset Your Password',
    html: `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password:</p>
      <a href="${process.env.FRONTEND_URL}/reset-password?token=${token}">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  }),
  welcome: (name) => ({
    subject: 'Welcome to CEO!',
    html: `
      <h1>Welcome ${name}!</h1>
      <p>Thank you for joining CEO. We're excited to help you manage your organization more efficiently.</p>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `,
  }),
  teamInvitation: (inviterName, orgName, token) => ({
    subject: `Invitation to join ${orgName}`,
    html: `
      <h1>You've been invited!</h1>
      <p>${inviterName} has invited you to join ${orgName} on CEO.</p>
      <p>Click the link below to accept the invitation:</p>
      <a href="${process.env.FRONTEND_URL}/accept-invite?token=${token}">Accept Invitation</a>
    `,
  }),
};

// Send email function
const sendEmail = async ({ to, template, data }) => {
  try {
    const { subject, html } = emailTemplates[template](data);
    
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service configuration error:', error);
    return false;
  }
};

export { sendEmail, verifyEmailConfig };