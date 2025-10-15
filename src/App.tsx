import { useState } from 'react';
import { parseRules } from './rules';
import { buildSchedule } from './scheduler';
import { Schedule, Leader, Group } from './models';
import { StrategyName } from './strategies';
import { exportMarkdown, exportCSV, exportICS } from './exporters';
import './App.css';

type ConfigTab = 'leaders' | 'groups' | 'rules';
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
  const [strategy, setStrategy] = useState<StrategyName>('round-robin');
  const [leadersPerCombined, setLeadersPerCombined] = useState(2);
  
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
  const [activeConfigTab, setActiveConfigTab] = useState<ConfigTab>('leaders');
  
  // Schedule state
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

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
        strategy,
        leadersPerCombined
      );
      
      setSchedule(newSchedule);
      setStatusType('success');
      setStatusMessage(`✅ Generated ${newSchedule.assignments.length} assignments`);
      
      localStorage.setItem('leaders', JSON.stringify(leaders));
      localStorage.setItem('groups', JSON.stringify(groups));
      localStorage.setItem('rules', JSON.stringify(rules));
      
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setSchedule(null);
    }
  };

  const handleExport = (format: 'md' | 'csv' | 'ics') => {
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
      
      {/* Status Bar - Always Visible */}
      {statusMessage && (
        <div className={`status-message status-${statusType}`}>
          {statusMessage}
        </div>
      )}
      
      {/* STEP 1: Configuration */}
      <section className="config-section">
        <div className="section-header">
          <h2>📝 Step 1: Configure People & Events</h2>
          <p className="section-description">Set up your leaders, groups, and recurring event rules</p>
        </div>
        
        <div className="tab-container">
          <div className="tab-buttons">
            <button
              className={`tab-button ${activeConfigTab === 'leaders' ? 'active' : ''}`}
              onClick={() => setActiveConfigTab('leaders')}
            >
              👥 Leaders ({leaders.length})
            </button>
            <button
              className={`tab-button ${activeConfigTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveConfigTab('groups')}
            >
              👨‍👩‍👧‍👦 Groups ({groups.length})
            </button>
            <button
              className={`tab-button ${activeConfigTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveConfigTab('rules')}
            >
              📅 Rules ({rules.length})
            </button>
          </div>
          
          {/* Toolbar - Context-Aware Buttons */}
          <div className="tab-toolbar">
            {activeConfigTab === 'leaders' && (
              <>
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
              </>
            )}
            {activeConfigTab === 'groups' && (
              <>
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
              </>
            )}
            {activeConfigTab === 'rules' && (
              <>
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
              </>
            )}
          </div>
          
          {/* Tab Content - Configuration Cards */}
          <div className="tab-content">
            {activeConfigTab === 'leaders' && (
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
                      
                      <div className="form-group">
                        <label>Weight (for weighted strategy)</label>
                        <input
                          type="number"
                          value={leader.weight}
                          onChange={(e) => updateLeader(index, { ...leader, weight: parseInt(e.target.value) || 1 })}
                          min="1"
                          max="10"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {activeConfigTab === 'groups' && (
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
            )}
            
            {activeConfigTab === 'rules' && (
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
                          <label>Rotation Pool (groups that rotate)</label>
                          <div className="checkbox-group">
                            {allGroupNames.map(groupName => (
                              <label key={groupName} className="checkbox-label">
                                <input
                                  type="checkbox"
                                  checked={rule.responsibility?.rotation_pool?.includes(groupName) || false}
                                  onChange={(e) => {
                                    const currentPool = rule.responsibility?.rotation_pool || [];
                                    const newPool = e.target.checked
                                      ? [...currentPool, groupName]
                                      : currentPool.filter((g: string) => g !== groupName);
                                    updateRule(index, {
                                      ...rule,
                                      responsibility: { ...rule.responsibility, rotation_pool: newPool }
                                    });
                                  }}
                                />
                                {groupName}
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      
      {/* STEP 2: Schedule Settings */}
      <section className="settings-section">
        <div className="section-header">
          <h2>⚙️ Step 2: Schedule Settings</h2>
          <p className="section-description">Configure date range and assignment strategy</p>
        </div>
        
        <div className="settings-form">
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
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
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Assignment Strategy</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as StrategyName)}>
                <option value="round-robin">Round Robin</option>
                <option value="random">Random</option>
                <option value="weighted">Weighted</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Leaders per Combined Event</label>
              <input
                type="number"
                value={leadersPerCombined}
                onChange={(e) => setLeadersPerCombined(parseInt(e.target.value))}
                min="1"
                max="5"
              />
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
          <div className="section-header">
            <div>
              <h2>📅 Step 3: Schedule Preview</h2>
              <p className="preview-summary">
                {schedule.assignments.length} total assignments
                {schedule.assignments.length > 150 && ' (showing first 150)'}
              </p>
            </div>
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
          </div>
          
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
                          
                          {assignment.leaders.length > 0 && (
                            <div className="card-leaders">
                              <strong>Leaders:</strong> {assignment.leaders.join(', ')}
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
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.toRows().slice(0, 100).map((row, i) => (
                    <tr key={i}>
                      <td>{row.date}</td>
                      <td>{row.kind}</td>
                      <td>{row.inCharge}</td>
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
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
