/**
 * Export View - export schedule to various formats
 */

import { useState, useMemo } from 'react';
import { SerializedAssignment } from '../models';
import { Button } from './common';
import { 
  exportMarkdown, 
  exportCSV, 
  exportICS, 
  exportTextMessage, 
  exportHTML,
  generateMarkdown,
  generateCSV,
} from '../exporters';
import { deserializeSchedule } from '../serialization';

interface ExportViewProps {
  assignments: SerializedAssignment[];
  dateRangeStart: string;
  dateRangeEnd: string;
  timezone: string;
}

type ExportFormat = 'md' | 'csv' | 'ics' | 'txt' | 'html';

interface FormatOption {
  id: ExportFormat;
  name: string;
  description: string;
  icon: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'md', name: 'Markdown', description: 'Print-friendly document', icon: '📝' },
  { id: 'csv', name: 'CSV', description: 'Spreadsheet compatible', icon: '📊' },
  { id: 'ics', name: 'iCalendar', description: 'Calendar import', icon: '📅' },
  { id: 'txt', name: 'Text', description: 'For messaging', icon: '💬' },
  { id: 'html', name: 'HTML', description: 'Web/email format', icon: '🌐' },
];

export function ExportView({ assignments, dateRangeStart, dateRangeEnd, timezone }: ExportViewProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('md');
  const [dateMode, setDateMode] = useState<'full' | 'custom'>('full');
  const [customStart, setCustomStart] = useState(dateRangeStart);
  const [customEnd, setCustomEnd] = useState(dateRangeEnd);
  const [showPreview, setShowPreview] = useState(false);

  // Filter assignments by date range
  const filteredAssignments = useMemo(() => {
    if (dateMode === 'full') {
      return assignments;
    }
    return assignments.filter(a => {
      return a.date >= customStart && a.date <= customEnd;
    });
  }, [assignments, dateMode, customStart, customEnd]);

  // Create a Schedule object for export
  const scheduleForExport = useMemo(() => {
    return deserializeSchedule(filteredAssignments);
  }, [filteredAssignments]);

  // Generate preview content
  const previewContent = useMemo(() => {
    if (!showPreview) return '';
    
    try {
      switch (selectedFormat) {
        case 'md':
          return generateMarkdown(scheduleForExport);
        case 'csv':
          return generateCSV(scheduleForExport);
        default:
          return 'Preview not available for this format.';
      }
    } catch (e) {
      return `Error generating preview: ${e instanceof Error ? e.message : 'Unknown error'}`;
    }
  }, [showPreview, selectedFormat, scheduleForExport]);

  const handleExport = () => {
    try {
      switch (selectedFormat) {
        case 'md':
          exportMarkdown(scheduleForExport);
          break;
        case 'csv':
          exportCSV(scheduleForExport);
          break;
        case 'ics':
          exportICS(scheduleForExport, timezone);
          break;
        case 'txt':
          exportTextMessage(scheduleForExport);
          break;
        case 'html':
          exportHTML(scheduleForExport);
          break;
      }
    } catch (e) {
      alert(`Export error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="export-view empty">
        <div className="empty-state">
          <div className="empty-icon">📤</div>
          <h2>No Schedule to Export</h2>
          <p>Generate a schedule first, then come back here to export.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="export-view">
      <div className="view-header">
        <h2>Export Schedule</h2>
      </div>

      <div className="export-content">
        {/* Date Range Selection */}
        <section className="export-section">
          <h3>Date Range</h3>
          <div className="date-range-options">
            <label className="radio-option">
              <input
                type="radio"
                name="dateMode"
                checked={dateMode === 'full'}
                onChange={() => setDateMode('full')}
              />
              <span className="radio-label">
                Full schedule ({dateRangeStart} to {dateRangeEnd})
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="dateMode"
                checked={dateMode === 'custom'}
                onChange={() => setDateMode('custom')}
              />
              <span className="radio-label">Custom range</span>
            </label>
          </div>

          {dateMode === 'custom' && (
            <div className="custom-date-range">
              <div className="form-group">
                <label>From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  min={dateRangeStart}
                  max={dateRangeEnd}
                />
              </div>
              <div className="form-group">
                <label>To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  min={dateRangeStart}
                  max={dateRangeEnd}
                />
              </div>
            </div>
          )}

          <div className="date-range-summary">
            <strong>{filteredAssignments.length}</strong> events will be exported
          </div>
        </section>

        {/* Format Selection */}
        <section className="export-section">
          <h3>Format</h3>
          <div className="format-grid">
            {FORMAT_OPTIONS.map(format => (
              <button
                key={format.id}
                className={`format-option ${selectedFormat === format.id ? 'selected' : ''}`}
                onClick={() => setSelectedFormat(format.id)}
              >
                <span className="format-icon">{format.icon}</span>
                <span className="format-name">{format.name}</span>
                <span className="format-description">{format.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Preview */}
        {(selectedFormat === 'md' || selectedFormat === 'csv') && (
          <section className="export-section">
            <div className="preview-header">
              <h3>Preview</h3>
              <Button 
                variant="ghost" 
                size="small" 
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
            </div>
            
            {showPreview && (
              <div className="preview-container">
                <pre className="preview-content">{previewContent}</pre>
              </div>
            )}
          </section>
        )}

        {/* Export Button */}
        <div className="export-actions">
          <Button 
            variant="primary" 
            size="large"
            onClick={handleExport}
            disabled={filteredAssignments.length === 0}
          >
            📤 Export as {FORMAT_OPTIONS.find(f => f.id === selectedFormat)?.name}
          </Button>
        </div>
      </div>
    </div>
  );
}
