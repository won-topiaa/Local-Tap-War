import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TapParticle } from './components/TapParticle';
import { RankingBoard } from './components/RankingBoard';
import { ConquestToast } from './components/ConquestToast';
import { FeverOverlay } from './components/FeverOverlay';
import { NeighborhoodMap } from './components/NeighborhoodMap';
import { LevelBadge } from './components/LevelBadge';
import { AchievementToastContainer } from './components/AchievementToast';
import { DailyMissions } from './components/DailyMissions';
import { PowerUpIndicator } from './components/PowerUpIndicator';
import { StatsPanel } from './components/StatsPanel';
import { SettingsPanel, type GameSettings } from './components/SettingsPanel';
import { Onboarding } from './components/Onboarding';
import { KeycapButton, KeycapStyles } from './components/KeycapButton';
import { KeycapDesigner, type KeycapDesign } from './components/KeycapDesigner';
import { neighborhoods as initialNeighborhoods } from './data/neighborhoods';
import { calculateLevel } from './data/levels';
import { ACHIEVEMENTS, type AchievementStats } from './data/achievements';
import { generateDailyMissions, getDaySeed, type DailyMission } from './data/missions';
import { useTapSync } from './hooks/useTapSync';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useSound } from './hooks/useSound';
import { usePowerUp } from './hooks/usePowerUp';

interface Particle {
  id: number;
  x: number;
  y: number;
  value: number;
}

interface SavedState {
  totalXp: number;
  totalTaps: number;
  bestCombo: number;
  feverCount: number;
  streakDays: number;
  lastPlayDate: string;
  unlockedAchievements: string[];
  missionsCompleted: number;
  powerUpsUsed: number;
  hasOnboarded: boolean;
}

const DEFAULT_STATE: SavedState = {
  totalXp: 0,
  totalTaps: 0,
  bestCombo: 0,
  feverCount: 0,
  streakDays: 1,
  lastPlayDate: '',
  unlockedAchievements: [],
  missionsCompleted: 0,
  powerUpsUsed: 0,
  hasOnboarded: false,
};

type TabId = 'map' | 'missions' | 'stats' | 'settings';
const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'map', icon: '🗺️', label: '지도' },
  { id: 'missions', icon: '📋', label: '미션' },
  { id: 'stats', icon: '📊', label: '통계' },
  { id: 'settings', icon: '⚙️', label: '설정' },
];

const MY_NEIGHBORHOOD_ID = 'yeoksam';

const RANK_MESSAGES: Record<number, string> = {
  0: '🏆 역삼동 1위 탈환!',
  1: '🥈 역삼동 2위 진입!',
  2: '🥉 역삼동 3위 달성!',
};

let particleId = 0;

