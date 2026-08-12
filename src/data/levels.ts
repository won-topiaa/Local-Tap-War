export interface LevelTier {
  minLevel: number;
  maxLevel: number;
  title: string;
  xpPerLevel: number;
  color: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  { minLevel: 1, maxLevel: 10, title: '뉴비', xpPerLevel: 100, color: '#9CA3AF' },
  { minLevel: 11, maxLevel: 20, title: '탭 워리어', xpPerLevel: 250, color: '#3B82F6' },
  { minLevel: 21, maxLevel: 30, title: '콤보 마스터', xpPerLevel: 500, color: '#8B5CF6' },
  { minLevel: 31, maxLevel: 40, title: '피버 킹', xpPerLevel: 1000, color: '#EF4444' },
  { minLevel: 41, maxLevel: 50, title: '동네 영웅', xpPerLevel: 2000, color: '#F59E0B' },
  { minLevel: 51, maxLevel: 99, title: '전설의 탭퍼', xpPerLevel: 4000, color: '#EC4899' },
];

export function getTier(level: number): LevelTier {
  return LEVEL_TIERS.find(t => level >= t.minLevel && level <= t.maxLevel) ?? LEVEL_TIERS[0];
}

export function getXpForLevel(level: number): number {
  return getTier(level).xpPerLevel;
}

export function calculateLevel(totalXp: number): { level: number; currentXp: number; requiredXp: number } {
  let remaining = totalXp;
  let level = 1;

  while (level < 99) {
    const required = getXpForLevel(level);
    if (remaining < required) {
      return { level, currentXp: remaining, requiredXp: required };
    }
    remaining -= required;
    level++;
  }

  return { level: 99, currentXp: remaining, requiredXp: getXpForLevel(99) };
}
