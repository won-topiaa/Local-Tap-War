import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TapParticle } from './components/TapParticle';
import { RankingBoard } from './components/RankingBoard';
import { ConquestToast } from './components/ConquestToast';
import { FeverOverlay } from './components/FeverOverlay';
import { NeighborhoodMap } from './components/NeighborhoodMap';
import { neighborhoods as initialNeighborhoods } from './data/neighborhoods';
import { useTapSync } from './hooks/useTapSync';

interface Particle {
  id: number;
  x: number;
  y: number;
  value: number;
}

const MY_NEIGHBORHOOD_ID = 'yeoksam';

const RANK_MESSAGES: Record<number, string> = {
  0: '🏆 역삼동 1위 탈환!',
  1: '🥈 역삼동 2위 진입!',
  2: '🥉 역삼동 3위 달성!',
};

let particleId = 0;

export default function App() {
  const [neighborhoodData, setNeighborhoodData] = useState(initialNeighborhoods);
  const myData = neighborhoodData.find((n) => n.id === MY_NEIGHBORHOOD_ID)!;
  const [myTaps, setMyTaps] = useState(0);
  const [combo, setCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastRank, setLastRank] = useState(() => {
    const sorted = [...initialNeighborhoods].sort((a, b) => b.taps - a.taps);
    return sorted.findIndex((n) => n.id === MY_NEIGHBORHOOD_ID);
  });
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(MY_NEIGHBORHOOD_ID);
  const [showMap, setShowMap] = useState(true);

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { addTap } = useTapSync({
    intervalMs: 2000,
    onSync: async (count) => {
      console.log(`[useTapSync] batched ${count} taps`);
    },
  });

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
      setMyTaps((prev) => prev + tapValue);

      setNeighborhoodData((prev) => {
        const updated = prev.map((n) =>
          n.id === MY_NEIGHBORHOOD_ID ? { ...n, taps: n.taps + tapValue } : n
        );
        const sorted = [...updated].sort((a, b) => b.taps - a.taps);
        const myNewRank = sorted.findIndex((n) => n.id === MY_NEIGHBORHOOD_ID);

        if (myNewRank < lastRank && myNewRank <= 2) {
          setToastMessage(RANK_MESSAGES[myNewRank] ?? `역삼동 ${myNewRank + 1}위!`);
          setLastRank(myNewRank);
        }

        return updated;
      });

      addTap(tapValue);

      if ((window as any).__mapTriggerRipple) {
        (window as any).__mapTriggerRipple();
      }

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
    [combo, addTap, lastRank],
  );

  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, []);

  const comboProgress = Math.min(combo / 50, 1);

  const rankings = [...neighborhoodData]
    .sort((a, b) => b.taps - a.taps)
    .slice(0, 3)
    .map((n) => ({
      name: n.name,
      taps: n.taps,
      isMe: n.id === MY_NEIGHBORHOOD_ID,
    }));

  const selectedInfo = neighborhoodData.find((n) => n.id === selectedNeighborhood);

  return (
    <motion.div
      className="h-screen flex flex-col font-sans overflow-hidden relative"
      animate={{ backgroundColor: isFever ? '#1e1b4b' : '#f9fafb' }}
      transition={{ duration: 0.5 }}
    >
      <FeverOverlay active={isFever} />

      <AnimatePresence>
        {particles.map((p) => (
          <TapParticle key={p.id} x={p.x} y={p.y} value={p.value} isFever={isFever} />
        ))}
      </AnimatePresence>

      <ConquestToast message={toastMessage} onDone={() => setToastMessage(null)} />

      {/* Header */}
      <header className="flex-none flex items-center justify-between px-4 pt-4 pb-2 z-20">
        <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
          <span className="text-lg font-extrabold text-blue-600">📍 역삼동</span>
        </div>

        <div className="flex items-center gap-2">
          <AnimatePresence>
            {combo > 10 && (
              <motion.div
                className={`px-3 py-1 rounded-full font-black text-base italic ${
                  isFever ? 'text-yellow-400 bg-red-600' : 'text-white bg-blue-500'
                }`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: isFever ? [1, 1.15, 1] : 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={isFever ? { scale: { repeat: Infinity, duration: 0.4 } } : { duration: 0.2 }}
              >
                {combo} COMBO!
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setShowMap((v) => !v)}
            className={`px-3 py-2 rounded-full text-sm font-bold backdrop-blur-sm shadow-sm transition-colors ${
              isFever ? 'bg-white/10 text-white' : 'bg-white/80 text-gray-600'
            }`}
          >
            {showMap ? '🗺️' : '📊'}
          </button>
        </div>
      </header>

      {/* Map area */}
      <div className="flex-1 min-h-0 px-4 pb-2 z-10">
        {showMap ? (
          <NeighborhoodMap
            neighborhoods={neighborhoodData}
            myNeighborhoodId={MY_NEIGHBORHOOD_ID}
            isFever={isFever}
            onSelectNeighborhood={setSelectedNeighborhood}
            selectedId={selectedNeighborhood}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <RankingBoard rankings={rankings} isFever={isFever} />
          </div>
        )}
      </div>

      {/* Selected neighborhood info */}
      {showMap && selectedInfo && (
        <div className={`flex-none px-4 pb-2 z-20`}>
          <motion.div
            className={`rounded-xl px-4 py-2 flex items-center justify-between backdrop-blur-sm ${
              isFever ? 'bg-white/10' : 'bg-white/70'
            } shadow-sm`}
            layout
          >
            <div>
              <p className={`text-xs ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>
                {selectedInfo.id === MY_NEIGHBORHOOD_ID ? '내 동네' : '상대 동네'}
              </p>
              <p className={`text-lg font-black ${
                selectedInfo.id === MY_NEIGHBORHOOD_ID
                  ? (isFever ? 'text-yellow-300' : 'text-blue-600')
                  : (isFever ? 'text-white' : 'text-gray-800')
              }`}>
                {selectedInfo.name}
              </p>
            </div>
            <p className={`text-2xl font-black tracking-tight ${isFever ? 'text-white' : 'text-gray-800'}`}>
              {selectedInfo.taps.toLocaleString()}
            </p>
          </motion.div>
        </div>
      )}

      {/* Bottom panel: tap button + stats */}
      <div className="flex-none px-4 pb-4 z-20">
        <div className={`rounded-2xl p-4 backdrop-blur-md ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-xl`}>
          {/* Stats row */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`text-xs ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>총 탭 수</p>
              <motion.p
                className={`text-2xl font-black tracking-tight ${isFever ? 'text-white' : 'text-gray-800'}`}
                style={isFever ? { textShadow: '0 0 12px rgba(255,255,255,0.4)' } : undefined}
                key={myData.taps}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.08 }}
              >
                {myData.taps.toLocaleString()}
              </motion.p>
            </div>
            <div className="text-right">
              <p className={`text-xs ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>내 기여도</p>
              <p className={`text-2xl font-black ${isFever ? 'text-yellow-300' : 'text-blue-600'}`}>
                {myTaps.toLocaleString()}
              </p>
            </div>
          </div>

          {/* Combo progress */}
          {combo > 0 && combo < 50 && (
            <div className="mb-3 flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isFever ? 'bg-white/20' : 'bg-gray-200'}`}>
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

          {/* Tap button */}
          <motion.button
            onMouseDown={handleTap}
            onTouchStart={handleTap}
            className={`w-full py-5 rounded-2xl flex items-center justify-center select-none outline-none border-none cursor-pointer ${
              isFever
                ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600'
                : 'bg-gradient-to-r from-blue-500 to-blue-600'
            }`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
            animate={
              isFever
                ? {
                    scale: [1, 1.02, 1],
                    boxShadow: [
                      '0 0 20px rgba(239,68,68,0.3)',
                      '0 0 40px rgba(239,68,68,0.6)',
                      '0 0 20px rgba(239,68,68,0.3)',
                    ],
                  }
                : { scale: 1, boxShadow: '0 8px 30px rgba(37,99,235,0.3)' }
            }
            transition={isFever ? { repeat: Infinity, duration: 0.6 } : { duration: 0.2 }}
            whileTap={{ scale: 0.96 }}
          >
            <span className="text-white text-center pointer-events-none font-black text-2xl">
              {isFever ? '🔥 FEVER x3 🔥' : '👊 TAP TO CONQUER'}
            </span>
          </motion.button>
        </div>
      </div>

      <style>{`
        .neighborhood-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: inherit;
          font-weight: 700;
        }
        .neighborhood-label::before {
          display: none !important;
        }
        .leaflet-container {
          background: transparent !important;
        }
      `}</style>
    </motion.div>
  );
}
