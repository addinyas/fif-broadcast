import { useState, useEffect, useCallback } from 'react';
import { broadcastService } from '../services/broadcastService';
import { getSocket } from '../services/socketService';
import type { BroadcastProgress } from '../types';

export function useBroadcastProgress() {
  const [progress, setProgress] = useState<BroadcastProgress | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchProgress = useCallback(async () => {
    try {
      const data = await broadcastService.getProgress();
      setProgress(data);
    } catch {
      // silent
    }
  }, []);

  const cancel = useCallback(async () => {
    setCancelling(true);
    try {
      const result = await broadcastService.cancelPending();
      await fetchProgress();
      return result;
    } finally {
      setCancelling(false);
    }
  }, [fetchProgress]);

  useEffect(() => {
    fetchProgress();
    const interval = setInterval(fetchProgress, 5000);

    const socket = getSocket();
    const onProgress = (data: BroadcastProgress) => setProgress(data);
    const onStatus = () => fetchProgress();

    socket.on('broadcast:progress', onProgress);
    socket.on('broadcast:status', onStatus);

    return () => {
      clearInterval(interval);
      socket.off('broadcast:progress', onProgress);
      socket.off('broadcast:status', onStatus);
    };
  }, [fetchProgress]);

  return { progress, cancelling, cancel };
}
