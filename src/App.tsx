import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeycapDesigner, type KeycapDesign } from './components/KeycapDesigner';

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

interface District {
  id: number;
  name: string;
  region: string;
  row: number;
  col: number;
  maxHp: number;
  currentHp: number;
  owner: string | null;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  value: string;
}

interface FeedEntry {
  id: number;
  text: string;
  type: 'player' | 'npc' | 'system';
}

// ═══════════════════════════════════════════════════════════
// Constants & Mock Data
// ═══════════════════════════════════════════════════════════

const NPC_NAMES = ['김탭러', '박클릭', '이매쉬', '최터치', '정스매시', '한연타', '윤크러시', '강히트'];

const NPC_COLORS: Record<string, string> = {
  '김탭러': '#ff6b6b', '박클릭': '#feca57', '이매쉬': '#48dbfb', '최터치': '#ff9ff3',
  '정스매시': '#ffa502', '한연타': '#7bed9f', '윤크러시': '#70a1ff', '강히트': '#ff6348',
};

const PLAYER_COLOR = '#00e5ff';
const UNCLAIMED_BG = '#1e1e3a';

type DData = Omit<District, 'currentHp' | 'owner'>;
const D = (id: number, name: string, region: string, row: number, col: number, maxHp: number): DData =>
  ({ id, name, region, row, col, maxHp });

const DISTRICT_DATA: DData[] = [
  D(0,'속초시','강원',0,5,80),    D(1,'양양군','강원',0,6,60),
  D(2,'의정부','경기',1,3,90),    D(3,'가평군','경기',1,4,50),    D(4,'춘천시','강원',1,5,120),
  D(5,'강릉시','강원',1,6,100),   D(6,'동해시','강원',1,7,70),
  D(7,'고양시','경기',2,2,130),   D(8,'종로구','서울',2,3,200),   D(9,'강남구','서울',2,4,250),
  D(10,'원주시','강원',2,5,100),  D(11,'태백시','강원',2,6,60),
  D(12,'인천','인천',3,1,180),    D(13,'부천시','경기',3,2,100),   D(14,'마포구','서울',3,3,150),
  D(15,'수원시','경기',3,4,160),  D(16,'성남시','경기',3,5,140),
  D(17,'평택시','경기',4,1,100),  D(18,'화성시','경기',4,2,120),   D(19,'안양시','경기',4,3,110),
  D(20,'용인시','경기',4,4,140),  D(21,'충주시','충북',4,5,90),
  D(22,'서산시','충남',5,2,80),   D(23,'천안시','충남',5,3,130),   D(24,'세종시','세종',5,4,100),
  D(25,'청주시','충북',5,5,140),  D(26,'안동시','경북',5,6,90),
  D(27,'논산시','충남',6,3,70),   D(28,'대전','대전',6,4,200),     D(29,'구미시','경북',6,5,100),
  D(30,'포항시','경북',6,6,120),  D(31,'영덕군','경북',6,7,50),
  D(32,'군산시','전북',7,2,100),  D(33,'전주시','전북',7,3,150),   D(34,'남원시','전북',7,4,60),
  D(35,'김천시','경북',7,5,80),   D(36,'대구','대구',7,6,220),     D(37,'경주시','경북',7,7,130),
  D(38,'광주','광주',8,2,170),    D(39,'나주시','전남',8,3,70),     D(40,'함양군','경남',8,4,50),
  D(41,'의령군','경남',8,5,40),   D(42,'울산','울산',8,6,160),     D(43,'부산','부산',8,7,280),
  D(44,'목포시','전남',9,2,90),   D(45,'순천시','전남',9,3,100),   D(46,'사천시','경남',9,4,60),
  D(47,'김해시','경남',9,5,120),  D(48,'창원시','경남',9,6,150),
  D(49,'완도군','전남',10,2,40),  D(50,'여수시','전남',10,3,110),
  D(51,'통영시','경남',10,5,60),  D(52,'거제시','경남',10,6,80),
  D(53,'제주시','제주',12,2,140), D(54,'서귀포','제주',12,3,100),
];

