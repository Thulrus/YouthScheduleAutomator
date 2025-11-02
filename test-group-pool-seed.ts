/**
 * Test script to verify random seed affects group pool assignments
 * 
 * Run with: npx tsx test-group-pool-seed.ts
 */

import { buildSchedule } from './src/scheduler';
import { parseRules } from './src/rules';
import { Schedule } from './src/models';

// Test configuration with multiple groups
const leaders = [
  { name: "Alice", groups: ["GroupA"], availability: [], weight: 1 },
  { name: "Bob", groups: ["GroupB"], availability: [], weight: 1 },
  { name: "Charlie", groups: ["GroupC"], availability: [], weight: 1 },
  { name: "Diana", groups: ["GroupD"], availability: [], weight: 1 },
];

const groups = [
  { name: "GroupA", members: ["Member1", "Member2"] },
  { name: "GroupB", members: ["Member3", "Member4"] },
  { name: "GroupC", members: ["Member5", "Member6"] },
  { name: "GroupD", members: ["Member7", "Member8"] },
];

const rulesRaw = [
  {
    name: "Monthly Combined Activity",
    frequency: "monthly",
    weekday: 1, // Monday
    nth: 1, // First Monday
    kind: "combined",
    description: "Monthly Activity",
    start_time: "19:00",
    duration_minutes: 90,
    responsibility: {
      mode: "group",
      rotation_pool: ["GroupA", "GroupB", "GroupC", "GroupD"]
    }
  },
];

const rules = parseRules(rulesRaw);

const SEPARATOR_LENGTH = 60;

console.log("🧪 Testing Group Pool Seed Variation\n");

// Test 1: Same seed produces same group assignments
console.log("Test 1: Same seed produces identical group assignments");
console.log("=".repeat(SEPARATOR_LENGTH));

const seed1_run1 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-06-30'),
  'round-robin',
  2,
  undefined,
  12345 // Seed
);

const seed1_run2 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-06-30'),
  'round-robin',
  2,
  undefined,
  12345 // Same seed
);

// Extract responsible groups from assignments
const extractGroups = (schedule: Schedule): string[] => {
  return schedule.assignments
    .map(a => a.responsibleGroup || 'N/A')
    .filter(g => g !== 'N/A');
};

const groups1_run1 = extractGroups(seed1_run1);
const groups1_run2 = extractGroups(seed1_run2);

console.log(`Run 1 with seed 12345: ${groups1_run1.length} group assignments`);
console.log(`Run 2 with seed 12345: ${groups1_run2.length} group assignments`);

const match1 = JSON.stringify(groups1_run1) === JSON.stringify(groups1_run2);
console.log(`Results match: ${match1 ? '✅' : '❌'}`);

console.log("\nGroup assignments from run 1:");
seed1_run1.assignments.slice(0, 4).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.responsibleGroup}`);
});

console.log("\nGroup assignments from run 2:");
seed1_run2.assignments.slice(0, 4).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.responsibleGroup}`);
});

// Test 2: Different seeds produce different group assignments
console.log("\n\nTest 2: Different seeds produce different group assignments");
console.log("=".repeat(SEPARATOR_LENGTH));

const seed2_result = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-06-30'),
  'round-robin',
  2,
  undefined,
  99999 // Different seed
);

const groups2 = extractGroups(seed2_result);

console.log(`Result with seed 12345: ${groups1_run1.length} group assignments`);
console.log(`Result with seed 99999: ${groups2.length} group assignments`);

const match2 = JSON.stringify(groups1_run1) === JSON.stringify(groups2);
console.log(`Results differ: ${!match2 ? '✅' : '❌'}`);

console.log("\nGroup assignments with seed 12345:");
seed1_run1.assignments.slice(0, 4).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.responsibleGroup}`);
});

console.log("\nGroup assignments with seed 99999:");
seed2_result.assignments.slice(0, 4).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.responsibleGroup}`);
});

// Test 3: Fairness is maintained regardless of seed
console.log("\n\nTest 3: Fairness maintained across different seeds");
console.log("=".repeat(SEPARATOR_LENGTH));

// Count group assignments for each seed
const countGroups = (schedule: Schedule): Map<string, number> => {
  const counts = new Map<string, number>();
  schedule.assignments.forEach(a => {
    if (a.responsibleGroup) {
      counts.set(a.responsibleGroup, (counts.get(a.responsibleGroup) || 0) + 1);
    }
  });
  return counts;
};

const counts1 = countGroups(seed1_run1);
const counts2 = countGroups(seed2_result);

console.log("\nGroup assignment counts with seed 12345:");
groups.forEach(g => {
  console.log(`  ${g.name}: ${counts1.get(g.name) || 0} assignments`);
});

console.log("\nGroup assignment counts with seed 99999:");
groups.forEach(g => {
  console.log(`  ${g.name}: ${counts2.get(g.name) || 0} assignments`);
});

// Check that distribution is fair (variance should be low)
const calculateVariance = (counts: Map<string, number>): number => {
  const values = Array.from(counts.values());
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return variance;
};

const variance1 = calculateVariance(counts1);
const variance2 = calculateVariance(counts2);

console.log(`\nVariance for seed 12345: ${variance1.toFixed(2)}`);
console.log(`Variance for seed 99999: ${variance2.toFixed(2)}`);
console.log(`Both have low variance (fair distribution): ${variance1 < 2 && variance2 < 2 ? '✅' : '❌'}`);

// Test 4: Seed of 0 works correctly
console.log("\n\nTest 4: Seed of 0 works correctly for group assignments");
console.log("=".repeat(SEPARATOR_LENGTH));

const seed0_result = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-03-31'),
  'round-robin',
  2,
  undefined,
  0 // Seed of 0
);

const groups0 = extractGroups(seed0_result);
console.log(`Schedule generated with seed 0: ${groups0.length} group assignments`);
console.log(`First assignment: ${seed0_result.assignments[0]?.responsibleGroup || 'none'}`);
console.log(`Seed 0 works: ${groups0.length > 0 ? '✅' : '❌'}`);

console.log("\n" + "=".repeat(SEPARATOR_LENGTH));
console.log("All tests completed!");

if (match1 && !match2 && variance1 < 2 && variance2 < 2 && groups0.length > 0) {
  console.log("\n✅ All tests passed! Group pool seed variation is working correctly.");
} else {
  console.log("\n❌ Some tests failed. Check the output above.");
}
