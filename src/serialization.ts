/**
 * Serialization utilities for converting between runtime and file formats
 */

import {
  Assignment,
  Schedule,
  SerializedAssignment,
  SerializedGroupAssignment,
  SerializedSchedulerState,
} from './models';
import { SchedulerState } from './scheduler';

// ============================================================================
// ASSIGNMENT ID GENERATION
// ============================================================================

/**
 * Generate a deterministic ID for an assignment based on date and description
 * Format: YYYYMMDD-{hash of description}
 */
export function generateAssignmentId(date: Date, description: string): string {
  const dateStr = formatDateCompact(date);
  const hash = simpleHash(description);
  return `${dateStr}-${hash}`;
}

/**
 * Format date as YYYYMMDD
 */
function formatDateCompact(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Simple deterministic hash function for strings
 * Returns a 6-character hex string
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  return Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
}

// ============================================================================
// ASSIGNMENT SERIALIZATION
// ============================================================================

/**
 * Convert a runtime Assignment to a SerializedAssignment
 */
export function serializeAssignment(assignment: Assignment): SerializedAssignment {
  const serialized: SerializedAssignment = {
    id: generateAssignmentId(assignment.date, assignment.description),
    date: assignment.date.toISOString().split('T')[0],
    kind: assignment.kind,
    description: assignment.description,
    leaders: [...assignment.leaders],
    isManuallyEdited: false,
  };

  if (assignment.responsibleGroup) {
    serialized.responsibleGroup = assignment.responsibleGroup;
  }

  if (assignment.startTime) {
    serialized.startTime = assignment.startTime;
  }

  if (assignment.durationMinutes) {
    serialized.durationMinutes = assignment.durationMinutes;
  }

  if (assignment.youthAssignments && assignment.youthAssignments.length > 0) {
    serialized.youthAssignments = assignment.youthAssignments.map(ya => ({
      leader: ya.leader,
      youth: [...ya.youth],
    }));
  }

  if (assignment.groupAssignments && assignment.groupAssignments.length > 0) {
    serialized.groupAssignments = assignment.groupAssignments.map(ga => {
      const sga: SerializedGroupAssignment = {
        group: ga.group,
        leaders: [...ga.leaders],
      };
      if (ga.youthAssignments && ga.youthAssignments.length > 0) {
        sga.youthAssignments = ga.youthAssignments.map(ya => ({
          leader: ya.leader,
          youth: [...ya.youth],
        }));
      }
      return sga;
    });
  }

  return serialized;
}

/**
 * Convert a SerializedAssignment back to a runtime Assignment
 */
export function deserializeAssignment(serialized: SerializedAssignment): Assignment {
  const assignment: Assignment = {
    date: new Date(serialized.date + 'T00:00:00'),
    kind: serialized.kind,
    group: serialized.kind === 'combined' ? 'All' : 'Multiple',
    leaders: [...serialized.leaders],
    description: serialized.description,
  };

  if (serialized.responsibleGroup) {
    assignment.responsibleGroup = serialized.responsibleGroup;
  }

  if (serialized.startTime) {
    assignment.startTime = serialized.startTime;
  }

  if (serialized.durationMinutes) {
    assignment.durationMinutes = serialized.durationMinutes;
  }

  if (serialized.youthAssignments && serialized.youthAssignments.length > 0) {
    assignment.youthAssignments = serialized.youthAssignments.map(ya => ({
      leader: ya.leader,
      youth: [...ya.youth],
    }));
  }

  if (serialized.groupAssignments && serialized.groupAssignments.length > 0) {
    assignment.groupAssignments = serialized.groupAssignments.map(ga => {
      const result: {
        group: string;
        leaders: string[];
        youthAssignments?: Array<{ leader: string; youth: string[] }>;
      } = {
        group: ga.group,
        leaders: [...ga.leaders],
      };
      if (ga.youthAssignments && ga.youthAssignments.length > 0) {
        result.youthAssignments = ga.youthAssignments.map(ya => ({
          leader: ya.leader,
          youth: [...ya.youth],
        }));
      }
      return result;
    });
  }

  return assignment;
}

// ============================================================================
// SCHEDULE SERIALIZATION
// ============================================================================

/**
 * Convert a runtime Schedule to an array of SerializedAssignments
 */
export function serializeSchedule(schedule: Schedule): SerializedAssignment[] {
  return schedule.assignments.map(serializeAssignment);
}

/**
 * Convert an array of SerializedAssignments to a runtime Schedule
 */
export function deserializeSchedule(serialized: SerializedAssignment[]): Schedule {
  const assignments = serialized.map(deserializeAssignment);
  return new Schedule(assignments);
}

// ============================================================================
// SCHEDULER STATE SERIALIZATION
// ============================================================================

/**
 * Convert a runtime SchedulerState to a SerializedSchedulerState
 * Maps are converted to plain objects for JSON serialization
 */
export function serializeSchedulerState(state: SchedulerState): SerializedSchedulerState {
  return {
    leaderAssignments: mapToRecord(state.leaderAssignments),
    groupRotations: mapToRecord(state.groupRotations),
    youthAssignments: mapToRecord(state.youthAssignments),
  };
}

/**
 * Convert a SerializedSchedulerState back to a runtime SchedulerState
 * Plain objects are converted back to Maps
 */
export function deserializeSchedulerState(serialized: SerializedSchedulerState): SchedulerState {
  return {
    leaderAssignments: recordToMap(serialized.leaderAssignments),
    groupRotations: recordToMap(serialized.groupRotations),
    youthAssignments: recordToMap(serialized.youthAssignments),
  };
}

/**
 * Convert a Map<string, number> to a plain object Record<string, number>
 */
function mapToRecord(map: Map<string, number>): Record<string, number> {
  const record: Record<string, number> = {};
  map.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

/**
 * Convert a plain object Record<string, number> to a Map<string, number>
 */
function recordToMap(record: Record<string, number>): Map<string, number> {
  const map = new Map<string, number>();
  Object.entries(record).forEach(([key, value]) => {
    map.set(key, value);
  });
  return map;
}

// ============================================================================
// DEEP CLONE UTILITIES
// ============================================================================

/**
 * Deep clone a SerializedAssignment
 */
export function cloneSerializedAssignment(assignment: SerializedAssignment): SerializedAssignment {
  return JSON.parse(JSON.stringify(assignment));
}

/**
 * Deep clone an array of SerializedAssignments
 */
export function cloneSerializedAssignments(assignments: SerializedAssignment[]): SerializedAssignment[] {
  return JSON.parse(JSON.stringify(assignments));
}
