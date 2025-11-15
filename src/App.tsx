import { useState, useEffect } from 'react';
import { parseRules } from './rules';
import { buildSchedule } from './scheduler';
import { Schedule, Leader, Group } from './models';
import { exportMarkdown, exportCSV, exportICS, exportTextMessage } from './exporters';
import './App.css';

type ScheduleDuration = '1-month' | '3-months' | '6-months' | '1-year' | '2-years';

// Common timezones for the dropdown
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

const WEEKDAYS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const AVAILABILITY_OPTIONS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function App() {
  const currentYear = new Date().getFullYear();
  
  // Form state
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [duration, setDuration] = useState<ScheduleDuration>('1-year');
  const [timezone, setTimezone] = useState('America/Denver');
  const [randomSeed, setRandomSeed] = useState(() => {
    const saved = localStorage.getItem('randomSeed');
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Config state - using objects instead of YAML strings
  const [leaders, setLeaders] = useState<Leader[]>(() => {
    const saved = localStorage.getItem('leaders');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('leaders');
      return [];
    }
  });
  const [groups, setGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('groups');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('groups');
      return [];
    }
  });
  const [rules, setRules] = useState<any[]>(() => {
    const saved = localStorage.getItem('rules');
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      localStorage.removeItem('rules');
      return [];
    }
  });
  
  // Accordion state - track which sections are open (only one at a time)
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [schedulePreviewOpen, setSchedulePreviewOpen] = useState(false);
  
  // Toggle functions - close others when opening one
  const toggleLeaders = () => {
    setLeadersOpen(!leadersOpen);
    if (!leadersOpen) {
      setGroupsOpen(false);
      setRulesOpen(false);
    }
  };
  
  const toggleGroups = () => {
    setGroupsOpen(!groupsOpen);
    if (!groupsOpen) {
      setLeadersOpen(false);
      setRulesOpen(false);
    }
  };
  
  const toggleRules = () => {
    setRulesOpen(!rulesOpen);
    if (!rulesOpen) {
      setLeadersOpen(false);
      setGroupsOpen(false);
    }
  };
  
  const toggleSchedulePreview = () => {
    setSchedulePreviewOpen(!schedulePreviewOpen);
  };
  
  // Schedule state
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Calculate end date based on start date and duration
  const calculateEndDate = (start: Date, dur: ScheduleDuration): Date => {
    const end = new Date(start);
    
    switch (dur) {
      case '1-month':
        end.setMonth(end.getMonth() + 1);
        break;
      case '3-months':
        end.setMonth(end.getMonth() + 3);
        break;
      case '6-months':
        end.setMonth(end.getMonth() + 6);
        break;
      case '1-year':
        end.setFullYear(end.getFullYear() + 1);
        break;
      case '2-years':
        end.setFullYear(end.getFullYear() + 2);
        break;
    }
    
    return end;
  };

  const handleGenerate = () => {
    try {
      const start = new Date(startDate);
      const end = calculateEndDate(start, duration);
      
      if (start > end) {
        setStatusType('error');
        setStatusMessage('Start date must be before or equal to end date');
        return;
      }
      
      const parsedRules = parseRules(rules);
      
      const newSchedule = buildSchedule(
        leaders,
        groups,
        parsedRules,
        start,
        end,
        'round-robin',
        1,
        undefined,
        randomSeed
      );
      
      setSchedule(newSchedule);
      setSchedulePreviewOpen(false); // Close preview to reduce clutter
      setStatusType('success');
      setStatusMessage(`✅ Generated ${newSchedule.assignments.length} assignments`);
      
      localStorage.setItem('leaders', JSON.stringify(leaders));
      localStorage.setItem('groups', JSON.stringify(groups));
      localStorage.setItem('rules', JSON.stringify(rules));
      localStorage.setItem('randomSeed', randomSeed.toString());
      
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSchedule(null);
    }
  };

  const handleExport = (format: 'md' | 'csv' | 'ics' | 'txt') => {
    if (!schedule) {
      setStatusType('error');
      setStatusMessage('Please generate a schedule first');
      return;
    }

    try {
      switch (format) {
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
      }
      setStatusType('success');
      setStatusMessage(`✅ Exported as ${format.toUpperCase()}`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportLeadersJSON = () => {
    try {
      const leadersConfig = {
        version: '1.0.0',
        leaders,
      };
      
      const blob = new Blob([JSON.stringify(leadersConfig, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'leaders-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatusType('success');
      setStatusMessage('✅ Exported leaders configuration');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportGroupsJSON = () => {
    try {
      const groupsConfig = {
        version: '1.0.0',
        groups,
      };
      
      const blob = new Blob([JSON.stringify(groupsConfig, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'groups-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatusType('success');
      setStatusMessage('✅ Exported groups configuration');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportRulesJSON = () => {
    try {
      const rulesConfig = {
        version: '1.0.0',
        rules,
      };
      
      const blob = new Blob([JSON.stringify(rulesConfig, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'rules-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatusType('success');
      setStatusMessage('✅ Exported rules configuration');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportAllJSON = () => {
    try {
      const completeConfig = {
        version: '1.0.0',
        leaders,
        groups,
        rules,
        randomSeed,
      };
      
      const blob = new Blob([JSON.stringify(completeConfig, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'complete-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatusType('success');
      setStatusMessage('✅ Exported complete configuration (leaders, groups, and rules)');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportLeadersJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        if (!config.leaders || !Array.isArray(config.leaders)) {
          throw new Error('Invalid format: "leaders" array not found in file');
        }
        
        setLeaders(config.leaders);
        localStorage.setItem('leaders', JSON.stringify(config.leaders));
        setStatusType('success');
        setStatusMessage(`✅ Imported ${config.leaders.length} leader(s)`);
      } catch (error) {
        setStatusType('error');
        setStatusMessage(`❌ Failed to import leaders: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportGroupsJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        if (!config.groups || !Array.isArray(config.groups)) {
          throw new Error('Invalid format: "groups" array not found in file');
        }
        
        setGroups(config.groups);
        localStorage.setItem('groups', JSON.stringify(config.groups));
        setStatusType('success');
        setStatusMessage(`✅ Imported ${config.groups.length} group(s)`);
      } catch (error) {
        setStatusType('error');
        setStatusMessage(`❌ Failed to import groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportRulesJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        if (!config.rules || !Array.isArray(config.rules)) {
          throw new Error('Invalid format: "rules" array not found in file');
        }
        
        setRules(config.rules);
        localStorage.setItem('rules', JSON.stringify(config.rules));
        setStatusType('success');
        setStatusMessage(`✅ Imported ${config.rules.length} rule(s)`);
      } catch (error) {
        setStatusType('error');
        setStatusMessage(`❌ Failed to import rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportAllJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        // Check if this is a complete config file (has all three sections)
        const hasLeaders = config.leaders && Array.isArray(config.leaders);
        const hasGroups = config.groups && Array.isArray(config.groups);
        const hasRules = config.rules && Array.isArray(config.rules);
        
        if (!hasLeaders && !hasGroups && !hasRules) {
          throw new Error('Invalid format: file must contain at least one of "leaders", "groups", or "rules" arrays');
        }
        
        const importedItems: string[] = [];
        
        // Import leaders if present
        if (hasLeaders) {
          setLeaders(config.leaders);
          localStorage.setItem('leaders', JSON.stringify(config.leaders));
          importedItems.push(`${config.leaders.length} leader(s)`);
        }
        
        // Import groups if present
        if (hasGroups) {
          setGroups(config.groups);
          localStorage.setItem('groups', JSON.stringify(config.groups));
          importedItems.push(`${config.groups.length} group(s)`);
        }
        
        // Import rules if present
        if (hasRules) {
          setRules(config.rules);
          localStorage.setItem('rules', JSON.stringify(config.rules));
          importedItems.push(`${config.rules.length} rule(s)`);
        }
        
        // Import random seed if present
        if (config.randomSeed !== undefined && typeof config.randomSeed === 'number') {
          setRandomSeed(config.randomSeed);
          localStorage.setItem('randomSeed', config.randomSeed.toString());
          importedItems.push('random seed');
        }
        
        setStatusType('success');
        setStatusMessage(`✅ Imported ${importedItems.join(', ')}`);
      } catch (error) {
        setStatusType('error');
        setStatusMessage(`❌ Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleLoadExampleLeaders = async () => {
    try {
      const response = await fetch('/YouthScheduleAutomator/example-leaders.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      
      if (!config.leaders || !Array.isArray(config.leaders)) {
        throw new Error('Invalid format: "leaders" array not found in file');
      }
      
      setLeaders(config.leaders);
      localStorage.setItem('leaders', JSON.stringify(config.leaders));
      setStatusType('success');
      setStatusMessage(`✅ Loaded ${config.leaders.length} example leader(s)`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Failed to load example leaders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadExampleGroups = async () => {
    try {
      const response = await fetch('/YouthScheduleAutomator/example-groups.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      
      if (!config.groups || !Array.isArray(config.groups)) {
        throw new Error('Invalid format: "groups" array not found in file');
      }
      
      setGroups(config.groups);
      localStorage.setItem('groups', JSON.stringify(config.groups));
      setStatusType('success');
      setStatusMessage(`✅ Loaded ${config.groups.length} example group(s)`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Failed to load example groups: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadExampleRules = async () => {
    try {
      const response = await fetch('/YouthScheduleAutomator/example-rules.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      
      if (!config.rules || !Array.isArray(config.rules)) {
        throw new Error('Invalid format: "rules" array not found in file');
      }
      
      setRules(config.rules);
      localStorage.setItem('rules', JSON.stringify(config.rules));
      setStatusType('success');
      setStatusMessage(`✅ Loaded ${config.rules.length} example rule(s)`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Failed to load example rules: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadExampleAll = async () => {
    try {
      const response = await fetch('/YouthScheduleAutomator/example-config.json');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const config = await response.json();
      
      const importedItems: string[] = [];
      
      // Load leaders if present
      if (config.leaders && Array.isArray(config.leaders)) {
        setLeaders(config.leaders);
        localStorage.setItem('leaders', JSON.stringify(config.leaders));
        importedItems.push(`${config.leaders.length} leader(s)`);
      }
      
      // Load groups if present
      if (config.groups && Array.isArray(config.groups)) {
        setGroups(config.groups);
        localStorage.setItem('groups', JSON.stringify(config.groups));
        importedItems.push(`${config.groups.length} group(s)`);
      }
      
      // Load rules if present
      if (config.rules && Array.isArray(config.rules)) {
        setRules(config.rules);
        localStorage.setItem('rules', JSON.stringify(config.rules));
        importedItems.push(`${config.rules.length} rule(s)`);
      }
      
      if (importedItems.length === 0) {
        throw new Error('Invalid format: file must contain at least one of "leaders", "groups", or "rules" arrays');
      }
      
      setStatusType('success');
      setStatusMessage(`✅ Loaded complete example configuration: ${importedItems.join(', ')}`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Failed to load example configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Leader management functions
  const addLeader = () => {
    const newLeader: Leader = {
      name: "New Leader",
      groups: [],
      availability: [],
      weight: 1
    };
    setLeaders([...leaders, newLeader]);
  };

  const updateLeader = (index: number, updatedLeader: Leader) => {
    const newLeaders = [...leaders];
    newLeaders[index] = updatedLeader;
    setLeaders(newLeaders);
    localStorage.setItem('leaders', JSON.stringify(newLeaders));
  };

  const deleteLeader = (index: number) => {
    const newLeaders = leaders.filter((_, i) => i !== index);
    setLeaders(newLeaders);
    localStorage.setItem('leaders', JSON.stringify(newLeaders));
  };

  // Group management functions
  const addGroup = () => {
    const newGroup: Group = {
      name: "new-group",
      members: []
    };
    setGroups([...groups, newGroup]);
  };

  const updateGroup = (index: number, updatedGroup: Group) => {
    const newGroups = [...groups];
    newGroups[index] = updatedGroup;
    setGroups(newGroups);
    localStorage.setItem('groups', JSON.stringify(newGroups));
  };

  const deleteGroup = (index: number) => {
    const newGroups = groups.filter((_, i) => i !== index);
    setGroups(newGroups);
    localStorage.setItem('groups', JSON.stringify(newGroups));
  };

  // Rule management functions
  const addRule = () => {
    const newRule = {
      name: "New Rule",
      frequency: "monthly",
      weekday: 6,
      nth: 1,
      kind: "combined",
      description: "New Event",
      start_time: "10:00",
      duration_minutes: 60
    };
    setRules([...rules, newRule]);
  };

  const updateRule = (index: number, updatedRule: any) => {
    const newRules = [...rules];
    newRules[index] = updatedRule;
    setRules(newRules);
    localStorage.setItem('rules', JSON.stringify(newRules));
  };

  const deleteRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    localStorage.setItem('rules', JSON.stringify(newRules));
  };

  // Group assignments by month for better visualization
  const groupedAssignments = schedule?.assignments.reduce((acc, assignment) => {
    const monthKey = assignment.date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(assignment);
    return acc;
  }, {} as Record<string, typeof schedule.assignments>) || {};

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Format time for display
  const formatTime = (startTime?: string, durationMinutes?: number) => {
    if (!startTime) return '';
    const [hours, minutes] = startTime.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    let timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    
    if (durationMinutes) {
      const durationHours = Math.floor(durationMinutes / 60);
      const durationMins = durationMinutes % 60;
      if (durationHours > 0) {
        timeStr += ` (${durationHours}h${durationMins > 0 ? ` ${durationMins}m` : ''})`;
      } else {
        timeStr += ` (${durationMins}m)`;
      }
    }
    
    return timeStr;
  };

  // Get all group names for dropdown
  const allGroupNames = groups.map(g => g.name);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>📅 Youth Scheduler</h1>
        <p className="app-subtitle">Configure your team, define recurring events, and generate schedules automatically</p>
      </header>
      
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`toast toast-${statusType}`}>
          <span className="toast-message">{statusMessage}</span>
          <button 
            className="toast-close" 
            onClick={() => setStatusMessage('')}
            aria-label="Close notification"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* STEP 1: Configuration */}
      <section className="config-section">
        <div className="section-header">
          <h2>📝 Step 1: Configure People & Events</h2>
          <p className="section-description">Set up your leaders, groups, and recurring event rules</p>
        </div>
        
        {/* COMBINED IMPORT/EXPORT SECTION */}
        <div style={{ 
          marginBottom: '24px', 
          padding: '16px', 
          backgroundColor: 'var(--card-bg)', 
          borderRadius: '8px',
          border: '2px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <strong style={{ fontSize: '1.1em' }}>🎯 Quick Configuration</strong>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9em', color: '#666' }}>
                Import or export all settings at once (leaders, groups, and rules)
              </p>
            </div>
            <div className="button-group-inline">
              <label className="button-secondary-inline">
                📁 Import All
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportAllJSON}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="button-secondary-inline" onClick={handleExportAllJSON}>
                💾 Export All
              </button>
              <button className="button-secondary-inline" onClick={handleLoadExampleAll}>
                ⭐ Load Example
              </button>
            </div>
          </div>
        </div>
        
        {/* LEADERS ACCORDION */}
        <div className="accordion-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${leadersOpen ? 'open' : ''}`}
              onClick={toggleLeaders}
            >
              <span className="accordion-icon">{leadersOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">👥 Leaders ({leaders.length})</span>
            </button>
            {leadersOpen && (
              <div className="accordion-toolbar">
                <button className="add-button-inline" onClick={addLeader}>
                  ➕ Add Leader
                </button>
                <div className="button-group-inline">
                  <label className="button-secondary-inline">
                    📁 Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportLeadersJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="button-secondary-inline" onClick={handleExportLeadersJSON}>
                    💾 Export
                  </button>
                  <button className="button-secondary-inline" onClick={handleLoadExampleLeaders}>
                    ⭐ Example
                  </button>
                </div>
              </div>
            )}
          </div>
          {leadersOpen && (
            <div className="accordion-content">
              <div className="config-cards">
                {leaders.map((leader, index) => (
                  <div key={index} className="config-card">
                    <div className="config-card-header">
                      <h4>Leader {index + 1}</h4>
                      <button 
                        className="delete-button"
                        onClick={() => deleteLeader(index)}
                        title="Delete Leader"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="config-card-body">
                      <div className="form-group">
                        <label>Name</label>
                        <input
                          type="text"
                          value={leader.name}
                          onChange={(e) => updateLeader(index, { ...leader, name: e.target.value })}
                          placeholder="Leader Name"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Groups (can lead)</label>
                        <div className="checkbox-group">
                          {allGroupNames.map(groupName => (
                            <label key={groupName} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={leader.groups.includes(groupName)}
                                onChange={(e) => {
                                  const newGroups = e.target.checked
                                    ? [...leader.groups, groupName]
                                    : leader.groups.filter(g => g !== groupName);
                                  updateLeader(index, { ...leader, groups: newGroups });
                                }}
                              />
                              {groupName}
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>Availability (days they can serve)</label>
                        <div className="checkbox-group">
                          {AVAILABILITY_OPTIONS.map(day => (
                            <label key={day} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={leader.availability.includes(day)}
                                onChange={(e) => {
                                  const newAvail = e.target.checked
                                    ? [...leader.availability, day]
                                    : leader.availability.filter(d => d !== day);
                                  updateLeader(index, { ...leader, availability: newAvail });
                                }}
                              />
                              {day}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* GROUPS ACCORDION */}
        <div className="accordion-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${groupsOpen ? 'open' : ''}`}
              onClick={toggleGroups}
            >
              <span className="accordion-icon">{groupsOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">👨‍👩‍👧‍👦 Groups ({groups.length})</span>
            </button>
            {groupsOpen && (
              <div className="accordion-toolbar">
                <button className="add-button-inline" onClick={addGroup}>
                  ➕ Add Group
                </button>
                <div className="button-group-inline">
                  <label className="button-secondary-inline">
                    📁 Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportGroupsJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="button-secondary-inline" onClick={handleExportGroupsJSON}>
                    💾 Export
                  </button>
                  <button className="button-secondary-inline" onClick={handleLoadExampleGroups}>
                    ⭐ Example
                  </button>
                </div>
              </div>
            )}
          </div>
          {groupsOpen && (
            <div className="accordion-content">
              <div className="config-cards">
                {groups.map((group, index) => (
                  <div key={index} className="config-card">
                    <div className="config-card-header">
                      <h4>Group {index + 1}</h4>
                      <button 
                        className="delete-button"
                        onClick={() => deleteGroup(index)}
                        title="Delete Group"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="config-card-body">
                      <div className="form-group">
                        <label>Group Name</label>
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => updateGroup(index, { ...group, name: e.target.value })}
                          placeholder="Group Name (e.g., priests, deacons)"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Members (one per line)</label>
                        <textarea
                          value={group.members.join('\n')}
                          onChange={(e) => {
                            const members = e.target.value.split('\n').filter(m => m.trim());
                            updateGroup(index, { ...group, members });
                          }}
                          placeholder="Enter member names, one per line"
                          rows={5}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RULES ACCORDION */}
        <div className="accordion-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${rulesOpen ? 'open' : ''}`}
              onClick={toggleRules}
            >
              <span className="accordion-icon">{rulesOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">📅 Rules ({rules.length})</span>
            </button>
            {rulesOpen && (
              <div className="accordion-toolbar">
                <button className="add-button-inline" onClick={addRule}>
                  ➕ Add Rule
                </button>
                <div className="button-group-inline">
                  <label className="button-secondary-inline">
                    📁 Import
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportRulesJSON}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button className="button-secondary-inline" onClick={handleExportRulesJSON}>
                    💾 Export
                  </button>
                  <button className="button-secondary-inline" onClick={handleLoadExampleRules}>
                    ⭐ Example
                  </button>
                </div>
              </div>
            )}
          </div>
          {rulesOpen && (
            <div className="accordion-content">
                            <div className="config-cards">
                {rules.map((rule, index) => (
                  <div key={index} className="config-card">
                    <div className="config-card-header">
                      <h4>Rule {index + 1}</h4>
                      <button 
                        className="delete-button"
                        onClick={() => deleteRule(index)}
                        title="Delete Rule"
                      >
                        🗑️
                      </button>
                    </div>
                    <div className="config-card-body">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Rule Name</label>
                          <input
                            type="text"
                            value={rule.name}
                            onChange={(e) => updateRule(index, { ...rule, name: e.target.value })}
                            placeholder="Rule Name"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Description</label>
                          <input
                            type="text"
                            value={rule.description}
                            onChange={(e) => updateRule(index, { ...rule, description: e.target.value })}
                            placeholder="Event Description"
                          />
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Frequency</label>
                          <select
                            value={rule.frequency}
                            onChange={(e) => updateRule(index, { ...rule, frequency: e.target.value })}
                          >
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label>Weekday</label>
                          <select
                            value={rule.weekday ?? ''}
                            onChange={(e) => updateRule(index, { ...rule, weekday: e.target.value ? parseInt(e.target.value) : undefined })}
                          >
                            <option value="">None</option>
                            {WEEKDAYS.map(day => (
                              <option key={day.value} value={day.value}>{day.label}</option>
                            ))}
                          </select>
                        </div>
                        
                        {rule.frequency === 'monthly' && (
                          <div className="form-group">
                            <label>Nth Occurrence</label>
                            <select
                              value={rule.nth ?? ''}
                              onChange={(e) => updateRule(index, { ...rule, nth: e.target.value ? parseInt(e.target.value) : undefined })}
                            >
                              <option value="">None</option>
                              <option value="1">1st</option>
                              <option value="2">2nd</option>
                              <option value="3">3rd</option>
                              <option value="4">4th</option>
                              <option value="5">5th</option>
                              <option value="-1">Last</option>
                            </select>
                          </div>
                        )}
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Kind</label>
                          <select
                            value={rule.kind}
                            onChange={(e) => updateRule(index, { ...rule, kind: e.target.value })}
                          >
                            <option value="combined">Combined</option>
                            <option value="separate">Separate</option>
                          </select>
                        </div>
                        
                        <div className="form-group">
                          <label>Start Time (HH:MM)</label>
                          <input
                            type="time"
                            value={rule.start_time || ''}
                            onChange={(e) => updateRule(index, { ...rule, start_time: e.target.value })}
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Duration (minutes)</label>
                          <input
                            type="number"
                            value={rule.duration_minutes || ''}
                            onChange={(e) => updateRule(index, { ...rule, duration_minutes: e.target.value ? parseInt(e.target.value) : undefined })}
                            placeholder="60"
                            min="5"
                            step="5"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Youth Assignments per Leader</label>
                          <input
                            type="number"
                            value={rule.youth_assignments?.count || 0}
                            onChange={(e) => {
                              const count = parseInt(e.target.value) || 0;
                              updateRule(index, {
                                ...rule,
                                youth_assignments: count > 0 ? { count } : undefined
                              });
                            }}
                            placeholder="0"
                            min="0"
                            max="10"
                          />
                          <small style={{ display: 'block', marginTop: '4px', color: '#666' }}>
                            Number of youth to assign to each leader (0 = none)
                          </small>
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>Responsibility Mode</label>
                        <select
                          value={rule.responsibility?.mode || 'leader'}
                          onChange={(e) => {
                            const mode = e.target.value;
                            updateRule(index, {
                              ...rule,
                              responsibility: mode === 'none' ? { mode: 'none' } : { mode, rotation_pool: rule.responsibility?.rotation_pool || [] }
                            });
                          }}
                        >
                          <option value="leader">Leader Assignment</option>
                          <option value="group">Group Rotation</option>
                          <option value="none">No Assignment</option>
                        </select>
                      </div>
                      
                      {rule.responsibility?.mode === 'group' && (
                        <div className="form-group">
                          <label>Rotation Pool</label>
                          <p className="field-description">Groups rotate responsibility in the order listed. Groups are tracked across all pools for fair distribution.</p>
                          
                          {/* Current pool list */}
                          <div className="rotation-pool-list">
                            {(rule.responsibility?.rotation_pool || []).length === 0 ? (
                              <p className="empty-message">No groups in rotation pool. Add groups below.</p>
                            ) : (
                              (rule.responsibility?.rotation_pool || []).map((groupName: string, poolIndex: number) => (
                                <div key={poolIndex} className="pool-item">
                                  <span className="pool-item-order">{poolIndex + 1}.</span>
                                  <span className="pool-item-name">{groupName}</span>
                                  <div className="pool-item-actions">
                                    <button
                                      type="button"
                                      className="pool-action-button"
                                      onClick={() => {
                                        const currentPool = rule.responsibility?.rotation_pool || [];
                                        if (poolIndex > 0) {
                                          const newPool = [...currentPool];
                                          [newPool[poolIndex - 1], newPool[poolIndex]] = [newPool[poolIndex], newPool[poolIndex - 1]];
                                          updateRule(index, {
                                            ...rule,
                                            responsibility: { ...rule.responsibility, rotation_pool: newPool }
                                          });
                                        }
                                      }}
                                      disabled={poolIndex === 0}
                                      title="Move up"
                                    >
                                      ⬆️
                                    </button>
                                    <button
                                      type="button"
                                      className="pool-action-button"
                                      onClick={() => {
                                        const currentPool = rule.responsibility?.rotation_pool || [];
                                        if (poolIndex < currentPool.length - 1) {
                                          const newPool = [...currentPool];
                                          [newPool[poolIndex], newPool[poolIndex + 1]] = [newPool[poolIndex + 1], newPool[poolIndex]];
                                          updateRule(index, {
                                            ...rule,
                                            responsibility: { ...rule.responsibility, rotation_pool: newPool }
                                          });
                                        }
                                      }}
                                      disabled={poolIndex === (rule.responsibility?.rotation_pool || []).length - 1}
                                      title="Move down"
                                    >
                                      ⬇️
                                    </button>
                                    <button
                                      type="button"
                                      className="pool-action-button delete"
                                      onClick={() => {
                                        const currentPool = rule.responsibility?.rotation_pool || [];
                                        const newPool = currentPool.filter((_: string, i: number) => i !== poolIndex);
                                        updateRule(index, {
                                          ...rule,
                                          responsibility: { ...rule.responsibility, rotation_pool: newPool }
                                        });
                                      }}
                                      title="Remove from pool"
                                    >
                                      ✖️
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                          
                          {/* Add group section */}
                          <div className="add-to-pool-section">
                            <div className="add-pool-controls">
                              {/* Available groups dropdown */}
                              {(() => {
                                // Collect all unique groups from rotation pools across all rules
                                const allPoolGroups = new Set<string>();
                                rules.forEach(r => {
                                  if (r.responsibility?.mode === 'group' && r.responsibility?.rotation_pool) {
                                    r.responsibility.rotation_pool.forEach((g: string) => allPoolGroups.add(g));
                                  }
                                });
                                const currentPool = rule.responsibility?.rotation_pool || [];
                                const availableGroups = Array.from(allPoolGroups).filter(g => !currentPool.includes(g)).sort();
                                
                                return availableGroups.length > 0 && (
                                  <div className="add-pool-option">
                                    <select
                                      className="pool-select"
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          const currentPool = rule.responsibility?.rotation_pool || [];
                                          updateRule(index, {
                                            ...rule,
                                            responsibility: { ...rule.responsibility, rotation_pool: [...currentPool, e.target.value] }
                                          });
                                          e.target.value = ''; // Reset dropdown
                                        }
                                      }}
                                      defaultValue=""
                                    >
                                      <option value="" disabled>+ Add group from other pools</option>
                                      {availableGroups.map(g => (
                                        <option key={g} value={g}>{g}</option>
                                      ))}
                                    </select>
                                  </div>
                                );
                              })()}
                              
                              {/* Custom group name input */}
                              <div className="add-pool-option">
                                <input
                                  type="text"
                                  className="pool-input"
                                  placeholder="Or type custom group name"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                                      const currentPool = rule.responsibility?.rotation_pool || [];
                                      const newGroupName = e.currentTarget.value.trim();
                                      if (!currentPool.includes(newGroupName)) {
                                        updateRule(index, {
                                          ...rule,
                                          responsibility: { ...rule.responsibility, rotation_pool: [...currentPool, newGroupName] }
                                        });
                                        e.currentTarget.value = '';
                                      }
                                    }
                                  }}
                                />
                                <button
                                  type="button"
                                  className="add-pool-button"
                                  onClick={(e) => {
                                    const input = (e.currentTarget.previousElementSibling as HTMLInputElement);
                                    if (input.value.trim()) {
                                      const currentPool = rule.responsibility?.rotation_pool || [];
                                      const newGroupName = input.value.trim();
                                      if (!currentPool.includes(newGroupName)) {
                                        updateRule(index, {
                                          ...rule,
                                          responsibility: { ...rule.responsibility, rotation_pool: [...currentPool, newGroupName] }
                                        });
                                        input.value = '';
                                      }
                                    }
                                  }}
                                >
                                  ➕ Add
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* STEP 2: Schedule Settings */}
      <section className="settings-section">
        <div className="section-header">
          <h2>⚙️ Step 2: Schedule Settings</h2>
          <p className="section-description">Configure date range and timezone</p>
        </div>
        
        <div className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <div className="date-input-group">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <button
                  type="button"
                  className="today-button"
                  onClick={() => {
                    const today = new Date();
                    const todayStr = today.toISOString().split('T')[0];
                    setStartDate(todayStr);
                  }}
                  title="Set to today's date"
                >
                  📅 Today
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label>Schedule Duration</label>
              <select value={duration} onChange={(e) => setDuration(e.target.value as ScheduleDuration)}>
                <option value="1-month">1 Month</option>
                <option value="3-months">3 Months</option>
                <option value="6-months">6 Months</option>
                <option value="1-year">1 Year</option>
                <option value="2-years">2 Years</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>
                Random Seed
                <span style={{ fontSize: '0.85em', color: '#666', marginLeft: '8px' }}>
                  (affects tie-breaking in assignments)
                </span>
              </label>
              <input
                type="number"
                value={randomSeed}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value)) {
                    setRandomSeed(value);
                    localStorage.setItem('randomSeed', value.toString());
                  }
                }}
                placeholder="0"
                style={{ width: '100%' }}
              />
              <p style={{ fontSize: '0.85em', color: '#666', margin: '4px 0 0 0' }}>
                Randomizes the initial starting order for round-robin assignments. 
                Different seeds produce different assignment patterns while maintaining fair distribution. 
                Same seed always produces the same results (deterministic).
              </p>
            </div>
          </div>
          
          <button className="generate-button" onClick={handleGenerate}>
            🎯 Generate Schedule
          </button>
        </div>
      </section>
      
      {/* STEP 3: Schedule Preview (only shows after generation) */}
      {schedule && (
        <section className="preview-section">
          <div className="accordion-header">
            <button
              className={`accordion-button ${schedulePreviewOpen ? 'open' : ''}`}
              onClick={toggleSchedulePreview}
            >
              <span className="accordion-icon">{schedulePreviewOpen ? '▼' : '▶'}</span>
              <span className="accordion-title">
                📅 Step 3: Schedule Preview ({schedule.assignments.length} assignments)
              </span>
            </button>
            {schedulePreviewOpen && (
              <div className="view-toggle">
                <button 
                  className={viewMode === 'cards' ? 'active' : ''}
                  onClick={() => setViewMode('cards')}
                  title="Card View"
                >
                  🎴 Cards
                </button>
                <button 
                  className={viewMode === 'table' ? 'active' : ''}
                  onClick={() => setViewMode('table')}
                  title="Table View"
                >
                  📊 Table
                </button>
              </div>
            )}
          </div>
          
          {schedulePreviewOpen && (
            <div className="accordion-content">
              {viewMode === 'cards' ? (
                <div className="schedule-timeline">
                  {Object.entries(groupedAssignments).slice(0, 5).map(([month, assignments]) => (
                <div key={month} className="month-group">
                  <h3 className="month-header">{month}</h3>
                  <div className="assignments-grid">
                    {assignments.slice(0, 30).map((assignment, i) => (
                      <div key={i} className={`assignment-card ${assignment.kind}`}>
                        <div className="card-header">
                          <span className="card-date">
                            {formatDate(assignment.date)}
                          </span>
                          <span className={`card-badge ${assignment.kind}`}>
                            {assignment.kind === 'combined' ? '👥 Combined' : '📚 Separate'}
                          </span>
                        </div>
                        
                        <div className="card-body">
                          <h4 className="card-title">{assignment.description}</h4>
                          
                          {assignment.startTime && (
                            <div className="card-time">
                              🕐 {formatTime(assignment.startTime, assignment.durationMinutes)}
                            </div>
                          )}
                          
                          {assignment.responsibleGroup && (
                            <div className="card-group">
                              <strong>Group:</strong> {assignment.responsibleGroup}
                            </div>
                          )}
                          
                          {/* Show grouped assignments for separate events */}
                          {assignment.groupAssignments && assignment.groupAssignments.length > 0 ? (
                            <div className="card-group-assignments">
                              <strong>Assignments:</strong>
                              <ul>
                                {assignment.groupAssignments.map((ga, idx) => (
                                  <li key={idx}>
                                    <strong>{ga.group}:</strong> {ga.leaders.join(', ') || 'TBD'}
                                    {ga.youthAssignments && ga.youthAssignments.length > 0 && (
                                      <ul style={{ marginTop: '4px', fontSize: '0.9em', color: '#666' }}>
                                        {ga.youthAssignments.map((ya, yaIdx) => (
                                          <li key={yaIdx}>
                                            Assistant: {ya.youth.join(', ') || 'none'}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : assignment.leaders.length > 0 && (
                            <div className="card-leaders">
                              <strong>Leaders:</strong> {assignment.leaders.join(', ')}
                              {assignment.youthAssignments && assignment.youthAssignments.length > 0 && (
                                <ul style={{ marginTop: '8px', fontSize: '0.9em', color: '#666', listStyleType: 'none', paddingLeft: 0 }}>
                                  {assignment.youthAssignments.map((ya, yaIdx) => (
                                    <li key={yaIdx}>
                                      Assistant: {ya.youth.join(', ') || 'none'}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>In Charge</th>
                    <th>Youth Helpers</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.toRows().slice(0, 100).map((row, i) => (
                    <tr key={i}>
                      <td>{row.date}</td>
                      <td>{row.kind}</td>
                      <td>{row.inCharge}</td>
                      <td>{row.youthHelpers || '—'}</td>
                      <td>{row.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {(viewMode === 'cards' && Object.keys(groupedAssignments).length > 5) && (
            <p className="more-months-note">
              📌 Showing first 5 months in card view. Switch to table view or export to see the complete schedule.
            </p>
          )}
            </div>
          )}
        </section>
      )}
      
      {/* STEP 4: Export (only shows after generation) */}
      {schedule && (
        <section className="export-section">
          <div className="section-header">
            <h2>💾 Step 4: Export Results</h2>
            <p className="section-description">Save your schedule in your preferred format</p>
          </div>
          
          <div className="export-buttons">
            <button className="export-button" onClick={() => handleExport('md')}>
              📄 Export Markdown
            </button>
            <button className="export-button" onClick={() => handleExport('csv')}>
              📊 Export CSV
            </button>
            <button className="export-button" onClick={() => handleExport('ics')}>
              📅 Export Calendar (.ics)
            </button>
            <button className="export-button" onClick={() => handleExport('txt')}>
              Export Text Message
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
