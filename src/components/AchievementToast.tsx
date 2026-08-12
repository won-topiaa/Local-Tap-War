import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

interface AchievementToastProps {
  icon: string;
  title: string;
  onDone: () => void;
}

export function AchievementToast({ icon, title, onDone }: AchievementToastProps) {
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed top-20 left-1/2 z-[60] pointer-events-none"
      initial={{ opacity: 0, y: -30, x: '-50%' }}
      animate={{ opacity: 1, y: 0, x: '-50%' }}
      exit={{ opacity: 0, y: -20, x: '-50%' }}
    >
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className="text-[10px] font-bold opacity-80">업적 달성!</p>
          <p className="text-sm font-black">{title}</p>
        </div>
      </div>
    </motion.div>
  );
}

export function AchievementToastContainer({
  queue,
  onDismiss,
}: {
  queue: { icon: string; title: string }[];
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {queue.length > 0 && (
        <AchievementToast
          key={queue[0].title}
          icon={queue[0].icon}
          title={queue[0].title}
          onDone={onDismiss}
        />
      )}
    </AnimatePresence>
  );
}
