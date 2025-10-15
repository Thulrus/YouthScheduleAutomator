/**
 * Rule parsing and recurring event date generation
 * Ported from Python scheduling/rules.py
 */

export type Frequency = 'weekly' | 'monthly' | 'yearly';

export interface RecurringRule {
  name: string;
  frequency: Frequency;
  weekday?: number; // 0=Monday, 6=Sunday (ISO weekday)
  nth?: number; // 1=first, 2=second, -1=last, etc.
  monthDay?: number; // day of month (1-31)
  month?: number; // month (1-12)
  kind: 'combined' | 'separate';
  groupsInvolved?: string[];
  responsibility?: {
    mode: 'none' | 'group' | 'leader';
    rotationPool?: string[];
  };
  description: string;
  startTime?: string;
  durationMinutes?: number;
}

/**
 * Parse raw YAML rules into RecurringRule objects
 */
export function parseRules(rawRules: any[]): RecurringRule[] {
  return rawRules.map(rule => {
    // Parse responsibility object, converting snake_case to camelCase
    let responsibility: RecurringRule['responsibility'] = undefined;
    if (rule.responsibility) {
      responsibility = {
        mode: rule.responsibility.mode || 'none',
        rotationPool: rule.responsibility.rotation_pool || rule.responsibility.rotationPool,
      };
    }
    
    return {
      name: rule.name,
      frequency: rule.frequency,
      weekday: rule.weekday,
      nth: rule.nth,
      monthDay: rule.month_day,
      month: rule.month,
      kind: rule.kind || 'combined',
      groupsInvolved: rule.groups_involved,
      responsibility,
      description: rule.description || rule.name,
      startTime: rule.start_time,
      durationMinutes: rule.duration_minutes,
    };
  });
}

/**
 * Generate dates for a recurring rule within a year
 */
export function generateDates(
  rule: RecurringRule,
  year: number,
  start?: Date,
  end?: Date
): Date[] {
  const dates: Date[] = [];

  if (rule.frequency === 'yearly') {
    dates.push(...generateYearlyDates(rule, year));
  } else if (rule.frequency === 'monthly') {
    dates.push(...generateMonthlyDates(rule, year));
  } else if (rule.frequency === 'weekly') {
    dates.push(...generateWeeklyDates(rule, year));
  }

  // Filter by start/end range
  return dates.filter(d => {
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

function generateYearlyDates(rule: RecurringRule, year: number): Date[] {
  if (rule.month === undefined) return [];

  if (rule.monthDay !== undefined) {
    // Specific day of month (e.g., January 15)
    return [new Date(year, rule.month - 1, rule.monthDay)];
  }

  if (rule.weekday !== undefined && rule.nth !== undefined) {
    // Nth weekday of month (e.g., 2nd Wednesday of March)
    const date = nthWeekdayOfMonth(year, rule.month, rule.weekday, rule.nth);
    return date ? [date] : [];
  }

  return [];
}

function generateMonthlyDates(rule: RecurringRule, year: number): Date[] {
  const dates: Date[] = [];

  for (let month = 1; month <= 12; month++) {
    if (rule.monthDay !== undefined) {
      // Specific day of each month
      const daysInMonth = new Date(year, month, 0).getDate();
      if (rule.monthDay <= daysInMonth) {
        dates.push(new Date(year, month - 1, rule.monthDay));
      }
    } else if (rule.weekday !== undefined && rule.nth !== undefined) {
      // Nth weekday of each month
      const date = nthWeekdayOfMonth(year, month, rule.weekday, rule.nth);
      if (date) dates.push(date);
    }
  }

  return dates;
}

function generateWeeklyDates(rule: RecurringRule, year: number): Date[] {
  if (rule.weekday === undefined) return [];

  const dates: Date[] = [];
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);

  let current = new Date(start);
  
  // Find first occurrence of the weekday
  while (current.getDay() !== convertWeekday(rule.weekday)) {
    current.setDate(current.getDate() + 1);
  }

  // Add every week
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }

  return dates;
}

/**
 * Find the nth occurrence of a weekday in a month
 * @param weekday 0=Monday, 6=Sunday (ISO format)
 * @param nth 1=first, 2=second, -1=last, etc.
 */
function nthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  nth: number
): Date | null {
  const jsWeekday = convertWeekday(weekday);
  
  if (nth > 0) {
    // Forward search (1st, 2nd, 3rd, etc.)
    const firstDay = new Date(year, month - 1, 1);
    let current = new Date(firstDay);
    
    // Find first occurrence
    while (current.getDay() !== jsWeekday) {
      current.setDate(current.getDate() + 1);
    }
    
    // Add weeks for nth
    current.setDate(current.getDate() + (nth - 1) * 7);
    
    // Check if still in same month
    if (current.getMonth() === month - 1) {
      return current;
    }
  } else if (nth < 0) {
    // Backward search (last, second-to-last, etc.)
    const lastDay = new Date(year, month, 0); // Last day of month
    let current = new Date(lastDay);
    
    // Find last occurrence
    while (current.getDay() !== jsWeekday) {
      current.setDate(current.getDate() - 1);
    }
    
    // Subtract weeks for nth (-1 is last, -2 is second-to-last, etc.)
    current.setDate(current.getDate() + (nth + 1) * 7);
    
    if (current.getMonth() === month - 1) {
      return current;
    }
  }

  return null;
}

/**
 * Convert ISO weekday (0=Mon, 6=Sun) to JS weekday (0=Sun, 6=Sat)
 */
function convertWeekday(isoWeekday: number): number {
  // ISO: 0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun
  // JS:  0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  return isoWeekday === 6 ? 0 : isoWeekday + 1;
}
