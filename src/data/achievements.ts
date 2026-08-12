export interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalTaps: number;
  bestCombo: number;
  feverCount: number;
  totalPlaySessions: number;
  streakDays: number;
  level: number;
  powerUpsUsed: number;
  missionsCompleted: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_tap',
    icon: '👆',
    title: '첫 탭!',
    description: '첫 번째 탭을 눌렀다',
    condition: (s) => s.totalTaps >= 1,
  },
  {
    id: 'tap_100',
    icon: '💪',
    title: '워밍업 완료',
    description: '100번 탭 달성',
    condition: (s) => s.totalTaps >= 100,
  },
  {
    id: 'tap_1000',
    icon: '🔨',
    title: '탭 장인',
    description: '1,000번 탭 달성',
    condition: (s) => s.totalTaps >= 1000,
  },
  {
    id: 'tap_10000',
    icon: '⚡',
    title: '만 탭 돌파',
    description: '10,000번 탭 달성',
    condition: (s) => s.totalTaps >= 10000,
  },
  {
    id: 'tap_100000',
    icon: '🌟',
    title: '전설의 손가락',
    description: '100,000번 탭 달성',
    condition: (s) => s.totalTaps >= 100000,
  },
  {
    id: 'combo_10',
    icon: '🔗',
    title: '콤보 입문',
    description: '10 콤보 달성',
    condition: (s) => s.bestCombo >= 10,
  },
  {
    id: 'combo_50',
    icon: '🔥',
    title: '피버 입성',
    description: '50 콤보로 피버 모드 진입',
    condition: (s) => s.bestCombo >= 50,
  },
  {
    id: 'combo_100',
    icon: '💥',
    title: '콤보 마스터',
    description: '100 콤보 달성',
    condition: (s) => s.bestCombo >= 100,
  },
  {
    id: 'combo_200',
    icon: '🌪️',
    title: '폭풍 탭퍼',
    description: '200 콤보 달성',
    condition: (s) => s.bestCombo >= 200,
  },
  {
    id: 'fever_first',
    icon: '🌡️',
    title: '불타오르네',
    description: '첫 피버 모드 진입',
    condition: (s) => s.feverCount >= 1,
  },
  {
    id: 'fever_10',
    icon: '🏔️',
    title: '피버 마니아',
    description: '피버 모드 10회 진입',
    condition: (s) => s.feverCount >= 10,
  },
  {
    id: 'level_10',
    icon: '📈',
    title: '성장 중',
    description: '레벨 10 달성',
    condition: (s) => s.level >= 10,
  },
  {
    id: 'level_30',
    icon: '👑',
    title: '베테랑',
    description: '레벨 30 달성',
    condition: (s) => s.level >= 30,
  },
  {
    id: 'level_50',
    icon: '🏆',
    title: '영웅 등극',
    description: '레벨 50 달성',
    condition: (s) => s.level >= 50,
  },
  {
    id: 'streak_3',
    icon: '📅',
    title: '3일 연속',
    description: '3일 연속 출석',
    condition: (s) => s.streakDays >= 3,
  },
  {
    id: 'streak_7',
    icon: '🗓️',
    title: '주간 전사',
    description: '7일 연속 출석',
    condition: (s) => s.streakDays >= 7,
  },
  {
    id: 'mission_5',
    icon: '📋',
    title: '미션 사냥꾼',
    description: '일일 미션 5개 완료',
    condition: (s) => s.missionsCompleted >= 5,
  },
  {
    id: 'powerup_3',
    icon: '🧪',
    title: '아이템 매니아',
    description: '파워업 3회 사용',
    condition: (s) => s.powerUpsUsed >= 3,
  },
];
