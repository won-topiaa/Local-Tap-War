import { motion, AnimatePresence } from 'framer-motion';
import type { PowerUp } from '../hooks/usePowerUp';

interface PowerUpIndicatorProps {
  active: PowerUp | null;
  remaining: number;
  dropReady: boolean;
  onCollect: () => void;
}

export function PowerUpIndicator({ active, remaining, dropReady, onCollect }: PowerUpIndicatorProps) {
  return (
    <>
      {/* Active power-up timer */}
      <AnimatePresence>
        {active && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
            initial={{ opacity: 0, scale: 0.5, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -10 }}
          >
            <span className="text-base">{active.icon}</span>
            <span className="text-xs font-black">{active.name}</span>
            <span className="text-[10px] font-mono opacity-80">
              {Math.ceil(remaining / 1000)}s
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop ready - collectible */}
      <AnimatePresence>
        {dropReady && !active && (
          <motion.button
            onClick={onCollect}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-black text-sm shadow-xl"
            initial={{ opacity: 0, scale: 0, rotate: -180 }}
            animate={{
              opacity: 1,
              scale: [1, 1.1, 1],
              rotate: 0,
            }}
            exit={{ opacity: 0, scale: 0, rotate: 180 }}
            transition={{
              scale: { repeat: Infinity, duration: 1.5 },
            }}
          >
            🎁 파워업 획득!
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
