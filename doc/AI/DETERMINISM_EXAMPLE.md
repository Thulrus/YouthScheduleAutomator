# Practical Example: Deterministic Scheduling

This example demonstrates how to use the scheduler's deterministic features in a real-world scenario.

## Scenario

You're planning a full year of activities but want to:

1. Generate the entire year schedule for planning purposes
2. Later generate just individual months as you need them
3. Ensure individual months match the yearly plan

## Step-by-Step Example

### Step 1: Generate Full Year for Planning

```typescript
import { buildSchedule } from './scheduler';

// Your configuration
const leaders = [...];  // Your leaders config
const groups = [...];   // Your groups config
const rules = [...];    // Your event rules

// Generate full year
const fullYear = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-12-31'),
  'round-robin',
  2
);

// Export this to a calendar file
exportICS(fullYear, 'America/Denver');
// Now you have a full year calendar in Outlook/Google Calendar
```

### Step 2: Later, Generate Just March

```typescript
// 3 months later, you need to generate just March
const marchOnly = buildSchedule(
  leaders,  // Same config
  groups,   // Same config
  rules,    // Same config
  new Date('2025-03-01'),
  new Date('2025-03-31'),
  'round-robin',  // Same strategy
  2               // Same leaders per event
);

// This will produce DIFFERENT results than fullYear's March
// because it starts fresh with zero assignments
```

❌ **Problem**: March standalone doesn't match the March from your full year schedule!

### Step 3: The Correct Way - Using State

```typescript
// Generate January and February first to get to March's state
const jan = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2
);

const janState = getSchedulerState(jan);

const feb = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-02-01'),
  new Date('2025-02-28'),
  'round-robin',
  2,
  janState  // Continue from January
);

const febState = getSchedulerState(feb);

// Now March with proper state
const marchWithState = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-03-01'),
  new Date('2025-03-31'),
  'round-robin',
  2,
  febState  // Continue from February
);

// ✅ This March will match the March from fullYear!
```

## The Easiest Approach

**For most use cases, just generate the full range you need:**

```typescript
// Need January through March? Generate them together:
const janToMarch = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-03-31'),
  'round-robin',
  2
);

// This is simpler and guarantees consistency
```

## UI Workflow Recommendation

### For Annual Planning

1. Set start date to January 1, 2025
2. Set duration to "1 Year"
3. Generate schedule
4. Export to calendar (ICS) for the full year
5. Everyone can import this into their calendars

### For Monthly Updates

If you need to regenerate a month (due to changes):

1. Set start date to your year start (Jan 1)
2. Set duration to cover through the month you want
3. Example: To regenerate April correctly:
   - Start: January 1, 2025
   - Duration: Set to end of April (or use "6 months" if mid-year)
4. Generate and export

This ensures the schedule maintains consistency with previous months.

## Key Takeaway

🎯 **Best Practice**: Always generate from your schedule's start date through the period you need. Don't try to generate single months in isolation unless you're managing state manually in code.

The scheduler is deterministic, which means:

- Jan 1 → Dec 31 (full year) will produce specific results
- Generating Jan 1 → Mar 31 will produce March exactly as it appears in the full year
- But generating Mar 1 → Mar 31 alone will produce DIFFERENT results (it starts fresh)

This is actually a feature, not a bug! It gives you flexibility:

- Want consistency with a master plan? Generate from the start
- Want to start fresh for a new period? Generate just that period

## Testing It Yourself

Try this in the app:

1. Generate Jan 1 - Dec 31, 2025, export to CSV as "full-year.csv"
2. Generate Jan 1 - Mar 31, 2025, export to CSV as "jan-mar.csv"
3. Open both files and compare the January-March rows
4. They will be IDENTICAL! ✅

Then try:

1. Generate Mar 1 - Mar 31, 2025, export to CSV as "march-only.csv"
2. Compare with March rows from full-year.csv
3. They will be DIFFERENT because March-only started fresh

Both behaviors are useful depending on your needs!
