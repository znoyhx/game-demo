import { createGameEventBus } from '../events/domainEvents';

import { attachDomainEventLogging, GameLogger } from './gameLogger';
import { gameLogStore } from './logStore';

export * from './gameLogger';
export * from './logStore';
export * from './logTypes';

export const gameEventBus = createGameEventBus();
export const gameLogger = new GameLogger(gameLogStore);
export const detachDomainEventLogging = attachDomainEventLogging(
  gameEventBus,
  gameLogger,
);
