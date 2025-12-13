/**
 * Core scheduler logic
 * Ported from Python scheduling/scheduler.py
 */

import { Leader, Group, Event, Assignment, Schedule } from './models';
import { RecurringRule, generateDates } from './rules';
import { getStrategy, StrategyName } from './strategies';
import { SeededRandom } from './utils';

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
        youthCount: rule.youthAssignments?.count || 0,
      });
    });
  });

  // Sort by date
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

/**
 * Assign responsible groups using history-aware smart assignment
 * Tracks how many times each group has been assigned and when they were last assigned
 * Prioritizes groups that have been assigned less frequently and less recently
 */
function assignResponsibleGroups(events: Event[], initialGroupState?: Map<string, number>, randomSeed: number = 0): Map<string, number> {
  const rotationState = new Map<string, number>(initialGroupState);
  
  // Track assignment counts and last assignment index for each group
  const groupAssignmentCount = new Map<string, number>();
  const groupLastAssigned = new Map<string, number>();
  
  // Initialize from rotation state if provided (for continuity across date ranges)
  if (initialGroupState) {
    initialGroupState.forEach((value, key) => {
      // The rotation state stores position in pool, use it to infer assignment counts
      groupAssignmentCount.set(key, value);
    });
  }

  // Filter events that need group assignment and sort by date
  const groupEvents = events.filter(
    e => e.responsibilityMode === 'group' && e.rotationPool && e.rotationPool.length > 0
  );
  
  // Process events in chronological order
  groupEvents.forEach((event, eventIndex) => {
    const pool = event.rotationPool!;
    const poolKey = pool.join(',');
    
    // Create a deterministic seed from the event date plus seed offset
    const seed = event.date.getTime() + randomSeed;
    const rng = new SeededRandom(seed);
    
    // Deterministically shuffle the pool based on the seed
    // This provides the initial randomized starting order
    const shuffledPool = [...pool];
    for (let i = shuffledPool.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffledPool[i], shuffledPool[j]] = [shuffledPool[j], shuffledPool[i]];
    }
    
    // Build candidate scores for each group in the shuffled pool
    const candidates: Array<{ group: string; score: number; shuffledIndex: number }> = shuffledPool.map((group, shuffledIndex) => {
      const assignmentCount = groupAssignmentCount.get(group) || 0;
      const lastAssignedIndex = groupLastAssigned.get(group) ?? -1;
      const eventsSinceLastAssignment = lastAssignedIndex === -1 ? 1000 : (eventIndex - lastAssignedIndex);
      
      // Lower score is better
      // Heavily weight recency (want groups that haven't been assigned recently)
      // Also weight total assignments (want fair distribution)
      const score = (assignmentCount * 100) - (eventsSinceLastAssignment * 10);
      
      return { group, score, shuffledIndex };
    });
    
    // Sort by score (ascending - lowest score = best candidate)
    // Then by shuffled pool order as tiebreaker for determinism
    candidates.sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      // Tiebreaker: maintain shuffled pool order for determinism
      return a.shuffledIndex - b.shuffledIndex;
    });
    
    // Select the best candidate (lowest score)
    const selectedGroup = candidates[0].group;
    
    // Assign the group to the event
    event.responsibleGroup = selectedGroup;
    
    // Update tracking
    groupAssignmentCount.set(selectedGroup, (groupAssignmentCount.get(selectedGroup) || 0) + 1);
    groupLastAssigned.set(selectedGroup, eventIndex);
    
    // Update rotation state for continuity
    // Store the total assignments for this pool key
    const poolAssignments = (rotationState.get(poolKey) || 0) + 1;
    rotationState.set(poolKey, poolAssignments);
  });

  return rotationState;
}

/**
 * Assign youth members to leaders for an event
 * Uses round-robin strategy based on youth assignment counts
 */
function assignYouthToLeaders(
  event: Event,
  assignedLeaderNames: string[],
  allLeaders: Leader[],
  groups: Map<string, Group>,
  youthState: Map<string, number>,
  randomSeed: number = 0,
  specificGroup?: string
): Array<{ leader: string; youth: string[] }> {
  const result: Array<{ leader: string; youth: string[] }> = [];
  
  if (!event.youthCount || event.youthCount <= 0) {
    return result;
  }
  
  // Get all leader names (to exclude them from youth selection)
  const leaderNamesSet = new Set(allLeaders.map(l => l.name));
  
  assignedLeaderNames.forEach(leaderName => {
    // Find the leader object to get their groups
    const leader = allLeaders.find(l => l.name === leaderName);
    if (!leader) {
      result.push({ leader: leaderName, youth: [] });
      return;
    }
    
    // Determine which groups to pull youth from
    let eligibleGroups: string[];
    if (specificGroup) {
      // For separate events: only pull from the specific group
      eligibleGroups = leader.groups.includes(specificGroup) ? [specificGroup] : [];
    } else {
      // For combined events: pull from any of the leader's groups
      eligibleGroups = leader.groups;
    }
    
    // Collect all eligible youth from these groups
    const eligibleYouth: string[] = [];
    eligibleGroups.forEach(groupName => {
      const group = groups.get(groupName);
      if (group) {
        group.members.forEach(member => {
          // Don't assign leaders as youth
          if (!leaderNamesSet.has(member) && !eligibleYouth.includes(member)) {
            eligibleYouth.push(member);
          }
        });
      }
    });
    
    if (eligibleYouth.length === 0) {
      result.push({ leader: leaderName, youth: [] });
      return;
    }
    
    // Create a deterministic seed from the event date, leader name, and seed offset
    // This ensures different youth selections when random seed changes
    const seed = event.date.getTime() + leaderName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + randomSeed;
    const rng = new SeededRandom(seed);
    
    // Deterministically shuffle the eligible youth based on the seed
    const shuffled = [...eligibleYouth];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Sort by assignment count (ascending) to maintain fairness
    // Youth with fewer assignments are selected first
    shuffled.sort((a, b) => {
      const countA = youthState.get(a) || 0;
      const countB = youthState.get(b) || 0;
      return countA - countB;
    });
    
    // Select the requested number of youth (or fewer if not enough available)
    const count = Math.min(event.youthCount!, shuffled.length);
    const selectedYouth = shuffled.slice(0, count);
    
    // Update state for selected youth
    selectedYouth.forEach(youthName => {
      youthState.set(youthName, (youthState.get(youthName) || 0) + 1);
    });
    
    result.push({ leader: leaderName, youth: selectedYouth });
  });
  
  return result;
}

