import { describe, expect, it } from 'vitest';

import {
  findRouteMeta,
  primaryRouteMeta,
  routeMeta,
} from '../../src/app/router/routeMeta';
import { agentRegistry } from '../../src/core/agents/agentRegistry';
import { schemaRegistry } from '../../src/core/schemas';

describe('route metadata scaffold', () => {
  it('defines the four placeholder routes for the app shell', () => {
    expect(routeMeta.map((entry) => entry.path)).toEqual(['/', '/game', '/debug', '/review']);
  });

  it('keeps debug outside the primary navigation flow', () => {
    expect(primaryRouteMeta.map((entry) => entry.path)).toEqual(['/', '/game', '/review']);
  });

  it('falls back to the home route for unknown paths', () => {
    expect(findRouteMeta('/missing').id).toBe('home');
  });
});

describe('core scaffold registries', () => {
  it('stages the MVP agent modules in mock mode', () => {
    expect(agentRegistry).toHaveLength(8);
    expect(agentRegistry.every((entry) => entry.mode === 'mock')).toBe(true);
  });

  it('exposes the concrete schema modules required by the docs', () => {
    expect(
      schemaRegistry
        .map((entry) => entry.owner)
        .filter((owner) => ['world', 'area', 'quest', 'npc', 'combat', 'event', 'save'].includes(owner))
        .sort(),
    ).toEqual([
      'area',
      'combat',
      'event',
      'npc',
      'quest',
      'save',
      'world',
    ]);
  });
});
