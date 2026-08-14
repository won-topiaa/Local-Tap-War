import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface HomePick {
  id: number;
  name: string;
  region: string;
}

interface OnboardingProps {
  districts: HomePick[];
  onComplete: (districtId: number) => void;
}

const PLAYER_COLOR = '#00e5ff';

// 시/도 표시 순서 — 수도권부터 아래로
const REGION_ORDER = [
  '서울', '경기', '인천', '강원', '충북', '충남', '세종', '대전',
  '전북', '전남', '광주', '경북', '경남', '대구', '울산', '부산', '제주',
];

export function Onboarding({ districts, onComplete }: OnboardingProps) {
  const [region, setRegion] = useState<string | null>(null);

  const regions = useMemo(() => {
    const set = new Set(districts.map(d => d.region));
    return REGION_ORDER.filter(r => set.has(r));
  }, [districts]);

  const inRegion = useMemo(
    () => districts.filter(d => d.region === region).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [districts, region],
  );

  return (
    <motion.div
      className="fixed inset-0 flex flex-col"
      style={{ zIndex: 100, background: '#0a0a1e', fontFamily: "'Courier New', monospace" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="flex-none px-6 pt-10 pb-4 text-center">
        <div style={{ fontSize: 34, marginBottom: 8 }}>🏴</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: PLAYER_COLOR, letterSpacing: 3 }}>
          우리 동네 탭-워
        </div>
        <div style={{ fontSize: 11, color: '#8888bb', marginTop: 10, lineHeight: 1.6 }}>
          {region === null
            ? '어디 사세요?\n내 동네부터 점령을 시작합니다'
            : `${region}\n우리 동네를 골라주세요`}
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex-none flex justify-center gap-2 pb-3">
        {[0, 1].map(i => (
          <div key={i} style={{
            width: 22, height: 4,
            background: (region === null ? 0 : 1) >= i ? PLAYER_COLOR : '#2a2a45',
          }} />
        ))}
      </div>

      {/* Choices */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
        <AnimatePresence mode="wait">
          {region === null ? (
            <motion.div
              key="regions"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
            >
              {regions.map(r => (
                <button
                  key={r}
                  onClick={() => setRegion(r)}
                  style={{
                    padding: '14px 0',
                    background: '#1a1a35',
                    border: '3px solid',
                    borderColor: '#3a3a5a #12122a #12122a #3a3a5a',
                    color: '#ccccee',
                    fontSize: 13, fontWeight: 900, letterSpacing: 1,
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {r}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="districts"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}
            >
              {inRegion.map(d => (
                <button
                  key={d.id}
                  onClick={() => onComplete(d.id)}
                  style={{
                    padding: '12px 2px',
                    background: '#1a1a35',
                    border: '3px solid',
                    borderColor: '#3a3a5a #12122a #12122a #3a3a5a',
                    color: '#ccccee',
                    fontSize: 11, fontWeight: 900,
                    cursor: 'pointer',
                    fontFamily: "'Courier New', monospace",
                  }}
                >
                  {d.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex-none px-5 pb-8 pt-2">
        {region !== null && (
          <button
            onClick={() => setRegion(null)}
            style={{
              width: '100%', padding: '10px 0',
              background: 'transparent',
              border: '2px solid #2a2a45',
              color: '#6a6a9a',
              fontSize: 11, fontWeight: 900, letterSpacing: 2,
              cursor: 'pointer',
              fontFamily: "'Courier New', monospace",
            }}
          >
            ← 다른 지역 선택
          </button>
        )}
      </div>
    </motion.div>
  );
}
