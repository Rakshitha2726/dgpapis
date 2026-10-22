import { Op } from 'sequelize';
import { KPI, Department } from '../models/index.js';

// Illustrative research-paper KPI presets (Total = 100%)
export const ILLUSTRATIVE_RESEARCH_PRESETS = [
  {
    name: 'Target Achievement',
    unit: '%',
    target_value: 90.00,
    weight: 30,
    higher_is_better: true,
    category: 'operational_efficiency',
    description: '[ILLUSTRATIVE PRESET] Overall operational target achievement rate across department mandate.',
  },
  {
    name: 'Complaint Resolution',
    unit: '%',
    target_value: 85.00,
    weight: 25,
    higher_is_better: true,
    category: 'service_delivery',
    description: '[ILLUSTRATIVE PRESET] Percentage of public/citizen grievances resolved within statutory SLA timeframes.',
  },
  {
    name: 'Citizen Satisfaction',
    unit: 'score',
    target_value: 80.00,
    weight: 20,
    higher_is_better: true,
    category: 'service_delivery',
    description: '[ILLUSTRATIVE PRESET] Aggregated citizen satisfaction index score from public feedback surveys (0-100).',
  },
  {
    name: 'Service Quality',
    unit: '%',
    target_value: 85.00,
    weight: 15,
    higher_is_better: true,
    category: 'service_delivery',
    description: '[ILLUSTRATIVE PRESET] Service delivery compliance and defect-free processing rate.',
  },
  {
    name: 'Budget Utilization',
    unit: '%',
    target_value: 95.00,
    weight: 10,
    higher_is_better: true,
    category: 'financial',
    description: '[ILLUSTRATIVE PRESET] Percentage of allocated fiscal budget utilized effectively on approved programs.',
  },
];

/**
 * Helper to calculate active KPI weight sum for a department.
 * Inactive KPIs (is_active = false) do NOT consume active allocation capacity.
 */
const getActiveWeightSum = async (department_id, excludeKpiId = null) => {
  const where = {
    department_id,
    is_active: true,
  };
  if (excludeKpiId) {
    where.id = { [Op.ne]: excludeKpiId };
  }

  const kpis = await KPI.findAll({
    where,
    attributes: ['weight'],
  });

  return kpis.reduce((sum, k) => sum + parseInt(k.weight || 0, 10), 0);
};

/**
 * GET /api/kpis
 * Fetch list of KPIs with department details & weight stats.
 */
export const getAllKPIs = async (req, res) => {
  const { department_id, category, includeInactive, search } = req.query;

  const whereClause = {};

  if (includeInactive !== 'true') {
    whereClause.is_active = true;
  }

  if (department_id) {
    whereClause.department_id = department_id;
  }

  if (category) {
    whereClause.category = category;
  }

  if (search && search.trim()) {
    const searchTerm = `%${search.trim()}%`;
    whereClause[Op.or] = [
      { name: { [Op.iLike]: searchTerm } },
      { description: { [Op.iLike]: searchTerm } },
      { unit: { [Op.iLike]: searchTerm } },
    ];
  }

  const kpis = await KPI.findAll({
    where: whereClause,
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code', 'is_active'],
      },
    ],
    order: [
      ['department_id', 'ASC'],
      ['weight', 'DESC'],
      ['name', 'ASC'],
    ],
  });

  res.status(200).json({
    success: true,
    count: kpis.length,
    kpis,
    notice: 'Weights represent relative importance for aggregate scoring. Illustrative presets are project evaluation metrics.',
  });
};

/**
 * GET /api/kpis/department/:department_id/weight-summary
 * Get active weight allocation summary for a department.
 */
