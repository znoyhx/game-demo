import { useEffect, useRef } from 'react';

import { StartupController } from '../../core/controllers/startupController';
import { LocalStorageAdapter } from '../../core/persistence/storageAdapter';
import { gameStore } from '../../core/state';

export function StartupBootstrap() {
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    const controller = new StartupController({
      storageAdapter: new LocalStorageAdapter(),
      store: gameStore,
    });

    void controller.initialize();
  }, []);

  return null;
}
