import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TapParticle } from './components/TapParticle';
import { RankingBoard, type RankEntry } from './components/RankingBoard';
import { ConquestToast } from './components/ConquestToast';
import { FeverOverlay } from './components/FeverOverlay';
import { useTapSync } from './hooks/useTapSync';

interface Particle {
  id: number;
  x: number;
  y: number;
  value: number;
}

const INITIAL_RANKINGS: RankEntry[] = [
  { name: '강남구', taps: 1254300, isMe: false },
  { name: '역삼동', taps: 1254300, isMe: true },
  { name: '서초구', taps: 1198700, isMe: false },
];

const RANK_MESSAGES = [
  '🏆 역삼동 1위 탈환!',
  '🥈 역삼동 2위 진입!',
  '🥉 역삼동 3위 달성!',
];

let particleId = 0;

export default function App() {
  const [totalTaps, setTotalTaps] = useState(INITIAL_RANKINGS[1].taps);
  const [myTaps, setMyTaps] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [rankings, setRankings] = useState<RankEntry[]>(INITIAL_RANKINGS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRank, setLastRank] = useState(1);

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addTap } = useTapSync({
    intervalMs: 2000,
    onSync: async (count) => {
      // Replace with actual API call: await fetch('/api/taps', { method: 'POST', body: JSON.stringify({ count }) })
      console.log(`[useTapSync] batched ${count} taps`);
    },
  });

  const updateRankings = useCallback((newTotal: number) => {
    const updated = rankings.map((r) =>
      r.isMe ? { ...r, taps: newTotal } : r
    );
    updated.sort((a, b) => b.taps - a.taps);
    const myNewRank = updated.findIndex((r) => r.isMe);

    if (myNewRank < lastRank && myNewRank < 3) {
      setToastMessage(RANK_MESSAGES[myNewRank]);
      setLastRank(myNewRank);
    }

    setRankings(updated);
  }, [rankings, lastRank]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => {
      e.preventDefault();

      let clientX = 0;
      let clientY = 0;
      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const nextCombo = combo + 1;
      const isNowFever = nextCombo >= 50;
      const tapValue = isNowFever ? 3 : 1;

      setCombo(nextCombo);
      setIsFever(isNowFever);
      setTotalTaps((prev) => {
        const next = prev + tapValue;
        updateRankings(next);
        return next;
      });
      setMyTaps((prev) => prev + tapValue);

      addTap(tapValue);

      const id = ++particleId;
      setParticles((prev) => [...prev, { id, x: clientX - 15, y: clientY - 30, value: tapValue }]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 750);

      if (navigator.vibrate) {
        navigator.vibrate(isNowFever ? [20, 10, 20] : 15);
      }

      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
      comboTimeoutRef.current = setTimeout(() => {
        setCombo(0);
        setIsFever(false);
      }, 1000);
    },
    [combo, addTap, updateRankings],
  );

  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, []);

  const comboProgress = Math.min(combo / 50, 1);

  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-between p-4 font-sans overflow-hidden relative"
      animate={{
        backgroundColor: isFever ? '#1e1b4b' : '#f9fafb',
      }}
      transition={{ duration: 0.5 }}
    >
      <FeverOverlay active={isFever} />

      {/* Particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <TapParticle key={p.id} x={p.x} y={p.y} value={p.value} isFever={isFever} />
        ))}
      </AnimatePresence>

      {/* Conquest Toast */}
      <ConquestToast message={toastMessage} onDone={() => setToastMessage(null)} />

      {/* Header */}
      <header className="w-full max-w-md mt-6 flex justify-between items-center z-10">
        <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
          <span className="text-lg font-extrabold text-blue-600">📍 역삼동</span>
        </div>

        <AnimatePresence>
          {combo > 10 && (
            <motion.div
              className={`px-4 py-1 rounded-full font-black text-lg italic ${
                isFever ? 'text-yellow-400 bg-red-600' : 'text-white bg-blue-500'
              }`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: 1,
                scale: isFever ? [1, 1.15, 1] : 1,
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={
                isFever
                  ? { scale: { repeat: Infinity, duration: 0.4 } }
                  : { duration: 0.2 }
              }
            >
              {combo} COMBO!
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main */}
      <main className="w-full max-w-md flex flex-col items-center justify-center flex-1 z-10">
        <div className="text-center mb-8">
          <p className={`text-sm mb-1 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
            우리 동네 총 탭 수
          </p>
          <motion.p
            className={`text-5xl font-black tracking-tighter ${isFever ? 'text-white' : 'text-gray-800'}`}
            style={isFever ? { textShadow: '0 0 20px rgba(255,255,255,0.5)' } : undefined}
            key={totalTaps}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.1 }}
          >
            {totalTaps.toLocaleString()}
          </motion.p>
        </div>

        {/* Combo progress ring */}
        {combo > 0 && combo < 50 && (
          <div className="mb-3 flex items-center gap-2">
            <div className={`w-32 h-2 rounded-full overflow-hidden ${isFever ? 'bg-white/20' : 'bg-gray-200'}`}>
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                animate={{ width: `${comboProgress * 100}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
            <span className={`text-xs font-bold ${isFever ? 'text-indigo-200' : 'text-gray-400'}`}>
              {combo}/50
            </span>
          </div>
        )}

        {/* Tap Button */}
        <motion.button
          onMouseDown={handleTap}
          onTouchStart={handleTap}
          className={`w-64 h-64 sm:w-72 sm:h-72 rounded-full flex items-center justify-center select-none outline-none border-none cursor-pointer ${
            isFever
              ? 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'
              : 'bg-gradient-to-b from-blue-400 to-blue-600'
          }`}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          animate={
            isFever
              ? {
                  scale: [1, 1.04, 1, 1.06, 1],
                  boxShadow: [
                    '0 0 40px rgba(239,68,68,0.4)',
                    '0 0 80px rgba(239,68,68,0.8)',
                    '0 0 40px rgba(239,68,68,0.4)',
                  ],
                }
              : {
                  scale: 1,
                  boxShadow: '0 20px 50px rgba(37,99,235,0.4)',
                }
          }
          transition={
            isFever
              ? { repeat: Infinity, duration: 0.8, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
          whileTap={{ scale: 0.92 }}
        >
          <div className="text-white text-center pointer-events-none">
            <p className="text-xl font-bold opacity-90">
              {isFever ? '🔥 FEVER 🔥' : 'TAP TO'}
            </p>
            <p className="text-4xl sm:text-5xl font-black mt-1">
              {isFever ? 'x3 POINTS' : 'CONQUER'}
            </p>
          </div>
        </motion.button>

        <div className="mt-6 text-center">
          <p className={`font-medium ${isFever ? 'text-indigo-100' : 'text-gray-500'}`}>
            내 기여도:{' '}
            <span className="font-bold text-xl">{myTaps.toLocaleString()}</span>
          </p>
        </div>
      </main>

      {/* Ranking Board */}
      <footer className="w-full max-w-md mb-6 z-10">
        <RankingBoard rankings={rankings} isFever={isFever} />
      </footer>
    </motion.div>
  );
}
