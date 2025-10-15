import { useState } from 'react';
import * as yaml from 'js-yaml';
import { parseRules } from './rules';
import { buildSchedule } from './scheduler';
import { Schedule } from './models';
import { StrategyName } from './strategies';
import { exportMarkdown, exportCSV, exportICS } from './exporters';
import './App.css';

// Default configurations
const DEFAULT_LEADERS = `- name: "John Smith"
  groups: ["deacons"]
  availability: []
  weight: 1

- name: "Jane Doe"
  groups: ["teachers", "deacons"]
  availability: []
  weight: 1

- name: "Bob Johnson"
  groups: ["priests", "teachers"]
  availability: ["wed", "sun"]
  weight: 2
`;

const DEFAULT_GROUPS = `- name: "deacons"
  members: []

- name: "teachers"
  members: []

- name: "priests"
  members: []
`;

const DEFAULT_RULES = `- name: "First Sunday - Combined Sacrament Meeting"
  frequency: monthly
  weekday: 6
  nth: 1
  kind: combined
  description: "Pass Sacrament"
  start_time: "09:00"
  duration_minutes: 60

- name: "Second Wednesday - Activity Night"
  frequency: monthly
  weekday: 2
  nth: 2
  kind: combined
  responsibility:
    mode: group
    rotation_pool: [priests, teachers, deacons]
  description: "Combined Activity Night"
  start_time: "19:00"
  duration_minutes: 90

- name: "Weekly Sunday Classes"
  frequency: weekly
  weekday: 6
  kind: separate
  description: "Sunday School Classes"
  start_time: "10:15"
  duration_minutes: 45
`;

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

