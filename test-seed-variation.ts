/**
 * Test script to verify random seed variation and effectiveness
 * 
 * Run with: npx tsx test-seed-variation.ts
 */

import { buildSchedule, getSchedulerState } from './src/scheduler';
import { parseRules } from './src/rules';

// Test configuration with multiple leaders in same group
const leaders = [
  { name: "Alice", groups: ["youth"], availability: [], weight: 1 },
  { name: "Bob", groups: ["youth"], availability: [], weight: 1 },
  { name: "Charlie", groups: ["youth"], availability: [], weight: 1 },
  { name: "Diana", groups: ["youth"], availability: [], weight: 1 },
  { name: "Eve", groups: ["youth"], availability: [], weight: 1 },
];

const groups = [
  { name: "youth", members: ["Member1", "Member2", "Member3"] },
];

const rulesRaw = [
  {
    name: "Weekly Service",
    frequency: "weekly",
    weekday: 0, // Sunday
    kind: "combined",
    description: "Weekly Service",
    start_time: "09:00",
    duration_minutes: 60,
    responsibility: { mode: "leader" }, // Required for leader assignment
  },
];

const rules = parseRules(rulesRaw);

console.log("🧪 Testing Random Seed Variation\n");

// Test 1: Same seed produces same results
console.log("Test 1: Same seed produces identical results");
console.log("=" .repeat(50));

const seed1_run1 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
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
  new Date('2025-01-31'),
  'round-robin',
  2,
  undefined,
  12345 // Same seed
);

const match1 = JSON.stringify(seed1_run1.assignments) === JSON.stringify(seed1_run2.assignments);
console.log(`Run 1 with seed 12345: ${seed1_run1.assignments.length} assignments`);
console.log(`Run 2 with seed 12345: ${seed1_run2.assignments.length} assignments`);
console.log(`Results match: ${match1 ? '✅' : '❌'}`);

// Show first few assignments
console.log("\nFirst 2 assignments from run 1:");
seed1_run1.assignments.slice(0, 2).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.leaders.join(', ')}`);
});

console.log("\nFirst 2 assignments from run 2:");
seed1_run2.assignments.slice(0, 2).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.leaders.join(', ')}`);
});

// Test 2: Different seeds produce different results
console.log("\n\nTest 2: Different seeds produce different results");
console.log("=" .repeat(50));

const seed2_result = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2,
  undefined,
  99999 // Different seed
);

const match2 = JSON.stringify(seed1_run1.assignments) === JSON.stringify(seed2_result.assignments);
console.log(`Result with seed 12345: ${seed1_run1.assignments.length} assignments`);
console.log(`Result with seed 99999: ${seed2_result.assignments.length} assignments`);
console.log(`Results differ: ${!match2 ? '✅' : '❌'}`);

console.log("\nFirst 2 assignments with seed 12345:");
seed1_run1.assignments.slice(0, 2).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.leaders.join(', ')}`);
});

console.log("\nFirst 2 assignments with seed 99999:");
seed2_result.assignments.slice(0, 2).forEach(a => {
  console.log(`  ${a.date.toISOString().split('T')[0]}: ${a.leaders.join(', ')}`);
});

// Test 3: Round-robin fairness is maintained regardless of seed
console.log("\n\nTest 3: Round-robin fairness maintained across different seeds");
console.log("=" .repeat(50));

// Run with two different seeds
const fairness_seed1 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-03-31'), // 3 months for better distribution
  'round-robin',
  2,
  undefined,
  11111
);

const fairness_seed2 = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-03-31'),
  'round-robin',
  2,
  undefined,
  22222
);

// Count assignments per leader for both seeds
const countAssignments = (schedule: any) => {
  const counts = new Map<string, number>();
  schedule.assignments.forEach((a: any) => {
    a.leaders.forEach((leader: string) => {
      counts.set(leader, (counts.get(leader) || 0) + 1);
    });
  });
  return counts;
};

const counts1 = countAssignments(fairness_seed1);
const counts2 = countAssignments(fairness_seed2);

console.log("\nAssignment counts with seed 11111:");
leaders.forEach(l => {
  console.log(`  ${l.name}: ${counts1.get(l.name) || 0} assignments`);
});

console.log("\nAssignment counts with seed 22222:");
leaders.forEach(l => {
  console.log(`  ${l.name}: ${counts2.get(l.name) || 0} assignments`);
});

// Check that distribution is fair (variance should be low)
const calculateVariance = (counts: Map<string, number>) => {
  const values = Array.from(counts.values());
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return variance;
};

const variance1 = calculateVariance(counts1);
const variance2 = calculateVariance(counts2);

console.log(`\nVariance for seed 11111: ${variance1.toFixed(2)}`);
console.log(`Variance for seed 22222: ${variance2.toFixed(2)}`);
console.log(`Both have low variance (fair distribution): ${variance1 < 2 && variance2 < 2 ? '✅' : '❌'}`);

// Test 4: Seed of 0 works correctly
console.log("\n\nTest 4: Seed of 0 works correctly");
console.log("=" .repeat(50));

const seed0_result = buildSchedule(
  leaders,
  groups,
  rules,
  new Date('2025-01-01'),
  new Date('2025-01-31'),
  'round-robin',
  2,
  undefined,
  0 // Seed of 0
);

console.log(`Schedule generated with seed 0: ${seed0_result.assignments.length} assignments`);
console.log(`First assignment: ${seed0_result.assignments[0]?.leaders.join(', ') || 'none'}`);
console.log(`Seed 0 works: ${seed0_result.assignments.length > 0 ? '✅' : '❌'}`);

console.log("\n" + "=".repeat(50));
console.log("All tests completed!");

if (match1 && !match2 && variance1 < 2 && variance2 < 2 && seed0_result.assignments.length > 0) {
  console.log("\n✅ All tests passed! Seed variation is working correctly.");
} else {
  console.log("\n❌ Some tests failed. Check the output above.");
}
