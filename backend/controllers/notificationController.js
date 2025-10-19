import { pool } from '../config/db.js';
import notificationService from '../utils/notificationService.js';
import whatsAppService from '../utils/whatsappService.js';

// @desc    Send notification
// @route   POST /api/notifications/send
// @access  Private (CEO, Managers)
export const sendNotification = async (req, res) => {
  try {
    const { title, content, type, userIds, channels } = req.body;
    const orgId = req.user.org_id;

    // Create notification template
    const templateResult = await pool.query(
      `INSERT INTO notification_templates 
       (name, title, content, type, channels, org_id, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id`,
      [title, title, content, type, channels, orgId, req.user.id]
    );

    const templateId = templateResult.rows[0].id;

    // Send to specific users or all org users
    const users = userIds ? 
      await pool.query('SELECT id FROM users WHERE id = ANY($1)', [userIds]) :
      await pool.query('SELECT id FROM users WHERE org_id = $1', [orgId]);

    // Send notifications
    const notifications = users.rows.map(user => 
      notificationService.sendNotification({
        user_id: user.id,
        org_id: orgId,
        template_id: templateId,
        title,
        content,
        type,
        channels
      })
    );

    await Promise.all(notifications);

    res.status(201).json({
      success: true,
      message: 'Notifications sent successfully'
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error sending notifications'
    });
  }
};

// @desc    Get user's notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 10, unreadOnly = false } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT n.*, nt.type as template_type 
      FROM notifications n
      LEFT JOIN notification_templates nt ON n.template_id = nt.id
      WHERE n.user_id = $1
    `;

    if (unreadOnly === 'true') {
      query += ' AND n.read_at IS NULL';
    }

    query += ' ORDER BY n.created_at DESC LIMIT $2 OFFSET $3';

    const notifications = await pool.query(query, [
      req.user.id,
      limit,
      offset
    ]);

    // Get total count
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        notifications: notifications.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].count),
          pages: Math.ceil(countResult.rows[0].count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching notifications'
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    await notificationService.markAsRead(id, req.user.id);

    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Error marking notification as read'
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
export const updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;

    await notificationService.updateNotificationPreferences(
      req.user.id,
      preferences
    );

    res.json({
      success: true,
      message: 'Notification preferences updated'
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Error updating notification preferences'
    });
  }
};

// @desc    Verify WhatsApp number
// @route   POST /api/notifications/verify-whatsapp
// @access  Private
export const verifyWhatsApp = async (req, res) => {
  try {
    const { whatsappNumber } = req.body;

    // Send verification code via WhatsApp
    const { verificationCode } = await whatsAppService.verifyNumber(whatsappNumber);

    // Store verification code temporarily (you might want to use Redis for this)
    await pool.query(
      `UPDATE users 
       SET whatsapp_verification_code = $1,
           whatsapp_verification_expires = NOW() + INTERVAL '10 minutes'
       WHERE id = $2`,
      [verificationCode, req.user.id]
    );

    res.json({
      success: true,
      message: 'Verification code sent to WhatsApp'
    });
  } catch (error) {
    console.error('Error verifying WhatsApp number:', error);
    res.status(500).json({
      success: false,
      error: 'Error verifying WhatsApp number'
    });
  }
};