import { useState, useCallback, useRef, useEffect } from 'react';

export type PowerUpType = 'double' | 'mega' | 'comboFreeze' | 'autoTap';

export interface PowerUp {
  type: PowerUpType;
  icon: string;
  name: string;
  duration: number;
}

const POWER_UPS: PowerUp[] = [
  { type: 'double', icon: '✨', name: '2x 점수', duration: 10000 },
  { type: 'mega', icon: '💎', name: '메가 탭', duration: 5000 },
  { type: 'comboFreeze', icon: '❄️', name: '콤보 유지', duration: 15000 },
  { type: 'autoTap', icon: '🤖', name: '오토 탭', duration: 8000 },
];

interface PowerUpState {
  active: PowerUp | null;
  remaining: number;
  dropReady: boolean;
}

export function usePowerUp(onAutoTap?: () => void) {
  const [state, setState] = useState<PowerUpState>({
    active: null,
    remaining: 0,
    dropReady: false,
  });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTapRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapCountRef = useRef(0);
  const onAutoTapRef = useRef(onAutoTap);
  onAutoTapRef.current = onAutoTap;

  const clearTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoTapRef.current) { clearInterval(autoTapRef.current); autoTapRef.current = null; }
  }, []);

  const activate = useCallback((powerUp: PowerUp) => {
    clearTimers();
    const endTime = Date.now() + powerUp.duration;

    setState({ active: powerUp, remaining: powerUp.duration, dropReady: false });

    timerRef.current = setInterval(() => {
      const left = Math.max(0, endTime - Date.now());
      if (left <= 0) {
        clearTimers();
        setState({ active: null, remaining: 0, dropReady: false });
      } else {
        setState((prev) => ({ ...prev, remaining: left }));
      }
    }, 100);

    if (powerUp.type === 'autoTap') {
      autoTapRef.current = setInterval(() => {
        onAutoTapRef.current?.();
      }, 200);
    }
  }, [clearTimers]);

  const recordTap = useCallback(() => {
    tapCountRef.current++;
    if (tapCountRef.current % 150 === 0 && !state.active) {
      setState((prev) => ({ ...prev, dropReady: true }));
    }
  }, [state.active]);

  const collectDrop = useCallback(() => {
    if (!state.dropReady) return null;
    const pick = POWER_UPS[Math.floor(Math.random() * POWER_UPS.length)];
    activate(pick);
    return pick;
  }, [state.dropReady, activate]);

  const getMultiplier = useCallback((): number => {
    if (!state.active) return 1;
    if (state.active.type === 'double') return 2;
    if (state.active.type === 'mega') return 10;
    return 1;
  }, [state.active]);

  const isComboFrozen = useCallback((): boolean => {
    return state.active?.type === 'comboFreeze';
  }, [state.active]);

  useEffect(() => clearTimers, [clearTimers]);

  return {
    active: state.active,
    remaining: state.remaining,
    dropReady: state.dropReady,
    recordTap,
    collectDrop,
    getMultiplier,
    isComboFrozen,
  };
}
