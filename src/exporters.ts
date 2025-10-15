/**
 * Export schedule to various formats
 * Ported from Python scheduling/exporters.py
 */

import { Schedule, Assignment } from './models';

/**
 * Format date as "YYYY Mon DD"
 */
function formatDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = date.getDate().toString().padStart(2, '0');
  return `${year} ${month} ${day}`;
}

/**
 * Generate Markdown table
 */
export function generateMarkdown(schedule: Schedule): string {
  const rows = schedule.toRows();
  if (rows.length === 0) {
    return '# Schedule\n\nNo events scheduled.\n';
  }

  let md = '# Schedule\n\n';
  md += '| Date | Type | In Charge | Description |\n';
  md += '|------|------|-----------|-------------|\n';

  rows.forEach(row => {
    const date = new Date(row.date);
    md += `| ${formatDate(date)} | ${row.kind} | ${row.inCharge} | ${row.description} |\n`;
  });

  return md;
}

/**
 * Generate CSV content
 */
export function generateCSV(schedule: Schedule): string {
  const rows = schedule.toRows();
  let csv = 'Date,Type,In Charge,Description\n';

  rows.forEach(row => {
    const date = new Date(row.date);
    const escapedCharge = row.inCharge.includes(',') ? `"${row.inCharge}"` : row.inCharge;
    const escapedDesc = row.description.includes(',') ? `"${row.description}"` : row.description;
    csv += `${formatDate(date)},${row.kind},${escapedCharge},${escapedDesc}\n`;
  });

  return csv;
}

/**
 * Generate iCalendar (.ics) content
 */
export function generateICS(schedule: Schedule, timezone: string = 'America/Denver'): string {
  const now = new Date();
  const dtStamp = formatICSDateTime(now);
  
  let ics = 'BEGIN:VCALENDAR\r\n';
  ics += 'VERSION:2.0\r\n';
  ics += 'PRODID:-//Youth Scheduler//EN\r\n';
  ics += 'CALSCALE:GREGORIAN\r\n';
  ics += 'METHOD:PUBLISH\r\n';

  schedule.assignments.forEach((assignment, index) => {
    ics += 'BEGIN:VEVENT\r\n';
    ics += `UID:${generateUID(assignment, index)}\r\n`;
    ics += `DTSTAMP:${dtStamp}\r\n`;

    // Date/time
    if (assignment.startTime && timezone !== 'floating') {
      const dtStart = formatICSDateTimeWithTZ(assignment.date, assignment.startTime, timezone);
      ics += `DTSTART;TZID=${timezone}:${dtStart}\r\n`;
      
      if (assignment.durationMinutes) {
        const endDate = new Date(assignment.date);
        const [hours, minutes] = assignment.startTime.split(':').map(Number);
        endDate.setHours(hours, minutes + assignment.durationMinutes);
        const dtEnd = formatICSDateTimeWithTZ(endDate, '', timezone);
        ics += `DTEND;TZID=${timezone}:${dtEnd}\r\n`;
      }
    } else {
      // All-day event
      const dtStart = formatICSDate(assignment.date);
      ics += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
    }

    // Summary and description
    const summary = `${assignment.kind === 'combined' ? 'Combined' : assignment.group}: ${assignment.description}`;
    ics += `SUMMARY:${escapeICS(summary)}\r\n`;
    
    let description = assignment.description;
    if (assignment.responsibleGroup) {
      description += ` (Responsible: ${assignment.responsibleGroup})`;
    }
    if (assignment.leaders.length > 0) {
      description += ` - Leaders: ${assignment.leaders.join(', ')}`;
    }
    ics += `DESCRIPTION:${escapeICS(description)}\r\n`;

    ics += 'END:VEVENT\r\n';
  });

  ics += 'END:VCALENDAR\r\n';
  return ics;
}

/**
 * Format date as YYYYMMDD for ICS
 */
function formatICSDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format datetime as YYYYMMDDTHHmmss for ICS
 */
function formatICSDateTime(date: Date): string {
  const dateStr = formatICSDate(date);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${dateStr}T${hours}${minutes}${seconds}Z`;
}

/**
 * Format datetime with timezone for ICS
 */
function formatICSDateTimeWithTZ(date: Date, time: string, _timezone: string): string {
  const dateStr = formatICSDate(date);
  if (time) {
    const [hours, minutes] = time.split(':');
    return `${dateStr}T${hours}${minutes}00`;
  }
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${dateStr}T${hours}${minutes}00`;
}

/**
 * Generate unique ID for event
 */
function generateUID(assignment: Assignment, index: number): string {
  const dateStr = formatICSDate(assignment.date);
  const sanitized = assignment.description.replace(/[^a-zA-Z0-9]/g, '');
  return `${dateStr}-${index}-${sanitized}@youth-scheduler`;
}

/**
 * Escape special characters for ICS
 */
function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Download a file to the user's browser
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export schedule as Markdown and download
 */
export function exportMarkdown(schedule: Schedule, filename: string = 'schedule.md'): void {
  const content = generateMarkdown(schedule);
  downloadFile(content, filename, 'text/markdown');
}

/**
 * Export schedule as CSV and download
 */
export function exportCSV(schedule: Schedule, filename: string = 'schedule.csv'): void {
  const content = generateCSV(schedule);
  downloadFile(content, filename, 'text/csv');
}

/**
 * Export schedule as ICS and download
 */
export function exportICS(schedule: Schedule, timezone: string = 'America/Denver', filename: string = 'schedule.ics'): void {
  const content = generateICS(schedule, timezone);
  downloadFile(content, filename, 'text/calendar');
}
