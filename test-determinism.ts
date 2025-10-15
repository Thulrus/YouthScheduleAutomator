/**
 * Test script to verify scheduling determinism
 * 
 * Run with: npx tsx test-determinism.ts
 */

import { buildSchedule, getSchedulerState } from './src/scheduler';
import { parseRules } from './src/rules';

// Simple test configuration
const leaders = [
  { name: "John", groups: ["deacons"], availability: [], weight: 1 },
  { name: "Jane", groups: ["teachers"], availability: [], weight: 1 },
  { name: "Bob", groups: ["priests"], availability: [], weight: 1 },
];

const groups = [
  { name: "deacons", members: [] },
  { name: "teachers", members: [] },
  { name: "priests", members: [] },
];

const rulesRaw = [
  {
    name: "Weekly Sunday Service",
    frequency: "weekly",
    weekday: 0, // Sunday
    kind: "combined",
    description: "Sunday Service",
    start_time: "09:00",
    duration_minutes: 60,
  },
];

const rules = parseRules(rulesRaw);

console.log("🧪 Testing Scheduler Determinism\n");

// Test 1: Same inputs produce same output
console.log("Test 1: Multiple runs with same inputs");
console.log("=" .repeat(50));

const run1 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2
);

const run2 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2
);

const match1 = JSON.stringify(run1.assignments) === JSON.stringify(run2.assignments);
console.log(`Run 1 assignments: ${run1.assignments.length}`);
console.log(`Run 2 assignments: ${run2.assignments.length}`);
console.log(`Results match: ${match1 ? '✅' : '❌'}\n`);

// Test 2: State continuity
console.log("Test 2: State continuity across time periods");
console.log("=" .repeat(50));

// Method A: Generate Jan-Feb together
const janFebTogether = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-02-28'),
  'round-robin',
  2
);

// Method B: Generate Jan, then Feb with state
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
  janState
);

// Combine Jan and Feb
const janFebSeparate = [...jan.assignments, ...feb.assignments];

// Filter janFebTogether to compare with separate
const febAssignments = janFebTogether.assignments.filter(
  a => a.date >= new Date('2025-02-01')
);

console.log(`Jan-Feb together: ${janFebTogether.assignments.length} assignments`);
console.log(`Jan separate: ${jan.assignments.length} assignments`);
console.log(`Feb separate: ${feb.assignments.length} assignments`);
console.log(`Combined: ${janFebSeparate.length} assignments`);

// Check if February assignments match
const match2 = JSON.stringify(febAssignments) === JSON.stringify(feb.assignments);
console.log(`February matches: ${match2 ? '✅' : '❌'}`);

// Show first few February assignments from both methods
console.log("\nFirst February assignment from full run:");
if (febAssignments[0]) {
  console.log(`  Date: ${febAssignments[0].date.toISOString().split('T')[0]}`);
  console.log(`  Leaders: ${febAssignments[0].leaders.join(', ')}`);
}

console.log("\nFirst February assignment from separate run:");
if (feb.assignments[0]) {
  console.log(`  Date: ${feb.assignments[0].date.toISOString().split('T')[0]}`);
  console.log(`  Leaders: ${feb.assignments[0].leaders.join(', ')}`);
}

// Test 3: Random strategy is also deterministic
console.log("\n\nTest 3: Random strategy determinism");
console.log("=" .repeat(50));

const random1 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'random',
  2
);

const random2 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'random',
  2
);

const match3 = JSON.stringify(random1.assignments) === JSON.stringify(random2.assignments);
console.log(`Random run 1: ${random1.assignments.length} assignments`);
console.log(`Random run 2: ${random2.assignments.length} assignments`);
console.log(`Results match: ${match3 ? '✅' : '❌'}`);

console.log("\n" + "=".repeat(50));
console.log("All tests completed!");

if (match1 && match2 && match3) {
  console.log("\n✅ All tests passed! Scheduler is deterministic.");
} else {
  console.log("\n❌ Some tests failed. Check the output above.");
}
