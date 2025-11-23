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
 * Generate a simplified date range string for filenames
 * Format: YYYYMMDD-YYYYMMDD or YYYYMMDD if single day
 * Example: 20250101-20250131 or 20250115
 */
function generateDateRangeString(schedule: Schedule): string {
  if (schedule.assignments.length === 0) {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  }

  // Sort assignments by date
  const sortedAssignments = [...schedule.assignments].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  const firstDate = sortedAssignments[0].date;
  const lastDate = sortedAssignments[sortedAssignments.length - 1].date;

  const formatDatePart = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const firstStr = formatDatePart(firstDate);
  const lastStr = formatDatePart(lastDate);

  // If same day, return single date
  if (firstStr === lastStr) {
    return firstStr;
  }

  return `${firstStr}-${lastStr}`;
}

/**
 * Generate Markdown document (print-friendly format)
 */
export function generateMarkdown(schedule: Schedule): string {
  if (schedule.assignments.length === 0) {
    return '# Schedule\n\nNo events scheduled.\n';
  }

  let md = '# Youth Activity Schedule\n\n';
  
  schedule.assignments.forEach((assignment) => {
    // Date header with day name
    const date = assignment.date;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayName = dayNames[date.getDay()];
    
    // Compact header: Date (Day) - Description
    md += `### ${formatDate(date)} (${dayName}) - ${assignment.description}\n`;
    
    // Time info on same line if available
    if (assignment.startTime) {
      md += `*${assignment.startTime}`;
      if (assignment.durationMinutes) {
        md += ` • ${assignment.durationMinutes}min`;
      }
      md += `*  `;
    }
    md += `*[${assignment.kind === 'combined' ? 'Combined' : 'Separate'}]*\n`;
    
    // Leader assignments
    if (assignment.groupAssignments && assignment.groupAssignments.length > 0) {
      // Separate event - inline format
      assignment.groupAssignments.forEach(ga => {
        md += `- **${ga.group}:** ${ga.leaders.join(', ') || 'TBD'}`;
        
        // Youth helpers inline if present (without repeating leader name)
        if (ga.youthAssignments && ga.youthAssignments.length > 0) {
          const youthParts = ga.youthAssignments.map(ya => {
            return ya.youth.length > 0 ? ya.youth.join(', ') : 'none';
          });
          md += ` - Helpers: ${youthParts.join('; ')}`;
        }
        md += '\n';
      });
    } else {
      // Combined event - more compact
      const parts: string[] = [];
      
      if (assignment.responsibleGroup) {
        parts.push(`Group: ${assignment.responsibleGroup}`);
      }
      
      if (assignment.leaders.length > 0) {
        parts.push(`Leaders: ${assignment.leaders.join(', ')}`);
      }
      
      if (parts.length > 0) {
        md += `- ${parts.join(' • ')}\n`;
      }
      
      // Youth assignments for combined events - inline (without repeating leader name)
      if (assignment.youthAssignments && assignment.youthAssignments.length > 0) {
        const youthParts = assignment.youthAssignments.map(ya => {
          return ya.youth.length > 0 ? ya.youth.join(', ') : 'none';
        });
        md += `- Helpers: ${youthParts.join('; ')}\n`;
      }
    }
    
    md += '\n';
  });

  return md;
}

/**
 * Generate CSV content
 */
