import { motion } from 'framer-motion';
import { ACHIEVEMENTS } from '../data/achievements';

interface StatsPanelProps {
  stats: {
    totalTaps: number;
    bestCombo: number;
    feverCount: number;
    streakDays: number;
    level: number;
    totalXp: number;
    missionsCompleted: number;
    powerUpsUsed: number;
  };
  unlockedAchievements: string[];
  isFever: boolean;
}

export function StatsPanel({ stats, unlockedAchievements, isFever }: StatsPanelProps) {
  const statItems = [
    { label: '총 탭 수', value: stats.totalTaps.toLocaleString(), icon: '👊' },
    { label: '최고 콤보', value: stats.bestCombo.toLocaleString(), icon: '🔗' },
    { label: '피버 진입', value: `${stats.feverCount}회`, icon: '🔥' },
    { label: '연속 출석', value: `${stats.streakDays}일`, icon: '📅' },
    { label: '레벨', value: `Lv.${stats.level}`, icon: '⭐' },
    { label: '총 경험치', value: stats.totalXp.toLocaleString(), icon: '✨' },
    { label: '미션 완료', value: `${stats.missionsCompleted}개`, icon: '📋' },
    { label: '파워업 사용', value: `${stats.powerUpsUsed}회`, icon: '🧪' },
  ];

  return (
    <div className="space-y-4 overflow-y-auto max-h-full pb-4">
      {/* Stats grid */}
      <div className={`rounded-2xl p-4 backdrop-blur-sm ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-lg`}>
        <h3 className={`text-sm font-bold mb-3 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
          내 통계
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {statItems.map((item, i) => (
            <motion.div
              key={item.label}
              className={`rounded-xl p-3 ${isFever ? 'bg-white/5' : 'bg-gray-50'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{item.icon}</span>
                <span className={`text-[10px] ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>
                  {item.label}
                </span>
              </div>
              <p className={`text-lg font-black ${isFever ? 'text-white' : 'text-gray-800'}`}>
                {item.value}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className={`rounded-2xl p-4 backdrop-blur-sm ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-lg`}>
        <h3 className={`text-sm font-bold mb-3 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
          업적 ({unlockedAchievements.length}/{ACHIEVEMENTS.length})
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {ACHIEVEMENTS.map((a) => {
            const unlocked = unlockedAchievements.includes(a.id);
            return (
              <motion.div
                key={a.id}
                className={`flex flex-col items-center p-2 rounded-xl ${
                  unlocked
                    ? (isFever ? 'bg-white/10' : 'bg-amber-50')
                    : (isFever ? 'bg-white/5 opacity-40' : 'bg-gray-100 opacity-40')
                }`}
                whileTap={unlocked ? { scale: 0.95 } : undefined}
              >
                <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{a.icon}</span>
                <span className={`text-[9px] font-bold text-center mt-1 leading-tight ${
                  isFever ? 'text-white' : 'text-gray-600'
                }`}>
                  {a.title}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
