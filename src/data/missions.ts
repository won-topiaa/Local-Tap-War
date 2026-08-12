export interface MissionTemplate {
  id: string;
  icon: string;
  titleFn: (target: number) => string;
  target: number;
  xpReward: number;
  statKey: 'sessionTaps' | 'sessionBestCombo' | 'sessionFeverCount' | 'sessionXp';
}

const MISSION_POOL: MissionTemplate[] = [
  { id: 'tap_50', icon: '👊', titleFn: (t) => `${t}번 탭하기`, target: 50, xpReward: 30, statKey: 'sessionTaps' },
  { id: 'tap_200', icon: '👊', titleFn: (t) => `${t}번 탭하기`, target: 200, xpReward: 80, statKey: 'sessionTaps' },
  { id: 'tap_500', icon: '💪', titleFn: (t) => `${t}번 탭하기`, target: 500, xpReward: 150, statKey: 'sessionTaps' },
  { id: 'combo_20', icon: '🔗', titleFn: (t) => `${t} 콤보 달성하기`, target: 20, xpReward: 40, statKey: 'sessionBestCombo' },
  { id: 'combo_50', icon: '🔥', titleFn: (t) => `${t} 콤보 달성하기`, target: 50, xpReward: 100, statKey: 'sessionBestCombo' },
  { id: 'combo_100', icon: '💥', titleFn: (t) => `${t} 콤보 달성`, target: 100, xpReward: 200, statKey: 'sessionBestCombo' },
  { id: 'fever_1', icon: '🌡️', titleFn: () => '피버 모드 1회 진입', target: 1, xpReward: 60, statKey: 'sessionFeverCount' },
  { id: 'fever_3', icon: '🔥', titleFn: (t) => `피버 모드 ${t}회 진입`, target: 3, xpReward: 120, statKey: 'sessionFeverCount' },
  { id: 'xp_100', icon: '⭐', titleFn: (t) => `경험치 ${t} 획득하기`, target: 100, xpReward: 50, statKey: 'sessionXp' },
  { id: 'xp_500', icon: '🌟', titleFn: (t) => `경험치 ${t} 획득하기`, target: 500, xpReward: 120, statKey: 'sessionXp' },
];

export interface DailyMission {
  templateId: string;
  icon: string;
  title: string;
  target: number;
  progress: number;
  xpReward: number;
  statKey: MissionTemplate['statKey'];
  completed: boolean;
  claimed: boolean;
}

export function generateDailyMissions(seed: number, count: number = 3): DailyMission[] {
  const shuffled = [...MISSION_POOL].sort((a, b) => {
    const ha = hashCode(a.id + seed);
    const hb = hashCode(b.id + seed);
    return ha - hb;
  });

  return shuffled.slice(0, count).map((t) => ({
    templateId: t.id,
    icon: t.icon,
    title: t.titleFn(t.target),
    target: t.target,
    progress: 0,
    xpReward: t.xpReward,
    statKey: t.statKey,
    completed: false,
    claimed: false,
  }));
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

export function getDaySeed(): number {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}