const KEYCAP_SIZE = {
  1: { body: 152, margin: 7, border: 4, borderInner: 3, emoji: 40, text: 11, spacing: 4, press: 6, shadow: 8 },
  2: { body: 120, margin: 6, border: 3, borderInner: 2, emoji: 32, text: 9, spacing: 3, press: 5, shadow: 6 },
  3: { body: 96, margin: 5, border: 3, borderInner: 2, emoji: 24, text: 8, spacing: 2, press: 4, shadow: 5 },
  4: { body: 80, margin: 4, border: 2, borderInner: 2, emoji: 20, text: 7, spacing: 2, press: 3, shadow: 4 },
} as const;

// ═══════════════════════════════════════════════════════════
// 8-bit Sound Engine
// ═══════════════════════════════════════════════════════════

function createPixelSound() {
  let ctx: AudioContext | null = null;
  const getCtx = () => { if (!ctx) ctx = new AudioContext(); return ctx; };

  function beep(freq: number, dur: number, vol = 0.08, delay = 0) {
    try {
      const c = getCtx();
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'square';
      o.frequency.value = freq;
      g.gain.value = vol;
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + dur);
      o.connect(g).connect(c.destination);
      o.start(c.currentTime + delay);
      o.stop(c.currentTime + delay + dur);
    } catch { /* audio not available */ }
  }

  return {
    tap: () => beep(440 + Math.random() * 80, 0.04),
    combo: (n: number) => { for (let i = 0; i < Math.min(n, 3); i++) beep(523 * (1 + i * 0.25), 0.07, 0.06, i * 0.06); },
    conquest: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.1, 0.1, i * 0.1)),
    npcAlert: () => beep(220, 0.12, 0.04),
  };
}

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

function comboMultiplier(combo: number): number {
  if (combo >= 50) return 8;
  if (combo >= 30) return 5;
  if (combo >= 15) return 3;
  if (combo >= 5) return 2;
  return 1;
}

function ownerColor(owner: string | null): string {
  if (!owner) return UNCLAIMED_BG;
  if (owner === 'player') return PLAYER_COLOR;
  return NPC_COLORS[owner] || '#ff6b6b';
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ═══════════════════════════════════════════════════════════
// Local Storage
// ═══════════════════════════════════════════════════════════

const SAVE_KEY = 'tapwar_pixel_v1';
const KEYCAP_DESIGNS_KEY = 'tapwar_keycap_designs_v1';

interface SaveData {
  districts: { id: number; hp: number; owner: string | null }[];
  taps: number;
  bestCombo: number;
  seasonEnd: number;
  keycapCount?: number;
  activeKeycapIds?: (string | null)[];
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s: SaveData = JSON.parse(raw);
      const districts: District[] = DISTRICT_DATA.map(d => {
        const sd = s.districts.find(x => x.id === d.id);
        return { ...d, currentHp: sd?.hp ?? d.maxHp, owner: sd?.owner ?? null };
      });
      return {
        districts, taps: s.taps, bestCombo: s.bestCombo, seasonEnd: s.seasonEnd,
        keycapCount: s.keycapCount ?? 1,
        activeKeycapIds: s.activeKeycapIds ?? [null, null, null, null],
      };
    }
  } catch { /* corrupt save */ }

  const districts: District[] = DISTRICT_DATA.map((d) => {
    if (d.id % 4 === 1 && d.id >= 4) {
      return { ...d, currentHp: d.maxHp, owner: NPC_NAMES[d.id % NPC_NAMES.length] };
    }
    return { ...d, currentHp: d.maxHp, owner: null };
  });
  return {
    districts, taps: 0, bestCombo: 0, seasonEnd: Date.now() + 7 * 86400000,
    keycapCount: 1,
    activeKeycapIds: [null, null, null, null] as (string | null)[],
  };
}

