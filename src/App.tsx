/**
 * Youth Scheduler - Main Application
 * 
 * Multi-view application for creating, editing, and exporting schedules.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Header,
  Sidebar,
  ViewType,
  WelcomeView,
  ScheduleView,
  LeadersView,
  GroupsView,
  RulesView,
  ExportView,
} from './components';
import { useScheduleFile } from './hooks';
import { Leader, Group, RawRule } from './models';
import { saveSession } from './utils/localStorage';
import './App.css';

function App() {
  // File state management
  const {
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
    // updateSettings is available for future use
    generateSchedule,
    regenerateRange,
    editAssignment,
    undo,
    redo,
    canUndo,
    canRedo,
    assignments,
  } = useScheduleFile();

  // UI state
  const [currentView, setCurrentView] = useState<ViewType>('welcome');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Show error messages
  useEffect(() => {
    if (error) {
      setStatusType('error');
      setStatusMessage(`❌ ${error}`);
    }
  }, [error]);

  // Switch to schedule view when file is opened
  useEffect(() => {
    if (file && currentView === 'welcome') {
      setCurrentView('schedule');
    }
    if (!file && currentView !== 'welcome') {
      setCurrentView('welcome');
    }
  }, [file, currentView]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl/Cmd key
      const isCtrl = e.ctrlKey || e.metaKey;
      
      if (isCtrl && e.key === 'n') {
        e.preventDefault();
        handleNewPrompt();
      } else if (isCtrl && e.key === 'o') {
        e.preventDefault();
        document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
      } else if (isCtrl && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          handleSaveAs();
        } else {
          handleSave();
        }
      } else if (isCtrl && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (isCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Warn before closing with unsaved changes AND save session
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Always save the current session before closing
      if (file) {
        console.log('[App] beforeunload - saving session immediately');
        saveSession(file);
      }
      
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handlers
  const handleNewPrompt = useCallback(() => {
    if (isDirty && !confirm('You have unsaved changes. Create a new file anyway?')) {
      return;
    }
    // The WelcomeView will handle the actual new file creation
    close();
    setCurrentView('welcome');
  }, [isDirty, close]);

  const handleNew = useCallback((name: string, timezone: string) => {
    newFile(name, timezone);
    setStatusType('success');
    setStatusMessage(`✅ Created new schedule: ${name}`);
  }, [newFile]);

  const handleOpen = useCallback(async (browserFile: File) => {
    if (isDirty && !confirm('You have unsaved changes. Open a different file anyway?')) {
      return;
    }
    
    const validation = await openFile(browserFile);
    
    if (validation.valid) {
      setStatusType('success');
      setStatusMessage(`✅ Opened: ${browserFile.name}`);
    } else {
      setStatusType('error');
      setStatusMessage(`❌ Failed to open file: ${validation.errors.map(e => e.message).join(', ')}`);
    }
  }, [isDirty, openFile]);

  const handleImportLegacy = useCallback((
    leaders: Leader[],
    groups: Group[],
    rules: RawRule[],
    randomSeed: number,
    timezone: string,
    name: string
  ) => {
    importLegacy(leaders, groups, rules, randomSeed, timezone, name);
    setStatusType('success');
    setStatusMessage(`✅ Imported legacy configuration: ${name}`);
  }, [importLegacy]);

  const handleSave = useCallback(() => {
    if (!file) return;
    save();
    setStatusType('success');
    setStatusMessage(`✅ Saved: ${file.name}.ysch`);
  }, [file, save]);

  const handleSaveAs = useCallback(() => {
    if (!file) return;
    const newName = prompt('Save as:', file.name);
    if (newName) {
      save(`${newName}.ysch`);
      setStatusType('success');
      setStatusMessage(`✅ Saved as: ${newName}.ysch`);
    }
  }, [file, save]);

  const handleNavigate = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  const handleGenerateSchedule = useCallback((startDate: Date, endDate: Date) => {
    generateSchedule(startDate, endDate);
    setStatusType('success');
    setStatusMessage(`✅ Generated ${assignments.length} assignments`);
  }, [generateSchedule, assignments.length]);

  // Derived state
  const editedCount = useMemo(() => {
    return assignments.filter(a => a.isManuallyEdited).length;
  }, [assignments]);

  const groupNames = useMemo(() => {
    return file?.config.groups.map(g => g.name) || [];
  }, [file]);

  const leaderAssignmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    assignments.forEach(a => {
      // Count combined event leaders
      a.leaders.forEach(leader => {
        counts[leader] = (counts[leader] || 0) + 1;
      });
      // Count separate event leaders
      a.groupAssignments?.forEach(ga => {
        ga.leaders.forEach(leader => {
          counts[leader] = (counts[leader] || 0) + 1;
        });
      });
    });
    return counts;
  }, [assignments]);

  // Render current view
  const renderView = () => {
    if (!file) {
      return (
        <WelcomeView
          onNew={handleNew}
          onOpen={handleOpen}
          onImportLegacy={handleImportLegacy}
          onRestoreSession={(restoredFile) => {
            restoreSession(restoredFile);
            setStatusType('success');
            setStatusMessage(`✅ Restored session: ${restoredFile.name}`);
          }}
        />
      );
    }

    switch (currentView) {
      case 'schedule':
        return (
          <ScheduleView
            assignments={assignments}
            leaders={file.config.leaders}
            groups={file.config.groups}
            timezone={file.config.timezone}
            onEditAssignment={editAssignment}
            onRegenerateRange={regenerateRange}
            onGenerateSchedule={handleGenerateSchedule}
            dateRangeStart={file.schedule.dateRangeStart}
            dateRangeEnd={file.schedule.dateRangeEnd}
          />
        );
      
      case 'leaders':
        return (
          <LeadersView
            leaders={file.config.leaders}
            onUpdateLeaders={updateLeaders}
            assignmentCounts={leaderAssignmentCounts}
          />
        );
      
      case 'groups':
        return (
          <GroupsView
            groups={file.config.groups}
            onUpdateGroups={updateGroups}
          />
        );
      
      case 'rules':
        return (
          <RulesView
            rules={file.config.rules}
            groupNames={groupNames}
            onUpdateRules={updateRules}
          />
        );
      
      case 'export':
        return (
          <ExportView
            assignments={assignments}
            dateRangeStart={file.schedule.dateRangeStart}
            dateRangeEnd={file.schedule.dateRangeEnd}
            timezone={file.config.timezone}
          />
        );
      
      default:
        return (
          <ScheduleView
            assignments={assignments}
            leaders={file.config.leaders}
            groups={file.config.groups}
            timezone={file.config.timezone}
            onEditAssignment={editAssignment}
            onRegenerateRange={regenerateRange}
            onGenerateSchedule={handleGenerateSchedule}
            dateRangeStart={file.schedule.dateRangeStart}
            dateRangeEnd={file.schedule.dateRangeEnd}
          />
        );
    }
  };

  return (
    <div className={`app ${file ? 'has-file' : 'no-file'}`}>
      <Header
        fileName={file?.name || null}
        isDirty={isDirty}
        canUndo={canUndo}
        canRedo={canRedo}
        onNew={handleNewPrompt}
        onOpen={handleOpen}
        onSave={handleSave}
        onSaveAs={handleSaveAs}
        onUndo={undo}
        onRedo={redo}
      />
      
      <div className="app-body">
        {file && (
          <Sidebar
            currentView={currentView}
            onNavigate={handleNavigate}
            hasFile={!!file}
            assignmentCount={assignments.length}
            editedCount={editedCount}
          />
        )}
        
        <main className="app-main">
          {isLoading ? (
            <div className="loading-state">
              <div className="loading-spinner" />
              <p>Loading...</p>
            </div>
          ) : (
            renderView()
          )}
        </main>
      </div>

      {/* Status toast */}
      {statusMessage && (
        <div className={`toast ${statusType}`}>
          {statusMessage}
          <button className="toast-close" onClick={() => setStatusMessage('')}>×</button>
        </div>
      )}
    </div>
  );
}

export default App;