export default function App() {
  // --- Persisted state ---
  const [saved, setSaved] = useLocalStorage<SavedState>('tapwar_state', DEFAULT_STATE);
  const [settings, setSettings] = useLocalStorage<GameSettings>('tapwar_settings', {
    sound: true,
    haptic: true,
    showMap: true,
  });
  const [missionState, setMissionState] = useLocalStorage<{ seed: number; missions: DailyMission[] }>(
    'tapwar_missions',
    { seed: 0, missions: [] },
  );

  // --- Session state ---
  const [neighborhoodData, setNeighborhoodData] = useState(() =>
    initialNeighborhoods.map((n) =>
      n.id === MY_NEIGHBORHOOD_ID ? { ...n, taps: n.taps + saved.totalTaps } : n,
    ),
  );
  const myData = neighborhoodData.find((n) => n.id === MY_NEIGHBORHOOD_ID)!;
  const sessionTapsRef = useRef(0);
  const sessionXpRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const [isFever, setIsFever] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [achievementQueue, setAchievementQueue] = useState<{ icon: string; title: string }[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('map');
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(MY_NEIGHBORHOOD_ID);
  const [showOnboarding, setShowOnboarding] = useState(!saved.hasOnboarded);
  const [keycapDesigns, setKeycapDesigns] = useLocalStorage<KeycapDesign[]>('tapwar_keycap_designs', []);
  const [activeKeycapIds, setActiveKeycapIds] = useLocalStorage<(string | null)[]>('tapwar_active_keycaps', [null, null, null]);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerSlot, setDesignerSlot] = useState(0);

  const comboTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLevelRef = useRef(calculateLevel(saved.totalXp).level);
  const lastRankRef = useRef(
    [...initialNeighborhoods].sort((a, b) => b.taps - a.taps).findIndex((n) => n.id === MY_NEIGHBORHOOD_ID)
  );
  const isFeverRef = useRef(false);

  // --- Hooks ---
  const playSound = useSound(settings.sound);

  const { addTap } = useTapSync({
    intervalMs: 2000,
    onSync: async (count) => {
      console.log(`[useTapSync] batched ${count} taps`);
    },
  });

  const tapCoreRef = useRef<(e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => void>(() => {});

  const handleAutoTap = useCallback(() => {
    const idx = Math.floor(Math.random() * 3);
    const btn = document.getElementById(`tap-button-${idx}`);
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const fakeEvent = {
        preventDefault: () => {},
        clientX: rect.left + rect.width / 2 + (Math.random() - 0.5) * 30,
        clientY: rect.top + rect.height / 2 + (Math.random() - 0.5) * 15,
      } as unknown as React.MouseEvent<HTMLButtonElement>;
      tapCoreRef.current(fakeEvent);
    }
  }, []);

  const powerUp = usePowerUp(handleAutoTap);

  // --- Daily missions init ---
  const todaySeed = getDaySeed();
  useEffect(() => {
    if (missionState.seed !== todaySeed) {
      setMissionState({ seed: todaySeed, missions: generateDailyMissions(todaySeed) });
    }
  }, [todaySeed, missionState.seed, setMissionState]);

  // --- Streak calculation ---
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (saved.lastPlayDate !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const newStreak = saved.lastPlayDate === yesterday ? saved.streakDays + 1 : 1;
      setSaved((prev) => ({ ...prev, lastPlayDate: today, streakDays: newStreak }));
    }
  }, [saved.lastPlayDate, saved.streakDays, setSaved]);

  // --- Achievement checker ---
  const checkAchievements = useCallback(
    (stats: AchievementStats) => {
      const newUnlocks: { icon: string; title: string }[] = [];
      ACHIEVEMENTS.forEach((a) => {
        if (!saved.unlockedAchievements.includes(a.id) && a.condition(stats)) {
          newUnlocks.push({ icon: a.icon, title: a.title });
          setSaved((prev) => ({
            ...prev,
            unlockedAchievements: [...prev.unlockedAchievements, a.id],
          }));
        }
      });
      if (newUnlocks.length > 0) {
        setAchievementQueue((prev) => [...prev, ...newUnlocks]);
        playSound('achievement');
      }
    },
    [saved.unlockedAchievements, setSaved, playSound],
  );

  // --- Core tap handler ---
  const handleTapCore = useCallback(
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
      const baseTapValue = isNowFever ? 3 : 1;
      const multiplier = powerUp.getMultiplier();
      const tapValue = baseTapValue * multiplier;
      const xpGained = tapValue;

      const feverJustStarted = isNowFever && !isFeverRef.current;

      if (feverJustStarted) {
        setSaved((prev) => ({ ...prev, feverCount: prev.feverCount + 1 }));
        playSound('fever');
      } else if (nextCombo % 10 === 0 && nextCombo > 0) {
        playSound('combo');
      } else {
        playSound('tap');
      }

      setCombo(nextCombo);
      setIsFever(isNowFever);
      isFeverRef.current = isNowFever;
      sessionTapsRef.current += tapValue;
      sessionXpRef.current += xpGained;

      setSaved((prev) => {
        const newState = {
          ...prev,
          totalTaps: prev.totalTaps + tapValue,
          totalXp: prev.totalXp + xpGained,
          bestCombo: Math.max(prev.bestCombo, nextCombo),
        };
        const newLevel = calculateLevel(newState.totalXp).level;
        if (newLevel > prevLevelRef.current) {
          prevLevelRef.current = newLevel;
          playSound('levelUp');
        }
        return newState;
      });

      setNeighborhoodData((prev) => {
        const updated = prev.map((n) =>
          n.id === MY_NEIGHBORHOOD_ID ? { ...n, taps: n.taps + tapValue } : n,
        );
        const sorted = [...updated].sort((a, b) => b.taps - a.taps);
        const myNewRank = sorted.findIndex((n) => n.id === MY_NEIGHBORHOOD_ID);
        if (myNewRank < lastRankRef.current && myNewRank <= 2) {
          setToastMessage(RANK_MESSAGES[myNewRank] ?? `역삼동 ${myNewRank + 1}위!`);
          lastRankRef.current = myNewRank;
        }
        return updated;
      });

      setMissionState((prev) => ({
        ...prev,
        missions: prev.missions.map((m) => {
          if (m.claimed) return m;
          let newProgress = m.progress;
          if (m.statKey === 'sessionTaps') newProgress += tapValue;
          if (m.statKey === 'sessionBestCombo') newProgress = Math.max(newProgress, nextCombo);
          if (m.statKey === 'sessionFeverCount' && feverJustStarted) newProgress += 1;
          if (m.statKey === 'sessionXp') newProgress += xpGained;
          const completed = newProgress >= m.target;
          if (completed && !m.completed) playSound('missionComplete');
          return { ...m, progress: newProgress, completed };
        }),
      }));

      addTap(tapValue);
      powerUp.recordTap();

      if ((window as any).__mapTriggerRipple) {
        (window as any).__mapTriggerRipple();
      }

      const id = ++particleId;
      const displayValue = tapValue;
      setParticles((prev) => [...prev, { id, x: clientX - 15, y: clientY - 30, value: displayValue }]);
      setTimeout(() => {
        setParticles((prev) => prev.filter((p) => p.id !== id));
      }, 750);

      if (settings.haptic && navigator.vibrate) {
        navigator.vibrate(isNowFever ? [20, 10, 20] : 15);
      }

      if (!powerUp.isComboFrozen()) {
        if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
        comboTimeoutRef.current = setTimeout(() => {
          setCombo(0);
          setIsFever(false);
          isFeverRef.current = false;
        }, 1000);
      }
    },
    [combo, addTap, powerUp, settings.haptic, playSound, setSaved, setMissionState],
  );

  tapCoreRef.current = handleTapCore;

  // --- Check achievements periodically ---
  useEffect(() => {
    const levelInfo = calculateLevel(saved.totalXp);
    const stats: AchievementStats = {
      totalTaps: saved.totalTaps,
      bestCombo: saved.bestCombo,
      feverCount: saved.feverCount,
      totalPlaySessions: 1,
      streakDays: saved.streakDays,
      level: levelInfo.level,
      powerUpsUsed: saved.powerUpsUsed,
      missionsCompleted: saved.missionsCompleted,
    };
    checkAchievements(stats);
  }, [saved.totalTaps, saved.bestCombo, saved.feverCount, saved.streakDays, saved.totalXp, saved.powerUpsUsed, saved.missionsCompleted, checkAchievements]);

  useEffect(() => {
    return () => {
      if (comboTimeoutRef.current) clearTimeout(comboTimeoutRef.current);
    };
  }, []);

  // --- Mission claim ---
  const handleClaimMission = useCallback(
    (index: number) => {
      const mission = missionState.missions[index];
      if (!mission || !mission.completed || mission.claimed) return;

      setSaved((prev) => ({
        ...prev,
        totalXp: prev.totalXp + mission.xpReward,
        missionsCompleted: prev.missionsCompleted + 1,
      }));
      setMissionState((prev) => ({
        ...prev,
        missions: prev.missions.map((m, i) => (i === index ? { ...m, claimed: true } : m)),
      }));
      playSound('achievement');
    },
    [missionState.missions, setSaved, setMissionState, playSound],
  );

  // --- Power-up collect ---
  const handleCollectPowerUp = useCallback(() => {
    const pu = powerUp.collectDrop();
    if (pu) {
      setSaved((prev) => ({ ...prev, powerUpsUsed: prev.powerUpsUsed + 1 }));
      playSound('powerUp');
    }
  }, [powerUp, setSaved, playSound]);

  // --- Reset ---
  const handleReset = useCallback(() => {
    setSaved(DEFAULT_STATE);
    setMissionState({ seed: todaySeed, missions: generateDailyMissions(todaySeed) });
    sessionTapsRef.current = 0;
    sessionXpRef.current = 0;
    setCombo(0);
    setIsFever(false);
    isFeverRef.current = false;
    setNeighborhoodData(initialNeighborhoods);
    prevLevelRef.current = 1;
    const sorted = [...initialNeighborhoods].sort((a, b) => b.taps - a.taps);
    lastRankRef.current = sorted.findIndex((n) => n.id === MY_NEIGHBORHOOD_ID);
  }, [setSaved, setMissionState, todaySeed]);

  // --- Derived ---
  const levelInfo = useMemo(() => calculateLevel(saved.totalXp), [saved.totalXp]);
  const comboProgress = Math.min(combo / 50, 1);

  const rankings = useMemo(() => {
    return [...neighborhoodData]
      .sort((a, b) => b.taps - a.taps)
      .slice(0, 3)
      .map((n) => ({
        name: n.name,
        taps: n.taps,
        isMe: n.id === MY_NEIGHBORHOOD_ID,
      }));
  }, [neighborhoodData]);

  const selectedInfo = neighborhoodData.find((n) => n.id === selectedNeighborhood);

  const keycapImages = useMemo(() => {
    return activeKeycapIds.map((id) => {
      if (!id) return null;
      return keycapDesigns.find((d) => d.id === id)?.imageData ?? null;
    });
  }, [activeKeycapIds, keycapDesigns]);

  const handleSaveDesign = useCallback((design: KeycapDesign) => {
    setKeycapDesigns((prev) => [...prev, design]);
  }, [setKeycapDesigns]);

  const handleSelectSlotDesign = useCallback((slotIndex: number, id: string | null) => {
    setActiveKeycapIds((prev) => {
      const next = [...prev];
      next[slotIndex] = id;
      return next;
    });
  }, [setActiveKeycapIds]);

  const handleDeleteDesign = useCallback((id: string) => {
    setKeycapDesigns((prev) => prev.filter((d) => d.id !== id));
    setActiveKeycapIds((prev) => prev.map((v) => (v === id ? null : v)));
  }, [setKeycapDesigns, setActiveKeycapIds]);

  // --- Onboarding ---
  if (showOnboarding) {
    return (
      <AnimatePresence>
        <Onboarding
          onComplete={() => {
            setShowOnboarding(false);
            setSaved((prev) => ({ ...prev, hasOnboarded: true }));
          }}
        />
      </AnimatePresence>
    );
  }

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
      <AchievementToastContainer
        queue={achievementQueue}
        onDismiss={() => setAchievementQueue((prev) => prev.slice(1))}
      />

      {/* Header */}
      <header className="flex-none px-4 pt-3 pb-1 z-20">
        <div className="flex items-center justify-between mb-2">
          <div className="inline-flex items-center px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-full shadow-sm">
            <span className="text-base font-extrabold text-blue-600">📍 역삼동</span>
          </div>

          <div className="flex items-center gap-2">
            <PowerUpIndicator
              active={powerUp.active}
              remaining={powerUp.remaining}
              dropReady={powerUp.dropReady}
              onCollect={handleCollectPowerUp}
            />
            <AnimatePresence>
              {combo > 10 && (
                <motion.div
                  className={`px-3 py-1 rounded-full font-black text-sm italic ${
                    isFever ? 'text-yellow-400 bg-red-600' : 'text-white bg-blue-500'
                  }`}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: isFever ? [1, 1.15, 1] : 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={isFever ? { scale: { repeat: Infinity, duration: 0.4 } } : { duration: 0.2 }}
                >
                  {combo}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Level bar */}
        <LevelBadge
          level={levelInfo.level}
          currentXp={levelInfo.currentXp}
          requiredXp={levelInfo.requiredXp}
          isFever={isFever}
        />
      </header>

      {/* Content area */}
      <div className="flex-1 min-h-0 px-4 py-2 z-10 overflow-y-auto">
        {activeTab === 'map' && settings.showMap && (
          <NeighborhoodMap
            neighborhoods={neighborhoodData}
            myNeighborhoodId={MY_NEIGHBORHOOD_ID}
            isFever={isFever}
            onSelectNeighborhood={setSelectedNeighborhood}
            selectedId={selectedNeighborhood}
          />
        )}
        {activeTab === 'map' && !settings.showMap && (
          <div className="h-full flex items-center justify-center">
            <RankingBoard rankings={rankings} isFever={isFever} />
          </div>
        )}
        {activeTab === 'missions' && (
          <DailyMissions
            missions={missionState.missions}
            onClaim={handleClaimMission}
            isFever={isFever}
          />
        )}
        {activeTab === 'stats' && (
          <StatsPanel
            stats={{
              totalTaps: saved.totalTaps,
              bestCombo: saved.bestCombo,
              feverCount: saved.feverCount,
              streakDays: saved.streakDays,
              level: levelInfo.level,
              totalXp: saved.totalXp,
              missionsCompleted: saved.missionsCompleted,
              powerUpsUsed: saved.powerUpsUsed,
            }}
            unlockedAchievements={saved.unlockedAchievements}
            isFever={isFever}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel
            settings={settings}
            onChange={setSettings}
            isFever={isFever}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Selected neighborhood info (map tab only) */}
      {activeTab === 'map' && settings.showMap && selectedInfo && (
        <div className="flex-none px-4 pb-1 z-20">
          <motion.div
            className={`rounded-xl px-4 py-2 flex items-center justify-between backdrop-blur-sm ${
              isFever ? 'bg-white/10' : 'bg-white/70'
            } shadow-sm`}
            layout
          >
            <div>
              <p className={`text-[10px] ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>
                {selectedInfo.id === MY_NEIGHBORHOOD_ID ? '내 동네' : '상대 동네'}
              </p>
              <p className={`text-base font-black ${
                selectedInfo.id === MY_NEIGHBORHOOD_ID
                  ? isFever ? 'text-yellow-300' : 'text-blue-600'
                  : isFever ? 'text-white' : 'text-gray-800'
              }`}>
                {selectedInfo.name}
              </p>
            </div>
            <p className={`text-xl font-black tracking-tight ${isFever ? 'text-white' : 'text-gray-800'}`}>
              {selectedInfo.taps.toLocaleString()}
            </p>
          </motion.div>
        </div>
      )}

      {/* Bottom tap panel */}
      <div className="flex-none px-4 pb-1 z-20">
        <div className={`rounded-2xl p-3 backdrop-blur-md ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-xl`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className={`text-[10px] ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>총 탭</p>
              <motion.p
                className={`text-xl font-black tracking-tight ${isFever ? 'text-white' : 'text-gray-800'}`}
                style={isFever ? { textShadow: '0 0 10px rgba(255,255,255,0.3)' } : undefined}
                key={myData.taps}
                initial={{ scale: 1.04 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.06 }}
              >
                {myData.taps.toLocaleString()}
              </motion.p>
            </div>
            <div className="text-right">
              <p className={`text-[10px] ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>내 기여</p>
              <p className={`text-xl font-black ${isFever ? 'text-yellow-300' : 'text-blue-600'}`}>
                {saved.totalTaps.toLocaleString()}
              </p>
            </div>
          </div>

          {combo > 0 && combo < 50 && (
            <div className="mb-2 flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isFever ? 'bg-white/20' : 'bg-gray-200'}`}>
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                  animate={{ width: `${comboProgress * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <span className={`text-[10px] font-bold ${isFever ? 'text-indigo-200' : 'text-gray-400'}`}>
                {combo}/50
              </span>
            </div>
          )}

          <div className="flex justify-center gap-3">
            {[0, 1, 2].map((i) => (
              <KeycapButton
                key={i}
                buttonId={`tap-button-${i}`}
                imageUrl={keycapImages[i] ?? null}
                isFever={isFever}
                label={isFever ? 'FEVER' : 'TAP'}
                compact
                onTap={handleTapCore}
              />
            ))}
          </div>
          <div className="flex justify-center mt-2">
            <button
              onClick={() => { setDesignerSlot(0); setShowDesigner(true); }}
              className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${
                isFever ? 'text-indigo-300 bg-white/5 active:bg-white/10' : 'text-gray-400 bg-gray-100 active:bg-gray-200'
              }`}
            >
              🎨 키캡 꾸미기
            </button>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <nav className={`flex-none flex items-center justify-around px-2 py-2 z-20 ${isFever ? 'bg-indigo-950/80' : 'bg-white/80'} backdrop-blur-sm`}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
              activeTab === tab.id
                ? isFever ? 'text-yellow-400' : 'text-blue-600'
                : isFever ? 'text-indigo-400' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] font-bold">{tab.label}</span>
          </button>
        ))}
      </nav>

      <AnimatePresence>
        {showDesigner && (
          <KeycapDesigner
            designs={keycapDesigns}
            activeDesignIds={activeKeycapIds}
            initialSlot={designerSlot}
            onSaveDesign={handleSaveDesign}
            onSelectDesign={handleSelectSlotDesign}
            onDeleteDesign={handleDeleteDesign}
            onClose={() => setShowDesigner(false)}
            isFever={isFever}
          />
        )}
      </AnimatePresence>

      <KeycapStyles />

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
