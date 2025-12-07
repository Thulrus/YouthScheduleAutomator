/**
 * Groups View - manage groups configuration
 */

import { useState } from 'react';
import { Group } from '../models';
import { Button } from './common';

interface GroupsViewProps {
  groups: Group[];
  onUpdateGroups: (groups: Group[]) => void;
}

export function GroupsView({ groups, onUpdateGroups }: GroupsViewProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Group | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  // Keep raw string for members input to allow typing commas
  const [membersInputValue, setMembersInputValue] = useState('');

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...groups[index], members: [...groups[index].members] });
    setMembersInputValue(groups[index].members.join(', '));
    setShowAddForm(false);
  };

  const handleSave = () => {
    if (editForm && editingIndex !== null) {
      // Parse members from input value before saving
      const members = membersInputValue.split(',').map(m => m.trim()).filter(m => m);
      const newGroups = [...groups];
      newGroups[editingIndex] = { ...editForm, members };
      onUpdateGroups(newGroups);
      setEditingIndex(null);
      setEditForm(null);
    }
  };

  const handleAdd = () => {
    setShowAddForm(true);
    setEditingIndex(null);
    setMembersInputValue('');
    setEditForm({
      name: '',
      members: [],
    });
  };

  const handleSaveNew = () => {
    if (editForm && editForm.name.trim()) {
      // Parse members from input value before saving
      const members = membersInputValue.split(',').map(m => m.trim()).filter(m => m);
      onUpdateGroups([...groups, { ...editForm, name: editForm.name.trim(), members }]);
      setShowAddForm(false);
      setEditForm(null);
    }
  };

  const handleDelete = (index: number) => {
    if (confirm(`Delete group "${groups[index].name}"?`)) {
      const newGroups = groups.filter((_, i) => i !== index);
      onUpdateGroups(newGroups);
    }
  };

  const handleCancel = () => {
    setEditingIndex(null);
    setShowAddForm(false);
    setEditForm(null);
  };

  const handleMembersChange = (value: string) => {
    if (!editForm) return;
    // Store raw value to allow typing commas
    setMembersInputValue(value);
  };

  const parseAndSaveMembers = () => {
    if (!editForm) return;
    const members = membersInputValue.split(',').map(m => m.trim()).filter(m => m);
    setEditForm({ ...editForm, members });
  };

  return (
    <div className="groups-view">
      <div className="view-header">
        <h2>Groups</h2>
        <Button variant="primary" onClick={handleAdd}>
          + Add Group
        </Button>
      </div>

      <div className="groups-list">
        {groups.length === 0 && !showAddForm && (
          <div className="empty-state">
            <p>No groups configured. Add groups to organize your members.</p>
          </div>
        )}

        {groups.map((group, index) => (
          <div key={index} className={`group-card ${editingIndex === index ? 'editing' : ''}`}>
            {editingIndex === index ? (
              <div className="group-edit-form">
                <div className="form-group">
                  <label>Group Name</label>
                  <input
                    type="text"
                    value={editForm?.name || ''}
                    onChange={e => setEditForm(editForm ? { ...editForm, name: e.target.value } : null)}
                  />
                </div>
                <div className="form-group">
                  <label>Members (comma-separated)</label>
                  <textarea
                    value={membersInputValue}
                    onChange={e => handleMembersChange(e.target.value)}
                    onBlur={parseAndSaveMembers}
                    placeholder="e.g., John Smith, Jane Doe, Bob Wilson"
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                  <Button variant="primary" onClick={handleSave}>Save</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="group-info">
                  <div className="group-name">{group.name}</div>
                  <div className="group-members">
                    {group.members.length > 0 
                      ? group.members.map((m, i) => <span key={i} className="member-tag">{m}</span>)
                      : <span className="no-members">No members</span>
                    }
                  </div>
                </div>
                <div className="group-stats">
                  <span className="member-count">{group.members.length} members</span>
                </div>
                <div className="group-actions">
                  <Button variant="ghost" size="small" onClick={() => handleEdit(index)}>Edit</Button>
                  <Button variant="ghost" size="small" onClick={() => handleDelete(index)}>Delete</Button>
                </div>
              </>
            )}
          </div>
        ))}

        {showAddForm && editForm && (
          <div className="group-card editing new">
            <div className="group-edit-form">
              <h3>New Group</h3>
              <div className="form-group">
                <label>Group Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Members (comma-separated)</label>
                <textarea
                  value={membersInputValue}
                  onChange={e => handleMembersChange(e.target.value)}
                  onBlur={parseAndSaveMembers}
                  placeholder="e.g., John Smith, Jane Doe, Bob Wilson"
                  rows={3}
                />
              </div>
              <div className="form-actions">
                <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
                <Button variant="primary" onClick={handleSaveNew} disabled={!editForm.name.trim()}>
                  Add Group
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
