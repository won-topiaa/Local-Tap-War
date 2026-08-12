import { motion } from 'framer-motion';
import { getTier } from '../data/levels';

interface LevelBadgeProps {
  level: number;
  currentXp: number;
  requiredXp: number;
  isFever: boolean;
}

export function LevelBadge({ level, currentXp, requiredXp, isFever }: LevelBadgeProps) {
  const tier = getTier(level);
  const isMaxLevel = level >= 99;
  const progress = isMaxLevel ? 1 : (requiredXp > 0 ? Math.min(currentXp / requiredXp, 1) : 0);

  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md"
        style={{ backgroundColor: tier.color }}
      >
        {level}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[10px] font-bold truncate ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
            {tier.title}
          </span>
          <span className={`text-[10px] ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>
            {isMaxLevel ? 'MAX' : `${currentXp}/${requiredXp}`}
          </span>
        </div>
        <div className={`h-1.5 rounded-full overflow-hidden ${isFever ? 'bg-white/15' : 'bg-gray-200'}`}>
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: tier.color }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
