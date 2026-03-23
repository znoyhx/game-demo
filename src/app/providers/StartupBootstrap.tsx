import { useEffect, useRef } from 'react';

import { appStorageAdapter } from '../runtime/appRuntime';
import { StartupController } from '../../core/controllers/startupController';
import { gameEventBus } from '../../core/logging';
import { gameStore } from '../../core/state';

export function StartupBootstrap() {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    const controller = new StartupController({
      eventBus: gameEventBus,
      storageAdapter: appStorageAdapter,
      store: gameStore,
    });

    void controller.initialize();
  }, []);

  return null;
}
