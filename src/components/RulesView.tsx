/**
 * Rules View - manage event rules configuration
 */

import { useState } from 'react';
import { RawRule } from '../models';
import { Button } from './common';

interface RulesViewProps {
  rules: RawRule[];
  groupNames: string[];
  onUpdateRules: (rules: RawRule[]) => void;
}

const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'Monday' },
  { value: 1, label: 'Tuesday' },
  { value: 2, label: 'Wednesday' },
  { value: 3, label: 'Thursday' },
  { value: 4, label: 'Friday' },
  { value: 5, label: 'Saturday' },
  { value: 6, label: 'Sunday' },
];

const NTH_OPTIONS = [
  { value: 1, label: '1st' },
  { value: 2, label: '2nd' },
  { value: 3, label: '3rd' },
  { value: 4, label: '4th' },
  { value: -1, label: 'Last' },
];

export function RulesView({ rules, groupNames, onUpdateRules }: RulesViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<RawRule | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Keep raw string for custom rotation pool input to allow typing commas
  const [customPoolInput, setCustomPoolInput] = useState('');

  const createDefaultRule = (): RawRule => ({
    name: '',
    frequency: 'weekly',
    weekday: 6, // Sunday
    kind: 'combined',
    description: '',
  });

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...rules[index] });
    // Extract any custom groups (not in groupNames) for the custom input
    const rulePool = rules[index].responsibility?.rotation_pool || [];
    const customGroups = rulePool.filter(g => !groupNames.includes(g));
    setCustomPoolInput(customGroups.join(', '));
    setShowAddForm(false);
  };

  const handleSave = () => {
    if (editForm && editingIndex !== null) {
      const newRules = [...rules];
      newRules[editingIndex] = editForm;
      onUpdateRules(newRules);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingIndex(null);
    setCustomPoolInput('');
    setEditForm(createDefaultRule());
  };

  const handleSaveNew = () => {
    if (editForm && editForm.name.trim()) {
      onUpdateRules([...rules, { ...editForm, name: editForm.name.trim() }]);
      setShowAddForm(false);
      setEditForm(null);
    }
  };

  const handleDelete = (index: number) => {
    if (confirm(`Delete rule "${rules[index].name}"?`)) {
      const newRules = rules.filter((_, i) => i !== index);
      onUpdateRules(newRules);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setShowAddForm(false);
    setEditForm(null);
  };

  const renderRuleForm = (rule: RawRule, isNew: boolean) => (
    <div className="rule-edit-form">
      {isNew && <h3>New Rule</h3>}
      
      <div className="form-row">
        <div className="form-group">
          <label>Name</label>
          <input
            type="text"
            value={rule.name}
            onChange={e => setEditForm({ ...rule, name: e.target.value })}
            autoFocus={isNew}
          />
        </div>
        <div className="form-group">
          <label>Type</label>
          <select
            value={rule.kind || 'combined'}
            onChange={e => setEditForm({ ...rule, kind: e.target.value as 'combined' | 'separate' })}
          >
            <option value="combined">Combined</option>
            <option value="separate">Separate</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Description</label>
        <input
          type="text"
          value={rule.description || ''}
          onChange={e => setEditForm({ ...rule, description: e.target.value })}
          placeholder="Displayed name for this event"
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Frequency</label>
          <select
            value={rule.frequency}
            onChange={e => setEditForm({ ...rule, frequency: e.target.value as 'weekly' | 'monthly' | 'yearly' })}
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {rule.frequency === 'weekly' && (
          <div className="form-group">
            <label>Weekday</label>
            <select
              value={rule.weekday ?? 6}
              onChange={e => setEditForm({ ...rule, weekday: parseInt(e.target.value) })}
            >
              {WEEKDAY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {rule.frequency === 'monthly' && (
          <>
            <div className="form-group">
              <label>Which</label>
              <select
                value={rule.nth ?? 1}
                onChange={e => setEditForm({ ...rule, nth: parseInt(e.target.value) })}
              >
                {NTH_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Weekday</label>
              <select
                value={rule.weekday ?? 6}
                onChange={e => setEditForm({ ...rule, weekday: parseInt(e.target.value) })}
              >
                {WEEKDAY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {rule.frequency === 'yearly' && (
          <>
            <div className="form-group">
              <label>Month</label>
              <select
                value={rule.month ?? 1}
                onChange={e => setEditForm({ ...rule, month: parseInt(e.target.value) })}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1, 1).toLocaleString('en', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Day</label>
              <input
                type="number"
                min="1"
                max="31"
                value={rule.month_day ?? 1}
                onChange={e => setEditForm({ ...rule, month_day: parseInt(e.target.value) })}
              />
            </div>
          </>
        )}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Start Time (optional)</label>
          <input
            type="time"
            value={rule.start_time || ''}
            onChange={e => setEditForm({ ...rule, start_time: e.target.value || undefined })}
          />
        </div>
        <div className="form-group">
          <label>Duration (minutes)</label>
          <input
            type="number"
            min="0"
            value={rule.duration_minutes || ''}
            onChange={e => setEditForm({ ...rule, duration_minutes: parseInt(e.target.value) || undefined })}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Responsibility Mode</label>
          <select
            value={rule.responsibility?.mode || 'leader'}
            onChange={e => {
              const mode = e.target.value as 'none' | 'group' | 'leader';
              if (mode === 'none') {
                setEditForm({ ...rule, responsibility: { mode } });
              } else if (mode === 'leader') {
                // Default - no responsibility object needed
                const { responsibility: _, ...rest } = rule;
                setEditForm(rest);
              } else {
                setEditForm({ 
                  ...rule, 
                  responsibility: { 
                    mode, 
                    rotation_pool: rule.responsibility?.rotation_pool || [] 
                  } 
                });
              }
            }}
          >
            <option value="leader">Leader (default)</option>
            <option value="group">Rotating Group</option>
            <option value="none">None (e.g., Bishopric)</option>
          </select>
          <small className="form-hint">
            Who is responsible for planning this event
          </small>
        </div>
        <div className="form-group">
          <label>Youth Assignments per Leader</label>
          <input
            type="number"
            value={rule.youth_assignments?.count || 0}
            onChange={e => {
              const count = parseInt(e.target.value) || 0;
              setEditForm({
                ...rule,
                youth_assignments: count > 0 ? { count } : undefined
              });
            }}
            placeholder="0"
            min="0"
            max="10"
          />
          <small className="form-hint">
            Number of youth to assign to each leader (0 = none)
          </small>
        </div>
      </div>

      {rule.responsibility?.mode === 'group' && (
        <div className="form-group">
          <label>Rotation Pool (groups that rotate responsibility)</label>
          
          {/* Checkboxes for defined groups */}
          {groupNames.length > 0 && (
            <div className="group-checkboxes">
              {groupNames.map(groupName => {
                const isSelected = rule.responsibility?.rotation_pool?.includes(groupName) || false;
                return (
                  <label key={groupName} className="group-checkbox">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        const currentPool = rule.responsibility?.rotation_pool || [];
                        let newPool: string[];
                        if (e.target.checked) {
                          newPool = [...currentPool, groupName];
                        } else {
                          newPool = currentPool.filter(g => g !== groupName);
                        }
                        setEditForm({
                          ...rule,
                          responsibility: {
                            ...rule.responsibility!,
                            rotation_pool: newPool.length > 0 ? newPool : undefined
                          }
                        });
                      }}
                    />
                    <span>{groupName}</span>
                  </label>
                );
              })}
            </div>
          )}
          
          {/* Text input for custom groups */}
          <div className="custom-groups-input">
            <label className="sub-label">Custom Groups (comma-separated)</label>
            <input
              type="text"
              value={customPoolInput}
              onChange={e => setCustomPoolInput(e.target.value)}
              onBlur={() => {
                // Parse custom groups and merge with selected defined groups
                const customGroups = customPoolInput.split(',').map(s => s.trim()).filter(Boolean);
                const currentPool = rule.responsibility?.rotation_pool || [];
                // Keep defined groups that are selected, add custom ones
                const definedSelected = currentPool.filter(g => groupNames.includes(g));
                const newPool = [...definedSelected, ...customGroups];
                // Remove duplicates
                const uniquePool = [...new Set(newPool)];
                setEditForm({
                  ...rule,
                  responsibility: {
                    ...rule.responsibility!,
                    rotation_pool: uniquePool.length > 0 ? uniquePool : undefined
                  }
                });
              }}
              placeholder="Add custom groups not in the list above"
            />
          </div>
          
          <small className="form-hint">
            Select from defined groups above, or add custom group names below
          </small>
        </div>
      )}

      <div className="form-actions">
        <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
        <Button 
          variant="primary" 
          onClick={isNew ? handleSaveNew : handleSave}
          disabled={!rule.name.trim()}
        >
          {isNew ? 'Add Rule' : 'Save'}
        </Button>
      </div>
    </div>
  );

  const formatRuleSchedule = (rule: RawRule): string => {
    if (rule.frequency === 'weekly') {
      return `Every ${WEEKDAY_OPTIONS.find(w => w.value === rule.weekday)?.label || 'Sunday'}`;
    }
    if (rule.frequency === 'monthly') {
      const nth = NTH_OPTIONS.find(n => n.value === rule.nth)?.label || '1st';
      const day = WEEKDAY_OPTIONS.find(w => w.value === rule.weekday)?.label || 'Sunday';
      return `${nth} ${day} of each month`;
    }
    if (rule.frequency === 'yearly') {
      const month = new Date(2000, (rule.month || 1) - 1, 1).toLocaleString('en', { month: 'long' });
      return `${month} ${rule.month_day || 1} each year`;
    }
    return rule.frequency;
  };

  return (
    <div className="rules-view">
      <div className="view-header">
        <h2>Event Rules</h2>
        <Button variant="primary" onClick={handleAdd}>
          + Add Rule
        </Button>
      </div>

      <div className="rules-list">
        {rules.length === 0 && !showAddForm && (
          <div className="empty-state">
            <p>No event rules configured. Add rules to define recurring events.</p>
          </div>
        )}

        {rules.map((rule, index) => (
          <div key={index} className={`rule-card ${editingIndex === index ? 'editing' : ''}`}>
            {editingIndex === index && editForm ? (
              renderRuleForm(editForm, false)
            ) : (
              <>
                <div className="rule-info">
                  <div className="rule-name">{rule.name}</div>
                  <div className="rule-description">{rule.description || rule.name}</div>
                  <div className="rule-schedule">{formatRuleSchedule(rule)}</div>
                  <div className="rule-meta">
                    <span className={`type-badge ${rule.kind || 'combined'}`}>
                      {rule.kind === 'separate' ? 'Separate' : 'Combined'}
                    </span>
                    {rule.start_time && <span className="time-badge">{rule.start_time}</span>}
                    {rule.duration_minutes && <span className="duration-badge">{rule.duration_minutes}min</span>}
                    {rule.responsibility?.mode === 'group' && (
                      <span className="responsibility-badge">Rotating: {rule.responsibility.rotation_pool?.join(', ') || 'groups'}</span>
                    )}
                    {rule.responsibility?.mode === 'none' && (
                      <span className="responsibility-badge">No leader assigned</span>
                    )}
                    {rule.youth_assignments?.count && rule.youth_assignments.count > 0 && (
                      <span className="youth-badge">{rule.youth_assignments.count} youth/leader</span>
                    )}
                  </div>
                </div>
                <div className="rule-actions">
                  <Button variant="ghost" size="small" onClick={() => handleEdit(index)}>Edit</Button>
                  <Button variant="ghost" size="small" onClick={() => handleDelete(index)}>Delete</Button>
                </div>
              </>
            )}
          </div>
        ))}

        {showAddForm && editForm && (
          <div className="rule-card editing new">
            {renderRuleForm(editForm, true)}
          </div>
        )}
      </div>
    </div>
  );
}
