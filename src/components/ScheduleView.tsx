/**
 * Schedule View - main view for displaying and editing assignments
 */

import { useMemo, useState, useEffect } from 'react';
import { SerializedAssignment, SerializedGroupAssignment, Leader, Group, RawRule } from '../models';
import { useFilters } from '../hooks';
import { Button } from './common';
import { deserializeSchedule } from '../serialization';
import { exportMarkdown, exportCSV, exportICS, exportTextMessage, exportHTML } from '../exporters';

interface ScheduleViewProps {
  assignments: SerializedAssignment[];
  leaders: Leader[];
  groups: Group[];
  rules: RawRule[];
  timezone: string;
  randomSeed: number;
  onEditAssignment: (assignmentId: string, updater: (a: SerializedAssignment) => SerializedAssignment, reason?: string) => void;
  onRegenerateRange: (startDate: Date, endDate: Date, preserveEdits?: boolean) => void;
  onGenerateSchedule: (startDate: Date, endDate: Date) => void;
  onUpdateRandomSeed: (seed: number) => void;
  dateRangeStart: string;
  dateRangeEnd: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December'];

// Group assignments by month
interface MonthGroup {
  key: string;
  label: string;
  year: number;
  month: number;
  assignments: SerializedAssignment[];
}

function groupByMonth(assignments: SerializedAssignment[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();
  
  for (const assignment of assignments) {
    const date = new Date(assignment.date + 'T00:00:00');
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${String(month).padStart(2, '0')}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: `${MONTH_NAMES[month]} ${year}`,
        year,
        month,
        assignments: [],
      });
    }
    groups.get(key)!.assignments.push(assignment);
  }
  
  // Sort by date
  return Array.from(groups.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    return a.month - b.month;
  });
}

