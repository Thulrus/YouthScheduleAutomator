/**
 * Schedule file operations - load, save, validate, create
 */

import {
  ScheduleFile,
  ScheduleFileConfig,
  SerializedAssignment,
  Leader,
  Group,
  RawRule,
  ScheduleEdit,
  SCHEDULE_FILE_VERSION,
  Schedule,
} from './models';
import {
  serializeSchedule,
  serializeSchedulerState,
  deserializeSchedule,
  deserializeSchedulerState,
  cloneSerializedAssignment,
} from './serialization';
import { SchedulerState, getSchedulerState } from './scheduler';

// ============================================================================
// FILE CREATION
// ============================================================================

/**
 * Create a new empty schedule file with default configuration
 */
export function createEmptyScheduleFile(name: string, timezone: string = 'America/Denver'): ScheduleFile {
  const now = new Date().toISOString();
  
  return {
    version: SCHEDULE_FILE_VERSION,
    name,
    createdAt: now,
    modifiedAt: now,
    config: {
      leaders: [],
      groups: [],
      rules: [],
      randomSeed: 0,
      timezone,
    },
    schedule: {
      dateRangeStart: '',
      dateRangeEnd: '',
      assignments: [],
      schedulerState: {
        leaderAssignments: {},
        groupRotations: {},
        youthAssignments: {},
      },
    },
    edits: [],
  };
}

/**
 * Create a schedule file from configuration and generated schedule
 */
export function createScheduleFile(
  name: string,
  config: ScheduleFileConfig,
  schedule: Schedule,
  dateRangeStart: Date,
  dateRangeEnd: Date
): ScheduleFile {
  const now = new Date().toISOString();
  const schedulerState = getSchedulerState(schedule);
  
  return {
    version: SCHEDULE_FILE_VERSION,
    name,
    createdAt: now,
    modifiedAt: now,
    config: { ...config },
    schedule: {
      dateRangeStart: dateRangeStart.toISOString().split('T')[0],
      dateRangeEnd: dateRangeEnd.toISOString().split('T')[0],
      assignments: serializeSchedule(schedule),
      schedulerState: serializeSchedulerState(schedulerState),
    },
    edits: [],
  };
}

/**
 * Import legacy configuration into a new schedule file
 * (for migration from the old format)
 */
export function createScheduleFileFromLegacy(
  name: string,
  leaders: Leader[],
  groups: Group[],
  rules: RawRule[],
  randomSeed: number,
  timezone: string
): ScheduleFile {
  const file = createEmptyScheduleFile(name, timezone);
  file.config.leaders = leaders;
  file.config.groups = groups;
  file.config.rules = rules;
  file.config.randomSeed = randomSeed;
  return file;
}

// ============================================================================
// FILE VALIDATION
// ============================================================================

/**
 * Validation error with field path
 */
