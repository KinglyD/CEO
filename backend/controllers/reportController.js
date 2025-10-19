import { pool } from '../config/db.js';
import { sendEmail } from '../utils/emailService.js';
import pkg from 'pdf-lib';
const { PDFDocument, rgb } = pkg;

// @desc    Create a report template
// @route   POST /api/reports/templates
// @access  Private (CEO, Managers)
export const createReportTemplate = async (req, res) => {
  try {
    const { name, description, fields, required_frequency } = req.body;
    const org_id = req.user.org_id;
    const created_by = req.user.id;

    const result = await pool.query(
      `INSERT INTO report_templates 
       (name, description, fields, required_frequency, org_id, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [name, description, fields, required_frequency, org_id, created_by]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating report template:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating report template'
    });
  }
};

// @desc    Get all report templates for an organization
// @route   GET /api/reports/templates
// @access  Private
export const getReportTemplates = async (req, res) => {
  try {
    const org_id = req.user.org_id;

    const result = await pool.query(
      'SELECT * FROM report_templates WHERE org_id = $1 ORDER BY created_at DESC',
      [org_id]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching report templates'
    });
  }
};

// @desc    Submit a report
// @route   POST /api/reports/submit
// @access  Private
export const submitReport = async (req, res) => {
  try {
    const {
      template_id,
      report_data,
      reporting_period_start,
      reporting_period_end
    } = req.body;
    const org_id = req.user.org_id;
    const submitted_by = req.user.id;

    // Validate template exists and belongs to organization
    const templateCheck = await pool.query(
      'SELECT * FROM report_templates WHERE id = $1 AND org_id = $2',
      [template_id, org_id]
    );

    if (templateCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report template not found'
      });
    }

    // Insert report
    const result = await pool.query(
      `INSERT INTO submitted_reports 
       (template_id, org_id, submitted_by, report_data, reporting_period_start, reporting_period_end) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [template_id, org_id, submitted_by, report_data, reporting_period_start, reporting_period_end]
    );

    // Notify relevant managers
    const managers = await pool.query(
      `SELECT u.email 
       FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       WHERE ur.org_id = $1 AND ur.role_id IN (
         SELECT id FROM roles WHERE name IN ('CEO', 'PROJECT_MANAGER')
       )`,
      [org_id]
    );

    // Send email notifications
    for (const manager of managers.rows) {
      await sendEmail({
        to: manager.email,
        template: 'reportSubmission',
        data: {
          reportId: result.rows[0].id,
          submitterName: req.user.name,
          templateName: templateCheck.rows[0].name
        }
      });
    }

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting report:', error);
    res.status(500).json({
      success: false,
      error: 'Error submitting report'
    });
  }
};

// @desc    Review a submitted report
// @route   PUT /api/reports/:id/review
// @access  Private (Managers only)
export const reviewReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const reviewed_by = req.user.id;

    const result = await pool.query(
      `UPDATE submitted_reports 
       SET status = $1, review_notes = $2, reviewed_by = $3, review_date = NOW() 
       WHERE id = $4 AND org_id = $5 
       RETURNING *`,
      [status, review_notes, reviewed_by, id, req.user.org_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    // Notify report submitter
    const submitter = await pool.query(
      'SELECT email, name FROM users WHERE id = $1',
      [result.rows[0].submitted_by]
    );

    if (submitter.rows.length > 0) {
      await sendEmail({
        to: submitter.rows[0].email,
        template: 'reportReviewed',
        data: {
          reportId: id,
          status,
          reviewerName: req.user.name
        }
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error reviewing report:', error);
    res.status(500).json({
      success: false,
      error: 'Error reviewing report'
    });
  }
};

// @desc    Generate PDF report
// @route   GET /api/reports/:id/pdf
// @access  Private
export const generateReportPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Get report data
    const result = await pool.query(
      `SELECT sr.*, rt.name as template_name, rt.fields as template_fields,
              u1.name as submitter_name, u2.name as reviewer_name
       FROM submitted_reports sr
       JOIN report_templates rt ON sr.template_id = rt.id
       JOIN users u1 ON sr.submitted_by = u1.id
       LEFT JOIN users u2 ON sr.reviewed_by = u2.id
       WHERE sr.id = $1 AND sr.org_id = $2`,
      [id, req.user.org_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const report = result.rows[0];

    // Create PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { height } = page.getSize();
    let yOffset = height - 50;

    // Add report content
    // TODO: Implement proper PDF formatting with proper styling
    // This is a basic implementation
    const content = `
      Report: ${report.template_name}
      Submitted by: ${report.submitter_name}
      Date: ${report.submission_date}
      Status: ${report.status}
      ${report.reviewer_name ? `Reviewed by: ${report.reviewer_name}` : ''}
      
      Report Data:
      ${JSON.stringify(report.report_data, null, 2)}
      
      ${report.review_notes ? `Review Notes: ${report.review_notes}` : ''}
    `;

    page.drawText(content, {
      x: 50,
      y: yOffset,
      size: 12,
      color: rgb(0, 0, 0),
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({
      success: false,
      error: 'Error generating PDF report'
    });
  }
};

// @desc    Add comment to a report
// @route   POST /api/reports/:id/comments
// @access  Private
export const addReportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const user_id = req.user.id;

    // Verify report exists and belongs to organization
    const reportCheck = await pool.query(
      'SELECT * FROM submitted_reports WHERE id = $1 AND org_id = $2',
      [id, req.user.org_id]
    );

    if (reportCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Report not found'
      });
    }

    const result = await pool.query(
      'INSERT INTO report_comments (report_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [id, user_id, comment]
    );

    // Notify relevant users
    const notifyUsers = await pool.query(
      `SELECT DISTINCT u.email, u.name
       FROM users u
       WHERE u.id IN (
         SELECT submitted_by FROM submitted_reports WHERE id = $1
         UNION
         SELECT user_id FROM report_comments WHERE report_id = $1
       )
       AND u.id != $2`,
      [id, user_id]
    );

    // Send notifications
    for (const user of notifyUsers.rows) {
      await sendEmail({
        to: user.email,
        template: 'reportComment',
        data: {
          reportId: id,
          commenterName: req.user.name,
          comment
        }
      });
    }

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      error: 'Error adding comment'
    });
  }
};