import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

class WhatsAppService {
  constructor() {
    this.from = process.env.TWILIO_WHATSAPP_NUMBER; // Your Twilio WhatsApp number
  }

  // Send WhatsApp message
  async sendMessage(to, message) {
    try {
      const response = await client.messages.create({
        body: message,
        from: `whatsapp:${this.from}`,
        to: `whatsapp:${to}`
      });

      console.log('WhatsApp message sent:', response.sid);
      return { success: true, messageId: response.sid };
    } catch (error) {
      console.error('WhatsApp message failed:', error);
      throw error;
    }
  }

  // Send template message
  async sendTemplateMessage(to, template, data) {
    try {
      let message;
      switch (template) {
        case 'welcome':
          message = `Welcome to CEO, ${data.name}! 👋\n\nYou're now connected to receive important updates and reminders via WhatsApp.`;
          break;
        case 'reminder':
          message = `🔔 Reminder: ${data.taskName}\n\nDue: ${data.dueDate}\n${data.description}`;
          break;
        case 'announcement':
          message = `📢 Announcement from ${data.senderName}\n\n${data.message}`;
          break;
        case 'reportDue':
          message = `📊 Report Due: ${data.reportName}\n\nDeadline: ${data.dueDate}\nPlease submit your report through the CEO platform.`;
          break;
        default:
          message = data.message;
      }

      return await this.sendMessage(to, message);
    } catch (error) {
      console.error('WhatsApp template message failed:', error);
      throw error;
    }
  }

  // Verify WhatsApp number
  async verifyNumber(number) {
    try {
      // Send a verification code via WhatsApp
      const verificationCode = Math.floor(100000 + Math.random() * 900000);
      await this.sendMessage(
        number,
        `Your CEO verification code is: ${verificationCode}`
      );
      return { success: true, verificationCode };
    } catch (error) {
      console.error('WhatsApp number verification failed:', error);
      throw error;
    }
  }
}

const whatsAppService = new WhatsAppService();
export default whatsAppService;