function App() {
  const currentYear = new Date().getFullYear();
  
  // Form state
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [duration, setDuration] = useState<ScheduleDuration>('1-year');
  const [timezone, setTimezone] = useState('America/Denver');
  const [strategy, setStrategy] = useState<StrategyName>('round-robin');
  const [leadersPerCombined, setLeadersPerCombined] = useState(2);
  
  // Config state
  const [leadersYaml, setLeadersYaml] = useState(
    localStorage.getItem('leaders') || DEFAULT_LEADERS
  );
  const [groupsYaml, setGroupsYaml] = useState(
    localStorage.getItem('groups') || DEFAULT_GROUPS
  );
  const [rulesYaml, setRulesYaml] = useState(
    localStorage.getItem('rules') || DEFAULT_RULES
  );
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
      // Parse YAML configs
      const leaders = yaml.load(leadersYaml) as any[];
      const groups = yaml.load(groupsYaml) as any[];
      const rulesRaw = yaml.load(rulesYaml) as any[];
      
      // Parse dates
      const start = new Date(startDate);
      const end = calculateEndDate(start, duration);
      
      if (start > end) {
        setStatusType('error');
        setStatusMessage('Start date must be before or equal to end date');
        return;
      }
      
      // Parse rules
      const rules = parseRules(rulesRaw);
      
      // Build schedule
      const newSchedule = buildSchedule(
        leaders,
        groups,
        rules,
        start,
        end,
        strategy,
        leadersPerCombined
      );
      
      setSchedule(newSchedule);
      setStatusType('success');
      setStatusMessage(`Generated ${newSchedule.assignments.length} assignments`);
      
      // Save configs to localStorage
      localStorage.setItem('leaders', leadersYaml);
      localStorage.setItem('groups', groupsYaml);
      localStorage.setItem('rules', rulesYaml);
      
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      setStatusMessage(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportPeopleJSON = () => {
    try {
      const leaders = yaml.load(leadersYaml) as any[];
      const groups = yaml.load(groupsYaml) as any[];
      
      const peopleConfig = {
        version: '1.0.0',
        leaders,
        groups,
      };
      
      const blob = new Blob([JSON.stringify(peopleConfig, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'people-config.json';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setStatusType('success');
      setStatusMessage('Exported people configuration as JSON');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportRulesJSON = () => {
    try {
      const rules = yaml.load(rulesYaml) as any[];
      
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
      setStatusMessage('Exported rules configuration as JSON');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`Export error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleImportPeopleJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        if (config.leaders) {
          const leadersYamlStr = yaml.dump(config.leaders);
          setLeadersYaml(leadersYamlStr);
          localStorage.setItem('leaders', leadersYamlStr);
        }
        
        if (config.groups) {
          const groupsYamlStr = yaml.dump(config.groups);
          setGroupsYaml(groupsYamlStr);
          localStorage.setItem('groups', groupsYamlStr);
        }
        
        setStatusType('success');
        setStatusMessage('Imported people configuration from JSON');
      } catch (error) {
        setStatusType('error');
        setStatusMessage(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleImportRulesJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const config = JSON.parse(content);
        
        if (config.rules) {
          const rulesYamlStr = yaml.dump(config.rules);
          setRulesYaml(rulesYamlStr);
          localStorage.setItem('rules', rulesYamlStr);
        }
        
        setStatusType('success');
        setStatusMessage('Imported rules configuration from JSON');
      } catch (error) {
        setStatusType('error');
        setStatusMessage(`Import error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
  };

  const handleLoadExamplePeople = async () => {
    try {
      const response = await fetch('/YouthScheduleAutomator/example-people.json');
      const config = await response.json();
      
      if (config.leaders) {
        const leadersYamlStr = yaml.dump(config.leaders);
        setLeadersYaml(leadersYamlStr);
        localStorage.setItem('leaders', leadersYamlStr);
      }
      
      if (config.groups) {
        const groupsYamlStr = yaml.dump(config.groups);
        setGroupsYaml(groupsYamlStr);
        localStorage.setItem('groups', groupsYamlStr);
      }
      
      setStatusType('success');
      setStatusMessage('Loaded example people configuration');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`Load error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleLoadExampleRules = async () => {
    try {
      const response = await fetch('/YouthScheduleAutomator/example-rules.json');
      const config = await response.json();
      
      if (config.rules) {
        const rulesYamlStr = yaml.dump(config.rules);
        setRulesYaml(rulesYamlStr);
        localStorage.setItem('rules', rulesYamlStr);
      }
      
      setStatusType('success');
      setStatusMessage('Loaded example rules configuration');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(`Load error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

  return (
    <div className="app-container">
      <h1>📅 Youth Scheduler</h1>
      
      <div className="controls-section">
        <h2>Schedule Settings</h2>
        
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
        
        <div className="button-group">
          <button className="button-primary" onClick={handleGenerate}>
            Generate Schedule
          </button>
          {schedule && (
            <>
              <button className="button-secondary" onClick={() => handleExport('md')}>
                Export Markdown
              </button>
              <button className="button-secondary" onClick={() => handleExport('csv')}>
                Export CSV
              </button>
              <button className="button-secondary" onClick={() => handleExport('ics')}>
                Export Calendar
              </button>
            </>
          )}
        </div>
        
        {statusMessage && (
          <div className={`status-message status-${statusType}`}>
            {statusMessage}
          </div>
        )}
      </div>
      
      <div className="config-section">
        <h2>Configuration</h2>
        
        <div className="config-actions">
          <div className="config-actions-group">
            <h3>📋 People & Groups</h3>
            <div className="button-group">
              <label className="button-file-upload">
                📁 Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportPeopleJSON}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={handleExportPeopleJSON}>
                💾 Export JSON
              </button>
              <button onClick={handleLoadExamplePeople}>
                ⭐ Load Example
              </button>
            </div>
          </div>
          
          <div className="config-actions-group">
            <h3>📅 Rules</h3>
            <div className="button-group">
              <label className="button-file-upload">
                📁 Import JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportRulesJSON}
                  style={{ display: 'none' }}
                />
              </label>
              <button onClick={handleExportRulesJSON}>
                💾 Export JSON
              </button>
              <button onClick={handleLoadExampleRules}>
                ⭐ Load Example
              </button>
            </div>
          </div>
        </div>
        
        <div className="tab-container">
          <div className="tab-buttons">
            <button
              className={`tab-button ${activeConfigTab === 'leaders' ? 'active' : ''}`}
              onClick={() => setActiveConfigTab('leaders')}
            >
              Leaders
            </button>
            <button
              className={`tab-button ${activeConfigTab === 'groups' ? 'active' : ''}`}
              onClick={() => setActiveConfigTab('groups')}
            >
              Groups
            </button>
            <button
              className={`tab-button ${activeConfigTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveConfigTab('rules')}
            >
              Rules
            </button>
          </div>
          
          {activeConfigTab === 'leaders' && (
            <textarea
              value={leadersYaml}
              onChange={(e) => setLeadersYaml(e.target.value)}
              placeholder="Enter leaders configuration in YAML format"
            />
          )}
          
          {activeConfigTab === 'groups' && (
            <textarea
              value={groupsYaml}
              onChange={(e) => setGroupsYaml(e.target.value)}
              placeholder="Enter groups configuration in YAML format"
            />
          )}
          
          {activeConfigTab === 'rules' && (
            <textarea
              value={rulesYaml}
              onChange={(e) => setRulesYaml(e.target.value)}
              placeholder="Enter rules configuration in YAML format"
            />
          )}
        </div>
      </div>
      
      
      {schedule && (
        <div className="preview-section">
          <div className="preview-header">
            <div>
              <h2>📅 Schedule Preview</h2>
              <p className="preview-subtitle">
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
        </div>
      )}
    </div>
  );
}

export default App;
