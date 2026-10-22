// controllers/reportController.js
// Handles report export (PDF/Excel) for authorized users.

import { generateReport } from '../services/reportService.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { validateReportParams, validateReportQuery } from '../validators/reportValidator.js';

/**
 * GET /api/reports/:departmentId/:year/:month?format=pdf|excel
 * Accessible by roles: admin, policy_maker.
 */
export const getReport = async (req, res) => {
  try {
    const { departmentId, year, month } = req.params;
    const { format } = req.query;
    const result = await generateReport(Number(departmentId), Number(year), Number(month), format);
    res.setHeader('Content-Type', result.mime);
    res.setHeader('Content-Disposition', `attachment; filename=department_${departmentId}_${year}_${month}.${result.ext}`);
    return res.send(result.buffer);
  } catch (err) {
    console.error('Report generation error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Report generation failed.' });
  }
};