export interface ValidationError {
  path: string;
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a schedule file structure
 */
export function validateScheduleFile(data: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  if (typeof data !== 'object' || data === null) {
    errors.push({ path: '', message: 'File must be a valid JSON object' });
    return { valid: false, errors, warnings };
  }

  const file = data as Record<string, unknown>;

  // Check version
  if (typeof file.version !== 'string') {
    errors.push({ path: 'version', message: 'Missing or invalid version field' });
  } else if (!file.version.startsWith('2.')) {
    warnings.push({ path: 'version', message: `File version ${file.version} may not be fully compatible` });
  }

  // Check required string fields
  if (typeof file.name !== 'string' || file.name.length === 0) {
    errors.push({ path: 'name', message: 'Name is required' });
  }
  if (typeof file.createdAt !== 'string') {
    errors.push({ path: 'createdAt', message: 'Missing createdAt timestamp' });
  }
  if (typeof file.modifiedAt !== 'string') {
    errors.push({ path: 'modifiedAt', message: 'Missing modifiedAt timestamp' });
  }

  // Check config section
  if (typeof file.config !== 'object' || file.config === null) {
    errors.push({ path: 'config', message: 'Missing config section' });
  } else {
    const config = file.config as Record<string, unknown>;
    
    if (!Array.isArray(config.leaders)) {
      errors.push({ path: 'config.leaders', message: 'Leaders must be an array' });
    }
    if (!Array.isArray(config.groups)) {
      errors.push({ path: 'config.groups', message: 'Groups must be an array' });
    }
    if (!Array.isArray(config.rules)) {
      errors.push({ path: 'config.rules', message: 'Rules must be an array' });
    }
    if (typeof config.randomSeed !== 'number') {
      warnings.push({ path: 'config.randomSeed', message: 'Missing randomSeed, will default to 0' });
    }
    if (typeof config.timezone !== 'string') {
      warnings.push({ path: 'config.timezone', message: 'Missing timezone, will default to America/Denver' });
    }
  }

  // Check schedule section
  if (typeof file.schedule !== 'object' || file.schedule === null) {
    errors.push({ path: 'schedule', message: 'Missing schedule section' });
  } else {
    const schedule = file.schedule as Record<string, unknown>;
    
    if (typeof schedule.dateRangeStart !== 'string') {
      warnings.push({ path: 'schedule.dateRangeStart', message: 'Missing dateRangeStart' });
    }
    if (typeof schedule.dateRangeEnd !== 'string') {
      warnings.push({ path: 'schedule.dateRangeEnd', message: 'Missing dateRangeEnd' });
    }
    if (!Array.isArray(schedule.assignments)) {
      errors.push({ path: 'schedule.assignments', message: 'Assignments must be an array' });
    }
    if (typeof schedule.schedulerState !== 'object' || schedule.schedulerState === null) {
      warnings.push({ path: 'schedule.schedulerState', message: 'Missing schedulerState, will use empty state' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// FILE LOADING
// ============================================================================

/**
 * Parse and validate a schedule file from JSON string
 */
export function parseScheduleFile(jsonString: string): { file: ScheduleFile | null; validation: ValidationResult } {
  let data: unknown;
  
  try {
    data = JSON.parse(jsonString);
  } catch (e) {
    return {
      file: null,
      validation: {
        valid: false,
        errors: [{ path: '', message: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}` }],
        warnings: [],
      },
    };
  }

  const validation = validateScheduleFile(data);
  
  if (!validation.valid) {
    return { file: null, validation };
  }

  // Apply defaults for missing optional fields
  const file = data as ScheduleFile;
  
  if (!file.config.randomSeed) {
    file.config.randomSeed = 0;
  }
  if (!file.config.timezone) {
    file.config.timezone = 'America/Denver';
  }
  if (!file.schedule.schedulerState) {
    file.schedule.schedulerState = {
      leaderAssignments: {},
      groupRotations: {},
      youthAssignments: {},
    };
  }
  if (!file.edits) {
    file.edits = [];
  }

  return { file, validation };
}

/**
 * Load a schedule file from a File object (browser File API)
 */
export async function loadScheduleFile(file: File): Promise<{ scheduleFile: ScheduleFile | null; validation: ValidationResult }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const result = parseScheduleFile(content);
      resolve({ scheduleFile: result.file, validation: result.validation });
    };
    
    reader.onerror = () => {
      resolve({
        scheduleFile: null,
        validation: {
          valid: false,
          errors: [{ path: '', message: 'Failed to read file' }],
          warnings: [],
        },
      });
    };
    
    reader.readAsText(file);
  });
}

// ============================================================================
// FILE SAVING
// ============================================================================

/**
 * Serialize a schedule file to JSON string
 */
export function stringifyScheduleFile(file: ScheduleFile): string {
  // Update modification timestamp
  const updated = {
    ...file,
    modifiedAt: new Date().toISOString(),
  };
  
  return JSON.stringify(updated, null, 2);
}

/**
 * Save a schedule file (triggers browser download)
 */
export function saveScheduleFile(file: ScheduleFile, filename?: string): void {
  const json = stringifyScheduleFile(file);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `${sanitizeFilename(file.name)}.ysch`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .slice(0, 100);
}

// ============================================================================
// FILE MODIFICATION HELPERS
// ============================================================================

/**
 * Update the schedule data in a file after regeneration
 */
export function updateScheduleData(
  file: ScheduleFile,
  schedule: Schedule,
  dateRangeStart: Date,
  dateRangeEnd: Date
): ScheduleFile {
  const schedulerState = getSchedulerState(schedule);
  
  return {
    ...file,
    modifiedAt: new Date().toISOString(),
    schedule: {
      dateRangeStart: dateRangeStart.toISOString().split('T')[0],
      dateRangeEnd: dateRangeEnd.toISOString().split('T')[0],
      assignments: serializeSchedule(schedule),
      schedulerState: serializeSchedulerState(schedulerState),
    },
  };
}

/**
 * Update a single assignment in the file
 */
export function updateAssignment(
  file: ScheduleFile,
  assignmentId: string,
  updater: (assignment: SerializedAssignment) => SerializedAssignment,
  editReason?: string
): ScheduleFile {
  const assignmentIndex = file.schedule.assignments.findIndex(a => a.id === assignmentId);
  
  if (assignmentIndex === -1) {
    throw new Error(`Assignment not found: ${assignmentId}`);
  }

  const oldAssignment = file.schedule.assignments[assignmentIndex];
  const newAssignment = updater(cloneSerializedAssignment(oldAssignment));
  
  // Mark as manually edited
  newAssignment.isManuallyEdited = true;
  
  // Store original if not already stored
  if (!newAssignment.originalLeaders && oldAssignment.leaders.length > 0) {
    newAssignment.originalLeaders = [...oldAssignment.leaders];
  }
  if (!newAssignment.originalGroupAssignments && oldAssignment.groupAssignments) {
    newAssignment.originalGroupAssignments = JSON.parse(JSON.stringify(oldAssignment.groupAssignments));
  }

  // Create edit record
  const edit: ScheduleEdit = {
    id: `edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    assignmentId,
    type: 'full-edit',
    before: {
      leaders: oldAssignment.leaders,
      groupAssignments: oldAssignment.groupAssignments,
      responsibleGroup: oldAssignment.responsibleGroup,
    },
    after: {
      leaders: newAssignment.leaders,
      groupAssignments: newAssignment.groupAssignments,
      responsibleGroup: newAssignment.responsibleGroup,
    },
    reason: editReason,
  };

  // Create new assignments array with the updated assignment
  const newAssignments = [...file.schedule.assignments];
  newAssignments[assignmentIndex] = newAssignment;

  return {
    ...file,
    modifiedAt: new Date().toISOString(),
    schedule: {
      ...file.schedule,
      assignments: newAssignments,
    },
    edits: [...(file.edits || []), edit],
  };
}

/**
 * Update the configuration in a file
 */
export function updateConfig(
  file: ScheduleFile,
  configUpdates: Partial<ScheduleFileConfig>
): ScheduleFile {
  return {
    ...file,
    modifiedAt: new Date().toISOString(),
    config: {
      ...file.config,
      ...configUpdates,
    },
  };
}

// ============================================================================
// RUNTIME CONVERSION
// ============================================================================

/**
 * Get a runtime Schedule object from a ScheduleFile
 */
export function getScheduleFromFile(file: ScheduleFile): Schedule {
  return deserializeSchedule(file.schedule.assignments);
}

/**
 * Get a runtime SchedulerState from a ScheduleFile
 */
export function getSchedulerStateFromFile(file: ScheduleFile): SchedulerState {
  return deserializeSchedulerState(file.schedule.schedulerState);
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Find an assignment by ID
 */
export function findAssignment(file: ScheduleFile, assignmentId: string): SerializedAssignment | undefined {
  return file.schedule.assignments.find(a => a.id === assignmentId);
}

/**
 * Get assignments within a date range
 */
export function getAssignmentsInRange(
  file: ScheduleFile,
  startDate: Date,
  endDate: Date
): SerializedAssignment[] {
  const startStr = startDate.toISOString().split('T')[0];
  const endStr = endDate.toISOString().split('T')[0];
  
  return file.schedule.assignments.filter(a => {
    return a.date >= startStr && a.date <= endStr;
  });
}

/**
 * Get assignments for a specific leader
 */
export function getAssignmentsForLeader(
  file: ScheduleFile,
  leaderName: string
): SerializedAssignment[] {
  return file.schedule.assignments.filter(a => {
    // Check combined event leaders
    if (a.leaders.includes(leaderName)) {
      return true;
    }
    // Check separate event group assignments
    if (a.groupAssignments) {
      return a.groupAssignments.some(ga => ga.leaders.includes(leaderName));
    }
    return false;
  });
}

/**
 * Get assignments that have been manually edited
 */
export function getEditedAssignments(file: ScheduleFile): SerializedAssignment[] {
  return file.schedule.assignments.filter(a => a.isManuallyEdited);
}

/**
 * Get assignments that have NOT been manually edited
 */
export function getUneditedAssignments(file: ScheduleFile): SerializedAssignment[] {
  return file.schedule.assignments.filter(a => !a.isManuallyEdited);
}
