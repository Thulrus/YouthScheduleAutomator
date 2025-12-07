/**
 * Custom hook for managing schedule view filters
 */

import { useState, useCallback, useMemo } from 'react';
import { SerializedAssignment } from '../models';

export type EventTypeFilter = 'all' | 'combined' | 'separate';
export type EditedFilter = 'all' | 'edited' | 'unedited';

export interface ScheduleFilters {
  dateStart: string | null;
  dateEnd: string | null;
  leader: string | null;
  group: string | null;
  eventType: EventTypeFilter;
  showEdited: EditedFilter;
  searchText: string;
}

export interface UseFiltersResult {
  filters: ScheduleFilters;
  
  // Individual filter setters
  setDateRange: (start: string | null, end: string | null) => void;
  setLeader: (leader: string | null) => void;
  setGroup: (group: string | null) => void;
  setEventType: (type: EventTypeFilter) => void;
  setShowEdited: (edited: EditedFilter) => void;
  setSearchText: (text: string) => void;
  
  // Bulk operations
  clearFilters: () => void;
  
  // Apply filters to assignments
  filterAssignments: (assignments: SerializedAssignment[]) => SerializedAssignment[];
  
  // Check if any filters are active
  hasActiveFilters: boolean;
}

const DEFAULT_FILTERS: ScheduleFilters = {
  dateStart: null,
  dateEnd: null,
  leader: null,
  group: null,
  eventType: 'all',
  showEdited: 'all',
  searchText: '',
};

export function useFilters(): UseFiltersResult {
  const [filters, setFilters] = useState<ScheduleFilters>(DEFAULT_FILTERS);

  const setDateRange = useCallback((start: string | null, end: string | null) => {
    setFilters(f => ({ ...f, dateStart: start, dateEnd: end }));
  }, []);

  const setLeader = useCallback((leader: string | null) => {
    setFilters(f => ({ ...f, leader }));
  }, []);

  const setGroup = useCallback((group: string | null) => {
    setFilters(f => ({ ...f, group }));
  }, []);

  const setEventType = useCallback((eventType: EventTypeFilter) => {
    setFilters(f => ({ ...f, eventType }));
  }, []);

  const setShowEdited = useCallback((showEdited: EditedFilter) => {
    setFilters(f => ({ ...f, showEdited }));
  }, []);

  const setSearchText = useCallback((searchText: string) => {
    setFilters(f => ({ ...f, searchText }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.dateStart !== null ||
      filters.dateEnd !== null ||
      filters.leader !== null ||
      filters.group !== null ||
      filters.eventType !== 'all' ||
      filters.showEdited !== 'all' ||
      filters.searchText !== ''
    );
  }, [filters]);

  const filterAssignments = useCallback((assignments: SerializedAssignment[]): SerializedAssignment[] => {
    return assignments.filter(assignment => {
      // Date range filter
      if (filters.dateStart && assignment.date < filters.dateStart) {
        return false;
      }
      if (filters.dateEnd && assignment.date > filters.dateEnd) {
        return false;
      }

      // Event type filter
      if (filters.eventType !== 'all' && assignment.kind !== filters.eventType) {
        return false;
      }

      // Edited filter
      if (filters.showEdited === 'edited' && !assignment.isManuallyEdited) {
        return false;
      }
      if (filters.showEdited === 'unedited' && assignment.isManuallyEdited) {
        return false;
      }

      // Leader filter
      if (filters.leader) {
        const hasLeader = assignmentHasLeader(assignment, filters.leader);
        if (!hasLeader) {
          return false;
        }
      }

      // Group filter
      if (filters.group) {
        const hasGroup = assignmentHasGroup(assignment, filters.group);
        if (!hasGroup) {
          return false;
        }
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesDescription = assignment.description.toLowerCase().includes(searchLower);
        const matchesLeaders = assignment.leaders.some(l => l.toLowerCase().includes(searchLower));
        const matchesGroup = assignment.responsibleGroup?.toLowerCase().includes(searchLower);
        const matchesGroupAssignment = assignment.groupAssignments?.some(ga => 
          ga.group.toLowerCase().includes(searchLower) ||
          ga.leaders.some(l => l.toLowerCase().includes(searchLower))
        );
        
        if (!matchesDescription && !matchesLeaders && !matchesGroup && !matchesGroupAssignment) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  return {
    filters,
    setDateRange,
    setLeader,
    setGroup,
    setEventType,
    setShowEdited,
    setSearchText,
    clearFilters,
    filterAssignments,
    hasActiveFilters,
  };
}

/**
 * Check if an assignment involves a specific leader
 */
function assignmentHasLeader(assignment: SerializedAssignment, leaderName: string): boolean {
  // Check combined event leaders
  if (assignment.leaders.includes(leaderName)) {
    return true;
  }
  
  // Check separate event group assignments
  if (assignment.groupAssignments) {
    return assignment.groupAssignments.some(ga => ga.leaders.includes(leaderName));
  }
  
  return false;
}

/**
 * Check if an assignment involves a specific group
 */
function assignmentHasGroup(assignment: SerializedAssignment, groupName: string): boolean {
  // Check responsible group
  if (assignment.responsibleGroup === groupName) {
    return true;
  }
  
  // Check group assignments
  if (assignment.groupAssignments) {
    return assignment.groupAssignments.some(ga => ga.group === groupName);
  }
  
  return false;
}