/**
 * State object to track assignment progress
 */
export interface SchedulerState {
  leaderAssignments: Map<string, number>;
  groupRotations: Map<string, number>;
  youthAssignments: Map<string, number>;
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
  initialState?: SchedulerState,
  randomSeed: number = 0
): Schedule {
  const leaders = buildLeaders(rawLeaders);
  const groups = buildGroups(rawGroups);
  const allGroupNames = Array.from(groups.keys());

  // Generate events
  const events = expandEvents(rules, allGroupNames, start, end);

  // Assign responsible groups with initial state
  const groupRotationState = assignResponsibleGroups(
    events, 
    initialState?.groupRotations,
    randomSeed
  );

  // Assign leaders with initial state
  const strategy = getStrategy(strategyName);
  const assignmentState = new Map<string, number>(initialState?.leaderAssignments);
  const youthState = new Map<string, number>(initialState?.youthAssignments);
  const assignments: Assignment[] = [];

  events.forEach(event => {
    if (event.kind === 'combined') {
      // One assignment for combined events
      let leadersToAssign: string[] = [];
      
      if (event.leaderRequired) {
        leadersToAssign = strategy.assignLeaders(event, leaders, leadersPerCombined, assignmentState, randomSeed);
      }
      
      // Assign youth to leaders if requested
      let youthAssignments: Array<{ leader: string; youth: string[] }> | undefined;
      if (event.youthCount && event.youthCount > 0 && leadersToAssign.length > 0) {
        youthAssignments = assignYouthToLeaders(
          event,
          leadersToAssign,
          leaders,
          groups,
          youthState,
          randomSeed
        );
      }
      
      assignments.push({
        date: event.date,
        kind: event.kind,
        group: 'All',
        leaders: leadersToAssign,
        description: event.description,
        responsibleGroup: event.responsibleGroup,
        startTime: event.startTime,
        durationMinutes: event.durationMinutes,
        youthAssignments,
      });
    } else {
      // Separate events: create ONE assignment with multiple group assignments
      // Track leaders already assigned to THIS specific event to avoid duplicates
      const leadersAssignedThisEvent = new Set<string>();
      const groupAssignments: Array<{ 
        group: string; 
        leaders: string[];
        youthAssignments?: Array<{ leader: string; youth: string[] }>;
      }> = [];
      
      event.groupsInvolved.forEach(groupName => {
        let leadersToAssign: string[] = [];
        
        if (event.leaderRequired) {
          // Create a modified event for this specific group
          const groupSpecificEvent: Event = {
            ...event,
            groupsInvolved: [groupName], // Only this group for eligibility check
          };
          
          // Filter leaders to exclude those already assigned to this event
          const availableLeaders = leaders.filter(l => !leadersAssignedThisEvent.has(l.name));
          
          leadersToAssign = strategy.assignLeaders(groupSpecificEvent, availableLeaders, 1, assignmentState, randomSeed);
          
          // Track this leader so they're not assigned to another group on the same event
          leadersToAssign.forEach(name => leadersAssignedThisEvent.add(name));
        }
        
        // Assign youth to leaders if requested
        let youthAssignments: Array<{ leader: string; youth: string[] }> | undefined;
        if (event.youthCount && event.youthCount > 0 && leadersToAssign.length > 0) {
          youthAssignments = assignYouthToLeaders(
            event,
            leadersToAssign,
            leaders,
            groups,
            youthState,
            randomSeed,
            groupName // Only assign youth from this specific group
          );
        }
        
        groupAssignments.push({
          group: groupName,
          leaders: leadersToAssign,
          youthAssignments,
        });
      });
      
      // Create a single assignment with all group assignments
      assignments.push({
        date: event.date,
        kind: event.kind,
        group: 'Multiple', // Indicate multiple groups
        leaders: [], // Empty for grouped separate events
        description: event.description,
        responsibleGroup: event.responsibleGroup,
        startTime: event.startTime,
        durationMinutes: event.durationMinutes,
        groupAssignments,
      });
    }
  });

  const schedule = new Schedule(assignments);
  schedule.sort();
  
  // Attach the final state to the schedule for continuity
  (schedule as any).finalState = {
    leaderAssignments: assignmentState,
    groupRotations: groupRotationState,
    youthAssignments: youthState,
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
    youthAssignments: new Map(),
  };
}

