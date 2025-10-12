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

function App() {
  const currentYear = new Date().getFullYear();
  
  // Form state
  const [startDate, setStartDate] = useState(`${currentYear}-01-01`);
  const [endDate, setEndDate] = useState(`${currentYear}-12-31`);
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

  const handleGenerate = () => {
    try {
      // Parse YAML configs
      const leaders = yaml.load(leadersYaml) as any[];
      const groups = yaml.load(groupsYaml) as any[];
      const rulesRaw = yaml.load(rulesYaml) as any[];
      
      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
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

  const rows = schedule?.toRows().slice(0, 50) || [];

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
            <label>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>Timezone</label>
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="America/Denver"
            />
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
          <h2>Schedule Preview (First 50 rows)</h2>
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
                {rows.map((row, i) => (
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
        </div>
      )}
    </div>
  );
}

export default App;
