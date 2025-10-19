import cron from 'node-cron';
import { pool } from '../config/db.js';
import { sendEmail } from './emailService.js';

class TaskScheduler {
  constructor() {
    this.scheduledTasks = new Map();
  }

  // Schedule periodic report reminders
  scheduleReportReminders() {
    // Run every day at 9 AM
    cron.schedule('0 9 * * *', async () => {
      try {
        // Get all report templates with required frequency
        const templates = await pool.query(`
          SELECT rt.*, o.name as org_name, u.email, u.name as user_name
          FROM report_templates rt
          JOIN organizations o ON rt.org_id = o.id
          JOIN user_roles ur ON rt.org_id = ur.org_id
          JOIN users u ON ur.user_id = u.id
          WHERE rt.required_frequency IS NOT NULL
          AND ur.role_id IN (
            SELECT id FROM roles 
            WHERE name IN ('CEO', 'PROJECT_MANAGER', 'OFFICER')
          )
        `);

        for (const template of templates.rows) {
          const lastReport = await pool.query(`
            SELECT submission_date 
            FROM submitted_reports 
            WHERE template_id = $1 
            ORDER BY submission_date DESC 
            LIMIT 1
          `, [template.id]);

          const shouldRemind = this.checkIfReminderNeeded(
            template.required_frequency,
            lastReport.rows[0]?.submission_date
          );

          if (shouldRemind) {
            await sendEmail({
              to: template.email,
              template: 'reportReminder',
              data: {
                userName: template.user_name,
                reportName: template.name,
                orgName: template.org_name
              }
            });
          }
        }
      } catch (error) {
        console.error('Error in report reminder scheduler:', error);
      }
    });
  }

  // Schedule report generation for completed reports
  scheduleReportGeneration() {
    // Run every hour
    cron.schedule('0 * * * *', async () => {
      try {
        const pendingReports = await pool.query(`
          SELECT sr.*, rt.name as template_name
          FROM submitted_reports sr
          JOIN report_templates rt ON sr.template_id = rt.id
          WHERE sr.status = 'approved'
          AND sr.pdf_generated = false
        `);

        for (const report of pendingReports.rows) {
          try {
            // Generate PDF (using the existing generateReportPDF logic)
            // Store the PDF in a suitable location
            // Update the report record to mark PDF as generated
            await pool.query(`
              UPDATE submitted_reports
              SET pdf_generated = true,
                  pdf_url = $1
              WHERE id = $2
            `, [pdfUrl, report.id]);
          } catch (error) {
            console.error(`Error generating PDF for report ${report.id}:`, error);
          }
        }
      } catch (error) {
        console.error('Error in report generation scheduler:', error);
      }
    });
  }

  // Schedule data backup
  scheduleBackup() {
    // Run every day at 1 AM
    cron.schedule('0 1 * * *', async () => {
      try {
        // Implement backup logic here
        console.log('Daily backup started');
        // You could use pg_dump or another backup solution
      } catch (error) {
        console.error('Error in backup scheduler:', error);
      }
    });
  }

  // Schedule periodic performance metrics calculation
  scheduleMetricsCalculation() {
    // Run every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      try {
        // Calculate organization metrics
        const orgs = await pool.query('SELECT id FROM organizations');
        
        for (const org of orgs.rows) {
          // Calculate various metrics
          const metrics = await this.calculateOrgMetrics(org.id);
          
          // Store metrics
          await pool.query(`
            INSERT INTO org_metrics (org_id, metrics_data, calculated_at)
            VALUES ($1, $2, NOW())
          `, [org.id, metrics]);
        }
      } catch (error) {
        console.error('Error in metrics calculation scheduler:', error);
      }
    });
  }

  // Helper method to check if reminder is needed based on frequency
  checkIfReminderNeeded(frequency, lastSubmissionDate) {
    if (!lastSubmissionDate) return true;

    const now = new Date();
    const last = new Date(lastSubmissionDate);
    const daysSinceLastSubmission = (now - last) / (1000 * 60 * 60 * 24);

    switch (frequency) {
      case 'daily':
        return daysSinceLastSubmission >= 1;
      case 'weekly':
        return daysSinceLastSubmission >= 7;
      case 'monthly':
        return daysSinceLastSubmission >= 30;
      case 'quarterly':
        return daysSinceLastSubmission >= 90;
      default:
        return false;
    }
  }

  // Helper method to calculate organization metrics
  async calculateOrgMetrics(orgId) {
    const metrics = {
      totalReports: 0,
      reportCompletion: 0,
      averageReviewTime: 0,
      activeUsers: 0
    };

    try {
      // Calculate total reports and completion rate
      const reportStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
        FROM submitted_reports
        WHERE org_id = $1
        AND submission_date > NOW() - INTERVAL '30 days'
      `, [orgId]);

      metrics.totalReports = reportStats.rows[0].total;
      metrics.reportCompletion = reportStats.rows[0].total > 0 
        ? (reportStats.rows[0].approved / reportStats.rows[0].total) * 100 
        : 0;

      // Calculate average review time
      const reviewStats = await pool.query(`
        SELECT AVG(
          EXTRACT(EPOCH FROM (review_date - submission_date)) / 3600
        ) as avg_review_time
        FROM submitted_reports
        WHERE org_id = $1
        AND status IN ('approved', 'rejected')
        AND review_date IS NOT NULL
        AND submission_date > NOW() - INTERVAL '30 days'
      `, [orgId]);

      metrics.averageReviewTime = reviewStats.rows[0].avg_review_time || 0;

      // Calculate active users
      const activeUsers = await pool.query(`
        SELECT COUNT(DISTINCT submitted_by) as active_users
        FROM submitted_reports
        WHERE org_id = $1
        AND submission_date > NOW() - INTERVAL '30 days'
      `, [orgId]);

      metrics.activeUsers = activeUsers.rows[0].active_users;

      return metrics;
    } catch (error) {
      console.error('Error calculating org metrics:', error);
      return metrics;
    }
  }

  // Initialize all scheduled tasks
  initializeScheduledTasks() {
    this.scheduleReportReminders();
    this.scheduleReportGeneration();
    this.scheduleBackup();
    this.scheduleMetricsCalculation();
    console.log('✅ All scheduled tasks initialized');
  }
}

const scheduler = new TaskScheduler();
export default scheduler;