export function ScheduleView({
  assignments,
  leaders,
  groups,
  rules,
  timezone,
  randomSeed,
  onEditAssignment,
  onRegenerateRange: _onRegenerateRange,
  onGenerateSchedule,
  onUpdateRandomSeed,
  dateRangeStart,
  dateRangeEnd,
}: ScheduleViewProps) {
  const { filters, setDateRange, setLeader, setSearchText, setEventType, setShowEdited, clearFilters, filterAssignments, hasActiveFilters } = useFilters();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [generateStart, setGenerateStart] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-01-01`;
  });
  const [generateEnd, setGenerateEnd] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-12-31`;
  });
  const [generateSeed, setGenerateSeed] = useState(randomSeed);
  
  // Update generateSeed when randomSeed prop changes
  useEffect(() => {
    setGenerateSeed(randomSeed);
  }, [randomSeed]);
  
  // Edit modal state
  const [editingAssignment, setEditingAssignment] = useState<SerializedAssignment | null>(null);
  const [editFormLeaders, setEditFormLeaders] = useState<string[]>([]);
  const [editFormResponsibleGroup, setEditFormResponsibleGroup] = useState<string | null>(null);
  const [editFormGroupAssignments, setEditFormGroupAssignments] = useState<Array<{group: string; leaders: string[]}>>([]);
  
  // Swap modal state
  const [swappingAssignment, setSwappingAssignment] = useState<SerializedAssignment | null>(null);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);
  const [swappingGroupName, setSwappingGroupName] = useState<string | null>(null); // For separate events, which group are we swapping
  
  // Youth swap modal state
  const [swappingYouthAssignment, setSwappingYouthAssignment] = useState<SerializedAssignment | null>(null);
  const [swappingYouthLeader, setSwappingYouthLeader] = useState<string | null>(null);
  const [swappingYouthName, setSwappingYouthName] = useState<string | null>(null);
  const [swappingYouthGroup, setSwappingYouthGroup] = useState<string | null>(null); // For separate events
  const [youthSwapTarget, setYouthSwapTarget] = useState<string | null>(null); // Combined "assignmentId:youthName"
  
  // Collapsed months - default to all collapsed
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string> | null>(null);
  
  // Export modal state for selected events
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFormat, setExportFormat] = useState<'md' | 'csv' | 'ics' | 'txt' | 'html'>('md');
  
  // Cancel modal state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelMode, setCancelMode] = useState<'cancel' | 'uncancel'>('cancel');
  
  // Track last selected item for shift-click range selection
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const filteredAssignments = useMemo(() => {
    return filterAssignments(assignments);
  }, [assignments, filterAssignments]);
  
  // Group filtered assignments by month
  const monthGroups = useMemo(() => {
    return groupByMonth(filteredAssignments);
  }, [filteredAssignments]);

  // Initialize collapsed months to all months when data loads
  useEffect(() => {
    if (collapsedMonths === null && monthGroups.length > 0) {
      setCollapsedMonths(new Set(monthGroups.map(g => g.key)));
    }
  }, [monthGroups, collapsedMonths]);

  const leaderNames = useMemo(() => {
    return leaders.map(l => l.name).sort();
  }, [leaders]);

  // const groupNames = useMemo(() => {
  //   return groups.map(g => g.name).sort();
  // }, [groups]);
  
  const toggleMonthCollapse = (monthKey: string) => {
    setCollapsedMonths(prev => {
      const next = new Set(prev || []);
      if (next.has(monthKey)) {
        next.delete(monthKey);
      } else {
        next.add(monthKey);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredAssignments.length) {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    } else {
      setSelectedIds(new Set(filteredAssignments.map(a => a.id)));
      setLastSelectedId(null);
    }
  };

  const handleSelectOne = (id: string, event?: React.MouseEvent) => {
    // Handle shift-click for range selection
    if (event?.shiftKey && lastSelectedId && lastSelectedId !== id) {
      // Find indices in the filtered list
      const lastIndex = filteredAssignments.findIndex(a => a.id === lastSelectedId);
      const currentIndex = filteredAssignments.findIndex(a => a.id === id);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = filteredAssignments.slice(start, end + 1).map(a => a.id);
        
        setSelectedIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(rangeId => next.add(rangeId));
          return next;
        });
        return;
      }
    }
    
    // Normal single selection
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setLastSelectedId(id);
  };
  
  // Select/deselect all events in a month
  const handleSelectMonth = (monthGroup: MonthGroup, event: React.MouseEvent) => {
    event.stopPropagation(); // Don't toggle collapse when clicking checkbox
    
    const monthIds = monthGroup.assignments.map(a => a.id);
    const allSelected = monthIds.every(id => selectedIds.has(id));
    
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect all in this month
        monthIds.forEach(id => next.delete(id));
      } else {
        // Select all in this month
        monthIds.forEach(id => next.add(id));
      }
      return next;
    });
  };
  
  // Check if all events in a month are selected
  const isMonthFullySelected = (monthGroup: MonthGroup): boolean => {
    return monthGroup.assignments.length > 0 && 
           monthGroup.assignments.every(a => selectedIds.has(a.id));
  };
  
  // Check if some (but not all) events in a month are selected
  const isMonthPartiallySelected = (monthGroup: MonthGroup): boolean => {
    const selectedCount = monthGroup.assignments.filter(a => selectedIds.has(a.id)).length;
    return selectedCount > 0 && selectedCount < monthGroup.assignments.length;
  };
  
  // Edit modal handlers
  const handleOpenEdit = (assignment: SerializedAssignment) => {
    setEditingAssignment(assignment);
    
    if (assignment.kind === 'combined') {
      // Combined event - edit leaders and possibly responsible group
      setEditFormLeaders([...assignment.leaders]);
      setEditFormResponsibleGroup(assignment.responsibleGroup || null);
      setEditFormGroupAssignments([]);
    } else {
      // Separate event - edit each group's leaders individually
      setEditFormLeaders([]);
      setEditFormResponsibleGroup(null);
      setEditFormGroupAssignments(
        (assignment.groupAssignments || []).map(ga => ({
          group: ga.group,
          leaders: [...ga.leaders]
        }))
      );
    }
  };
  
  const handleSaveEdit = () => {
    if (!editingAssignment) return;
    
    if (editingAssignment.kind === 'combined') {
      onEditAssignment(editingAssignment.id, (a) => ({
        ...a,
        leaders: editFormLeaders,
        responsibleGroup: editFormResponsibleGroup || undefined,
        isManuallyEdited: true,
      }), 'Manual edit');
    } else {
      // Separate event - save group assignments
      onEditAssignment(editingAssignment.id, (a) => ({
        ...a,
        groupAssignments: editFormGroupAssignments.map(ega => ({
          ...((a.groupAssignments || []).find(ga => ga.group === ega.group) || { group: ega.group }),
          leaders: ega.leaders,
        })),
        isManuallyEdited: true,
      }), 'Manual edit');
    }
    
    setEditingAssignment(null);
    setEditFormLeaders([]);
    setEditFormResponsibleGroup(null);
    setEditFormGroupAssignments([]);
  };
  
  const handleCancelEdit = () => {
    setEditingAssignment(null);
    setEditFormLeaders([]);
    setEditFormResponsibleGroup(null);
    setEditFormGroupAssignments([]);
  };
  
  // Get leaders eligible for a specific group
  const getLeadersForGroup = (groupName: string): Leader[] => {
    return leaders.filter(l => l.groups.includes(groupName));
  };
  
  // Get all group names from the groups array
  const allGroupNames = useMemo(() => {
    return groups.map(g => g.name);
  }, [groups]);
  
  // Get the rotation pool for an assignment based on its matching rule
  const getRotationPoolForAssignment = (assignment: SerializedAssignment): string[] => {
    // Find the rule that matches this assignment's description (which is the rule name)
    const matchingRule = rules.find(r => 
      r.name === assignment.description || 
      r.description === assignment.description
    );
    
    if (matchingRule?.responsibility?.mode === 'group' && matchingRule.responsibility.rotation_pool) {
      return matchingRule.responsibility.rotation_pool;
    }
    
    // Fallback: return all group names plus the current value
    return allGroupNames;
  };
  
  // Swap modal handlers
  const handleOpenSwap = (assignment: SerializedAssignment, groupName?: string) => {
    setSwappingAssignment(assignment);
    setSwapTargetId(null);
    setSwappingGroupName(groupName || null);
  };
  
  const handleConfirmSwap = () => {
    if (!swappingAssignment || !swapTargetId) return;
    
    const targetAssignment = assignments.find(a => a.id === swapTargetId);
    if (!targetAssignment) return;
    
    if (swappingAssignment.kind === 'combined' && !swappingGroupName) {
      // Swap entire combined event leaders and responsible group
      const sourceLeaders = [...swappingAssignment.leaders];
      const targetLeaders = [...targetAssignment.leaders];
      const sourceResponsible = swappingAssignment.responsibleGroup;
      const targetResponsible = targetAssignment.responsibleGroup;
      
      onEditAssignment(swappingAssignment.id, (a) => ({
        ...a,
        leaders: targetLeaders,
        responsibleGroup: targetResponsible,
        isManuallyEdited: true,
      }), `Swapped with ${targetAssignment.date}`);
      
      onEditAssignment(swapTargetId, (a) => ({
        ...a,
        leaders: sourceLeaders,
        responsibleGroup: sourceResponsible,
        isManuallyEdited: true,
      }), `Swapped with ${swappingAssignment.date}`);
    } else if (swappingGroupName) {
      // Swap a specific group's leaders (for separate events or combined with responsible group)
      const sourceGA = swappingAssignment.groupAssignments?.find(ga => ga.group === swappingGroupName);
      const targetGA = targetAssignment.groupAssignments?.find(ga => ga.group === swappingGroupName);
      
      if (sourceGA && targetGA) {
        const sourceLeaders = [...sourceGA.leaders];
        const targetLeaders = [...targetGA.leaders];
        
        onEditAssignment(swappingAssignment.id, (a) => ({
          ...a,
          groupAssignments: (a.groupAssignments || []).map(ga => 
            ga.group === swappingGroupName ? { ...ga, leaders: targetLeaders } : ga
          ),
          isManuallyEdited: true,
        }), `Swapped ${swappingGroupName} with ${targetAssignment.date}`);
        
        onEditAssignment(swapTargetId, (a) => ({
          ...a,
          groupAssignments: (a.groupAssignments || []).map(ga => 
            ga.group === swappingGroupName ? { ...ga, leaders: sourceLeaders } : ga
          ),
          isManuallyEdited: true,
        }), `Swapped ${swappingGroupName} with ${swappingAssignment.date}`);
      }
    }
    
    setSwappingAssignment(null);
    setSwapTargetId(null);
    setSwappingGroupName(null);
  };
  
  const handleCancelSwap = () => {
    setSwappingAssignment(null);
    setSwapTargetId(null);
    setSwappingGroupName(null);
  };
  
  // Youth swap handlers
  const handleOpenYouthSwap = (assignment: SerializedAssignment, leaderName: string, youthName: string, groupName?: string) => {
    setSwappingYouthAssignment(assignment);
    setSwappingYouthLeader(leaderName);
    setSwappingYouthName(youthName);
    setSwappingYouthGroup(groupName || null);
    setYouthSwapTarget(null);
  };
  
  const handleConfirmYouthSwap = () => {
    if (!swappingYouthAssignment || !youthSwapTarget || !swappingYouthName) return;
    
    // Parse the combined target "assignmentId:youthName"
    const [youthSwapTargetId, youthSwapTargetYouth] = youthSwapTarget.split(':');
    if (!youthSwapTargetId || !youthSwapTargetYouth) return;
    
    const targetAssignment = assignments.find(a => a.id === youthSwapTargetId);
    if (!targetAssignment) return;
    
    // Find the group that the youth belongs to (to ensure we swap with same group members)
    const youthGroupName = findYouthGroup(swappingYouthName);
    if (!youthGroupName) return;
    
    if (swappingYouthGroup) {
      // Swapping youth within group assignments (separate events)
      onEditAssignment(swappingYouthAssignment.id, (a) => ({
        ...a,
        groupAssignments: (a.groupAssignments || []).map(ga => {
          if (ga.group !== swappingYouthGroup) return ga;
          return {
            ...ga,
            youthAssignments: (ga.youthAssignments || []).map(ya => ({
              ...ya,
              youth: ya.youth.map(y => y === swappingYouthName ? youthSwapTargetYouth : y),
            })),
          };
        }),
        isManuallyEdited: true,
      }), `Swapped ${swappingYouthName} with ${youthSwapTargetYouth}`);
      
      onEditAssignment(youthSwapTargetId, (a) => ({
        ...a,
        groupAssignments: (a.groupAssignments || []).map(ga => {
          if (ga.group !== swappingYouthGroup) return ga;
          return {
            ...ga,
            youthAssignments: (ga.youthAssignments || []).map(ya => ({
              ...ya,
              youth: ya.youth.map(y => y === youthSwapTargetYouth ? swappingYouthName! : y),
            })),
          };
        }),
        isManuallyEdited: true,
      }), `Swapped ${youthSwapTargetYouth} with ${swappingYouthName}`);
    } else {
      // Swapping youth in combined event youth assignments
      onEditAssignment(swappingYouthAssignment.id, (a) => ({
        ...a,
        youthAssignments: (a.youthAssignments || []).map(ya => ({
          ...ya,
          youth: ya.youth.map(y => y === swappingYouthName ? youthSwapTargetYouth : y),
        })),
        isManuallyEdited: true,
      }), `Swapped ${swappingYouthName} with ${youthSwapTargetYouth}`);
      
      onEditAssignment(youthSwapTargetId, (a) => ({
        ...a,
        youthAssignments: (a.youthAssignments || []).map(ya => ({
          ...ya,
          youth: ya.youth.map(y => y === youthSwapTargetYouth ? swappingYouthName! : y),
        })),
        isManuallyEdited: true,
      }), `Swapped ${youthSwapTargetYouth} with ${swappingYouthName}`);
    }
    
    handleCancelYouthSwap();
  };
  
  const handleCancelYouthSwap = () => {
    setSwappingYouthAssignment(null);
    setSwappingYouthLeader(null);
    setSwappingYouthName(null);
    setSwappingYouthGroup(null);
    setYouthSwapTarget(null);
  };
  
  // Find which group a youth belongs to
  const findYouthGroup = (youthName: string): string | null => {
    for (const group of groups) {
      if (group.members.includes(youthName)) {
        return group.name;
      }
    }
    return null;
  };
  
  // Get eligible youth swap targets - flat list of {assignmentId, youthName, date, description}
  const youthSwapCandidates = useMemo(() => {
    if (!swappingYouthAssignment || !swappingYouthName) return [];
    
    const youthGroupName = findYouthGroup(swappingYouthName);
    if (!youthGroupName) return [];
    
    const candidates: Array<{
      assignmentId: string;
      youthName: string;
      date: string;
      description: string;
    }> = [];
    
    for (const a of assignments) {
      if (a.id === swappingYouthAssignment.id) continue;
      
      // Check combined event youth assignments
      if (a.youthAssignments) {
        for (const ya of a.youthAssignments) {
          for (const youthName of ya.youth) {
            if (findYouthGroup(youthName) === youthGroupName && youthName !== swappingYouthName) {
              candidates.push({
                assignmentId: a.id,
                youthName,
                date: a.date,
                description: a.description
              });
            }
          }
        }
      }
      
      // Check group assignments youth
      if (a.groupAssignments) {
        for (const ga of a.groupAssignments) {
          if (ga.youthAssignments) {
            for (const ya of ga.youthAssignments) {
              for (const youthName of ya.youth) {
                if (findYouthGroup(youthName) === youthGroupName && youthName !== swappingYouthName) {
                  candidates.push({
                    assignmentId: a.id,
                    youthName,
                    date: a.date,
                    description: a.description
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Sort by date
    return candidates.sort((a, b) => a.date.localeCompare(b.date));
  }, [assignments, swappingYouthAssignment, swappingYouthName, groups]);
  
  // Get eligible swap targets based on what we're swapping
  const swapCandidates = useMemo(() => {
    if (!swappingAssignment) return [];
    
    if (swappingGroupName) {
      // For group-specific swaps, find events with the same group
      return assignments.filter(a => 
        a.id !== swappingAssignment.id && 
        a.groupAssignments?.some(ga => ga.group === swappingGroupName)
      );
    } else if (swappingAssignment.responsibleGroup) {
      // For events with responsible groups, match by that
      return assignments.filter(a => 
        a.id !== swappingAssignment.id && 
        a.responsibleGroup !== undefined
      );
    } else {
      // For combined events without groups, just match by kind
      return assignments.filter(a => 
        a.id !== swappingAssignment.id && 
        a.kind === swappingAssignment.kind &&
        !a.responsibleGroup &&
        !a.groupAssignments?.length
      );
    }
  }, [assignments, swappingAssignment, swappingGroupName]);

  const handleGenerate = () => {
    // Update random seed if changed
    if (generateSeed !== randomSeed) {
      onUpdateRandomSeed(generateSeed);
    }
    onGenerateSchedule(new Date(generateStart), new Date(generateEnd));
    setShowGenerateDialog(false);
  };

  // Get selected assignments
  const selectedAssignments = useMemo(() => {
    return assignments.filter(a => selectedIds.has(a.id));
  }, [assignments, selectedIds]);

  // Check if any selected events are cancelled
  const hasSelectedCancelled = useMemo(() => {
    return selectedAssignments.some(a => a.cancelled);
  }, [selectedAssignments]);

  const hasSelectedNotCancelled = useMemo(() => {
    return selectedAssignments.some(a => !a.cancelled);
  }, [selectedAssignments]);

  // Export selected events
  const handleExportSelected = () => {
    if (selectedAssignments.length === 0) return;
    
    // Filter out cancelled events for export (unless all are cancelled)
    const eventsToExport = selectedAssignments.filter(a => !a.cancelled);
    const finalEvents = eventsToExport.length > 0 ? eventsToExport : selectedAssignments;
    
    const schedule = deserializeSchedule(finalEvents);
    
    switch (exportFormat) {
      case 'md':
        exportMarkdown(schedule);
        break;
      case 'csv':
        exportCSV(schedule);
        break;
      case 'ics':
        exportICS(schedule, timezone);
        break;
      case 'txt':
        exportTextMessage(schedule);
        break;
      case 'html':
        exportHTML(schedule);
        break;
    }
    
    setShowExportDialog(false);
    setSelectedIds(new Set());
  };

  // Cancel selected events
  const handleCancelSelected = () => {
    selectedIds.forEach(id => {
      onEditAssignment(id, (a) => ({
        ...a,
        cancelled: true,
        cancelReason: cancelReason || undefined,
        isManuallyEdited: true,
      }), cancelReason ? `Cancelled: ${cancelReason}` : 'Cancelled');
    });
    
    setShowCancelDialog(false);
    setCancelReason('');
    setSelectedIds(new Set());
  };

  // Uncancel selected events
  const handleUncancelSelected = () => {
    selectedIds.forEach(id => {
      onEditAssignment(id, (a) => ({
        ...a,
        cancelled: false,
        cancelReason: undefined,
        isManuallyEdited: true,
      }), 'Uncancelled');
    });
    
    setShowCancelDialog(false);
    setSelectedIds(new Set());
  };

  // Open cancel dialog
  const openCancelDialog = (mode: 'cancel' | 'uncancel') => {
    setCancelMode(mode);
    setCancelReason('');
    setShowCancelDialog(true);
  };

  const editedCount = assignments.filter(a => a.isManuallyEdited).length;

  if (assignments.length === 0) {
    return (
      <div className="schedule-view empty">
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>No Schedule Generated</h2>
          <p>Generate a schedule to see assignments here.</p>
          <Button variant="primary" onClick={() => setShowGenerateDialog(true)}>
            Generate Schedule
          </Button>
        </div>

        {showGenerateDialog && (
          <div className="modal-backdrop" onClick={() => setShowGenerateDialog(false)}>
            <div className="modal modal-small" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 className="modal-title">Generate Schedule</h2>
                <button className="modal-close" onClick={() => setShowGenerateDialog(false)}>×</button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="gen-start">Start Date</label>
                  <input
                    id="gen-start"
                    type="date"
                    value={generateStart}
                    onChange={e => setGenerateStart(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="gen-end">End Date</label>
                  <input
                    id="gen-end"
                    type="date"
                    value={generateEnd}
                    onChange={e => setGenerateEnd(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="gen-seed">Random Seed</label>
                  <input
                    id="gen-seed"
                    type="number"
                    value={generateSeed}
                    onChange={e => setGenerateSeed(parseInt(e.target.value) || 0)}
                    min="0"
                    step="1"
                  />
                  <small className="form-hint">Change this to get different random assignments</small>
                </div>
              </div>
              <div className="modal-footer">
                <Button variant="secondary" onClick={() => setShowGenerateDialog(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleGenerate}>
                  Generate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="schedule-view">
      {/* Header */}
      <div className="schedule-header">
        <div className="schedule-info">
          <h2>Schedule</h2>
          <span className="schedule-range">
            {dateRangeStart} to {dateRangeEnd}
          </span>
          <span className="schedule-stats">
            {assignments.length} events
            {editedCount > 0 && <span className="edited-badge">• {editedCount} edited</span>}
          </span>
        </div>
        <div className="schedule-actions">
          <Button variant="ghost" size="small" onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}>
            {viewMode === 'cards' ? '📊 Table' : '🎴 Cards'}
          </Button>
          <Button variant="secondary" size="small" onClick={() => setShowGenerateDialog(true)}>
            🔄 Regenerate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="schedule-filters">
        <div className="filter-row">
          <input
            type="text"
            placeholder="🔍 Search..."
            value={filters.searchText}
            onChange={e => setSearchText(e.target.value)}
            className="filter-search"
          />
          <select
            value={filters.leader || ''}
            onChange={e => setLeader(e.target.value || null)}
            className="filter-select"
          >
            <option value="">All Leaders</option>
            {leaderNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={filters.eventType}
            onChange={e => setEventType(e.target.value as 'all' | 'combined' | 'separate')}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="combined">Combined</option>
            <option value="separate">Separate</option>
          </select>
          <select
            value={filters.showEdited}
            onChange={e => setShowEdited(e.target.value as 'all' | 'edited' | 'unedited')}
            className="filter-select"
          >
            <option value="all">All</option>
            <option value="edited">Edited Only</option>
            <option value="unedited">Unedited Only</option>
          </select>
          {hasActiveFilters && (
            <Button variant="ghost" size="small" onClick={clearFilters}>
              ✕ Clear
            </Button>
          )}
        </div>
        <div className="filter-row">
          <label className="filter-label">Date Range:</label>
          <input
            type="date"
            value={filters.dateStart || ''}
            onChange={e => setDateRange(e.target.value || null, filters.dateEnd)}
            className="filter-date"
          />
          <span className="filter-separator">to</span>
          <input
            type="date"
            value={filters.dateEnd || ''}
            onChange={e => setDateRange(filters.dateStart, e.target.value || null)}
            className="filter-date"
          />
        </div>
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="selection-bar">
          <span className="selection-count">{selectedIds.size} selected</span>
          <div className="selection-actions">
            <Button variant="secondary" size="small" onClick={() => setShowExportDialog(true)}>
              📤 Export
            </Button>
            {hasSelectedNotCancelled && (
              <Button variant="secondary" size="small" onClick={() => openCancelDialog('cancel')}>
                🚫 Cancel
              </Button>
            )}
            {hasSelectedCancelled && (
              <Button variant="secondary" size="small" onClick={() => openCancelDialog('uncancel')}>
                ✅ Restore
              </Button>
            )}
            <Button variant="ghost" size="small" onClick={() => setSelectedIds(new Set())}>
              ✕ Clear
            </Button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="results-info">
        Showing {filteredAssignments.length} of {assignments.length} events
        {monthGroups.length > 1 && ` across ${monthGroups.length} months`}
      </div>

      {/* Assignment list - grouped by month */}
      {viewMode === 'cards' ? (
        <div className="assignments-by-month">
          {monthGroups.map(monthGroup => (
            <div key={monthGroup.key} className="month-section">
              <div 
                className="month-header"
                onClick={() => toggleMonthCollapse(monthGroup.key)}
              >
                <input
                  type="checkbox"
                  className="month-checkbox"
                  checked={isMonthFullySelected(monthGroup)}
                  ref={el => {
                    if (el) el.indeterminate = isMonthPartiallySelected(monthGroup);
                  }}
                  onChange={() => {}} // Handled by onClick
                  onClick={(e) => handleSelectMonth(monthGroup, e)}
                />
                <span className="month-toggle">
                  {collapsedMonths?.has(monthGroup.key) ? '▶' : '▼'}
                </span>
                <h3 className="month-title">{monthGroup.label}</h3>
                <span className="month-count">{monthGroup.assignments.length} events</span>
              </div>
              {!collapsedMonths?.has(monthGroup.key) && (
                <div className="assignments-grid">
                  {monthGroup.assignments.map(assignment => (
                    <AssignmentCard
                      key={assignment.id}
                      assignment={assignment}
                      isSelected={selectedIds.has(assignment.id)}
                      onSelect={(e) => handleSelectOne(assignment.id, e)}
                      onEdit={() => handleOpenEdit(assignment)}
                      onSwap={(groupName) => handleOpenSwap(assignment, groupName)}
                      onSwapYouth={(leaderName, youthName, groupName) => handleOpenYouthSwap(assignment, leaderName, youthName, groupName)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="assignments-table-wrapper">
          <table className="assignments-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredAssignments.length && filteredAssignments.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th>Date</th>
                <th>Description</th>
                <th>Type</th>
                <th>Leaders / Groups</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssignments.map(assignment => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  isSelected={selectedIds.has(assignment.id)}
                  onSelect={(e) => handleSelectOne(assignment.id, e)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate dialog */}
      {showGenerateDialog && (
        <div className="modal-backdrop" onClick={() => setShowGenerateDialog(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Regenerate Schedule</h2>
              <button className="modal-close" onClick={() => setShowGenerateDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="warning-text">⚠️ This will replace all existing assignments!</p>
              <div className="form-group">
                <label htmlFor="regen-start">Start Date</label>
                <input
                  id="regen-start"
                  type="date"
                  value={generateStart}
                  onChange={e => setGenerateStart(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="regen-end">End Date</label>
                <input
                  id="regen-end"
                  type="date"
                  value={generateEnd}
                  onChange={e => setGenerateEnd(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="regen-seed">Random Seed</label>
                <input
                  id="regen-seed"
                  type="number"
                  value={generateSeed}
                  onChange={e => setGenerateSeed(parseInt(e.target.value) || 0)}
                  min="0"
                  step="1"
                />
                <small className="form-hint">Change this to get different random assignments</small>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowGenerateDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleGenerate}>
                Regenerate
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="modal-backdrop" onClick={handleCancelEdit}>
          <div className="modal modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Edit Assignment
                {editingAssignment.cancelled && <span className="modal-title-badge cancelled">🚫 Cancelled</span>}
              </h2>
              <button className="modal-close" onClick={handleCancelEdit}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-assignment-info">
                <p><strong>Date:</strong> {editingAssignment.date}</p>
                <p><strong>Event:</strong> {editingAssignment.description}</p>
                <p><strong>Type:</strong> {editingAssignment.kind === 'combined' ? 'Combined' : 'Separate Groups'}</p>
                {editingAssignment.responsibleGroup && (
                  <p><strong>Responsible Group:</strong> {editingAssignment.responsibleGroup}</p>
                )}
                {editingAssignment.cancelled && editingAssignment.cancelReason && (
                  <p><strong>Cancel Reason:</strong> {editingAssignment.cancelReason}</p>
                )}
              </div>
              
              {editingAssignment.kind === 'combined' && !editingAssignment.groupAssignments?.length ? (
                <>
                  {/* Combined event with responsible group rotation */}
                  {editingAssignment.responsibleGroup !== undefined && (
                    <div className="form-group">
                      <label>Responsible Group</label>
                      <select
                        value={editFormResponsibleGroup || ''}
                        onChange={e => setEditFormResponsibleGroup(e.target.value || null)}
                        className="form-select"
                      >
                        <option value="">None</option>
                        {/* Use rotation pool from the matching rule, or fall back to all groups */}
                        {(() => {
                          const rotationPool = getRotationPoolForAssignment(editingAssignment);
                          // Also include current value if not in pool
                          const options = [...new Set([
                            ...rotationPool,
                            ...(editingAssignment.responsibleGroup && !rotationPool.includes(editingAssignment.responsibleGroup) 
                              ? [editingAssignment.responsibleGroup] 
                              : [])
                          ])];
                          return options.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ));
                        })()}
                      </select>
                      <small className="form-hint">
                        This is a group-rotation event. The responsible group handles planning.
                      </small>
                    </div>
                  )}
                  
                  {/* Only show leaders section if there are leaders assigned or no responsible group */}
                  {(editingAssignment.leaders.length > 0 || !editingAssignment.responsibleGroup) && (
                    <div className="form-group">
                      <label>Leaders</label>
                      <div className="leader-checkboxes">
                        {leaderNames.map(name => (
                          <label key={name} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={editFormLeaders.includes(name)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditFormLeaders([...editFormLeaders, name]);
                                } else {
                                  setEditFormLeaders(editFormLeaders.filter(n => n !== name));
                                }
                              }}
                            />
                            {name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Separate group event or combined with group assignments */
                <div className="separate-groups-edit">
                  {editFormGroupAssignments.map((ega, idx) => {
                    const eligibleLeaders = getLeadersForGroup(ega.group);
                    return (
                      <div key={ega.group} className="group-edit-section">
                        <h4 className="group-edit-title">{ega.group}</h4>
                        <div className="leader-checkboxes">
                          {eligibleLeaders.length > 0 ? (
                            eligibleLeaders.map(leader => (
                              <label key={leader.name} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={ega.leaders.includes(leader.name)}
                                  onChange={(e) => {
                                    const newAssignments = [...editFormGroupAssignments];
                                    if (e.target.checked) {
                                      newAssignments[idx] = { 
                                        ...ega, 
                                        leaders: [...ega.leaders, leader.name] 
                                      };
                                    } else {
                                      newAssignments[idx] = { 
                                        ...ega, 
                                        leaders: ega.leaders.filter(n => n !== leader.name) 
                                      };
                                    }
                                    setEditFormGroupAssignments(newAssignments);
                                  }}
                                />
                                {leader.name}
                              </label>
                            ))
                          ) : (
                            <p className="no-leaders-warning">
                              No leaders configured for this group. 
                              Add leaders with &quot;{ega.group}&quot; in their groups list.
                            </p>
                          )}
                        </div>
                        <div className="current-selection">
                          Selected: {ega.leaders.length > 0 ? ega.leaders.join(', ') : 'None'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer edit-modal-footer">
              {editingAssignment.cancelled ? (
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    onEditAssignment(editingAssignment.id, (a) => ({
                      ...a,
                      cancelled: false,
                      cancelReason: undefined,
                      isManuallyEdited: true,
                    }), 'Restored');
                    handleCancelEdit();
                  }}
                  title="Restore this cancelled event"
                >
                  ✅ Restore Event
                </Button>
              ) : (
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    const reason = prompt('Cancel reason (optional):');
                    onEditAssignment(editingAssignment.id, (a) => ({
                      ...a,
                      cancelled: true,
                      cancelReason: reason || undefined,
                      isManuallyEdited: true,
                    }), reason ? `Cancelled: ${reason}` : 'Cancelled');
                    handleCancelEdit();
                  }}
                  title="Cancel this event"
                >
                  🚫 Cancel Event
                </Button>
              )}
              <div className="modal-footer-spacer" />
              <Button variant="secondary" onClick={handleCancelEdit}>
                Close
              </Button>
              <Button variant="primary" onClick={handleSaveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Swap Assignment Modal */}
      {swappingAssignment && (
        <div className="modal-backdrop" onClick={handleCancelSwap}>
          <div className="modal modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {swappingGroupName ? `Swap ${swappingGroupName} Leaders` : 'Swap Assignment'}
              </h2>
              <button className="modal-close" onClick={handleCancelSwap}>×</button>
            </div>
            <div className="modal-body">
              <div className="swap-source-info">
                <h4>Swapping from:</h4>
                <p><strong>{swappingAssignment.date}</strong> - {swappingAssignment.description}</p>
                {swappingGroupName ? (
                  <p>
                    <strong>{swappingGroupName}:</strong>{' '}
                    {swappingAssignment.groupAssignments?.find(ga => ga.group === swappingGroupName)?.leaders.join(', ') || 'N/A'}
                  </p>
                ) : swappingAssignment.responsibleGroup ? (
                  <p><strong>Responsible:</strong> {swappingAssignment.responsibleGroup}</p>
                ) : (
                  <p><strong>Leaders:</strong> {swappingAssignment.leaders.join(', ') || 'N/A'}</p>
                )}
              </div>
              
              {swapCandidates.length === 0 ? (
                <div className="no-candidates-warning">
                  <p>⚠️ No eligible events found to swap with.</p>
                  <p className="info-text">
                    {swappingGroupName 
                      ? `Looking for other events with "${swappingGroupName}" group assignments.`
                      : swappingAssignment.responsibleGroup
                        ? 'Looking for other events with responsible group assignments.'
                        : 'Looking for other combined events without group-specific assignments.'}
                  </p>
                </div>
              ) : (
                <div className="form-group">
                  <label>Swap with:</label>
                  <select 
                    value={swapTargetId || ''} 
                    onChange={e => setSwapTargetId(e.target.value || null)}
                    className="swap-target-select"
                  >
                    <option value="">Select an event to swap with...</option>
                    {swapCandidates.map(a => {
                      let displayInfo: string;
                      if (swappingGroupName) {
                        const ga = a.groupAssignments?.find(g => g.group === swappingGroupName);
                        displayInfo = ga?.leaders.join(', ') || 'TBD';
                      } else if (a.responsibleGroup) {
                        displayInfo = a.responsibleGroup;
                      } else {
                        displayInfo = a.leaders.join(', ') || 'N/A';
                      }
                      return (
                        <option key={a.id} value={a.id}>
                          {a.date} - {a.description} ({displayInfo})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
              
              {swapTargetId && (() => {
                const target = assignments.find(a => a.id === swapTargetId);
                if (!target) return null;
                
                let sourceDisplay: string;
                let targetDisplay: string;
                
                if (swappingGroupName) {
                  sourceDisplay = swappingAssignment.groupAssignments?.find(ga => ga.group === swappingGroupName)?.leaders.join(', ') || 'TBD';
                  targetDisplay = target.groupAssignments?.find(ga => ga.group === swappingGroupName)?.leaders.join(', ') || 'TBD';
                } else if (swappingAssignment.responsibleGroup) {
                  sourceDisplay = swappingAssignment.responsibleGroup;
                  targetDisplay = target.responsibleGroup || 'N/A';
                } else {
                  sourceDisplay = swappingAssignment.leaders.join(', ') || 'N/A';
                  targetDisplay = target.leaders.join(', ') || 'N/A';
                }
                
                return (
                  <div className="swap-preview">
                    <p className="swap-arrow">↕️ After swap:</p>
                    <div className="swap-result">
                      <p>
                        <strong>{swappingAssignment.date}</strong> will have: {targetDisplay}
                      </p>
                      <p>
                        <strong>{target.date}</strong> will have: {sourceDisplay}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={handleCancelSwap}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmSwap}
                disabled={!swapTargetId}
              >
                Confirm Swap
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Youth Swap Modal */}
      {swappingYouthAssignment && swappingYouthName && (
        <div className="modal-backdrop" onClick={handleCancelYouthSwap}>
          <div className="modal modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Swap Teaching Assistant</h2>
              <button className="modal-close" onClick={handleCancelYouthSwap}>×</button>
            </div>
            <div className="modal-body">
              <div className="swap-source-info">
                <h4>Swapping:</h4>
                <p><strong>{swappingYouthName}</strong></p>
                <p className="info-text">
                  From: {swappingYouthAssignment.date} - {swappingYouthAssignment.description}
                  {swappingYouthLeader && ` (with ${swappingYouthLeader})`}
                </p>
              </div>
              
              {youthSwapCandidates.length === 0 ? (
                <div className="no-candidates-warning">
                  <p>⚠️ No eligible events found to swap with.</p>
                  <p className="info-text">
                    Looking for other events with teaching assistants from the same group.
                  </p>
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label>Swap with:</label>
                    <select 
                      value={youthSwapTarget || ''} 
                      onChange={e => setYouthSwapTarget(e.target.value || null)}
                      className="swap-target-select"
                    >
                      <option value="">Select a person to swap with...</option>
                      {youthSwapCandidates.map(candidate => (
                        <option 
                          key={`${candidate.assignmentId}:${candidate.youthName}`} 
                          value={`${candidate.assignmentId}:${candidate.youthName}`}
                        >
                          {candidate.date} - {candidate.description} ({candidate.youthName})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {youthSwapTarget && (() => {
                    const [targetId, targetYouth] = youthSwapTarget.split(':');
                    const targetAssignment = assignments.find(a => a.id === targetId);
                    return (
                      <div className="swap-preview">
                        <p className="swap-arrow">↕️ After swap:</p>
                        <div className="swap-result">
                          <p>
                            <strong>{swappingYouthAssignment.date}</strong> will have: {targetYouth}
                          </p>
                          <p>
                            <strong>{targetAssignment?.date}</strong> will have: {swappingYouthName}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={handleCancelYouthSwap}>
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmYouthSwap}
                disabled={!youthSwapTarget}
              >
                Confirm Swap
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Export Selected Modal */}
      {showExportDialog && (
        <div className="modal-backdrop" onClick={() => setShowExportDialog(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Export Selected Events</h2>
              <button className="modal-close" onClick={() => setShowExportDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="export-info">
                Exporting {selectedAssignments.filter(a => !a.cancelled).length} events
                {selectedAssignments.some(a => a.cancelled) && 
                  ` (${selectedAssignments.filter(a => a.cancelled).length} cancelled events will be excluded)`
                }
              </p>
              <div className="form-group">
                <label>Export Format</label>
                <select
                  value={exportFormat}
                  onChange={e => setExportFormat(e.target.value as typeof exportFormat)}
                  className="export-format-select"
                >
                  <option value="md">📝 Markdown - Print-friendly document</option>
                  <option value="csv">📊 CSV - Spreadsheet compatible</option>
                  <option value="ics">📅 iCalendar - Calendar import</option>
                  <option value="txt">💬 Text - For messaging</option>
                  <option value="html">🌐 HTML - Web/email format</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowExportDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleExportSelected}>
                Export
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel/Restore Events Modal */}
      {showCancelDialog && (
        <div className="modal-backdrop" onClick={() => setShowCancelDialog(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {cancelMode === 'cancel' ? '🚫 Cancel Events' : '✅ Restore Events'}
              </h2>
              <button className="modal-close" onClick={() => setShowCancelDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              {cancelMode === 'cancel' ? (
                <>
                  <p className="cancel-info">
                    Cancel {selectedAssignments.filter(a => !a.cancelled).length} event(s)?
                    Cancelled events will remain in the schedule but be marked as cancelled.
                  </p>
                  <div className="form-group">
                    <label>Reason (optional)</label>
                    <input
                      type="text"
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      placeholder="e.g., Holiday, Weather, Special event"
                    />
                  </div>
                </>
              ) : (
                <p className="cancel-info">
                  Restore {selectedAssignments.filter(a => a.cancelled).length} cancelled event(s)?
                  They will be unmarked as cancelled and show as regular events.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowCancelDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant={cancelMode === 'cancel' ? 'secondary' : 'primary'}
                onClick={cancelMode === 'cancel' ? handleCancelSelected : handleUncancelSelected}
              >
                {cancelMode === 'cancel' ? 'Cancel Events' : 'Restore Events'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Assignment Card Component
interface AssignmentCardProps {
  assignment: SerializedAssignment;
  isSelected: boolean;
  onSelect: (event?: React.MouseEvent) => void;
  onEdit: () => void;
  onSwap: (groupName?: string) => void;
  onSwapYouth: (leaderName: string, youthName: string, groupName?: string) => void;
}

function AssignmentCard({ assignment, isSelected, onSelect, onEdit, onSwap, onSwapYouth }: AssignmentCardProps) {
  const date = new Date(assignment.date + 'T00:00:00');
  const dayName = DAY_NAMES[date.getDay()];

  const hasGroupAssignments = assignment.groupAssignments && assignment.groupAssignments.length > 0;
  const hasYouthAssignments = assignment.youthAssignments && assignment.youthAssignments.length > 0;

  // Render youth assignments for combined events
  const renderYouthAssignments = () => {
    if (!hasYouthAssignments) return null;
    
    return (
      <div className="card-youth-assignments">
        <div className="youth-section-label">Teaching Assistants:</div>
        {assignment.youthAssignments!.map(ya => (
          <div key={ya.leader} className="youth-assignment-row">
            <span className="youth-leader-name">{ya.leader}:</span>
            <span className="youth-names">
              {ya.youth.map((youthName, idx) => (
                <span key={youthName} className="youth-name-with-swap">
                  {idx > 0 && ', '}
                  {youthName}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onSwapYouth(ya.leader, youthName); }}
                    title={`Swap ${youthName}`}
                  >
                    ↔
                  </Button>
                </span>
              ))}
              {ya.youth.length === 0 && <span className="no-youth">None assigned</span>}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Render youth assignments within group assignments (for separate events)
  const renderGroupYouthAssignments = (ga: SerializedGroupAssignment) => {
    if (!ga.youthAssignments || ga.youthAssignments.length === 0) return null;
    
    return (
      <div className="group-youth-assignments">
        {ga.youthAssignments.map(ya => (
          <div key={ya.leader} className="youth-assignment-row compact">
            <span className="youth-leader-name">{ya.leader}:</span>
            <span className="youth-names">
              {ya.youth.map((youthName, idx) => (
                <span key={youthName} className="youth-name-with-swap">
                  {idx > 0 && ', '}
                  {youthName}
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onSwapYouth(ya.leader, youthName, ga.group); }}
                    title={`Swap ${youthName}`}
                  >
                    ↔
                  </Button>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const formatLeaders = () => {
    if (hasGroupAssignments) {
      return assignment.groupAssignments!.map(ga => (
        <div key={ga.group} className="group-assignment-block">
          <div className="group-assignment">
            <span className="group-name">{ga.group}:</span>
            <span className="leader-names">{ga.leaders.join(', ') || 'TBD'}</span>
            <Button 
              variant="ghost" 
              size="small" 
              onClick={(e) => { e.stopPropagation(); onSwap(ga.group); }}
              title={`Swap ${ga.group} leader`}
            >
              ↔
            </Button>
          </div>
          {renderGroupYouthAssignments(ga)}
        </div>
      ));
    }
    // Don't show N/A if there's a responsible group - the group handles it
    if (assignment.responsibleGroup && assignment.leaders.length === 0) {
      return null;
    }
    return <span className="leader-names">{assignment.leaders.join(', ') || 'N/A'}</span>;
  };

  return (
    <div className={`assignment-card ${isSelected ? 'selected' : ''} ${assignment.isManuallyEdited ? 'edited' : ''} ${assignment.cancelled ? 'cancelled' : ''}`}>
      <div className="card-header">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // Handled by onClick for shift-click support
          onClick={(e) => { e.stopPropagation(); onSelect(e); }}
        />
        <div className="card-date">
          <span className="date-day">{dayName}</span>
          <span className="date-full">{assignment.date}</span>
        </div>
        {assignment.cancelled && (
          <span className="cancelled-indicator" title={assignment.cancelReason || 'Cancelled'}>🚫</span>
        )}
        {assignment.isManuallyEdited && !assignment.cancelled && (
          <span className="edited-indicator" title="Manually edited">✏️</span>
        )}
      </div>
      {assignment.cancelled && (
        <div className="cancelled-banner">
          <span className="cancelled-text">CANCELLED</span>
          {assignment.cancelReason && (
            <span className="cancelled-reason">{assignment.cancelReason}</span>
          )}
        </div>
      )}
      <div className="card-body">
        <div className="card-description">{assignment.description}</div>
        <div className="card-type">
          <span className={`type-badge ${assignment.kind}`}>
            {assignment.kind === 'combined' ? 'Combined' : 'Separate'}
          </span>
        </div>
        {(() => {
          const leadersContent = formatLeaders();
          return leadersContent && (
            <div className="card-leaders">
              {leadersContent}
            </div>
          );
        })()}
        {assignment.responsibleGroup && (
          <div className="card-responsible">
            <span className="responsible-label">Responsible:</span>
            <span className="responsible-group">{assignment.responsibleGroup}</span>
          </div>
        )}
        {/* Youth assignments for combined events (group youth are rendered within formatLeaders) */}
        {!hasGroupAssignments && renderYouthAssignments()}
      </div>
      <div className="card-actions">
        <Button variant="ghost" size="small" onClick={onEdit}>Edit</Button>
        {!hasGroupAssignments && (
          <Button variant="ghost" size="small" onClick={() => onSwap()}>Swap</Button>
        )}
      </div>
    </div>
  );
}

// Assignment Table Row Component
interface AssignmentRowProps {
  assignment: SerializedAssignment;
  isSelected: boolean;
  onSelect: (event?: React.MouseEvent) => void;
}

function AssignmentRow({ assignment, isSelected, onSelect }: AssignmentRowProps) {
  const date = new Date(assignment.date + 'T00:00:00');
  const dayName = DAY_NAMES[date.getDay()];

  const getLeaderDisplay = () => {
    if (assignment.groupAssignments && assignment.groupAssignments.length > 0) {
      return assignment.groupAssignments
        .map(ga => `${ga.group}: ${ga.leaders.join(', ') || 'TBD'}`)
        .join(' | ');
    }
    return assignment.leaders.join(', ') || 'N/A';
  };

  return (
    <tr className={`${isSelected ? 'selected' : ''} ${assignment.isManuallyEdited ? 'edited' : ''} ${assignment.cancelled ? 'cancelled' : ''}`}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}} // Handled by onClick for shift-click support
          onClick={(e) => onSelect(e)}
        />
      </td>
      <td>
        <span className="date-cell">
          <span className="day-name">{dayName}</span>
          {assignment.date}
        </span>
      </td>
      <td>
        {assignment.cancelled && <span className="cancelled-badge">🚫</span>}
        {assignment.description}
        {assignment.cancelled && assignment.cancelReason && (
          <span className="cancelled-reason-inline"> ({assignment.cancelReason})</span>
        )}
      </td>
      <td>
        <span className={`type-badge ${assignment.kind}`}>
          {assignment.kind === 'combined' ? 'Combined' : 'Separate'}
        </span>
      </td>
      <td>{getLeaderDisplay()}</td>
      <td>
        {assignment.cancelled && <span className="cancelled-indicator">🚫 Cancelled</span>}
        {assignment.isManuallyEdited && !assignment.cancelled && <span className="edited-indicator">✏️ Edited</span>}
      </td>
    </tr>
  );
}