function saveGame(
  districts: District[], taps: number, bestCombo: number, seasonEnd: number,
  keycapCount: number, activeKeycapIds: (string | null)[],
) {
  try {
    const data: SaveData = {
      districts: districts.map(d => ({ id: d.id, hp: d.currentHp, owner: d.owner })),
      taps, bestCombo, seasonEnd, keycapCount, activeKeycapIds,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* storage full */ }
}

function loadKeycapDesigns(): KeycapDesign[] {
  try {
    const raw = localStorage.getItem(KEYCAP_DESIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveKeycapDesignsToStorage(designs: KeycapDesign[]) {
  try {
    localStorage.setItem(KEYCAP_DESIGNS_KEY, JSON.stringify(designs));
  } catch { /* storage full */ }
}

// ═══════════════════════════════════════════════════════════
// App
// ═══════════════════════════════════════════════════════════

export default function App() {
  const [init] = useState(loadGame);
  const [districts, setDistricts] = useState<District[]>(init.districts);
  const [selectedId, setSelectedId] = useState(() => {
    const t = init.districts.find(d => !d.owner) ?? init.districts[0];
    return t.id;
  });
  const [combo, setCombo] = useState(0);
  const [totalTaps, setTotalTaps] = useState(init.taps);
  const [bestCombo, setBestCombo] = useState(init.bestCombo);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([
    { id: 1, text: '⚔ 시즌 1 시작! 대한민국을 점령하세요!', type: 'system' },
  ]);
  const [conquestName, setConquestName] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [flashId, setFlashId] = useState<number | null>(null);

  const [keycapCount, setKeycapCount] = useState(init.keycapCount);
  const [keycapDesigns, setKeycapDesigns] = useState<KeycapDesign[]>(loadKeycapDesigns);
  const [activeKeycapIds, setActiveKeycapIds] = useState<(string | null)[]>(init.activeKeycapIds);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerSlot, setDesignerSlot] = useState(0);

  const comboTimer = useRef(0);
  const feedId = useRef(10);
  const particleId = useRef(0);
  const sound = useRef(createPixelSound());
  const seasonEnd = useRef(init.seasonEnd);
  const comboRef = useRef(0);
  const keycapRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = districts.find(d => d.id === selectedId) ?? null;
  const playerCount = districts.filter(d => d.owner === 'player').length;
  const mult = comboMultiplier(combo);
  const isFever = combo >= 30;
  const sz = KEYCAP_SIZE[keycapCount as keyof typeof KEYCAP_SIZE];

  const getDesignImage = useCallback((slotIndex: number): string | null => {
    const designId = activeKeycapIds[slotIndex];
    if (!designId) return null;
    return keycapDesigns.find(d => d.id === designId)?.imageData ?? null;
  }, [activeKeycapIds, keycapDesigns]);

  // ── Season Timer ─────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTimeLeft(formatTime(seasonEnd.current - Date.now())), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Auto-save ────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => saveGame(districts, totalTaps, bestCombo, seasonEnd.current, keycapCount, activeKeycapIds), 500);
    return () => clearTimeout(t);
  }, [districts, totalTaps, bestCombo, keycapCount, activeKeycapIds]);

  // ── Save keycap designs ──────────────────────────────
  useEffect(() => {
    saveKeycapDesignsToStorage(keycapDesigns);
  }, [keycapDesigns]);

  // ── NPC Simulation ───────────────────────────────────
  useEffect(() => {
    let timer: number;
    function tick() {
      timer = window.setTimeout(() => {
        const npc = NPC_NAMES[Math.floor(Math.random() * NPC_NAMES.length)];
        setDistricts(prev => {
          const targets = prev.filter(d => d.owner !== npc);
          if (!targets.length) return prev;
          const target = targets[Math.floor(Math.random() * targets.length)];
          const dmg = 15 + Math.floor(Math.random() * 25);
          const hp = Math.max(0, target.currentHp - dmg);
          const won = hp <= 0;
          const id = ++feedId.current;
          setFeed(f => [
            { id, text: won ? `💥 ${npc} → [${target.name}] 점령!` : `⚡ ${npc} → [${target.name}] -${dmg}`, type: 'npc' as const },
            ...f,
          ].slice(0, 30));
          if (won && target.owner === 'player') sound.current.npcAlert();
          return prev.map(d => d.id === target.id
            ? { ...d, currentHp: won ? d.maxHp : hp, owner: won ? npc : d.owner }
            : d);
        });
        tick();
      }, 4000 + Math.random() * 6000);
    }
    tick();
    return () => clearTimeout(timer);
  }, []);

  // ── Helpers ──────────────────────────────────────────
  const addFeed = useCallback((text: string, type: FeedEntry['type']) => {
    setFeed(f => [{ id: ++feedId.current, text, type }, ...f].slice(0, 30));
  }, []);

  const nextTarget = useCallback((current: District, dists: District[]): number => {
    const avail = dists.filter(d => d.owner !== 'player');
    if (!avail.length) return current.id;
    avail.sort((a, b) =>
      (Math.abs(a.row - current.row) + Math.abs(a.col - current.col)) -
      (Math.abs(b.row - current.row) + Math.abs(b.col - current.col))
    );
    return avail[0].id;
  }, []);

  // ── Tap Handler ──────────────────────────────────────
  const handleTap = useCallback((e: React.MouseEvent | React.TouchEvent, keycapIdx: number) => {
    e.preventDefault();

    setDistricts(prev => {
      const target = prev.find(d => d.id === selectedId);
      if (!target || target.owner === 'player') return prev;

      comboRef.current += 1;
      const c = comboRef.current;
      const dmg = comboMultiplier(c);
      setCombo(c);
      if (c > bestCombo) setBestCombo(c);
      setTotalTaps(t => t + 1);

      clearTimeout(comboTimer.current);
      comboTimer.current = window.setTimeout(() => { comboRef.current = 0; setCombo(0); }, 1500);

      if ([5, 15, 30, 50].includes(c)) sound.current.combo(Math.ceil(c / 15));
      sound.current.tap();
      if (navigator.vibrate) navigator.vibrate(12);

      const el = keycapRefs.current[keycapIdx];
      if (el) {
        const rect = el.getBoundingClientRect();
        const pid = ++particleId.current;
        setParticles(p => [...p, {
          id: pid,
          x: rect.left + rect.width * (0.3 + Math.random() * 0.4),
          y: rect.top + rect.height * 0.15,
          value: `+${dmg}`,
        }]);
        setTimeout(() => setParticles(p => p.filter(pp => pp.id !== pid)), 700);
      }

      setFlashId(target.id);
      setTimeout(() => setFlashId(null), 80);

      const hp = Math.max(0, target.currentHp - dmg);
      const won = hp <= 0;

      if (won) {
        sound.current.conquest();
        if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
        setConquestName(target.name);
        setTimeout(() => setConquestName(null), 1500);
        addFeed(`🏴 [${target.name}] 점령 완료!`, 'player');
        const updated = prev.map(d => d.id === target.id ? { ...d, currentHp: d.maxHp, owner: 'player' } : d);
        const nxt = nextTarget(target, updated);
        setTimeout(() => setSelectedId(nxt), 200);
        return updated;
      }

      return prev.map(d => d.id === target.id ? { ...d, currentHp: hp } : d);
    });
  }, [selectedId, bestCombo, addFeed, nextTarget]);

  // ── Keycap Design Handlers ───────────────────────────
  const handleSaveDesign = useCallback((design: KeycapDesign) => {
    setKeycapDesigns(prev => [...prev, design]);
  }, []);

  const handleSelectDesign = useCallback((slotIndex: number, id: string | null) => {
    setActiveKeycapIds(prev => {
      const next = [...prev];
      next[slotIndex] = id;
      return next;
    });
  }, []);

  const handleDeleteDesign = useCallback((id: string) => {
    setKeycapDesigns(prev => prev.filter(d => d.id !== id));
    setActiveKeycapIds(prev => prev.map(aid => aid === id ? null : aid));
  }, []);

  // ── Derived ──────────────────────────────────────────
  const hpPct = selected ? (selected.currentHp / selected.maxHp) * 100 : 0;
  const isOwned = selected?.owner === 'player';

  // ── Render ───────────────────────────────────────────
  return (
    <div className="h-screen w-full flex flex-col overflow-hidden" style={{ background: '#0a0a1e', fontFamily: "'Courier New', monospace" }}>

      {/* ── Header ──────────────────────────────── */}
      <div className="flex-none px-4 pt-3 pb-2" style={{ borderBottom: '2px solid #1a1a35' }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[9px] tracking-[3px] uppercase" style={{ color: '#5a5a8a' }}>시즌 1 · 대한민국</div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: '#8888bb' }}>마감까지</span>
              <span className="text-sm font-bold" style={{ color: '#ff6b6b' }}>{timeLeft || '──:──:──'}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] tracking-[2px]" style={{ color: '#5a5a8a' }}>점령</div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-bold" style={{ color: PLAYER_COLOR }}>{playerCount}</span>
              <span className="text-xs" style={{ color: '#3a3a5a' }}>/{DISTRICT_DATA.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Map ─────────────────────────────────── */}
      <div className="flex-none flex justify-center py-2 overflow-hidden">
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(7, 24px)',
          gridTemplateRows: 'repeat(13, 20px)',
          gap: '3px',
        }}>
          {districts.map(d => {
            const isSel = d.id === selectedId;
            const color = d.id === flashId ? '#ffffff' : ownerColor(d.owner);
            return (
              <motion.div
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                style={{
                  gridColumn: d.col,
                  gridRow: d.row + 1,
                  width: 24, height: 20,
                  background: color,
                  border: isSel ? '2px solid #fff' : `2px solid ${d.owner ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  cursor: 'pointer',
                  boxShadow: isSel ? `0 0 8px ${PLAYER_COLOR}44` : 'none',
                  position: 'relative',
                }}
                animate={isSel ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
                transition={isSel ? { repeat: Infinity, duration: 0.7, ease: 'easeInOut' } : { duration: 0.15 }}
              >
                {d.owner === 'player' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, color: '#0a0a1e', fontWeight: 900,
                  }}>●</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Map Legend (mini) ────────────────────── */}
      <div className="flex-none flex justify-center gap-4 pb-1 px-4">
        <div className="flex items-center gap-1">
          <div style={{ width: 8, height: 8, background: PLAYER_COLOR }} />
          <span className="text-[8px]" style={{ color: '#6a6a9a' }}>나</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 8, height: 8, background: '#ff6b6b' }} />
          <span className="text-[8px]" style={{ color: '#6a6a9a' }}>적</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 8, height: 8, background: UNCLAIMED_BG, border: '1px solid #333' }} />
          <span className="text-[8px]" style={{ color: '#6a6a9a' }}>미점령</span>
        </div>
      </div>

      {/* ── Selected District HP ────────────────── */}
      <div className="flex-none px-5 py-1">
        {selected && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: ownerColor(selected.owner) }}>
                  [{selected.name}]
                </span>
                <span className="text-[9px]" style={{ color: '#5a5a8a' }}>{selected.region}</span>
              </div>
              <span className="text-[10px] font-bold" style={{ color: isOwned ? '#4ade80' : '#ccccee' }}>
                {isOwned ? '방어중' : `${selected.currentHp}/${selected.maxHp}`}
              </span>
            </div>
            {!isOwned && (
              <div style={{ height: 8, background: '#111128', border: '2px solid #2a2a45' }}>
                <motion.div
                  style={{
                    height: '100%',
                    background: hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#fbbf24' : '#ef4444',
                  }}
                  animate={{ width: `${hpPct}%` }}
                  transition={{ duration: 0.08 }}
                />
              </div>
            )}
            {selected.owner && selected.owner !== 'player' && (
              <div className="text-[9px] mt-0.5" style={{ color: ownerColor(selected.owner) }}>
                점령자: {selected.owner}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Keycap Area ─────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
        {/* Combo display */}
        <div className="flex-none mb-1 text-center" style={{ minHeight: 28 }}>
          {combo > 0 && (
            <motion.div
              key={combo}
              initial={{ scale: 1.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center justify-center gap-2"
            >
              <span className="text-lg font-bold" style={{ color: combo >= 30 ? '#ff6b6b' : combo >= 15 ? '#fbbf24' : '#00e5ff' }}>
                {combo} COMBO
              </span>
              <span className="text-sm font-bold" style={{
                color: '#0a0a1e',
                background: combo >= 30 ? '#ff6b6b' : combo >= 15 ? '#fbbf24' : '#00e5ff',
                padding: '1px 6px',
              }}>
                ×{mult}
              </span>
            </motion.div>
          )}
        </div>

        {/* Keycap settings row */}
        <div className="flex-none flex items-center justify-center gap-2 mb-2">
          <div className="flex items-center gap-0.5">
            {([1, 2, 3, 4] as const).map(n => (
              <button
                key={n}
                onClick={() => setKeycapCount(n)}
                style={{
                  width: 22, height: 22,
                  background: keycapCount === n ? PLAYER_COLOR : '#1a1a35',
                  color: keycapCount === n ? '#0a0a1e' : '#5a5a8a',
                  border: `2px solid ${keycapCount === n ? PLAYER_COLOR : '#2a2a45'}`,
                  fontSize: 10, fontWeight: 900,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setDesignerSlot(0); setShowDesigner(true); }}
            style={{
              width: 28, height: 22,
              background: '#1a1a35',
              border: '2px solid #2a2a45',
              fontSize: 12,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            🎨
          </button>
        </div>

        {/* Keycap Buttons */}
        <div className="flex items-end justify-center" style={{ gap: keycapCount <= 2 ? 16 : 10 }}>
          {Array.from({ length: keycapCount }, (_, i) => {
            const designImg = getDesignImage(i);
            return (
              <motion.button
                key={i}
                ref={(el) => { keycapRefs.current[i] = el; }}
                id={i === 0 ? 'tap-button' : undefined}
                onMouseDown={(e) => handleTap(e, i)}
                onTouchStart={(e) => handleTap(e, i)}
                className="pixel-keycap-btn"
                style={{ WebkitTapHighlightColor: 'transparent', outline: 'none', border: 'none', cursor: 'pointer' }}
                whileTap={{ y: sz.press, transition: { type: 'spring', stiffness: 800, damping: 20 } }}
                animate={isFever ? { boxShadow: [`0 ${sz.shadow}px 0 #1a0030, 0 0 0 rgba(139,92,246,0)`, `0 ${sz.shadow}px 0 #1a0030, 0 0 20px rgba(139,92,246,0.5)`] } : {}}
                transition={isFever ? { repeat: Infinity, duration: 0.6, repeatType: 'reverse' as const } : {}}
              >
                <div
                  className="pixel-keycap-body"
                  style={{
                    width: sz.body, height: sz.body,
                    borderWidth: sz.border,
                    boxShadow: isFever
                      ? `0 ${sz.shadow}px 0 0 #1a0030, 0 ${sz.shadow + 2}px 0 0 #100020, 0 0 20px rgba(139,92,246,0.3)`
                      : `0 ${sz.shadow}px 0 0 #18182a, 0 ${sz.shadow + 2}px 0 0 #101020`,
                    background: isFever ? '#4a2070' : undefined,
                    borderColor: isFever ? '#7c3aed #2a0845 #2a0845 #7c3aed' : undefined,
                  }}
                >
                  <div
                    className="pixel-keycap-face"
                    style={{
                      top: sz.margin, left: sz.margin, right: sz.margin, bottom: sz.margin,
                      borderWidth: sz.borderInner,
                      background: isFever ? '#5b2d8a' : undefined,
                      borderColor: isFever ? '#8b5cf6 #3a1060 #3a1060 #8b5cf6' : undefined,
                    }}
                  >
                    {designImg ? (
                      <div className="pixel-keycap-img" style={{ backgroundImage: `url(${designImg})` }} />
                    ) : (
                      <span style={{ fontSize: sz.emoji, lineHeight: 1 }}>{isFever ? '🔥' : '⚔️'}</span>
                    )}
                    <span style={{
                      position: 'absolute',
                      bottom: keycapCount >= 3 ? 2 : 4,
                      left: 0, right: 0,
                      textAlign: 'center',
                      fontSize: sz.text, fontWeight: 900, letterSpacing: sz.spacing,
                      color: isFever ? '#fbbf24' : designImg ? '#fff' : '#8888aa',
                      textShadow: designImg ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
                      pointerEvents: 'none',
                    }}>
                      TAP!
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {isOwned && (
          <div className="text-[10px] mt-2" style={{ color: '#5a5a8a' }}>
            ↑ 다른 지역을 선택하세요
          </div>
        )}

        {/* Total taps */}
        <div className="flex-none mt-2 text-[9px]" style={{ color: '#3a3a5a' }}>
          총 {totalTaps.toLocaleString()}회 탭 · 최고 콤보 {bestCombo}
        </div>
      </div>

      {/* ── Particles (fixed overlay) ───────────── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }}>
        <AnimatePresence>
          {particles.map(p => (
            <motion.div
              key={p.id}
              className="absolute font-bold"
              style={{ left: p.x, top: p.y, color: PLAYER_COLOR, fontSize: 18, fontFamily: 'monospace', textShadow: '0 0 6px rgba(0,229,255,0.6)' }}
              initial={{ opacity: 1, y: 0, scale: 1 }}
              animate={{ opacity: 0, y: -50, scale: 1.3 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              {p.value}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Conquest Toast ──────────────────────── */}
      <AnimatePresence>
        {conquestName && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 70 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              style={{
                background: '#0a0a1e',
                border: '4px solid',
                borderColor: `${PLAYER_COLOR} #005566 #005566 ${PLAYER_COLOR}`,
                padding: '16px 32px',
                textAlign: 'center',
                boxShadow: `0 0 40px ${PLAYER_COLOR}44`,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>⚔️</div>
              <div style={{ color: PLAYER_COLOR, fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>
                {conquestName}
              </div>
              <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, letterSpacing: 3, marginTop: 4 }}>
                점 령 완 료
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KeycapDesigner Modal ────────────────── */}
      <AnimatePresence>
        {showDesigner && (
          <KeycapDesigner
            designs={keycapDesigns}
            activeDesignIds={activeKeycapIds}
            initialSlot={designerSlot}
            slotCount={keycapCount}
            onSaveDesign={handleSaveDesign}
            onSelectDesign={handleSelectDesign}
            onDeleteDesign={handleDeleteDesign}
            onClose={() => setShowDesigner(false)}
            isFever={isFever}
          />
        )}
      </AnimatePresence>

      {/* ── Live Feed ───────────────────────────── */}
      <div className="flex-none px-4 pb-4 pt-1" style={{ borderTop: '2px solid #1a1a35' }}>
        <div className="text-[8px] tracking-[2px] uppercase mb-1" style={{ color: '#3a3a5a' }}>LIVE</div>
        <div style={{ height: 52, overflow: 'hidden' }}>
          <AnimatePresence initial={false}>
            {feed.slice(0, 3).map(entry => (
              <motion.div
                key={entry.id}
                initial={{ height: 0, opacity: 0, x: 20 }}
                animate={{ height: 17, opacity: 1, x: 0 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="text-[10px] truncate font-bold"
                style={{
                  color: entry.type === 'player' ? PLAYER_COLOR
                    : entry.type === 'npc' ? '#ff9999'
                    : '#7a7aaa',
                }}
              >
                {entry.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Styles ──────────────────────────────── */}
      <style>{`
        * { image-rendering: pixelated; }

        .pixel-keycap-btn {
          padding: 0;
          background: transparent;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .pixel-keycap-body {
          position: relative;
          background: #3a3a50;
          border-style: solid;
          border-color: #5a5a70 #222235 #222235 #5a5a70;
          transition: box-shadow 0.04s;
        }

        .pixel-keycap-btn:active .pixel-keycap-body {
          box-shadow: 0 2px 0 0 #18182a !important;
        }

        .pixel-keycap-face {
          position: absolute;
          background: #4a4a62;
          border-style: solid;
          border-color: #6a6a82 #2e2e42 #2e2e42 #6a6a82;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          overflow: hidden;
        }

        .pixel-keycap-img {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
        }
      `}</style>
    </div>
  );
}
