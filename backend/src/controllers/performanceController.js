import { Op } from 'sequelize';
import { PerformanceEntry, Department, KPI, User } from '../models/index.js';
import { computeAndSaveDepartmentScore } from '../utils/scoreEngine.js';

/**
 * GET /api/performance/active-kpis
 * Returns active KPIs for the authenticated Department Officer's assigned department.
 */
export const getDepartmentActiveKpis = async (req, res) => {
  const user = req.user;

  if (user.role === 'department_officer' && !user.department_id) {
    return res.status(400).json({
      success: false,
      message: 'You are not currently assigned to any department. Please contact an administrator.',
    });
  }

  const deptId = user.role === 'department_officer' ? user.department_id : req.query.department_id;

  if (!deptId) {
    return res.status(400).json({
      success: false,
      message: 'Department ID is required.',
    });
  }

  const department = await Department.findByPk(deptId);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${deptId} not found.`,
    });
  }

  if (!department.is_active) {
    return res.status(400).json({
      success: false,
      message: `Department '${department.name}' is deactivated. Data entry is disabled for inactive departments.`,
    });
  }

  const activeKpis = await KPI.findAll({
    where: {
      department_id: deptId,
      is_active: true,
    },
    attributes: ['id', 'name', 'unit', 'target_value', 'weight', 'higher_is_better', 'category', 'description'],
    order: [['name', 'ASC']],
  });

  res.status(200).json({
    success: true,
    department: {
      id: department.id,
      name: department.name,
      code: department.code,
    },
    count: activeKpis.length,
    kpis: activeKpis,
  });
};

/**
 * GET /api/performance
 * Fetch performance entries.
 * Officers are strictly isolated to their assigned department.
 * Admins and Policymakers can view across departments.
 */
export const getPerformanceEntries = async (req, res) => {
  const user = req.user;
  const { department_id, kpi_id, period_year, period_month, status, search } = req.query;

  const whereClause = {};

  // Department Isolation Guard
  if (user.role === 'department_officer') {
    if (!user.department_id) {
      return res.status(400).json({
        success: false,
        message: 'You are not assigned to any department.',
      });
    }
    whereClause.department_id = user.department_id;
  } else if (department_id) {
    whereClause.department_id = department_id;
  }

  if (kpi_id) whereClause.kpi_id = kpi_id;
  if (period_year) whereClause.period_year = period_year;
  if (period_month) whereClause.period_month = period_month;
  if (status) whereClause.status = status;

  if (search && search.trim()) {
    whereClause.notes = { [Op.iLike]: `%${search.trim()}%` };
  }

  const entries = await PerformanceEntry.findAll({
    where: whereClause,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code', 'is_active'],
      },
      {
        model: KPI,
        as: 'kpi',
        attributes: ['id', 'name', 'unit', 'target_value', 'higher_is_better', 'category', 'is_active'],
      },
      {
        model: User,
        as: 'submittedBy',
        attributes: ['id', 'name', 'email', 'role'],
      },
    ],
    order: [
      ['period_year', 'DESC'],
      ['period_month', 'DESC'],
      ['id', 'DESC'],
    ],
  });

  res.status(200).json({
    success: true,
    count: entries.length,
    entries,
  });
};

/**
 * GET /api/performance/:id
 */
export const getPerformanceEntryById = async (req, res) => {
  const { id } = req.params;
  const user = req.user;

  const entry = await PerformanceEntry.findByPk(id, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code', 'is_active'],
      },
      {
        model: KPI,
        as: 'kpi',
        attributes: ['id', 'name', 'unit', 'target_value', 'higher_is_better', 'category', 'is_active'],
      },
      {
        model: User,
        as: 'submittedBy',
        attributes: ['id', 'name', 'email', 'role'],
      },
    ],
  });

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: `Performance entry with ID ${id} not found.`,
    });
  }

  // Department Isolation Guard
  if (user.role === 'department_officer' && entry.department_id !== user.department_id) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You can only view performance data belonging to your assigned department.',
    });
  }

  res.status(200).json({
    success: true,
    entry,
  });
};

/**
 * POST /api/performance
 * Create a new performance entry.
 * ONLY department_officer role can submit performance entries.
 */
export const createPerformanceEntry = async (req, res) => {
  const user = req.user;
  const { kpi_id, period_year, period_month, actual_value, notes, status } = req.body;

  // Role Restriction: ONLY department_officer
  if (user.role !== 'department_officer') {
    return res.status(403).json({
      success: false,
      message: `Access Denied: Only Department Officers can create performance entries. '${user.role}' users have read-only access.`,
    });
  }

  if (!user.department_id) {
    return res.status(400).json({
      success: false,
      message: 'You are not assigned to any department. Contact an administrator.',
    });
  }

  const departmentId = user.department_id;

  // Active Department Check
  const department = await Department.findByPk(departmentId);
  if (!department || !department.is_active) {
    return res.status(400).json({
      success: false,
      message: `Cannot submit data. Department '${department ? department.name : departmentId}' is deactivated.`,
    });
  }

  // Active KPI Check
  const kpi = await KPI.findByPk(kpi_id);
  if (!kpi) {
    return res.status(404).json({
      success: false,
      message: `KPI with ID ${kpi_id} not found.`,
    });
  }

  if (kpi.department_id !== departmentId) {
    return res.status(403).json({
      success: false,
      message: `Access Denied: KPI '${kpi.name}' does not belong to your assigned department (${department.code}).`,
    });
  }

  if (!kpi.is_active) {
    return res.status(400).json({
      success: false,
      message: `Cannot submit data for inactive KPI '${kpi.name}'. Only active KPIs accept new performance entries.`,
    });
  }

  // Composite Unique Period Constraint Check: (department_id, kpi_id, period_year, period_month)
  const existingEntry = await PerformanceEntry.findOne({
    where: {
      department_id: departmentId,
      kpi_id,
      period_year,
      period_month,
    },
  });

  if (existingEntry) {
    const monthName = new Date(period_year, period_month - 1).toLocaleString('default', { month: 'long' });
    return res.status(409).json({
      success: false,
      message: `A performance entry already exists for KPI '${kpi.name}' in ${monthName} ${period_year} (Status: ${existingEntry.status}). You can edit the existing record instead of creating a duplicate.`,
      existing_entry_id: existingEntry.id,
    });
  }

  const newEntry = await PerformanceEntry.create({
    department_id: departmentId,
    kpi_id,
    submitted_by: user.id,
    period_year,
    period_month,
    actual_value,
    notes: notes ? notes.trim() : null,
    status: status || 'draft',
  });

  const createdWithAssoc = await PerformanceEntry.findByPk(newEntry.id, {
    include: [
      { model: Department, as: 'department', attributes: ['id', 'name', 'code'] },
      { model: KPI, as: 'kpi', attributes: ['id', 'name', 'unit', 'target_value', 'higher_is_better'] },
      { model: User, as: 'submittedBy', attributes: ['id', 'name', 'email'] },
    ],
  });

  // Automatically recalculate and persist department score when entry is submitted
  let departmentScoreResult = null;
  if (newEntry.status === 'submitted') {
    try {
      const scoreOutcome = await computeAndSaveDepartmentScore(departmentId, period_year, period_month);
      departmentScoreResult = scoreOutcome.result;
    } catch (scoreErr) {
      console.error('Auto-calculation of department score on create failed:', scoreErr);
    }
  }

  res.status(201).json({
    success: true,
    message: `Performance data for '${kpi.name}' (${period_year}-${String(period_month).padStart(2, '0')}) saved successfully (${newEntry.status}).`,
    entry: createdWithAssoc,
    department_score: departmentScoreResult,
  });
};

/**
 * PUT /api/performance/:id
 * Update an existing performance entry.
 * ONLY department_officer role can update entries for their own department.
 */
export const updatePerformanceEntry = async (req, res) => {
  const { id } = req.params;
  const user = req.user;
  const { actual_value, notes, status } = req.body;

  // Role Restriction: ONLY department_officer
  if (user.role !== 'department_officer') {
    return res.status(403).json({
      success: false,
      message: `Access Denied: Only Department Officers can update performance entries. '${user.role}' users have read-only access.`,
    });
  }

  const entry = await PerformanceEntry.findByPk(id, {
    include: [
      { model: Department, as: 'department' },
      { model: KPI, as: 'kpi' },
    ],
  });

  if (!entry) {
    return res.status(404).json({
      success: false,
      message: `Performance entry with ID ${id} not found.`,
    });
  }

  // Department Isolation Guard
  if (entry.department_id !== user.department_id) {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: You can only edit performance records for your assigned department.',
    });
  }

  // Active Department & Active KPI Guards
  if (!entry.department.is_active) {
    return res.status(400).json({
      success: false,
      message: `Cannot edit entry. Department '${entry.department.name}' is deactivated.`,
    });
  }

  if (!entry.kpi.is_active) {
    return res.status(400).json({
      success: false,
      message: `Cannot edit entry. KPI '${entry.kpi.name}' is inactive.`,
    });
  }

  const updates = {};
  if (actual_value !== undefined) updates.actual_value = actual_value;
  if (notes !== undefined) updates.notes = notes ? notes.trim() : null;
  if (status !== undefined) updates.status = status;

  await entry.update(updates);

  // Automatically recalculate and persist department score for this period
  let departmentScoreResult = null;
  if (entry.status === 'submitted' || status !== undefined) {
    try {
      const scoreOutcome = await computeAndSaveDepartmentScore(entry.department_id, entry.period_year, entry.period_month);
      departmentScoreResult = scoreOutcome.result;
    } catch (scoreErr) {
      console.error('Auto-calculation of department score on update failed:', scoreErr);
    }
  }

  res.status(200).json({
    success: true,
    message: `Performance entry for '${entry.kpi.name}' updated successfully.`,
    entry,
    department_score: departmentScoreResult,
  });
};