export const getDepartmentWeightSummary = async (req, res) => {
  const { department_id } = req.params;

  const department = await Department.findByPk(department_id);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${department_id} not found.`,
    });
  }

  const activeWeightSum = await getActiveWeightSum(department_id);
  const remainingWeight = Math.max(0, 100 - activeWeightSum);

  const activeKpis = await KPI.findAll({
    where: { department_id, is_active: true },
    attributes: ['id', 'name', 'weight', 'category', 'target_value', 'unit', 'higher_is_better'],
  });

  res.status(200).json({
    success: true,
    department: {
      id: department.id,
      name: department.name,
      code: department.code,
    },
    weight_summary: {
      total_active_weight: activeWeightSum,
      remaining_weight: remainingWeight,
      is_fully_allocated: activeWeightSum === 100,
      is_over_allocated: activeWeightSum > 100,
      active_kpi_count: activeKpis.length,
    },
    active_kpis: activeKpis,
    notice: 'Illustrative research-paper preset values: Target Achievement (30%), Complaint Resolution (25%), Citizen Satisfaction (20%), Service Quality (15%), Budget Utilization (10%).',
  });
};

/**
 * GET /api/kpis/:id
 */
export const getKPIById = async (req, res) => {
  const { id } = req.params;

  const kpi = await KPI.findByPk(id, {
    include: [
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name', 'code', 'is_active'],
      },
    ],
  });

  if (!kpi) {
    return res.status(404).json({
      success: false,
      message: `KPI with ID ${id} not found.`,
    });
  }

  res.status(200).json({
    success: true,
    kpi,
  });
};

/**
 * POST /api/kpis
 * Create a single KPI (Admin only).
 */
export const createKPI = async (req, res) => {
  const { name, department_id, unit, target_value, weight, higher_is_better, category, description, is_active } = req.body;

  const department = await Department.findByPk(department_id);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${department_id} not found.`,
    });
  }

  const kpiIsActive = is_active !== undefined ? is_active : true;

  // Active-only weight sum check
  if (kpiIsActive) {
    const currentActiveSum = await getActiveWeightSum(department_id);
    const newTotalWeight = currentActiveSum + parseInt(weight, 10);

    if (newTotalWeight > 100) {
      return res.status(400).json({
        success: false,
        message: `Weight allocation error: Adding KPI '${name}' with weight ${weight}% would make total active weights ${newTotalWeight}%, exceeding the maximum 100% capacity for ${department.code} (Current active weight: ${currentActiveSum}%, Remaining available: ${100 - currentActiveSum}%).`,
      });
    }
  }

  const newKPI = await KPI.create({
    name: name.trim(),
    department_id,
    unit: unit.trim(),
    target_value,
    weight: parseInt(weight, 10),
    higher_is_better,
    category,
    description: description ? description.trim() : null,
    is_active: kpiIsActive,
  });

  const updatedActiveSum = await getActiveWeightSum(department_id);

  res.status(201).json({
    success: true,
    message: `KPI '${newKPI.name}' created successfully for ${department.name}.`,
    kpi: newKPI,
    department_weight_summary: {
      total_active_weight: updatedActiveSum,
      remaining_weight: Math.max(0, 100 - updatedActiveSum),
    },
  });
};

/**
 * PUT /api/kpis/:id
 * Update an existing KPI (Admin only).
 */
