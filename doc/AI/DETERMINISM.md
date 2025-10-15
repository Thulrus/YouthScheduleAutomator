# Scheduling Determinism Guide

## Overview

The Youth Scheduler is now **fully deterministic** for all assignment strategies. This means:

✅ Running the same date range multiple times produces identical results
✅ You can generate a full year, then generate any single month and they will match
✅ You can chain schedules (Jan → Feb → Mar) and get the same result as generating (Jan-Mar) all at once

## How It Works

### 1. Deterministic Strategies

All three strategies are now deterministic:

- **Round-Robin**: Always assigns leaders in order of who has the fewest assignments
- **Weighted**: Assigns based on weight values, breaking ties with assignment counts
- **Random**: Uses a seeded random number generator based on the event date (not truly random anymore, but appears random while being reproducible)

### 2. State Continuity

The scheduler now supports "state continuity" which tracks:

- **Leader Assignment Counts**: How many times each leader has been assigned
- **Group Rotation Positions**: Where each rotation pool is in its cycle

When you generate a schedule, it returns not just the assignments but also the final state. You can then use this state as the starting point for the next schedule.

## Usage Examples

### Basic Usage (Single Time Period)

```typescript
import { buildSchedule } from './scheduler';

// Generate a schedule for January 2025
const schedule = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2
);

// Running this again will produce identical results
```

### Advanced Usage (Continuity Across Time Periods)

```typescript
import { buildSchedule, getSchedulerState } from './scheduler';

// Generate January
const janSchedule = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2
);

// Extract the state after January
const janState = getSchedulerState(janSchedule);

// Generate February using January's final state
const febSchedule = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-02-01'),
  new Date('2025-02-28'),
  'round-robin',
  2,
  janState  // Pass in the state from January
);

// This February schedule will match what you'd get from
// generating Jan-Feb together, then filtering to Feb only
```

### Verification Example

```typescript
// Method 1: Generate full year at once
const fullYear = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-12-31'),
  'round-robin',
  2
);

// Method 2: Generate each month separately with state continuity
let state = undefined;
const monthlySchedules = [];

for (let month = 0; month < 12; month++) {
  const startDate = new Date(2025, month, 1);
  const endDate = new Date(2025, month + 1, 0); // Last day of month
  
  const schedule = buildSchedule(
    leaders,
    groups,
    rules,
    startDate,
    endDate,
    'round-robin',
    2,
    state
  );
  
  monthlySchedules.push(schedule);
  state = getSchedulerState(schedule);
}

// Combine all monthly schedules
const combinedMonthly = new Schedule(
  monthlySchedules.flatMap(s => s.assignments)
);

// These two schedules will be identical!
// fullYear.assignments === combinedMonthly.assignments
```

## Important Notes

### Determinism Requirements

For the scheduler to be deterministic, you must:

1. ✅ Use the same leaders configuration
2. ✅ Use the same groups configuration  
3. ✅ Use the same rules configuration
4. ✅ Use the same strategy name
5. ✅ Use the same leadersPerCombined count
6. ✅ For continuity, pass in the state from the previous schedule

### What Breaks Determinism

❌ Changing the order of leaders in your configuration
❌ Adding/removing leaders between runs
❌ Changing leader availability between runs
❌ Using different date ranges without state continuity
❌ Not passing state when chaining schedules

### Strategy-Specific Behavior

**Round-Robin**: Most "fair" - distributes assignments evenly. Perfect for most use cases.

**Weighted**: Good when some leaders should be assigned more often (higher weight = more assignments).

**Random**: Now deterministic but appears random. Same event date always gets same leaders, but the pattern isn't obvious. Good for testing or when you want varied assignments that are still reproducible.

## Testing Determinism

You can test this yourself in the app:

1. Generate a full year schedule (Jan 1 - Dec 31)
2. Export it to CSV
3. Clear the schedule
4. Generate just January (Jan 1 - Jan 31)
5. Export it to CSV
6. Compare the January rows - they should be identical!

## Current Limitation in the UI

⚠️ **Important**: The current UI doesn't yet support state continuity. Each time you click "Generate Schedule", it starts fresh. This means:

- Generating Jan 1-31, then Feb 1-28 will NOT continue from January's state
- Both will start from zero assignments for all leaders

To get true continuity, you would need to either:

- Always generate the full range you want in one go
- Or use the exported functions directly in code (as shown in examples above)

A future enhancement could add state persistence to the UI so it remembers previous schedules.

## Summary

✅ **The scheduler IS deterministic** - same inputs always produce same outputs
✅ **State continuity is supported** - you can chain schedules together
✅ **All strategies are deterministic** - including "random"
✅ **You can generate partial schedules that match full schedules** - with proper state handling

The system is designed to be reliable and reproducible, which is crucial for long-term planning and coordination.
