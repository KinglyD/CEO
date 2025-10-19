import { pool } from '../config/db.js';

// @desc    Get organization overview statistics
// @route   GET /api/dashboard/overview
// @access  Private
export const getOrgOverview = async (req, res) => {
  try {
    const orgId = req.user.org_id;

    // Get latest metrics
    const metricsResult = await pool.query(
      `SELECT metrics_data 
       FROM org_metrics 
       WHERE org_id = $1 
       ORDER BY calculated_at DESC 
       LIMIT 1`,
      [orgId]
    );

    // Get user statistics
    const userStats = await pool.query(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 END) as users_last_7_days
       FROM users 
       WHERE org_id = $1`,
      [orgId]
    );

    // Get report statistics
    const reportStats = await pool.query(
      `SELECT 
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reports,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reports
       FROM submitted_reports 
       WHERE org_id = $1 
       AND submission_date > NOW() - INTERVAL '30 days'`,
      [orgId]
    );

    // Get activity trends
    const activityTrends = await pool.query(
      `SELECT 
        DATE_TRUNC('day', submission_date) as date,
        COUNT(*) as report_count
       FROM submitted_reports 
       WHERE org_id = $1 
       AND submission_date > NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', submission_date)
       ORDER BY date`,
      [orgId]
    );

    res.json({
      success: true,
      data: {
        metrics: metricsResult.rows[0]?.metrics_data || {},
        userStats: userStats.rows[0],
        reportStats: reportStats.rows[0],
        activityTrends: activityTrends.rows
      }
    });
  } catch (error) {
    console.error('Error fetching organization overview:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching organization overview'
    });
  }
};

// @desc    Get user activity log
// @route   GET /api/dashboard/activity
// @access  Private
export const getActivityLog = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const activities = await pool.query(
      `SELECT 
        'report_submission' as type,
        sr.id,
        sr.submission_date as date,
        u.name as user_name,
        rt.name as report_name,
        sr.status
       FROM submitted_reports sr
       JOIN users u ON sr.submitted_by = u.id
       JOIN report_templates rt ON sr.template_id = rt.id
       WHERE sr.org_id = $1
       
       UNION ALL
       
       SELECT 
        'report_comment' as type,
        rc.id,
        rc.created_at as date,
        u.name as user_name,
        rt.name as report_name,
        sr.status
       FROM report_comments rc
       JOIN submitted_reports sr ON rc.report_id = sr.id
       JOIN users u ON rc.user_id = u.id
       JOIN report_templates rt ON sr.template_id = rt.id
       WHERE sr.org_id = $1
       
       ORDER BY date DESC
       LIMIT $2 OFFSET $3`,
      [orgId, limit, offset]
    );

    // Get total count for pagination
    const totalCount = await pool.query(
      `SELECT COUNT(*) as total FROM (
        SELECT id FROM submitted_reports WHERE org_id = $1
        UNION ALL
        SELECT rc.id 
        FROM report_comments rc
        JOIN submitted_reports sr ON rc.report_id = sr.id
        WHERE sr.org_id = $1
      ) as combined`,
      [orgId]
    );

    res.json({
      success: true,
      data: {
        activities: activities.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(totalCount.rows[0].total),
          pages: Math.ceil(totalCount.rows[0].total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity log:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching activity log'
    });
  }
};

// @desc    Get user performance metrics
// @route   GET /api/dashboard/performance
// @access  Private
export const getUserPerformance = async (req, res) => {
  try {
    const orgId = req.user.org_id;
    const { userId } = req.params;

    // Ensure user has permission to view this data
    if (req.user.id !== userId && !['CEO', 'PROJECT_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this data'
      });
    }

    // Get user's report statistics
    const reportStats = await pool.query(
      `SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reports,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_reports,
        AVG(EXTRACT(EPOCH FROM (review_date - submission_date))/3600) as avg_review_time
       FROM submitted_reports 
       WHERE org_id = $1 
       AND submitted_by = $2
       AND submission_date > NOW() - INTERVAL '30 days'`,
      [orgId, userId]
    );

    // Get report submission timeline
    const timeline = await pool.query(
      `SELECT 
        DATE_TRUNC('day', submission_date) as date,
        COUNT(*) as submission_count,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
       FROM submitted_reports 
       WHERE org_id = $1 
       AND submitted_by = $2
       AND submission_date > NOW() - INTERVAL '30 days'
       GROUP BY DATE_TRUNC('day', submission_date)
       ORDER BY date`,
      [orgId, userId]
    );

    // Get report types distribution
    const reportTypes = await pool.query(
      `SELECT 
        rt.name as report_type,
        COUNT(*) as count
       FROM submitted_reports sr
       JOIN report_templates rt ON sr.template_id = rt.id
       WHERE sr.org_id = $1 
       AND sr.submitted_by = $2
       AND sr.submission_date > NOW() - INTERVAL '30 days'
       GROUP BY rt.name`,
      [orgId, userId]
    );

    res.json({
      success: true,
      data: {
        statistics: reportStats.rows[0],
        timeline: timeline.rows,
        reportTypes: reportTypes.rows
      }
    });
  } catch (error) {
    console.error('Error fetching user performance:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching user performance'
    });
  }
};

// @desc    Get team performance overview
// @route   GET /api/dashboard/team
// @access  Private (Managers only)
export const getTeamPerformance = async (req, res) => {
  try {
    const orgId = req.user.org_id;

    // Ensure user has permission
    if (!['CEO', 'PROJECT_MANAGER'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view team performance'
      });
    }

    // Get team members performance
    const teamStats = await pool.query(
      `SELECT 
        u.id,
        u.name,
        COUNT(sr.id) as total_submissions,
        COUNT(CASE WHEN sr.status = 'approved' THEN 1 END) as approved_reports,
        COUNT(CASE WHEN sr.status = 'rejected' THEN 1 END) as rejected_reports,
        AVG(EXTRACT(EPOCH FROM (sr.review_date - sr.submission_date))/3600) as avg_review_time
       FROM users u
       LEFT JOIN submitted_reports sr ON u.id = sr.submitted_by 
        AND sr.submission_date > NOW() - INTERVAL '30 days'
       WHERE u.org_id = $1
       GROUP BY u.id, u.name
       ORDER BY total_submissions DESC`,
      [orgId]
    );

    // Get team activity distribution
    const activityDistribution = await pool.query(
      `SELECT 
        DATE_PART('hour', submission_date) as hour,
        COUNT(*) as submission_count
       FROM submitted_reports
       WHERE org_id = $1
       AND submission_date > NOW() - INTERVAL '7 days'
       GROUP BY DATE_PART('hour', submission_date)
       ORDER BY hour`,
      [orgId]
    );

    res.json({
      success: true,
      data: {
        teamStats: teamStats.rows,
        activityDistribution: activityDistribution.rows
      }
    });
  } catch (error) {
    console.error('Error fetching team performance:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching team performance'
    });
  }
};