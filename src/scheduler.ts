/**
 * Core scheduler logic
 * Ported from Python scheduling/scheduler.py
 */

import { Leader, Group, Event, Assignment, Schedule } from './models';
import { RecurringRule, generateDates } from './rules';
import { getStrategy, StrategyName } from './strategies';

/**
 * Build Leader objects from raw config
 */
export function buildLeaders(raw: any[]): Leader[] {
  return raw.map(entry => ({
    name: entry.name,
    groups: entry.groups || [],
    availability: entry.availability || [],
    weight: entry.weight || 1,
  }));
}

/**
 * Build Group objects from raw config
 */
export function buildGroups(raw: any[]): Map<string, Group> {
  const groups = new Map<string, Group>();
  raw.forEach(entry => {
    const group: Group = {
      name: entry.name,
      members: entry.members || [],
    };
    groups.set(group.name, group);
  });
  return groups;
}

/**
 * Expand rules into individual Event objects
 */
export function expandEvents(
  rules: RecurringRule[],
  allGroups: string[],
  start: Date,
  end: Date
): Event[] {
  const events: Event[] = [];
  const spanYears = new Set<number>();

  // Collect all years in range
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
    spanYears.add(y);
  }

  rules.forEach(rule => {
    const dates: Date[] = [];
    spanYears.forEach(year => {
      dates.push(...generateDates(rule, year, start, end));
    });

    const involved = rule.groupsInvolved || allGroups;
    const responsibility = rule.responsibility || { mode: 'none' as const };
    const mode = responsibility.mode || 'none';
    const rotationPool = responsibility.rotationPool || [];

    dates.forEach(date => {
      const leaderRequired = mode === 'leader' || rule.kind === 'separate';
      events.push({
        date,
        kind: rule.kind,
        description: rule.description,
        groupsInvolved: involved,
        responsibilityMode: mode,
        leaderRequired,
        rotationPool,
        startTime: rule.startTime,
        durationMinutes: rule.durationMinutes,
      });
    });
  });

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

/**
 * Assign responsible groups using round-robin rotation
 */
function assignResponsibleGroups(events: Event[], initialGroupState?: Map<string, number>): Map<string, number> {
  const rotationState = new Map<string, number>(initialGroupState);

  events.forEach(event => {
    if (event.responsibilityMode === 'group' && event.rotationPool && event.rotationPool.length > 0) {
      const pool = event.rotationPool;
      const poolKey = pool.join(',');
      const index = rotationState.get(poolKey) || 0;
      event.responsibleGroup = pool[index % pool.length];
      rotationState.set(poolKey, index + 1);
    }
  });

  return rotationState;
}

/**
 * State object to track assignment progress
 */
export interface SchedulerState {
  leaderAssignments: Map<string, number>;
  groupRotations: Map<string, number>;
}

/**
 * Build complete schedule with optional initial state for continuity
 */
export function buildSchedule(
  rawLeaders: any[],
  rawGroups: any[],
  rules: RecurringRule[],
  start: Date,
  end: Date,
  strategyName: StrategyName = 'round-robin',
  leadersPerCombined: number = 2,
  initialState?: SchedulerState
): Schedule {
  const leaders = buildLeaders(rawLeaders);
  const groups = buildGroups(rawGroups);
  const allGroupNames = Array.from(groups.keys());

  // Generate events
  const events = expandEvents(rules, allGroupNames, start, end);

  // Assign responsible groups with initial state
  const groupRotationState = assignResponsibleGroups(
    events, 
    initialState?.groupRotations
  );

  // Assign leaders with initial state
  const strategy = getStrategy(strategyName);
  const assignmentState = new Map<string, number>(initialState?.leaderAssignments);
  const assignments: Assignment[] = [];

  events.forEach(event => {
    let leadersToAssign: string[] = [];

    if (event.leaderRequired) {
      const count = event.kind === 'combined' ? leadersPerCombined : 1;
      leadersToAssign = strategy.assignLeaders(event, leaders, count, assignmentState);
    }

    if (event.kind === 'combined') {
      // One assignment for combined events
      assignments.push({
        date: event.date,
        kind: event.kind,
        group: 'All',
        leaders: leadersToAssign,
        description: event.description,
        responsibleGroup: event.responsibleGroup,
        startTime: event.startTime,
        durationMinutes: event.durationMinutes,
      });
    } else {
      // Separate assignments for each group
      event.groupsInvolved.forEach(groupName => {
        assignments.push({
          date: event.date,
          kind: event.kind,
          group: groupName,
          leaders: leadersToAssign,
          description: event.description,
          responsibleGroup: event.responsibleGroup,
          startTime: event.startTime,
          durationMinutes: event.durationMinutes,
        });
      });
    }
  });

  const schedule = new Schedule(assignments);
  schedule.sort();
  
  // Attach the final state to the schedule for continuity
  (schedule as any).finalState = {
    leaderAssignments: assignmentState,
    groupRotations: groupRotationState,
  };
  
  return schedule;
}

/**
 * Extract the final state from a schedule for use in subsequent scheduling runs
 */
export function getSchedulerState(schedule: Schedule): SchedulerState {
  return (schedule as any).finalState || {
    leaderAssignments: new Map(),
    groupRotations: new Map(),
  };
}