export const updateKPI = async (req, res) => {
  const { id } = req.params;
  const { name, department_id, unit, target_value, weight, higher_is_better, category, description, is_active } = req.body;

  const kpi = await KPI.findByPk(id);
  if (!kpi) {
    return res.status(404).json({
      success: false,
      message: `KPI with ID ${id} not found.`,
    });
  }

  const targetDepartmentId = department_id || kpi.department_id;
  const willBeActive = is_active !== undefined ? is_active : kpi.is_active;
  const newWeight = weight !== undefined ? parseInt(weight, 10) : kpi.weight;

  // Validate active-only weight capacity
  if (willBeActive) {
    const otherActiveSum = await getActiveWeightSum(targetDepartmentId, kpi.id);
    const updatedTotalWeight = otherActiveSum + newWeight;

    if (updatedTotalWeight > 100) {
      return res.status(400).json({
        success: false,
        message: `Weight allocation error: Updating KPI weight to ${newWeight}% would bring total active weights to ${updatedTotalWeight}%, exceeding 100% for department ID ${targetDepartmentId} (Other active KPIs: ${otherActiveSum}%, Remaining capacity: ${100 - otherActiveSum}%).`,
      });
    }
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (department_id !== undefined) updates.department_id = department_id;
  if (unit !== undefined) updates.unit = unit.trim();
  if (target_value !== undefined) updates.target_value = target_value;
  if (weight !== undefined) updates.weight = parseInt(weight, 10);
  if (higher_is_better !== undefined) updates.higher_is_better = higher_is_better;
  if (category !== undefined) updates.category = category;
  if (description !== undefined) updates.description = description ? description.trim() : null;
  if (is_active !== undefined) updates.is_active = is_active;

  await kpi.update(updates);

  const updatedActiveSum = await getActiveWeightSum(targetDepartmentId);

  res.status(200).json({
    success: true,
    message: `KPI '${kpi.name}' updated successfully.`,
    kpi,
    department_weight_summary: {
      total_active_weight: updatedActiveSum,
      remaining_weight: Math.max(0, 100 - updatedActiveSum),
    },
  });
};

/**
 * DELETE /api/kpis/:id
 * Soft deactivates a KPI (Admin only).
 * Always sets is_active = false to preserve historical performance data.
 */
export const deleteKPI = async (req, res) => {
  const { id } = req.params;

  const kpi = await KPI.findByPk(id);
  if (!kpi) {
    return res.status(404).json({
      success: false,
      message: `KPI with ID ${id} not found.`,
    });
  }

  if (!kpi.is_active) {
    return res.status(400).json({
      success: false,
      message: `KPI '${kpi.name}' is already deactivated.`,
    });
  }

  kpi.is_active = false;
  await kpi.save();

  const updatedActiveSum = await getActiveWeightSum(kpi.department_id);

  res.status(200).json({
    success: true,
    message: `KPI '${kpi.name}' deactivated successfully. Historical performance data remains intact. Released ${kpi.weight}% active weight.`,
    kpi,
    department_weight_summary: {
      total_active_weight: updatedActiveSum,
      remaining_weight: Math.max(0, 100 - updatedActiveSum),
    },
  });
};

/**
 * POST /api/kpis/apply-presets
 * Applies research-paper illustrative KPI presets to a department (Admin only).
 * Deduplication: Checks existing KPIs for department. If a preset KPI already exists, skips it. Adds ONLY missing presets.
 */
export const applyIllustrativePresets = async (req, res) => {
  const { department_id } = req.body;

  const department = await Department.findByPk(department_id);
  if (!department) {
    return res.status(404).json({
      success: false,
      message: `Department with ID ${department_id} not found.`,
    });
  }

  // Get existing KPIs for this department
  const existingKpis = await KPI.findAll({
    where: { department_id },
    attributes: ['id', 'name', 'weight', 'is_active'],
  });

  const existingNamesLower = new Set(existingKpis.map((k) => k.name.toLowerCase()));

  const createdPresets = [];
  const skippedPresets = [];

  for (const preset of ILLUSTRATIVE_RESEARCH_PRESETS) {
    if (existingNamesLower.has(preset.name.toLowerCase())) {
      skippedPresets.push(preset.name);
    } else {
      // Check active weight capacity
      const currentActiveSum = await getActiveWeightSum(department_id);
      if (currentActiveSum + preset.weight <= 100) {
        const created = await KPI.create({
          ...preset,
          department_id,
          is_active: true,
        });
        createdPresets.push(created);
        existingNamesLower.add(preset.name.toLowerCase());
      } else {
        skippedPresets.push(`${preset.name} (Weight over-allocation capacity limit reached)`);
      }
    }
  }

  const updatedActiveSum = await getActiveWeightSum(department_id);

  res.status(200).json({
    success: true,
    message: createdPresets.length > 0
      ? `Applied ${createdPresets.length} illustrative research presets to ${department.name}. (${skippedPresets.length} presets skipped as duplicates or due to weight limit).`
      : `No new presets applied. All illustrative presets already exist or department is fully allocated.`,
    created_count: createdPresets.length,
    skipped_count: skippedPresets.length,
    created_presets: createdPresets,
    skipped_presets: skippedPresets,
    department_weight_summary: {
      total_active_weight: updatedActiveSum,
      remaining_weight: Math.max(0, 100 - updatedActiveSum),
    },
    notice: '⚠️ Illustrative Project Values: Target Achievement (30%), Complaint Resolution (25%), Citizen Satisfaction (20%), Service Quality (15%), Budget Utilization (10%) are illustrative research-paper design metrics for evaluation, not official government standards.',
  });
};
