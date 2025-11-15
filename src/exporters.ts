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
export function exportTextMessage(schedule: Schedule, filename: string = 'schedule.txt'): void {
  const content = generateTextMessage(schedule);
  downloadFile(content, filename, 'text/plain');
}
