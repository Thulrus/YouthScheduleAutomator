/**
 * Core data models ported from Python scheduling/models.py
 */

export interface Leader {
  name: string;
  groups: string[]; // groups this leader can serve (e.g., ["deacons", "teachers"])
  availability: string[]; // ISO date strings or weekday tokens (mon, tue, wed, etc.)
  weight: number; // for weighted assignment strategies
}

export interface Group {
  name: string;
  members: string[];
}

export interface Event {
  date: Date;
  kind: 'combined' | 'separate';
  description: string;
  groupsInvolved: string[];
  responsibilityMode: 'none' | 'group' | 'leader';
  responsibleGroup?: string; // resolved at scheduling if mode=group
  leaderRequired: boolean; // whether to assign leader(s)
  rotationPool?: string[]; // candidate groups when responsibility_mode=group
  startTime?: string; // HH:MM 24h format
  durationMinutes?: number;
  youthCount?: number; // number of youth to assign per leader (0 or undefined = none)
}

export interface Assignment {
  date: Date;
  kind: 'combined' | 'separate';
  group: string; // For combined: 'All', For separate: used for backward compatibility
  leaders: string[]; // For combined or backward compatibility
  description: string;
  responsibleGroup?: string;
  startTime?: string;
  durationMinutes?: number;
  // Youth assignments for combined events: maps each leader to their assigned youth
  youthAssignments?: Array<{
    leader: string;
    youth: string[];
  }>;
  // For separate events: array of group-specific assignments
  groupAssignments?: Array<{
    group: string;
    leaders: string[];
    youthAssignments?: Array<{
      leader: string;
      youth: string[];
    }>;
  }>;
}

export class Schedule {
  assignments: Assignment[];

  constructor(assignments: Assignment[] = []) {
    this.assignments = assignments;
  }

  /**
   * Convert schedule to table rows for display
   */
  toRows(): Array<{
    date: string;
    kind: string;
    inCharge: string;
    description: string;
    youthHelpers: string;
  }> {
    return this.assignments.map(a => {
      let inCharge: string;
      let youthHelpers: string = '';
      
      // Handle grouped separate assignments
      if (a.groupAssignments && a.groupAssignments.length > 0) {
        inCharge = a.groupAssignments
          .map(ga => `${ga.group}: ${ga.leaders.join(', ') || 'TBD'}`)
          .join(' | ');
        
        // Format youth for separate events
        const youthParts = a.groupAssignments
          .filter(ga => ga.youthAssignments && ga.youthAssignments.length > 0)
          .map(ga => {
            const youthStrs = ga.youthAssignments!
              .map(ya => `${ya.leader}: ${ya.youth.join(', ') || 'none'}`)
              .join('; ');
            return `${ga.group} - ${youthStrs}`;
          });
        youthHelpers = youthParts.join(' | ');
      } else if (a.responsibleGroup) {
        inCharge = `${a.responsibleGroup}${a.leaders.length > 0 ? ` (${a.leaders.join(', ')})` : ''}`;
        
        // Format youth for combined events with responsible group
        if (a.youthAssignments && a.youthAssignments.length > 0) {
          youthHelpers = a.youthAssignments
            .map(ya => `${ya.leader}: ${ya.youth.join(', ') || 'none'}`)
            .join(' | ');
        }
      } else {
        inCharge = a.leaders.join(', ') || 'N/A';
        
        // Format youth for combined events
        if (a.youthAssignments && a.youthAssignments.length > 0) {
          youthHelpers = a.youthAssignments
            .map(ya => `${ya.leader}: ${ya.youth.join(', ') || 'none'}`)
            .join(' | ');
        }
      }
      
      return {
        date: a.date.toISOString().split('T')[0],
        kind: a.kind,
        inCharge,
        description: a.description,
        youthHelpers,
      };
    });
  }

  /**
   * Sort assignments by date
   */
  sort(): void {
    this.assignments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}

/**
 * Raw configuration structure
 */
export interface RawConfig {
  leaders: any[];
  groups: any[];
  rules: any[];
}

/**
 * Helper to check if a leader is available on a given date
 */
export function isLeaderAvailable(leader: Leader, date: Date): boolean {
  if (leader.availability.length === 0) {
    return true;
  }

  const iso = date.toISOString().split('T')[0];
  if (leader.availability.includes(iso)) {
    return true;
  }

  const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const weekdayToken = weekdays[date.getDay()];
  if (leader.availability.includes(weekdayToken)) {
    return true;
  }

  return false;
}
