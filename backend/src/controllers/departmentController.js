import { Op } from 'sequelize';
import { Department, User, KPI } from '../models/index.js';

/**
 * GET /api/departments
 * Fetch list of all departments with search and active status filtering.
 */
export const getAllDepartments = async (req, res) => {
  const { search, includeInactive } = req.query;

  const whereClause = {};

  if (includeInactive !== 'true') {
    whereClause.is_active = true;
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { name: { [Op.iLike]: searchTerm } },
      { code: { [Op.iLike]: searchTerm } },
      { description: { [Op.iLike]: searchTerm } },
    ];
  }

  const departments = await Department.findAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'users',
        attributes: ['id', 'name', 'email', 'role', 'is_active'],
      },
      {
        model: KPI,
        as: 'kpis',
        attributes: ['id', 'name', 'unit', 'is_active'],
      },
    ],
    order: [['name', 'ASC']],
  });

  const formattedDepartments = departments.map((dept) => {
    const json = dept.toJSON();
    return {
      id: json.id,
      name: json.name,
      code: json.code,
      description: json.description,
      is_active: json.is_active,
      created_at: json.created_at,
      updated_at: json.updated_at,
      user_count: json.users ? json.users.length : 0,
      kpi_count: json.kpis ? json.kpis.length : 0,
      active_kpi_count: json.kpis ? json.kpis.filter((k) => k.is_active).length : 0,
      users: json.users || [],
      kpis: json.kpis || [],
    };
  });

  res.status(200).json({
    success: true,
    count: formattedDepartments.length,
    departments: formattedDepartments,
  });
};

/**
 * GET /api/departments/:id
 * Fetch detailed info for a single department.
 */
export const getDepartmentById = async (req, res) => {
  const { id } = req.params;

  const department = await Department.findByPk(id, {
    include: [
      {
        model: User,
        as: 'users',
        attributes: ['id', 'name', 'email', 'role', 'is_active', 'last_login_at'],
      },
      {
        model: KPI,
        as: 'kpis',
        attributes: ['id', 'name', 'description', 'unit', 'target_value', 'weight', 'higher_is_better', 'category', 'is_active'],
      },
    ],
  });

  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${id} not found.`,
    });
  }

  const json = department.toJSON();
  res.status(200).json({
    success: true,
    department: {
      ...json,
      user_count: json.users ? json.users.length : 0,
      kpi_count: json.kpis ? json.kpis.length : 0,
    },
  });
};

/**
 * POST /api/departments
 * Create a new department (Admin only).
 */
export const createDepartment = async (req, res) => {
  const { name, code, description, is_active } = req.body;

  const formattedCode = code.trim().toUpperCase();
  const formattedName = name.trim();

  // Check for duplicate name or code
  const existingDept = await Department.findOne({
    where: {
      [Op.or]: [
        { name: { [Op.iLike]: formattedName } },
        { code: { [Op.iLike]: formattedCode } },
      ],
    },
  });

  if (existingDept) {
    const isNameConflict = existingDept.name.toLowerCase() === formattedName.toLowerCase();
    const message = isNameConflict
      ? `A department with the name '${formattedName}' already exists.`
      : `A department with the code '${formattedCode}' already exists.`;

    return res.status(409).json({
      success: false,
      message,
    });
  }

  const newDepartment = await Department.create({
    name: formattedName,
    code: formattedCode,
    description: description ? description.trim() : null,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json({
    success: true,
    message: `Department '${newDepartment.name}' (${newDepartment.code}) created successfully.`,
    department: newDepartment,
  });
};

/**
 * PUT /api/departments/:id
 * Update an existing department (Admin only).
 */
export const updateDepartment = async (req, res) => {
  const { id } = req.params;
  const { name, code, description, is_active } = req.body;

  const department = await Department.findByPk(id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${id} not found.`,
    });
  }

  const updates = {};

  if (name !== undefined) {
    const formattedName = name.trim();
    // Check if duplicate name exists in another department
    const nameConflict = await Department.findOne({
      where: {
        name: { [Op.iLike]: formattedName },
        id: { [Op.ne]: id },
      },
    });

    if (nameConflict) {
      return res.status(409).json({
        success: false,
        message: `A department with the name '${formattedName}' already exists.`,
      });
    }
    updates.name = formattedName;
  }

  if (code !== undefined) {
    const formattedCode = code.trim().toUpperCase();
    // Check if duplicate code exists in another department
    const codeConflict = await Department.findOne({
      where: {
        code: { [Op.iLike]: formattedCode },
        id: { [Op.ne]: id },
      },
    });

    if (codeConflict) {
      return res.status(409).json({
        success: false,
        message: `A department with the code '${formattedCode}' already exists.`,
      });
    }
    updates.code = formattedCode;
  }

  if (description !== undefined) {
    updates.description = description ? description.trim() : null;
  }

  if (is_active !== undefined) {
    updates.is_active = is_active;
  }

  await department.update(updates);

  res.status(200).json({
    success: true,
    message: `Department '${department.name}' updated successfully.`,
    department,
  });
};

/**
 * DELETE /api/departments/:id
 * Soft deactivates a department (Admin only).
 * Always sets is_active = false to preserve historical performance data.
 */
export const deleteDepartment = async (req, res) => {
  const { id } = req.params;

  const department = await Department.findByPk(id);

  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${id} not found.`,
    });
  }

  if (!department.is_active) {
    return res.status(400).json({
      success: false,
      message: `Department '${department.name}' is already deactivated.`,
    });
  }

  // Soft deactivation requirement: Always set is_active = false
  department.is_active = false;
  await department.save();

  res.status(200).json({
    success: true,
    message: `Department '${department.name}' (${department.code}) deactivated successfully. Historical performance data remains intact.`,
    department,
  });
};
