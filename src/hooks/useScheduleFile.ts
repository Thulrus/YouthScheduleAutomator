/**
 * Custom hook for managing schedule file state
 * Handles loading, saving, editing, and undo/redo
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  ScheduleFile,
  SerializedAssignment,
  Leader,
  Group,
  RawRule,
  Schedule,
} from '../models';
import {
  createEmptyScheduleFile,
  createScheduleFileFromLegacy,
  updateScheduleData,
  updateAssignment,
  updateConfig,
  loadScheduleFile as loadFile,
  saveScheduleFile as saveFile,
  getScheduleFromFile,
  ValidationResult,
} from '../scheduleFile';
import { buildSchedule } from '../scheduler';
import { parseRules } from '../rules';
import { saveSession, addRecentFile, clearAutoSavedSession } from '../utils/localStorage';

// Maximum number of undo steps to keep
const MAX_UNDO_STACK = 50;

// Debounce time for auto-save (ms)
const AUTO_SAVE_DEBOUNCE = 2000;

export interface UseScheduleFileResult {
  // Current state
  file: ScheduleFile | null;
  isDirty: boolean;
  isLoading: boolean;
  error: string | null;
  
  // File operations
  newFile: (name: string, timezone?: string) => void;
  openFile: (browserFile: File) => Promise<ValidationResult>;
  restoreSession: (file: ScheduleFile) => void;
  importLegacy: (leaders: Leader[], groups: Group[], rules: RawRule[], randomSeed: number, timezone: string, name: string) => void;
  save: (filename?: string) => void;
  close: () => void;
  
  // Config operations
  updateLeaders: (leaders: Leader[]) => void;
  updateGroups: (groups: Group[]) => void;
  updateRules: (rules: RawRule[]) => void;
  updateSettings: (settings: { randomSeed?: number; timezone?: string }) => void;
  
  // Schedule operations
  generateSchedule: (startDate: Date, endDate: Date) => void;
  regenerateRange: (startDate: Date, endDate: Date, preserveEdits?: boolean) => void;
  editAssignment: (assignmentId: string, updater: (a: SerializedAssignment) => SerializedAssignment, reason?: string) => void;
  
  // Undo/redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  // Derived state
  schedule: Schedule | null;
  assignments: SerializedAssignment[];
}

export function useScheduleFile(): UseScheduleFileResult {
  // Core state
  const [file, setFile] = useState<ScheduleFile | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Undo/redo stacks
  const [undoStack, setUndoStack] = useState<ScheduleFile[]>([]);
  const [redoStack, setRedoStack] = useState<ScheduleFile[]>([]);

  // Helper to update file with undo support
  const updateFile = useCallback((updater: (f: ScheduleFile) => ScheduleFile) => {
    setFile(current => {
      if (!current) return current;
      
      // Push current state to undo stack
      setUndoStack(stack => {
        const newStack = [...stack, current];
        // Limit stack size
        if (newStack.length > MAX_UNDO_STACK) {
          newStack.shift();
        }
        return newStack;
      });
      
      // Clear redo stack on new change
      setRedoStack([]);
      
      // Mark as dirty
      setIsDirty(true);
      
      return updater(current);
    });
  }, []);

  // ============================================================================
  // FILE OPERATIONS
  // ============================================================================

  const newFile = useCallback((name: string, timezone: string = 'America/Denver') => {
    setFile(createEmptyScheduleFile(name, timezone));
    setIsDirty(false);
    setUndoStack([]);
    setRedoStack([]);
    setError(null);
  }, []);

  const openFile = useCallback(async (browserFile: File): Promise<ValidationResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await loadFile(browserFile);
      
      if (result.scheduleFile) {
        setFile(result.scheduleFile);
        setIsDirty(false);
        setUndoStack([]);
        setRedoStack([]);
        // Add to recent files with content
        addRecentFile(result.scheduleFile.name, result.scheduleFile);
      } else {
        setError(result.validation.errors.map(e => e.message).join(', '));
      }
      
      return result.validation;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const restoreSession = useCallback((restoredFile: ScheduleFile) => {
    setFile(restoredFile);
    setIsDirty(true); // Mark as dirty since it wasn't saved to disk
    setUndoStack([]);
    setRedoStack([]);
    setError(null);
  }, []);

  const importLegacy = useCallback((
    leaders: Leader[],
    groups: Group[],
    rules: RawRule[],
    randomSeed: number,
    timezone: string,
    name: string
  ) => {
    const newScheduleFile = createScheduleFileFromLegacy(name, leaders, groups, rules, randomSeed, timezone);
    setFile(newScheduleFile);
    setIsDirty(true);
    setUndoStack([]);
    setRedoStack([]);
    setError(null);
  }, []);

  const save = useCallback((filename?: string) => {
    if (!file) return;
    saveFile(file, filename);
    setIsDirty(false);
    // Clear auto-save since we've saved to disk
    clearAutoSavedSession();
    // Add to recent files with content
    addRecentFile(filename?.replace('.ysch', '') || file.name, file);
  }, [file]);

  const close = useCallback(() => {
    setFile(null);
    setIsDirty(false);
    setUndoStack([]);
    setRedoStack([]);
    setError(null);
  }, []);

  // ============================================================================
  // CONFIG OPERATIONS
  // ============================================================================

  const updateLeaders = useCallback((leaders: Leader[]) => {
    updateFile(f => updateConfig(f, { leaders }));
  }, [updateFile]);

  const updateGroups = useCallback((groups: Group[]) => {
    updateFile(f => updateConfig(f, { groups }));
  }, [updateFile]);

  const updateRules = useCallback((rules: RawRule[]) => {
    updateFile(f => updateConfig(f, { rules }));
  }, [updateFile]);

  const updateSettings = useCallback((settings: { randomSeed?: number; timezone?: string }) => {
    updateFile(f => updateConfig(f, settings));
  }, [updateFile]);

  // ============================================================================
  // SCHEDULE OPERATIONS
  // ============================================================================

  const generateSchedule = useCallback((startDate: Date, endDate: Date) => {
    if (!file) return;
    
    try {
      const parsedRules = parseRules(file.config.rules);
      const schedule = buildSchedule(
        file.config.leaders,
        file.config.groups,
        parsedRules,
        startDate,
        endDate,
        'round-robin',
        1,
        undefined,
        file.config.randomSeed
      );
      
      updateFile(f => updateScheduleData(f, schedule, startDate, endDate));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate schedule');
    }
  }, [file, updateFile]);

  const regenerateRange = useCallback((startDate: Date, endDate: Date, preserveEdits: boolean = true) => {
    if (!file) return;
    
    try {
      const parsedRules = parseRules(file.config.rules);
      
      // Get existing assignments outside the range to preserve
      const existingBefore = file.schedule.assignments.filter(a => a.date < startDate.toISOString().split('T')[0]);
      const existingAfter = file.schedule.assignments.filter(a => a.date > endDate.toISOString().split('T')[0]);
      
      // Get edited assignments in range if preserving edits
      const editedInRange = preserveEdits 
        ? file.schedule.assignments.filter(a => 
            a.date >= startDate.toISOString().split('T')[0] && 
            a.date <= endDate.toISOString().split('T')[0] &&
            a.isManuallyEdited
          )
        : [];
      
      // Generate new schedule for the range
      // TODO: Use scheduler state from before the range for continuity
      const newSchedule = buildSchedule(
        file.config.leaders,
        file.config.groups,
        parsedRules,
        startDate,
        endDate,
        'round-robin',
        1,
        undefined,
        file.config.randomSeed
      );
      
      // Get the new assignments and filter out dates that have edited assignments
      const editedDates = new Set(editedInRange.map(a => a.date));
      const newSerializedAssignments = newSchedule.assignments.map(a => ({
        id: `${a.date.toISOString().split('T')[0]}-${simpleHash(a.description)}`,
        date: a.date.toISOString().split('T')[0],
        kind: a.kind,
        description: a.description,
        leaders: a.leaders,
        responsibleGroup: a.responsibleGroup,
        startTime: a.startTime,
        durationMinutes: a.durationMinutes,
        youthAssignments: a.youthAssignments,
        groupAssignments: a.groupAssignments?.map(ga => ({
          group: ga.group,
          leaders: ga.leaders,
          youthAssignments: ga.youthAssignments,
        })),
        isManuallyEdited: false,
      } as SerializedAssignment)).filter(a => !editedDates.has(a.date));
      
      // Combine all assignments
      const allAssignments = [
        ...existingBefore,
        ...editedInRange,
        ...newSerializedAssignments,
        ...existingAfter,
      ].sort((a, b) => a.date.localeCompare(b.date));
      
      updateFile(f => ({
        ...f,
        modifiedAt: new Date().toISOString(),
        schedule: {
          ...f.schedule,
          assignments: allAssignments,
        },
      }));
      
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to regenerate schedule');
    }
  }, [file, updateFile]);

  const editAssignment = useCallback((
    assignmentId: string,
    updater: (a: SerializedAssignment) => SerializedAssignment,
    reason?: string
  ) => {
    updateFile(f => updateAssignment(f, assignmentId, updater, reason));
  }, [updateFile]);

  // ============================================================================
  // UNDO/REDO
  // ============================================================================

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    setFile(current => {
      if (current) {
        setRedoStack(stack => [...stack, current]);
      }
      const previous = undoStack[undoStack.length - 1];
      setUndoStack(stack => stack.slice(0, -1));
      setIsDirty(true);
      return previous;
    });
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    
    setFile(current => {
      if (current) {
        setUndoStack(stack => [...stack, current]);
      }
      const next = redoStack[redoStack.length - 1];
      setRedoStack(stack => stack.slice(0, -1));
      setIsDirty(true);
      return next;
    });
  }, [redoStack]);

  // ============================================================================
  // AUTO-SAVE EFFECT
  // ============================================================================
  
  const autoSaveTimerRef = useRef<number | null>(null);
  
  // Auto-save whenever file changes (debounced)
  useEffect(() => {
    console.log('[useScheduleFile] Auto-save effect triggered, file:', file?.name, 'isDirty:', isDirty);
    
    // Clear any pending auto-save
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    
    // If we have a file, schedule auto-save
    // Save both dirty and clean files to ensure session recovery works
    if (file) {
      console.log('[useScheduleFile] Scheduling auto-save in', AUTO_SAVE_DEBOUNCE, 'ms');
      autoSaveTimerRef.current = window.setTimeout(() => {
        console.log('[useScheduleFile] Auto-save timer fired, saving...');
        saveSession(file);
      }, AUTO_SAVE_DEBOUNCE);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [file, isDirty]);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const schedule = useMemo(() => {
    if (!file) return null;
    return getScheduleFromFile(file);
  }, [file]);

  const assignments = useMemo(() => {
    return file?.schedule.assignments ?? [];
  }, [file]);

  return {
    file,
    isDirty,
    isLoading,
    error,
    
    newFile,
    openFile,
    restoreSession,
    importLegacy,
    save,
    close,
    
    updateLeaders,
    updateGroups,
    updateRules,
    updateSettings,
    
    generateSchedule,
    regenerateRange,
    editAssignment,
    
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    
    schedule,
    assignments,
  };
}

// Simple hash function (duplicated here to avoid circular dependency)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(6, '0').slice(0, 6);
}
