/**
 * Leader assignment strategies
 * Ported from Python scheduling/strategies.py
 */

import { Leader, Event, isLeaderAvailable } from './models';
import { SeededRandom } from './utils';

export type StrategyName = 'round-robin' | 'random' | 'weighted';

export interface AssignmentStrategy {
  assignLeaders(
    event: Event,
    leaders: Leader[],
    count: number,
    state: Map<string, number>,
    seedOffset?: number
  ): string[];
}

/**
 * Round-robin strategy: cycle through leaders fairly
 */
export class RoundRobinStrategy implements AssignmentStrategy {
  assignLeaders(
    event: Event,
    leaders: Leader[],
    count: number,
    state: Map<string, number>,
    seedOffset: number = 0
  ): string[] {
    const eligible = leaders.filter(
      l =>
        l.groups.some(g => event.groupsInvolved.includes(g)) &&
        isLeaderAvailable(l, event.date)
    );

    if (eligible.length === 0) return [];

    // Create a deterministic seed from the event date plus seed offset
    const seed = event.date.getTime() + seedOffset;
    const rng = new SeededRandom(seed);

    // Deterministically shuffle the eligible leaders based on the seed
    // This provides the initial randomized starting order
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Sort by assignment count (ascending) to maintain round-robin fairness
    // Leaders with fewer assignments are selected first
    shuffled.sort((a, b) => {
      const countA = state.get(a.name) || 0;
      const countB = state.get(b.name) || 0;
      return countA - countB;
    });

    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    
    // Update state
    selected.forEach(l => {
      state.set(l.name, (state.get(l.name) || 0) + 1);
    });

    return selected.map(l => l.name);
  }
}

/**
 * Random strategy: randomly select from eligible leaders
 * Now deterministic using a seeded random number generator based on event date
 */
export class RandomStrategy implements AssignmentStrategy {
  assignLeaders(
    event: Event,
    leaders: Leader[],
    count: number,
    state: Map<string, number>,
    seedOffset: number = 0
  ): string[] {
    const eligible = leaders.filter(
      l =>
        l.groups.some(g => event.groupsInvolved.includes(g)) &&
        isLeaderAvailable(l, event.date)
    );

    if (eligible.length === 0) return [];

    // Create a deterministic seed from the event date plus optional seed offset
    const seed = event.date.getTime() + seedOffset;
    const rng = new SeededRandom(seed);

    // Deterministic shuffle using seeded random
    const shuffled = [...eligible];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, Math.min(count, eligible.length));

    // Update state
    selected.forEach(l => {
      state.set(l.name, (state.get(l.name) || 0) + 1);
    });

    return selected.map(l => l.name);
  }
}

/**
 * Weighted strategy: prefer leaders with higher weight values
 */
export class WeightedStrategy implements AssignmentStrategy {
  assignLeaders(
    event: Event,
    leaders: Leader[],
    count: number,
    state: Map<string, number>,
    _seedOffset?: number
  ): string[] {
    const eligible = leaders.filter(
      l =>
        l.groups.some(g => event.groupsInvolved.includes(g)) &&
        isLeaderAvailable(l, event.date)
    );

    if (eligible.length === 0) return [];

    // Sort by weight (descending), then by assignment count (ascending)
    eligible.sort((a, b) => {
      if (a.weight !== b.weight) {
        return b.weight - a.weight; // Higher weight first
      }
      const countA = state.get(a.name) || 0;
      const countB = state.get(b.name) || 0;
      return countA - countB; // Fewer assignments first
    });

    const selected = eligible.slice(0, Math.min(count, eligible.length));

    // Update state
    selected.forEach(l => {
      state.set(l.name, (state.get(l.name) || 0) + 1);
    });

    return selected.map(l => l.name);
  }
}

/**
 * Get strategy by name
 */
export function getStrategy(name: StrategyName): AssignmentStrategy {
  switch (name) {
    case 'round-robin':
      return new RoundRobinStrategy();
    case 'random':
      return new RandomStrategy();
    case 'weighted':
      return new WeightedStrategy();
    default:
      return new RoundRobinStrategy();
  }
}
