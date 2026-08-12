import { motion } from 'framer-motion';
import type { DailyMission } from '../data/missions';

interface DailyMissionsProps {
  missions: DailyMission[];
  onClaim: (index: number) => void;
  isFever: boolean;
}

export function DailyMissions({ missions, onClaim, isFever }: DailyMissionsProps) {
  return (
    <div className={`rounded-2xl p-4 backdrop-blur-sm ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-lg`}>
      <h3 className={`text-sm font-bold mb-3 flex items-center gap-1.5 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
        📋 일일 미션
      </h3>
      <div className="space-y-2.5">
        {missions.map((m, i) => {
          const progress = Math.min(m.progress / m.target, 1);
          return (
            <div key={m.templateId} className="flex items-center gap-2.5">
              <span className="text-lg">{m.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-xs font-bold truncate ${
                    m.claimed ? (isFever ? 'text-green-300 line-through' : 'text-green-500 line-through') :
                    (isFever ? 'text-white' : 'text-gray-700')
                  }`}>
                    {m.title}
                  </span>
                  <span className={`text-[10px] ml-1 ${isFever ? 'text-yellow-300' : 'text-amber-500'}`}>
                    +{m.xpReward} XP
                  </span>
                </div>
                <div className={`h-1.5 rounded-full overflow-hidden ${isFever ? 'bg-white/15' : 'bg-gray-200'}`}>
                  <motion.div
                    className={`h-full rounded-full ${m.claimed ? 'bg-green-400' : 'bg-gradient-to-r from-blue-400 to-purple-500'}`}
                    animate={{ width: `${progress * 100}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              </div>
              {m.completed && !m.claimed && (
                <button
                  onClick={() => onClaim(i)}
                  className="px-2.5 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black rounded-full shadow-sm active:scale-95 transition-transform"
                >
                  받기
                </button>
              )}
              {m.claimed && (
                <span className="text-green-400 text-sm">✓</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
