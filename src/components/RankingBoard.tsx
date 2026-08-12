import { motion } from 'framer-motion';

export interface RankEntry {
  name: string;
  taps: number;
  isMe: boolean;
}

interface RankingBoardProps {
  rankings: RankEntry[];
  isFever: boolean;
}

const medals = ['🥇', '🥈', '🥉'];
const barColors = [
  'from-yellow-400 to-amber-500',
  'from-gray-300 to-gray-400',
  'from-orange-300 to-orange-400',
];

export function RankingBoard({ rankings, isFever }: RankingBoardProps) {
  const maxTaps = Math.max(...rankings.map(r => r.taps), 1);

  return (
    <div className={`w-full max-w-md rounded-2xl p-4 backdrop-blur-sm ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-lg`}>
      <h3 className={`text-sm font-bold mb-3 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
        동네 랭킹
      </h3>
      <div className="space-y-2">
        {rankings.slice(0, 3).map((entry, i) => (
          <motion.div
            key={entry.name}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <span className="text-xl w-8 text-center">{medals[i]}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className={`text-sm font-bold ${entry.isMe ? (isFever ? 'text-yellow-300' : 'text-blue-600') : (isFever ? 'text-white' : 'text-gray-700')}`}>
                  {entry.name}
                  {entry.isMe && <span className="ml-1 text-xs opacity-70">(나)</span>}
                </span>
                <span className={`text-xs font-mono ${isFever ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {entry.taps.toLocaleString()}
                </span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${isFever ? 'bg-white/10' : 'bg-gray-200'}`}>
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${barColors[i]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(entry.taps / maxTaps) * 100}%` }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
