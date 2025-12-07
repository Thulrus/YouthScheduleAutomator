/**
 * Header component with file operations
 */

import React, { useRef } from 'react';
import { Button } from './common';

interface HeaderProps {
  fileName: string | null;
  isDirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNew: () => void;
  onOpen: (file: File) => void;
  onSave: () => void;
  onSaveAs: () => void;
  onUndo: () => void;
  onRedo: () => void;
}

export function Header({
  fileName,
  isDirty,
  canUndo,
  canRedo,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onUndo,
  onRedo,
}: HeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onOpen(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-brand">
          <span className="brand-icon">📅</span>
          <span className="brand-name">Youth Scheduler</span>
        </div>
        
        <div className="header-file-actions">
          <Button variant="ghost" size="small" onClick={onNew} title="New Schedule (Ctrl+N)">
            📄 New
          </Button>
          <Button variant="ghost" size="small" onClick={handleOpenClick} title="Open Schedule (Ctrl+O)">
            📂 Open
          </Button>
          <Button 
            variant="ghost" 
            size="small" 
            onClick={onSave} 
            disabled={!fileName}
            title="Save (Ctrl+S)"
          >
            💾 Save
          </Button>
          <Button 
            variant="ghost" 
            size="small" 
            onClick={onSaveAs}
            disabled={!fileName}
            title="Save As (Ctrl+Shift+S)"
          >
            📥 Save As
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".ysch,.json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        
        <div className="header-divider" />
        
        <div className="header-edit-actions">
          <Button 
            variant="ghost" 
            size="small" 
            onClick={onUndo} 
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            ↩️ Undo
          </Button>
          <Button 
            variant="ghost" 
            size="small" 
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
          >
            ↪️ Redo
          </Button>
        </div>
      </div>
      
      <div className="header-center">
        {fileName && (
          <span className="header-filename">
            {fileName}
            {isDirty && <span className="dirty-indicator" title="Unsaved changes"> •</span>}
          </span>
        )}
      </div>
      
      <div className="header-right">
        {/* Future: Settings button */}
      </div>
    </header>
  );
}
