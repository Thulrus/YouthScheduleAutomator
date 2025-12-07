/**
 * Leaders View - manage leaders configuration
 */

import { useState } from 'react';
import { Leader } from '../models';
import { Button } from './common';

interface LeadersViewProps {
  leaders: Leader[];
  onUpdateLeaders: (leaders: Leader[]) => void;
  assignmentCounts?: Record<string, number>;
}

const WEEKDAY_OPTIONS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function LeadersView({ leaders, onUpdateLeaders, assignmentCounts = {} }: LeadersViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Leader | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Keep raw string for groups input to allow typing commas
  const [groupsInputValue, setGroupsInputValue] = useState('');

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...leaders[index] });
    setGroupsInputValue(leaders[index].groups.join(', '));
    setShowAddForm(false);
  };

  const handleSave = () => {
    if (editForm && editingIndex !== null) {
      // Parse groups from input value before saving
      const groups = groupsInputValue.split(',').map(g => g.trim()).filter(g => g);
      const newLeaders = [...leaders];
      newLeaders[editingIndex] = { ...editForm, groups };
      onUpdateLeaders(newLeaders);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingIndex(null);
    setGroupsInputValue('');
    setEditForm({
      name: '',
      groups: [],
      availability: WEEKDAY_OPTIONS.slice(), // All days by default
      weight: 1,
    });
  };

  const handleSaveNew = () => {
    if (editForm && editForm.name.trim()) {
      // Parse groups from input value before saving
      const groups = groupsInputValue.split(',').map(g => g.trim()).filter(g => g);
      onUpdateLeaders([...leaders, { ...editForm, name: editForm.name.trim(), groups }]);
      setShowAddForm(false);
      setEditForm(null);
    }
  };

  const handleDelete = (index: number) => {
    if (confirm(`Delete leader "${leaders[index].name}"?`)) {
      const newLeaders = leaders.filter((_, i) => i !== index);
      onUpdateLeaders(newLeaders);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setShowAddForm(false);
    setEditForm(null);
  };

  const toggleAvailability = (day: string) => {
    if (!editForm) return;
    const newAvail = editForm.availability.includes(day)
      ? editForm.availability.filter(d => d !== day)
      : [...editForm.availability, day];
    setEditForm({ ...editForm, availability: newAvail });
  };

  const handleGroupsChange = (value: string) => {
    if (!editForm) return;
    // Store raw value to allow typing commas
    setGroupsInputValue(value);
  };

  const parseAndSaveGroups = () => {
    if (!editForm) return;
    const groups = groupsInputValue.split(',').map(g => g.trim()).filter(g => g);
    setEditForm({ ...editForm, groups });
  };

  return (
    <div className="leaders-view">
      <div className="view-header">
        <h2>Leaders</h2>
        <Button variant="primary" onClick={handleAdd}>
          + Add Leader
        </Button>
      </div>

      <div className="leaders-list">
        {leaders.length === 0 && !showAddForm && (
          <div className="empty-state">
            <p>No leaders configured. Add leaders to start building your schedule.</p>
          </div>
        )}

        {leaders.map((leader, index) => (
          <div key={index} className={`leader-card ${editingIndex === index ? 'editing' : ''}`}>
            {editingIndex === index ? (
              <div className="leader-edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editForm?.name || ''}
                      onChange={e => setEditForm(editForm ? { ...editForm, name: e.target.value } : null)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Weight</label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editForm?.weight || 1}
                      onChange={e => setEditForm(editForm ? { ...editForm, weight: parseFloat(e.target.value) || 1 } : null)}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Groups (comma-separated)</label>
                  <input
                    type="text"
                    value={groupsInputValue}
                    onChange={e => handleGroupsChange(e.target.value)}
                    onBlur={parseAndSaveGroups}
                    placeholder="e.g., deacons, teachers"
                  />
                </div>
                <div className="form-group">
                  <label>Availability</label>
                  <div className="weekday-toggles">
                    {WEEKDAY_OPTIONS.map(day => (
                      <button
                        key={day}
                        type="button"
                        className={`weekday-toggle ${editForm?.availability.includes(day) ? 'active' : ''}`}
                        onClick={() => toggleAvailability(day)}
                      >
                        {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-actions">
                  <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave}>Save</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="leader-info">
                  <div className="leader-name">{leader.name}</div>
                  <div className="leader-groups">
                    {leader.groups.length > 0 
                      ? leader.groups.map(g => <span key={g} className="group-tag">{g}</span>)
                      : <span className="no-groups">No groups</span>
                    }
                  </div>
                  <div className="leader-availability">
                    {WEEKDAY_OPTIONS.map(day => (
                      <span
                        key={day}
                        className={`day-indicator ${leader.availability.includes(day) ? 'available' : 'unavailable'}`}
                        title={leader.availability.includes(day) ? `Available ${day}` : `Unavailable ${day}`}
                      >
                        {day.charAt(0).toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="leader-stats">
                  {assignmentCounts[leader.name] !== undefined && (
                    <span className="assignment-count">
                      {assignmentCounts[leader.name]} assignments
                    </span>
                  )}
                  <span className="weight-badge">Weight: {leader.weight}</span>
                </div>
                <div className="leader-actions">
                  <Button variant="ghost" size="small" onClick={() => handleEdit(index)}>Edit</Button>
                  <Button variant="ghost" size="small" onClick={() => handleDelete(index)}>Delete</Button>
                </div>
              </>
            )}
          </div>
        ))}

        {showAddForm && editForm && (
          <div className="leader-card editing new">
            <div className="leader-edit-form">
              <h3>New Leader</h3>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>Weight</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={editForm.weight}
                    onChange={e => setEditForm({ ...editForm, weight: parseFloat(e.target.value) || 1 })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Groups (comma-separated)</label>
                <input
                  type="text"
                  value={groupsInputValue}
                  onChange={e => handleGroupsChange(e.target.value)}
                  onBlur={parseAndSaveGroups}
                  placeholder="e.g., deacons, teachers"
                />
              </div>
              <div className="form-group">
                <label>Availability</label>
                <div className="weekday-toggles">
                  {WEEKDAY_OPTIONS.map(day => (
                    <button
                      key={day}
                      type="button"
                      className={`weekday-toggle ${editForm.availability.includes(day) ? 'active' : ''}`}
                      onClick={() => toggleAvailability(day)}
                    >
                      {day.charAt(0).toUpperCase() + day.slice(1, 3)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-actions">
                <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveNew} disabled={!editForm.name.trim()}>
                  Add Leader
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
