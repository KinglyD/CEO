import { pool } from '../config/db.js';
import { sendEmail } from './emailService.js';
import whatsAppService from './whatsappService.js';

class NotificationService {
  // Send notification through all enabled channels
  async sendNotification(notification) {
    const {
      user_id,
      org_id,
      title,
      content,
      type,
      template_id,
      channels = ['email', 'whatsapp', 'in_app']
    } = notification;

    try {
      // Get user preferences and contact info
      const userResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [user_id]
      );
      const user = userResult.rows[0];

      if (!user) {
        throw new Error('User not found');
      }

      // Create notification record
      const notificationResult = await pool.query(
        `INSERT INTO notifications 
         (template_id, org_id, user_id, title, content, type) 
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [template_id, org_id, user_id, title, content, type]
      );
      const notificationId = notificationResult.rows[0].id;

      // Send through each enabled channel based on user preferences
      const promises = [];
      const userPrefs = user.notification_preferences;

      if (channels.includes('email') && userPrefs.email) {
        promises.push(this.sendEmailNotification(
          notificationId,
          user.email,
          title,
          content
        ));
      }

      // WhatsApp notifications temporarily disabled until Twilio is configured
      if (channels.includes('whatsapp') && userPrefs.whatsapp && user.whatsapp_number && process.env.TWILIO_ACCOUNT_SID) {
        promises.push(this.sendWhatsAppNotification(
          notificationId,
          user.whatsapp_number,
          title,
          content
        ));
      }

      if (channels.includes('in_app') && userPrefs.in_app) {
        promises.push(this.createInAppNotification(
          notificationId,
          user_id,
          title,
          content
        ));
      }

      await Promise.all(promises);

      return { success: true, notificationId };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmailNotification(notificationId, email, title, content) {
    try {
      await sendEmail({
        to: email,
        template: 'notification',
        data: { title, content }
      });

      await this.logNotificationStatus(notificationId, 'email', 'success');
    } catch (error) {
      await this.logNotificationStatus(notificationId, 'email', 'failed', error.message);
      throw error;
    }
  }

  // Send WhatsApp notification
  async sendWhatsAppNotification(notificationId, whatsappNumber, title, content) {
    try {
      await whatsAppService.sendMessage(
        whatsappNumber,
        `${title}\n\n${content}`
      );

      await this.logNotificationStatus(notificationId, 'whatsapp', 'success');
    } catch (error) {
      await this.logNotificationStatus(notificationId, 'whatsapp', 'failed', error.message);
      throw error;
    }
  }

  // Create in-app notification
  async createInAppNotification(notificationId, userId, title, content) {
    try {
      await this.logNotificationStatus(notificationId, 'in_app', 'success');
      return true;
    } catch (error) {
      await this.logNotificationStatus(notificationId, 'in_app', 'failed', error.message);
      throw error;
    }
  }

  // Log notification status
  async logNotificationStatus(notificationId, channel, status, errorMessage = null) {
    try {
      await pool.query(
        `INSERT INTO notification_logs 
         (notification_id, channel, status, error_message) 
         VALUES ($1, $2, $3, $4)`,
        [notificationId, channel, status, errorMessage]
      );

      // Update notification status
      await pool.query(
        `UPDATE notifications 
         SET status = status || jsonb_build_object($2, $3)
         WHERE id = $1`,
        [notificationId, channel, status]
      );
    } catch (error) {
      console.error('Error logging notification status:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      await pool.query(
        'UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Get user's unread notifications
  async getUnreadNotifications(userId) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications 
         WHERE user_id = $1 
         AND read_at IS NULL 
         ORDER BY created_at DESC`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      throw error;
    }
  }

  // Update user's notification preferences
  async updateNotificationPreferences(userId, preferences) {
    try {
      await pool.query(
        'UPDATE users SET notification_preferences = $1 WHERE id = $2',
        [preferences, userId]
      );
      return true;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
}

const notificationService = new NotificationService();
export default notificationService;