export function generateCSV(schedule: Schedule): string {
  const rows = schedule.toRows();
  let csv = 'Date,Type,In Charge,Youth Helpers,Description\n';

  rows.forEach(row => {
    const date = new Date(row.date);
    const escapedCharge = row.inCharge.includes(',') ? `"${row.inCharge}"` : row.inCharge;
    const escapedYouth = (row.youthHelpers || '-').includes(',') ? `"${row.youthHelpers || '-'}"` : (row.youthHelpers || '-');
    const escapedDesc = row.description.includes(',') ? `"${row.description}"` : row.description;
    csv += `${formatDate(date)},${row.kind},${escapedCharge},${escapedYouth},${escapedDesc}\n`;
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
      const dtStart = formatICSDateTimeWithTZ(assignment.date, assignment.startTime);
      ics += `DTSTART;TZID=${timezone}:${dtStart}\r\n`;
      
      if (assignment.durationMinutes) {
        const endDate = new Date(assignment.date);
        const [hours, minutes] = assignment.startTime.split(':').map(Number);
        endDate.setHours(hours, minutes + assignment.durationMinutes);
        const dtEnd = formatICSDateTimeWithTZ(endDate, '');
        ics += `DTEND;TZID=${timezone}:${dtEnd}\r\n`;
      }
    } else {
      // All-day event
      const dtStart = formatICSDate(assignment.date);
      ics += `DTSTART;VALUE=DATE:${dtStart}\r\n`;
    }

    // Summary and description
    const summary = `${assignment.kind === 'combined' ? 'Combined' : 'Separate'}: ${assignment.description}`;
    ics += `SUMMARY:${escapeICS(summary)}\r\n`;
    
    let description = assignment.description;
    if (assignment.groupAssignments && assignment.groupAssignments.length > 0) {
      description += ' - Assignments: ';
      description += assignment.groupAssignments
        .map(ga => {
          let gaStr = `${ga.group}: ${ga.leaders.join(', ') || 'TBD'}`;
          if (ga.youthAssignments && ga.youthAssignments.length > 0) {
            const youthStr = ga.youthAssignments
              .map(ya => `${ya.leader} (Youth: ${ya.youth.join(', ') || 'none'})`)
              .join(', ');
            gaStr += ` [${youthStr}]`;
          }
          return gaStr;
        })
        .join('; ');
    } else {
      if (assignment.responsibleGroup) {
        description += ` (Responsible: ${assignment.responsibleGroup})`;
      }
      if (assignment.leaders.length > 0) {
        description += ` - Leaders: ${assignment.leaders.join(', ')}`;
        if (assignment.youthAssignments && assignment.youthAssignments.length > 0) {
          const youthStr = assignment.youthAssignments
            .map(ya => `${ya.leader} (Youth: ${ya.youth.join(', ') || 'none'})`)
            .join('; ');
          description += ` - Youth: ${youthStr}`;
        }
      }
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
function formatICSDateTimeWithTZ(date: Date, time: string): string {
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
export function exportMarkdown(schedule: Schedule, filename?: string): void {
  const defaultFilename = `schedule-${generateDateRangeString(schedule)}.md`;
  const content = generateMarkdown(schedule);
  downloadFile(content, filename || defaultFilename, 'text/markdown');
}

/**
 * Export schedule as CSV and download
 */
export function exportCSV(schedule: Schedule, filename?: string): void {
  const defaultFilename = `schedule-${generateDateRangeString(schedule)}.csv`;
  const content = generateCSV(schedule);
  downloadFile(content, filename || defaultFilename, 'text/csv');
}

/**
 * Export schedule as ICS and download
 */
export function exportICS(schedule: Schedule, timezone: string = 'America/Denver', filename?: string): void {
  const defaultFilename = `schedule-${generateDateRangeString(schedule)}.ics`;
  const content = generateICS(schedule, timezone);
  downloadFile(content, filename || defaultFilename, 'text/calendar');
}

/**
 * Generate text message format grouped by month
 * Designed for easy copy-paste into text messages
 * 
 * Example output:
 * 📅 January 2025
 * ────────────────────────────────────────
 * 
 * Tue 7 - Separate Activity Night: John Smith
 *   (deacons)
 * Sun 12 - Combined Sunday Lesson: Steve Doe & Bob Johnson
 * Tue 14 - Combined YW/YM Activity Night: Ted Williams & John Smith
 * Tue 21 - YM Combined Activity: Steve Doe & Bob Johnson
 * 
 * ========================================
 * 
 * 📅 February 2025
 * ────────────────────────────────────────
 * ...
 */
export function generateTextMessage(schedule: Schedule): string {
  if (schedule.assignments.length === 0) {
    return 'No assignments scheduled.';
  }

  // Group assignments by month
  const byMonth = new Map<string, Assignment[]>();
  
  schedule.assignments.forEach(assignment => {
    const date = new Date(assignment.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, []);
    }
    byMonth.get(monthKey)!.push(assignment);
  });

  // Format each month
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  let text = '';
  const sortedMonths = Array.from(byMonth.keys()).sort();
  
  sortedMonths.forEach((monthKey, index) => {
    const [year, month] = monthKey.split('-');
    const monthName = months[parseInt(month) - 1];
    
    if (index > 0) {
      text += '\n\n' + '='.repeat(40) + '\n\n';
    }
    
    text += `${monthName} ${year}\n`;
    text += '─'.repeat(40) + '\n\n';
    
    const assignments = byMonth.get(monthKey)!;
    assignments.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    assignments.forEach(assignment => {
      const date = new Date(assignment.date);
      const day = date.getDate();
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
      
      // Format: "Wed 15 - Sacrament: John & Steve" or "Wed 15 - Activity: priests (responsible group)"
      text += `${dayName} ${day} - ${assignment.description}`;
      
      // Handle grouped separate assignments
      if (assignment.groupAssignments && assignment.groupAssignments.length > 0) {
        text += '\n';
        assignment.groupAssignments.forEach(ga => {
          const leaders = ga.leaders.join(' & ') || 'TBD';
          text += `  • ${ga.group}: ${leaders}\n`;
          // Add youth if present
          if (ga.youthAssignments && ga.youthAssignments.length > 0) {
            ga.youthAssignments.forEach(ya => {
              if (ya.youth.length > 0) {
                text += `    Assistant: ${ya.youth.join(', ')}\n`;
              }
            });
          }
        });
      } else {
        // Single assignment (combined or old-style)
        let inCharge: string;
        if (assignment.responsibleGroup) {
          // Show responsible group for group-responsibility events
          inCharge = assignment.responsibleGroup;
          if (assignment.leaders.length > 0) {
            inCharge += ` (${assignment.leaders.join(' & ')})`;
          }
        } else {
          // Show leaders or TBD
          inCharge = assignment.leaders.join(' & ') || 'TBD';
        }
        text += `: ${inCharge}\n`;
        // Add youth if present
        if (assignment.youthAssignments && assignment.youthAssignments.length > 0) {
          assignment.youthAssignments.forEach(ya => {
            if (ya.youth.length > 0) {
              text += `  Assistant: ${ya.youth.join(', ')}\n`;
            }
          });
        }
      }
    });
  });
  
  return text;
}

/**
 * Export schedule as text message format and download
 */
export function exportTextMessage(schedule: Schedule, filename?: string): void {
  const defaultFilename = `schedule-${generateDateRangeString(schedule)}.txt`;
  const content = generateTextMessage(schedule);
  downloadFile(content, filename || defaultFilename, 'text/plain');
}

/**
 * Generate HTML document with styled schedule
 * Includes print-friendly styles and light/dark mode support
 */
export function generateHTML(schedule: Schedule): string {
  if (schedule.assignments.length === 0) {
    return generateEmptyHTML();
  }

  // Sort assignments by date
  const sortedAssignments = [...schedule.assignments].sort((a, b) => 
    a.date.getTime() - b.date.getTime()
  );

  // Get date range for title
  const firstDate = sortedAssignments[0].date;
  const lastDate = sortedAssignments[sortedAssignments.length - 1].date;
  const dateRange = firstDate.getTime() === lastDate.getTime() 
    ? formatHTMLDate(firstDate)
    : `${formatHTMLDate(firstDate)} - ${formatHTMLDate(lastDate)}`;

  // Group assignments by month
  const byMonth = new Map<string, Assignment[]>();
  sortedAssignments.forEach(assignment => {
    const date = assignment.date;
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth.has(monthKey)) {
      byMonth.set(monthKey, []);
    }
    byMonth.get(monthKey)!.push(assignment);
  });

  // Build HTML with month sections
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  
  let assignmentsHTML = '';
  const sortedMonths = Array.from(byMonth.keys()).sort();
  
  sortedMonths.forEach((monthKey) => {
    const [year, month] = monthKey.split('-');
    const monthName = months[parseInt(month) - 1];
    
    // Add month header
    assignmentsHTML += `
    <div class="month-section">
      <h2 class="month-header">📅 ${monthName} ${year}</h2>
      <div class="assignments-grid">`;
    
    // Add cards for this month
    const monthAssignments = byMonth.get(monthKey)!;
    monthAssignments.forEach(assignment => {
      assignmentsHTML += generateAssignmentCard(assignment);
    });
    
    assignmentsHTML += `
      </div>
    </div>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Youth Activity Schedule - ${dateRange}</title>
  <style>
    /* Root Variables */
    :root {
      --bg-primary: #ffffff;
      --bg-card: #f8f9fb;
      --text-primary: #1a1a1a;
      --text-secondary: #666666;
      --text-muted: #999999;
      --border-color: #e0e0e0;
      --accent-combined: #646cff;
      --accent-separate: #4caf50;
      --card-border: rgba(100, 108, 255, 0.3);
    }

    /* Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.4;
      padding: 1.25rem 0.75rem;
      max-width: 1200px;
      margin: 0 auto;
      font-size: 14px;
    }

    /* Header - Compact */
    .header {
      text-align: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid var(--accent-combined);
    }

    .header h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      color: var(--text-primary);
    }

    .header .subtitle {
      font-size: 0.9rem;
      color: var(--text-secondary);
      font-weight: 400;
    }

    .header .date-range {
      margin-top: 0.5rem;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    /* Month Sections */
    .month-section {
      margin-bottom: 2rem;
    }

    .month-section:last-child {
      margin-bottom: 0;
    }

    .month-header {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent-combined);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid var(--accent-combined);
    }

    /* Assignment Cards - Tiled Grid */
    .assignments-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 0.875rem;
    }

    .assignment-card {
      background: var(--bg-card);
      border: 2px solid var(--card-border);
      border-radius: 10px;
      padding: 0.875rem;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .assignment-card.combined {
      border-left: 4px solid var(--accent-combined);
    }

    .assignment-card.separate {
      border-left: 4px solid var(--accent-separate);
    }

    /* Card Header - Compact */
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.6rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--border-color);
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .card-date-container {
      flex: 1;
      min-width: 0;
    }

    .card-day {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.2;
      margin-bottom: 0.15rem;
    }

    .card-date {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-secondary);
    }

    .event-badge {
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 500;
    }

    .event-badge.combined {
      background: var(--accent-combined);
      color: white;
    }

    .event-badge.separate {
      background: var(--accent-separate);
      color: white;
    }

    /* Card Body - Compact */
    .card-body {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .event-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
    }

    .event-time {
      color: var(--text-secondary);
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .event-time::before {
      content: '🕐';
      font-size: 0.9em;
    }

    /* Assignments - Compact */
    .assignments-list {
      margin-top: 0.4rem;
      font-size: 0.8rem;
    }

    .assignment-group {
      margin-bottom: 0.5rem;
      padding: 0.4rem;
      background: rgba(100, 108, 255, 0.08);
      border-radius: 6px;
    }

    .assignment-group:last-child {
      margin-bottom: 0;
    }

    .group-header {
      font-weight: 600;
      color: var(--accent-combined);
      margin-bottom: 0.3rem;
      font-size: 0.8rem;
    }

    .leaders-list {
      color: var(--text-primary);
      line-height: 1.4;
    }

    .leaders-list strong {
      font-weight: 600;
    }

    .youth-helpers {
      margin-top: 0.3rem;
      padding-left: 0.75rem;
      color: var(--text-secondary);
      font-size: 0.75rem;
    }

    .youth-helper-item {
      margin-bottom: 0.15rem;
    }

    .youth-helper-item::before {
      content: '→ ';
      margin-right: 0.25rem;
    }

    .responsible-group {
      display: inline-block;
      padding: 0.3rem 0.6rem;
      background: rgba(100, 108, 255, 0.12);
      border-radius: 6px;
      font-size: 0.8rem;
      color: var(--text-primary);
      font-weight: 500;
      margin-bottom: 0.3rem;
    }

    .responsible-group::before {
      content: '🎯 ';
    }

    .single-leaders {
      color: var(--text-primary);
      font-size: 0.8rem;
    }

    .single-leaders strong {
      font-weight: 600;
    }

    /* Print Styles - Optimized for compact printing */
    @media print {
      @page {
        margin: 0.5in;
        size: letter;
      }

      body {
        padding: 0;
        background: white !important;
        color: black !important;
        font-size: 11px;
        max-width: 100%;
      }

      .header {
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
      }

      .header h1 {
        font-size: 1.5rem;
      }

      .header .subtitle {
        font-size: 0.8rem;
      }

      .month-section {
        margin-bottom: 1.5rem;
        page-break-before: auto;
      }

      .month-header {
        font-size: 1.3rem;
        margin-bottom: 0.75rem;
        padding-bottom: 0.4rem;
        page-break-after: avoid;
        border-bottom-color: #646cff !important;
        color: #646cff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .assignments-grid {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 0.5rem !important;
      }

      .assignment-card {
        box-shadow: none;
        border: 1.5px solid #ccc !important;
        padding: 0.65rem;
        margin-bottom: 0;
        background: #f8f9fb !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .event-badge.combined {
        background: #646cff !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .event-badge.separate {
        background: #4caf50 !important;
        color: white !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .assignment-card.combined {
        border-left: 3px solid #646cff !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .assignment-card.separate {
        border-left: 3px solid #4caf50 !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .event-time::before {
        content: '⏰';
      }

      /* Remove page breaks within cards */
      .assignment-card {
        page-break-inside: avoid;
        break-inside: avoid;
        display: block;
        width: auto;
      }

      .assignment-group {
        background: rgba(100, 108, 255, 0.08) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .responsible-group {
        background: rgba(100, 108, 255, 0.12) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .assignments-grid {
        grid-template-columns: 1fr;
      }
      
      .month-header {
        font-size: 1.3rem;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📅 Youth Activity Schedule</h1>
    <p class="subtitle">Leader Assignments & Event Details</p>
    <div class="date-range">${dateRange}</div>
  </div>

  ${assignmentsHTML}

  <script>
    // Optional: Add print button functionality
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        window.print();
      }
    });
  </script>
</body>
</html>`;
}

/**
 * Generate empty HTML page
 */
function generateEmptyHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Youth Activity Schedule</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f8f9fa;
      color: #666;
      text-align: center;
    }
    .empty-state {
      padding: 2rem;
    }
    .empty-state h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="empty-state">
    <h1>📅 Youth Activity Schedule</h1>
    <p>No events scheduled.</p>
  </div>
</body>
</html>`;
}

/**
 * Format date for HTML display (e.g., "January 15, 2025")
 */
function formatHTMLDate(date: Date): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Get emoji for day of week
 */
function getDayEmoji(dayOfWeek: number): string {
  const emojis = ['☀️', '🌙', '💼', '📚', '🎯', '🎉', '⭐'];
  return emojis[dayOfWeek];
}

/**
 * Format day name with emoji (e.g., "📚 Wednesday")
 */
function formatCardDay(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const emoji = getDayEmoji(date.getDay());
  return `${emoji} ${days[date.getDay()]}`;
}

/**
 * Format date for card display (e.g., "Jan 15, 2025")
 */
function formatCardDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/**
 * Format time for HTML display
 */
function formatHTMLTime(startTime?: string, durationMinutes?: number): string {
  if (!startTime) return '';
  
  const [hours, minutes] = startTime.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  let timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  
  if (durationMinutes) {
    const durationHours = Math.floor(durationMinutes / 60);
    const durationMins = durationMinutes % 60;
    if (durationHours > 0) {
      timeStr += ` • ${durationHours}h`;
      if (durationMins > 0) timeStr += ` ${durationMins}m`;
    } else {
      timeStr += ` • ${durationMins}m`;
    }
  }
  
  return timeStr;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate HTML for a single assignment card
 */
function generateAssignmentCard(assignment: Assignment): string {
  const eventType = assignment.kind === 'combined' ? 'combined' : 'separate';
  
  let cardHTML = `
    <div class="assignment-card ${eventType}">
      <div class="card-header">
        <div class="card-date-container">
          <div class="card-day">${formatCardDay(assignment.date)}</div>
          <div class="card-date">${formatCardDate(assignment.date)}</div>
        </div>
        <span class="event-badge ${eventType}">${assignment.kind}</span>
      </div>
      
      <div class="card-body">
        <h3 class="event-title">${escapeHTML(assignment.description)}</h3>`;

  // Add time if available
  const timeStr = formatHTMLTime(assignment.startTime, assignment.durationMinutes);
  if (timeStr) {
    cardHTML += `
        <div class="event-time">${timeStr}</div>`;
  }

  cardHTML += `
        <div class="assignments-list">`;

  // Handle group assignments (separate events)
  if (assignment.groupAssignments && assignment.groupAssignments.length > 0) {
    assignment.groupAssignments.forEach(ga => {
      cardHTML += `
          <div class="assignment-group">
            <div class="group-header">${escapeHTML(ga.group)}</div>
            <div class="leaders-list">`;
      
      if (ga.leaders.length > 0) {
        cardHTML += `<strong>Leaders:</strong> ${ga.leaders.map(l => escapeHTML(l)).join(', ')}`;
      } else {
        cardHTML += `<strong>Leaders:</strong> TBD`;
      }
      
      cardHTML += `
            </div>`;

      // Youth helpers for this group
      if (ga.youthAssignments && ga.youthAssignments.length > 0) {
        const hasYouth = ga.youthAssignments.some(ya => ya.youth.length > 0);
        if (hasYouth) {
          cardHTML += `
            <div class="youth-helpers">`;
          ga.youthAssignments.forEach(ya => {
            if (ya.youth.length > 0) {
              cardHTML += `
              <div class="youth-helper-item">Helpers: ${escapeHTML(ya.youth.join(', '))}</div>`;
            }
          });
          cardHTML += `
            </div>`;
        }
      }
      
      cardHTML += `
          </div>`;
    });
  } else {
    // Combined event
    if (assignment.responsibleGroup) {
      cardHTML += `
          <div class="responsible-group">${escapeHTML(assignment.responsibleGroup)}</div>`;
    }

    if (assignment.leaders.length > 0) {
      cardHTML += `
          <div class="single-leaders"><strong>Leaders:</strong> ${assignment.leaders.map(l => escapeHTML(l)).join(', ')}</div>`;
    }

    // Youth helpers for combined event
    if (assignment.youthAssignments && assignment.youthAssignments.length > 0) {
      const hasYouth = assignment.youthAssignments.some(ya => ya.youth.length > 0);
      if (hasYouth) {
        cardHTML += `
          <div class="youth-helpers">`;
        assignment.youthAssignments.forEach(ya => {
          if (ya.youth.length > 0) {
            cardHTML += `
            <div class="youth-helper-item">Helpers: ${escapeHTML(ya.youth.join(', '))}</div>`;
          }
        });
        cardHTML += `
          </div>`;
      }
    }
  }

  cardHTML += `
        </div>
      </div>
    </div>`;

  return cardHTML;
}

/**
 * Export schedule as HTML and download
 */
export function exportHTML(schedule: Schedule, filename?: string): void {
  const defaultFilename = `schedule-${generateDateRangeString(schedule)}.html`;
  const content = generateHTML(schedule);
  downloadFile(content, filename || defaultFilename, 'text/html');
}
