/**
 * Welcome view - shown when no file is open
 */

import React, { useRef, useState, useEffect } from 'react';
import { Button } from './common';
import { Leader, Group, RawRule, ScheduleFile } from '../models';
import { 
  getRecentFiles, 
  getRecentFileContent,
  removeRecentFile, 
  getAutoSavedSession, 
  clearAutoSavedSession,
  formatRelativeTime,
  RecentFile 
} from '../utils/localStorage';

interface WelcomeViewProps {
  onNew: (name: string, timezone: string) => void;
  onOpen: (file: File) => void;
  onImportLegacy: (leaders: Leader[], groups: Group[], rules: RawRule[], randomSeed: number, timezone: string, name: string) => void;
  onRestoreSession: (file: ScheduleFile) => void;
}

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Phoenix',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

export function WelcomeView({ onNew, onOpen, onImportLegacy, onRestoreSession }: WelcomeViewProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const legacyInputRef = useRef<HTMLInputElement>(null);
  
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTimezone, setNewTimezone] = useState('America/Denver');
  
  // Recent files and auto-save state
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [autoSave, setAutoSave] = useState<{ file: ScheduleFile; timestamp: string } | null>(null);
  
  // Load recent files and check for auto-save on mount
  useEffect(() => {
    console.log('[WelcomeView] Loading recent files and checking auto-save...');
    const recent = getRecentFiles();
    const saved = getAutoSavedSession();
    console.log('[WelcomeView] Recent files:', recent.length, 'Auto-save:', saved?.file?.name);
    setRecentFiles(recent);
    setAutoSave(saved);
  }, []);

  const handleRestoreAutoSave = () => {
    if (autoSave) {
      onRestoreSession(autoSave.file);
      // Don't clear auto-save - keep it until they save manually
    }
  };

  const handleDismissAutoSave = () => {
    clearAutoSavedSession();
    setAutoSave(null);
  };

  const handleRemoveRecentFile = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeRecentFile(name);
    setRecentFiles(getRecentFiles());
  };

  const handleOpenRecentFile = (name: string) => {
    // Try to get stored content first
    const content = getRecentFileContent(name);
    if (content) {
      console.log('[WelcomeView] Opening recent file from stored content:', name);
      onRestoreSession(content);
    } else {
      // Fallback to file dialog if content not available
      console.log('[WelcomeView] No stored content for recent file, opening file dialog:', name);
      handleOpenClick();
    }
  };

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpen(file);
    }
    e.target.value = '';
  };

  const handleLegacyImport = () => {
    legacyInputRef.current?.click();
  };

  const handleLegacyFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        const data = JSON.parse(content);
        
        // Detect file format and extract data
        let leaders: Leader[] = [];
        let groups: Group[] = [];
        let rules: RawRule[] = [];
        let randomSeed = 0;
        let timezone = 'America/Denver';
        const name = file.name.replace(/\.[^.]+$/, '');

        // Check if it's a combined config file
        if (data.leaders && Array.isArray(data.leaders)) {
          leaders = data.leaders;
        }
        if (data.groups && Array.isArray(data.groups)) {
          groups = data.groups;
        }
        if (data.rules && Array.isArray(data.rules)) {
          rules = data.rules;
        }
        if (typeof data.randomSeed === 'number') {
          randomSeed = data.randomSeed;
        }
        if (typeof data.timezone === 'string') {
          timezone = data.timezone;
        }

        onImportLegacy(leaders, groups, rules, randomSeed, timezone, name);
      } catch (err) {
        console.error('Failed to parse legacy file:', err);
        alert('Failed to parse configuration file. Make sure it\'s valid JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCreateNew = () => {
    if (newName.trim()) {
      onNew(newName.trim(), newTimezone);
      setShowNewDialog(false);
      setNewName('');
    }
  };

  return (
    <div className="welcome-view">
      {/* Auto-save recovery banner */}
      {autoSave && (
        <div className="autosave-banner">
          <div className="autosave-info">
            <span className="autosave-icon">💾</span>
            <div className="autosave-text">
              <strong>Unsaved session found</strong>
              <span className="autosave-details">
                &ldquo;{autoSave.file.name}&rdquo; from {formatRelativeTime(autoSave.timestamp)}
              </span>
            </div>
          </div>
          <div className="autosave-actions">
            <Button variant="primary" size="small" onClick={handleRestoreAutoSave}>
              Restore Session
            </Button>
            <Button variant="ghost" size="small" onClick={handleDismissAutoSave}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      
      <div className="welcome-hero">
        <div className="welcome-icon">📅</div>
        <h1 className="welcome-title">Youth Scheduler</h1>
        <p className="welcome-subtitle">
          Create, manage, and export deterministic schedules for youth activities
        </p>
      </div>

      <div className="welcome-actions">
        <div className="action-card" onClick={() => setShowNewDialog(true)}>
          <div className="action-icon">📄</div>
          <div className="action-content">
            <h3>New Schedule</h3>
            <p>Create a new schedule file from scratch</p>
          </div>
        </div>

        <div className="action-card" onClick={handleOpenClick}>
          <div className="action-icon">📂</div>
          <div className="action-content">
            <h3>Open Schedule</h3>
            <p>Open an existing .ysch schedule file</p>
          </div>
        </div>

        <div className="action-card secondary" onClick={handleLegacyImport}>
          <div className="action-icon">📥</div>
          <div className="action-content">
            <h3>Import Legacy Config</h3>
            <p>Import leaders, groups, and rules from JSON files</p>
          </div>
        </div>
      </div>

      {/* Recent Files Section */}
      {recentFiles.length > 0 && (
        <div className="recent-files-section">
          <h3 className="recent-files-title">Recent Schedules</h3>
          <div className="recent-files-list">
            {recentFiles.map((file) => (
              <div key={file.name} className="recent-file-item" onClick={() => handleOpenRecentFile(file.name)}>
                <div className="recent-file-info">
                  <span className="recent-file-icon">📅</span>
                  <div className="recent-file-details">
                    <span className="recent-file-name">{file.name}</span>
                    <span className="recent-file-date">{formatRelativeTime(file.lastOpened)}</span>
                  </div>
                </div>
                <button 
                  className="recent-file-remove" 
                  onClick={(e) => handleRemoveRecentFile(file.name, e)}
                  title="Remove from recent files"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="recent-files-note">
            Click to restore a recent file. Files are stored locally in your browser.
          </p>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".ysch,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <input
        ref={legacyInputRef}
        type="file"
        accept=".json"
        onChange={handleLegacyFileChange}
        style={{ display: 'none' }}
      />

      {/* New Schedule Dialog */}
      {showNewDialog && (
        <div className="modal-backdrop" onClick={() => setShowNewDialog(false)}>
          <div className="modal modal-small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">New Schedule</h2>
              <button className="modal-close" onClick={() => setShowNewDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="schedule-name">Schedule Name</label>
                <input
                  id="schedule-name"
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g., 2025 Youth Activities"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="schedule-timezone">Timezone</label>
                <select
                  id="schedule-timezone"
                  value={newTimezone}
                  onChange={e => setNewTimezone(e.target.value)}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setShowNewDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleCreateNew} disabled={!newName.trim()}>
                Create Schedule
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="welcome-footer">
        <p>
          Schedule files (.ysch) contain all your configuration and generated events in one place.
          You can view, edit, regenerate, and export schedules at any time.
        </p>
      </div>
    </div>
  );
}
