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

interface TheftEvent {
  npc: string;
  districtId: number;
  districtName: string;
}

interface InvasionReport {
  thefts: TheftEvent[];
  otherConquests: number;
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

// HP 배율 — 시즌이 7일이므로 점령에 훨씬 많은 클릭이 필요하도록 상향
// x25: 최소 지역(HP 20) = 500 → 콤보 없이 시작해도 첫 점령까지 ~90탭.
// 전국 총량 276,000 HP ≈ 무결점 풀콤보 연타 ~2시간, 콤보가 끊기는 현실적
// 페이스로 ~6시간 + 뺏긴 영토 재점령분이 7일 시즌의 플레이 볼륨.
const HP_SCALE = 25;

// NPC 속도: 유저가 보고 있는 동안엔 1배로 천천히, 자리를 비우면 3배로 빨라진다.
// 모든 유저에게 동일하게 적용되는 고정 상수 (랜덤 요소 없음 = 공평).
const NPC_ACTIVE_DPS = 0.3;                   // 접속 중 전체 NPC 합산 초당 데미지 (유저 연타 대비 미미한 압박)
const NPC_OFFLINE_DPS = 0.9;                  // 부재 중 3배 속도
const NPC_ACTIVE_TICK_MS = 20 * 1000;         // 접속 중 NPC 공격 주기 (틱당 데미지 = DPS × 20초 = 6)
const NPC_MAX_OFFLINE_MS = 8 * 3600 * 1000;   // 한 번의 부재당 최대 8시간까지만 시뮬레이션 (NPC도 잠은 잔다)
const NPC_MIN_OFFLINE_MS = 60 * 1000;         // 1분 미만의 이탈로는 NPC가 깨어나지 않음
const NPC_MAX_THEFTS_PER_ABSENCE = 3;         // 부재 1회당 플레이어 영토는 최대 3개까지만 절도 (초보 전멸 방지)

type DData = Omit<District, 'currentHp' | 'owner'>;
const D = (id: number, name: string, region: string, row: number, col: number, maxHp: number): DData =>
  ({ id, name, region, row, col, maxHp });

const DISTRICT_DATA: DData[] = [
  // ═══ 강원특별자치도 (18) ═══
  D(0,'철원군','강원',0,14,50),  D(1,'화천군','강원',0,15,45),  D(2,'양구군','강원',0,16,40),  D(3,'고성군','강원',0,17,45),
  D(4,'춘천시','강원',1,15,80),  D(5,'인제군','강원',1,16,50),  D(6,'속초시','강원',1,17,60),
  D(7,'홍천군','강원',2,15,55),  D(8,'횡성군','강원',2,16,45),  D(9,'양양군','강원',2,17,40),  D(10,'강릉시','강원',2,18,80),
  D(11,'원주시','강원',3,15,80),  D(12,'평창군','강원',3,16,55),  D(13,'정선군','강원',3,17,50),  D(14,'동해시','강원',3,18,50),
  D(15,'영월군','강원',4,16,50),  D(16,'태백시','강원',4,17,40),  D(17,'삼척시','강원',4,18,55),
  // ═══ 경기도 (31) ═══
  D(18,'파주시','경기',1,7,80),   D(19,'연천군','경기',1,9,50),
  D(20,'김포시','경기',2,7,70),   D(21,'양주시','경기',2,8,55),   D(22,'동두천시','경기',2,9,40),  D(23,'포천시','경기',2,10,60),  D(24,'가평군','경기',2,12,50),
  D(25,'고양시','경기',3,7,100),  D(26,'의정부시','경기',3,9,60),  D(27,'남양주시','경기',3,11,75),  D(28,'양평군','경기',3,13,55),
  D(29,'구리시','경기',4,8,40),   D(30,'하남시','경기',4,10,50),
  D(31,'부천시','경기',5,6,65),   D(32,'광주시','경기',5,12,60),
  D(33,'광명시','경기',6,6,40),   D(34,'성남시','경기',6,12,90),   D(35,'여주시','경기',6,13,50),
  D(36,'시흥시','경기',7,6,60),   D(37,'용인시','경기',7,12,90),   D(38,'이천시','경기',7,13,60),
  D(39,'안산시','경기',8,6,70),
  D(40,'안양시','경기',9,5,60),   D(41,'과천시','경기',9,6,30),
  D(42,'군포시','경기',10,5,40),  D(43,'의왕시','경기',10,6,30),   D(44,'수원시','경기',10,7,100),  D(45,'오산시','경기',10,8,35),
  D(46,'화성시','경기',11,5,90),  D(47,'평택시','경기',11,7,80),   D(48,'안성시','경기',11,8,55),
  // ═══ 서울특별시 (25) ═══
  D(49,'도봉구','서울',5,7,35),   D(50,'노원구','서울',5,8,40),   D(51,'강북구','서울',5,9,30),   D(52,'성북구','서울',5,10,35),   D(53,'중랑구','서울',5,11,30),
  D(54,'은평구','서울',6,7,35),   D(55,'종로구','서울',6,8,30),   D(56,'서대문구','서울',6,9,30),  D(57,'동대문구','서울',6,10,30),  D(58,'광진구','서울',6,11,30),
  D(59,'마포구','서울',7,7,40),   D(60,'용산구','서울',7,8,35),   D(61,'중구','서울',7,9,25),      D(62,'성동구','서울',7,10,30),   D(63,'강동구','서울',7,11,35),
  D(64,'강서구','서울',8,7,40),   D(65,'양천구','서울',8,8,35),   D(66,'영등포구','서울',8,9,35),  D(67,'동작구','서울',8,10,30),   D(68,'송파구','서울',8,11,45),
  D(69,'구로구','서울',9,7,35),   D(70,'금천구','서울',9,8,25),   D(71,'관악구','서울',9,9,35),    D(72,'서초구','서울',9,10,45),   D(73,'강남구','서울',9,11,50),
  // ═══ 인천광역시 (10) ═══
  D(74,'강화군','인천',3,3,55),   D(75,'옹진군','인천',4,3,45),
  D(76,'서구','인천',5,4,45),     D(77,'계양구','인천',5,5,35),
  D(78,'부평구','인천',6,4,40),   D(79,'미추홀구','인천',6,5,30),
  D(80,'남동구','인천',7,4,40),   D(81,'연수구','인천',7,5,35),
  D(82,'중구','인천',8,4,35),     D(83,'동구','인천',8,5,25),
  // ═══ 충청북도 (11) ═══
  D(84,'충주시','충북',8,14,80),  D(85,'제천시','충북',8,15,70),
  D(86,'음성군','충북',9,13,45),  D(87,'단양군','충북',9,14,45),
  D(88,'증평군','충북',10,12,30), D(89,'진천군','충북',10,13,40),
  D(90,'청주시','충북',11,11,100),D(91,'괴산군','충북',11,12,50),
  D(92,'보은군','충북',12,11,45), D(93,'옥천군','충북',12,12,40),  D(94,'영동군','충북',12,13,45),
  // ═══ 충청남도 (15) ═══
  D(95,'태안군','충남',10,3,45),   D(96,'서산시','충남',10,4,65),
  D(97,'홍성군','충남',11,3,45),   D(98,'당진시','충남',11,4,60),
  D(99,'보령시','충남',12,3,50),   D(100,'예산군','충남',12,4,45),  D(101,'아산시','충남',12,5,70),  D(102,'천안시','충남',12,6,100),
  D(103,'서천군','충남',13,3,40),  D(104,'부여군','충남',13,4,45),  D(105,'청양군','충남',13,5,35),  D(106,'공주시','충남',13,6,60),
  D(107,'논산시','충남',14,4,55),  D(108,'금산군','충남',14,5,45),  D(109,'계룡시','충남',14,6,25),
  // ═══ 세종특별자치시 (1) ═══
  D(110,'세종시','세종',12,10,70),
  // ═══ 대전광역시 (5) ═══
  D(111,'유성구','대전',13,10,40), D(112,'대덕구','대전',13,11,35),
  D(113,'서구','대전',14,10,40),   D(114,'중구','대전',14,11,30),   D(115,'동구','대전',14,9,35),
  // ═══ 경상북도 (22) ═══
  D(116,'봉화군','경북',5,17,50),  D(117,'울진군','경북',5,18,55),
  D(118,'영주시','경북',6,16,65),  D(119,'영양군','경북',6,17,40),  D(120,'영덕군','경북',6,18,45),
  D(121,'문경시','경북',7,16,55),  D(122,'예천군','경북',7,17,45),
  D(123,'안동시','경북',8,16,80),  D(124,'의성군','경북',8,17,50),  D(125,'청송군','경북',8,18,40),
  D(126,'상주시','경북',9,16,60),  D(127,'구미시','경북',9,17,80),
  D(128,'김천시','경북',10,16,65), D(129,'칠곡군','경북',10,17,40), D(130,'성주군','경북',10,18,40),
  D(131,'고령군','경북',11,16,35), D(132,'경산시','경북',11,17,65), D(133,'영천시','경북',11,18,55),
  D(134,'청도군','경북',12,17,40), D(135,'경주시','경북',12,18,90), D(136,'포항시','경북',12,19,85),
  D(137,'울릉군','경북',2,21,50),
  // ═══ 대구광역시 (9) ═══
  D(138,'군위군','대구',13,15,40), D(139,'북구','대구',13,16,35),   D(140,'동구','대구',13,17,30),
  D(141,'서구','대구',14,15,25),   D(142,'중구','대구',14,16,25),   D(143,'수성구','대구',14,17,40),
  D(144,'달서구','대구',15,15,40), D(145,'남구','대구',15,16,25),   D(146,'달성군','대구',15,17,55),
  // ═══ 전북특별자치도 (14) ═══
  D(147,'군산시','전북',15,3,70),  D(148,'고창군','전북',15,4,50),  D(149,'김제시','전북',15,5,50),  D(150,'익산시','전북',15,6,70),
  D(151,'부안군','전북',16,3,45),  D(152,'정읍시','전북',16,4,55),  D(153,'전주시','전북',16,5,100), D(154,'완주군','전북',16,6,55),
  D(155,'순창군','전북',17,4,35),  D(156,'임실군','전북',17,5,40),  D(157,'남원시','전북',17,6,55),  D(158,'진안군','전북',17,7,45),
  D(159,'장수군','전북',17,3,35),  D(160,'무주군','전북',16,7,45),
  // ═══ 경상남도 (18) ═══
  D(161,'거창군','경남',15,8,50),  D(162,'합천군','경남',15,9,50),  D(163,'함양군','경남',15,10,40),
  D(164,'산청군','경남',16,9,40),  D(165,'의령군','경남',16,10,35), D(166,'창녕군','경남',16,11,45), D(167,'밀양시','경남',16,12,55),
  D(168,'하동군','경남',17,9,45),  D(169,'진주시','경남',17,10,80), D(170,'함안군','경남',17,11,40), D(171,'창원시','경남',17,12,100),
  D(172,'남해군','경남',18,9,40),  D(173,'사천시','경남',18,10,50), D(174,'고성군','경남',18,11,40), D(175,'김해시','경남',18,12,75),
  D(176,'통영시','경남',19,10,50), D(177,'거제시','경남',19,11,55), D(178,'양산시','경남',19,12,60),
  // ═══ 울산광역시 (5) ═══
  D(179,'울주군','울산',14,18,55), D(180,'북구','울산',14,19,35),
  D(181,'중구','울산',15,18,30),   D(182,'동구','울산',15,19,25),   D(183,'남구','울산',16,18,35),
  // ═══ 부산광역시 (16) ═══
  D(184,'강서구','부산',16,14,40), D(185,'북구','부산',16,15,35),   D(186,'금정구','부산',16,16,35), D(187,'기장군','부산',16,17,45),
  D(188,'사하구','부산',17,14,35), D(189,'사상구','부산',17,15,30), D(190,'동래구','부산',17,16,30), D(191,'해운대구','부산',17,17,45),
  D(192,'서구','부산',18,14,25),   D(193,'부산진구','부산',18,15,35),D(194,'연제구','부산',18,16,25), D(195,'수영구','부산',18,17,25),
  D(196,'영도구','부산',19,14,25), D(197,'중구','부산',19,15,20),   D(198,'동구','부산',19,16,20),   D(199,'남구','부산',19,17,30),
  // ═══ 광주광역시 (5) ═══
  D(200,'북구','광주',18,4,40),    D(201,'광산구','광주',18,5,45),
  D(202,'서구','광주',19,4,30),    D(203,'동구','광주',19,5,25),    D(204,'남구','광주',20,4,30),
  // ═══ 전라남도 (22) ═══
  D(205,'영광군','전남',18,2,40),  D(206,'함평군','전남',18,3,35),  D(207,'장성군','전남',18,6,40),  D(208,'담양군','전남',18,7,45),
  D(209,'무안군','전남',19,2,40),  D(210,'나주시','전남',19,3,55),  D(211,'화순군','전남',19,6,45),  D(212,'곡성군','전남',19,7,40),
  D(213,'신안군','전남',20,1,40),  D(214,'목포시','전남',20,2,55),  D(215,'영암군','전남',20,3,40),  D(216,'보성군','전남',20,5,45),  D(217,'구례군','전남',20,6,40),  D(218,'광양시','전남',20,7,55),
  D(219,'해남군','전남',21,2,55),  D(220,'강진군','전남',21,3,40),  D(221,'장흥군','전남',21,4,40),  D(222,'고흥군','전남',21,5,50),  D(223,'순천시','전남',21,6,75),  D(224,'여수시','전남',21,7,70),
  D(225,'진도군','전남',22,2,40),  D(226,'완도군','전남',22,3,45),
  // ═══ 제주특별자치도 (2) ═══
  D(227,'제주시','제주',24,4,90),  D(228,'서귀포시','제주',24,5,70),
  // ═══ 독도 ═══
  D(229,'독도','경북',3,22,20),
];

// 이름이 겹치는 지역(중구·동구·서구·남구·북구·강서구·고성군 등)은
// 표시할 때 시/도를 앞에 붙여 구분한다. 예: '서울 중구' vs '부산 중구'
const DUP_NAMES = (() => {
  const counts: Record<string, number> = {};
  for (const d of DISTRICT_DATA) counts[d.name] = (counts[d.name] || 0) + 1;
  return new Set(Object.keys(counts).filter(n => counts[n] > 1));
})();

const districtLabel = (d: { name: string; region: string }): string =>
  DUP_NAMES.has(d.name) ? `${d.region} ${d.name}` : d.name;

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

// ── 콤보 타임 ────────────────────────────────────────
// 콤보 배율은 하루 1시간의 '콤보 타임'에만 열린다. 시간대는 날짜 문자열
// 해시로 결정(10~23시 사이)되므로 서버 없이도 모든 유저에게 같은 시각에
// 열린다 = 공평 + 같은 시간대에 유저가 몰리는 이벤트성.
function comboWindowFor(date: Date): { start: number; end: number } {
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const hour = 10 + (h % 14); // 10:00 ~ 23:00 시작 (새벽 배제)
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);
  return { start: start.getTime(), end: start.getTime() + 3600 * 1000 };
}

function isComboTime(now: number = Date.now()): boolean {
  const w = comboWindowFor(new Date(now));
  return now >= w.start && now < w.end;
}

// 진행 중이거나 다가올 가장 가까운 콤보 타임 (오늘 지났으면 내일)
function nextComboWindow(now: number = Date.now()): { start: number; end: number } {
  const today = comboWindowFor(new Date(now));
  if (now < today.end) return today;
  return comboWindowFor(new Date(now + 86400 * 1000));
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

// ── 부재 중 NPC 시뮬레이션 ──────────────────────────
// 유저가 자리를 비운 elapsedMs 동안 NPC들이 활동한 결과를 일괄 계산한다.
// 우선 플레이어의 영토(HP 낮은 순)를 노리고, 없으면 미점령지를 먹는다.
// 플레이어의 마지막 1개 영토는 절대 뺏지 않는다 (전멸 방지).
function simulateNpcOffline(
  districts: District[],
  elapsedMs: number,
): { districts: District[]; thefts: TheftEvent[]; otherConquests: number } {
  const cappedMs = Math.min(elapsedMs, NPC_MAX_OFFLINE_MS);
  let budget = Math.floor((cappedMs / 1000) * NPC_OFFLINE_DPS);
  if (budget <= 0) return { districts, thefts: [], otherConquests: 0 };

  const next = districts.map(d => ({ ...d }));
  const thefts: TheftEvent[] = [];
  let otherConquests = 0;
  let npcIdx = Math.floor(elapsedMs / 1000) % NPC_NAMES.length;

  while (budget > 0) {
    const playerLands = next.filter(d => d.owner === 'player');
    const canSteal = playerLands.length > 1 && thefts.length < NPC_MAX_THEFTS_PER_ABSENCE;
    const pool = canSteal ? playerLands : next.filter(d => !d.owner);
    if (!pool.length) break;

    pool.sort((a, b) => a.currentHp - b.currentHp);
    const target = pool[0];
    const dmg = Math.min(budget, target.currentHp);
    target.currentHp -= dmg;
    budget -= dmg;

    if (target.currentHp <= 0) {
      const npc = NPC_NAMES[npcIdx % NPC_NAMES.length];
      npcIdx++;
      if (target.owner === 'player') {
        thefts.push({ npc, districtId: target.id, districtName: districtLabel(target) });
      } else {
        otherConquests++;
      }
      target.owner = npc;
      target.currentHp = target.maxHp;
    }
  }

  return { districts: next, thefts, otherConquests };
}

// ═══════════════════════════════════════════════════════════
// Local Storage
// ═══════════════════════════════════════════════════════════

const SAVE_KEY = 'tapwar_pixel_v4';
const KEYCAP_DESIGNS_KEY = 'tapwar_keycap_designs_v1';

interface SaveData {
  districts: { id: number; hp: number; owner: string | null }[];
  taps: number;
  bestCombo: number;
  seasonEnd: number;
  keycapCount?: number;
  activeKeycapIds?: (string | null)[];
  lastSeenAt?: number;
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const s: SaveData = JSON.parse(raw);
      const districts: District[] = DISTRICT_DATA.map(d => {
        const sd = s.districts.find(x => x.id === d.id);
        const maxHp = d.maxHp * HP_SCALE;
        return { ...d, maxHp, currentHp: Math.min(sd?.hp ?? maxHp, maxHp), owner: sd?.owner ?? null };
      });
      return {
        districts, taps: s.taps, bestCombo: s.bestCombo, seasonEnd: s.seasonEnd,
        keycapCount: s.keycapCount ?? 1,
        activeKeycapIds: s.activeKeycapIds ?? [null, null, null, null],
        lastSeenAt: s.lastSeenAt ?? Date.now(),
      };
    }
  } catch { /* corrupt save */ }

  const districts: District[] = DISTRICT_DATA.map((d) => {
    const maxHp = d.maxHp * HP_SCALE;
    if (d.id % 4 === 1 && d.id >= 4) {
      // id가 4씩 건너뛰므로 id%8은 2명에게만 몰린다 — floor(id/4)로 8명에게 고르게 배분
      return { ...d, maxHp, currentHp: maxHp, owner: NPC_NAMES[Math.floor(d.id / 4) % NPC_NAMES.length] };
    }
    return { ...d, maxHp, currentHp: maxHp, owner: null };
  });
  return {
    districts, taps: 0, bestCombo: 0, seasonEnd: Date.now() + 7 * 86400000,
    keycapCount: 1,
    activeKeycapIds: [null, null, null, null] as (string | null)[],
    lastSeenAt: Date.now(),
  };
}

// 로드 직후, 마지막 접속 이후 흐른 시간만큼 NPC 활동을 반영해서 게임을 시작한다.
// 시즌 종료 이후의 시간은 부재로 치지 않는다.
function initGame() {
  const g = loadGame();

  // 웹뷰가 백그라운드(프리렌더/세션 복원)로 로드된 경우: 지금 시뮬레이션하면
  // 유저가 리포트를 못 보고 lastSeenAt만 리셋되므로, 첫 화면 노출 시점으로 미룬다.
  if (document.visibilityState === 'hidden') {
    return { ...g, report: null as InvasionReport | null, deferredFrom: g.lastSeenAt as number | null };
  }

  const elapsed = Math.min(Date.now(), g.seasonEnd) - g.lastSeenAt;
  if (elapsed < NPC_MIN_OFFLINE_MS) {
    return { ...g, report: null as InvasionReport | null, deferredFrom: null as number | null };
  }
  const { districts, thefts, otherConquests } = simulateNpcOffline(g.districts, elapsed);
  const report: InvasionReport | null =
    thefts.length > 0 || otherConquests > 0 ? { thefts, otherConquests } : null;
  return { ...g, districts, report, deferredFrom: null as number | null };
}

function saveGame(
  districts: District[], taps: number, bestCombo: number, seasonEnd: number,
  keycapCount: number, activeKeycapIds: (string | null)[],
) {
  try {
    const data: SaveData = {
      districts: districts.map(d => ({ id: d.id, hp: d.currentHp, owner: d.owner })),
      taps, bestCombo, seasonEnd, keycapCount, activeKeycapIds,
      lastSeenAt: Date.now(),
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
  const [init] = useState(initGame);
  const [districts, setDistricts] = useState<District[]>(init.districts);
  const [selectedId, setSelectedId] = useState(() => {
    // 첫 목표는 가장 싼 미점령지 — 첫 점령 도파민까지의 거리를 최소화
    const unclaimed = init.districts.filter(d => !d.owner);
    if (!unclaimed.length) return init.districts[0].id;
    return unclaimed.reduce((min, d) => (d.maxHp < min.maxHp ? d : min)).id;
  });
  const [combo, setCombo] = useState(0);
  const [totalTaps, setTotalTaps] = useState(init.taps);
  const [bestCombo, setBestCombo] = useState(init.bestCombo);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>(() => [
    ...(init.report?.thefts.slice(0, 5).map((t, i) => ({
      id: 2 + i,
      text: `💥 ${t.npc} → [${t.districtName}] 점령!`,
      type: 'npc' as const,
    })) ?? []),
    { id: 1, text: '⚔ 시즌 1 시작! 대한민국을 점령하세요!', type: 'system' },
  ]);
  const [conquestName, setConquestName] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [flashId, setFlashId] = useState<number | null>(null);
  const [invasionReport, setInvasionReport] = useState<InvasionReport | null>(init.report);
  const [comboTime, setComboTime] = useState(() => isComboTime());
  const [comboToast, setComboToast] = useState(false);

  const [keycapCount, setKeycapCount] = useState(init.keycapCount);
  const [keycapDesigns, setKeycapDesigns] = useState<KeycapDesign[]>(loadKeycapDesigns);
  const [activeKeycapIds, setActiveKeycapIds] = useState<(string | null)[]>(init.activeKeycapIds);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerSlot, setDesignerSlot] = useState(0);
  const [showRanking, setShowRanking] = useState(false);

  const comboTimer = useRef(0);
  const comboTimeRef = useRef(isComboTime());
  const feedId = useRef(10);
  const particleId = useRef(0);
  const sound = useRef(createPixelSound());
  const seasonEnd = useRef(init.seasonEnd);
  const comboRef = useRef(0);
  const keycapRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = districts.find(d => d.id === selectedId) ?? null;
  const playerCount = districts.filter(d => d.owner === 'player').length;
  const mult = comboTime ? comboMultiplier(combo) : 1;
  const isFever = comboTime && combo >= 30;
  const sz = KEYCAP_SIZE[keycapCount as keyof typeof KEYCAP_SIZE];

  const getDesignImage = useCallback((slotIndex: number): string | null => {
    const designId = activeKeycapIds[slotIndex];
    if (!designId) return null;
    return keycapDesigns.find(d => d.id === designId)?.imageData ?? null;
  }, [activeKeycapIds, keycapDesigns]);

  // ── Season Timer + 콤보 타임 감지 ────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(formatTime(seasonEnd.current - Date.now()));

      const active = isComboTime();
      if (active !== comboTimeRef.current) {
        comboTimeRef.current = active;
        setComboTime(active);
        if (active) {
          // 앱을 보고 있는 중에 콤보 타임이 열리면 즉시 알림
          setComboToast(true);
          setTimeout(() => setComboToast(false), 2600);
          sound.current.combo(3);
          if (navigator.vibrate) navigator.vibrate([30, 30, 30]);
          setFeed(f => [{ id: ++feedId.current, text: '🔥 콤보 타임 시작! 1시간 동안 콤보 배율 최대 ×8!', type: 'system' as const }, ...f].slice(0, 30));
        } else {
          comboRef.current = 0;
          setCombo(0);
          setFeed(f => [{ id: ++feedId.current, text: '⏰ 콤보 타임 종료! 내일 다시 열립니다', type: 'system' as const }, ...f].slice(0, 30));
        }
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Auto-save ────────────────────────────────────────
  // 타이머 id를 ref로 보관: hidden/pagehide flush가 pending 디바운스를
  // 취소할 수 있어야 부재 중 뒤늦게 발화해 lastSeenAt을 오염시키지 않는다.
  const autosaveTimer = useRef(0);
  useEffect(() => {
    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(
      () => saveGame(districts, totalTaps, bestCombo, seasonEnd.current, keycapCount, activeKeycapIds),
      500,
    );
    return () => clearTimeout(autosaveTimer.current);
  }, [districts, totalTaps, bestCombo, keycapCount, activeKeycapIds]);

  // ── Save keycap designs ──────────────────────────────
  useEffect(() => {
    saveKeycapDesignsToStorage(keycapDesigns);
  }, [keycapDesigns]);

  // ── NPC: 부재 중에만 활동 ────────────────────────────
  // 앱을 보고 있는 동안 NPC는 완전히 잠들어 있다. 탭이 백그라운드로
  // 가거나 앱이 닫히면 그때부터 NPC가 깨어나고, 돌아왔을 때 그 사이의
  // 활동을 일괄 반영한 뒤 뺏긴 영토를 침공 리포트로 알려준다.
  const districtsRef = useRef(districts);
  useEffect(() => { districtsRef.current = districts; }, [districts]);

  // districts는 state가 아니라 ref에서 읽는다: applyOffline이 시뮬레이션 결과를
  // districtsRef에 동기 반영하므로, 직후 flush가 와도 최신 상태가 저장된다.
  const saveNowRef = useRef(() => {});
  useEffect(() => {
    saveNowRef.current = () =>
      saveGame(districtsRef.current, totalTaps, bestCombo, seasonEnd.current, keycapCount, activeKeycapIds);
  }, [totalTaps, bestCombo, keycapCount, activeKeycapIds]);

  // hidden 상태로 로드된 경우(프리렌더) 저장된 lastSeenAt에서 부재가 이어지는 중
  const hiddenAtRef = useRef<number | null>(init.deferredFrom);
  useEffect(() => {
    const applyOffline = () => {
      if (hiddenAtRef.current === null) return;
      // 시즌 종료 이후의 시간은 부재로 치지 않는다
      const elapsed = Math.min(Date.now(), seasonEnd.current) - hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (elapsed < NPC_MIN_OFFLINE_MS) return;
      const { districts: after, thefts, otherConquests } =
        simulateNpcOffline(districtsRef.current, elapsed);
      // 점령 미달의 부분 데미지도 항상 반영 — 콜드 스타트(initGame)와 동일 규칙
      districtsRef.current = after;
      setDistricts(after);
      if (thefts.length) {
        setFeed(f => [
          ...thefts.slice(0, 5).map(t => ({
            id: ++feedId.current,
            text: `💥 ${t.npc} → [${t.districtName}] 점령!`,
            type: 'npc' as const,
          })),
          ...f,
        ].slice(0, 30));
        sound.current.npcAlert();
      }
      if (thefts.length || otherConquests > 0) {
        setInvasionReport({ thefts, otherConquests });
      }
      saveNowRef.current();
    };
    const markHidden = () => {
      // 항상 덮어쓴다: stale하게 남은 과거 시각이 활성 플레이 시간을
      // 부재로 과대 계산하는 것보다 부재 1회 유실이 낫다.
      hiddenAtRef.current = Date.now();
      clearTimeout(autosaveTimer.current);
      saveNowRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') markHidden();
      else applyOffline();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      // iOS bfcache 복원 시 visibilitychange(visible)가 안 오는 경우 대비
      if (e.persisted) applyOffline();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', markHidden);
    window.addEventListener('pageshow', onPageShow);

    // 하트비트: 크래시/강제종료로 hidden 이벤트를 못 받아도, 화면을 보고 있던
    // 시간이 NPC 부재로 계산되지 않도록 lastSeenAt을 30초마다 갱신한다.
    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === 'visible') saveNowRef.current();
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', markHidden);
      window.removeEventListener('pageshow', onPageShow);
      clearInterval(heartbeat);
    };
  }, []);

  // ── NPC: 접속 중에도 1배 속도로 활동 ─────────────────
  // 20초마다 한 번씩 공격한다 (틱당 6 데미지 = NPC_ACTIVE_DPS × 20초).
  // 3틱에 1번만 플레이어 영토를 노리고 나머지는 미점령지로 확장 —
  // 플레이 중 압박은 느껴지되 유저 연타 화력에 압도적으로 밀리는 수준.
  useEffect(() => {
    let tickN = 0;
    const t = setInterval(() => {
      // 화면이 안 보이는 동안은 부재 시뮬레이션 담당 (이중 계산 방지)
      if (document.visibilityState !== 'visible' || hiddenAtRef.current !== null) return;
      tickN++;
      const dmg = Math.round(NPC_ACTIVE_DPS * (NPC_ACTIVE_TICK_MS / 1000));
      const lands = districtsRef.current;
      const playerLands = lands.filter(d => d.owner === 'player');
      const attackPlayer = tickN % 3 === 0 && playerLands.length > 1;
      const pool = attackPlayer ? playerLands : lands.filter(d => !d.owner);
      if (!pool.length) return;
      const target = pool.reduce((m, d) => (d.currentHp < m.currentHp ? d : m));
      const npc = NPC_NAMES[tickN % NPC_NAMES.length];
      const hp = target.currentHp - dmg;
      const won = hp <= 0;
      const wasPlayers = target.owner === 'player';

      const updated = lands.map(d => d.id === target.id
        ? (won ? { ...d, currentHp: d.maxHp, owner: npc } : { ...d, currentHp: hp })
        : d);
      districtsRef.current = updated;
      setDistricts(updated);

      const pushFeed = (text: string) =>
        setFeed(f => [{ id: ++feedId.current, text, type: 'npc' as const }, ...f].slice(0, 30));
      if (won) {
        pushFeed(`💥 ${npc} → [${districtLabel(target)}] 점령!`);
        if (wasPlayers) sound.current.npcAlert();
      } else if (wasPlayers) {
        pushFeed(`⚡ ${npc} → [${districtLabel(target)}] -${dmg}`);
      }
    }, NPC_ACTIVE_TICK_MS);
    return () => clearInterval(t);
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
  const handleTap = useCallback((e: React.PointerEvent, keycapIdx: number) => {
    if (e.button !== 0) return;
    e.preventDefault();

    // updater 안에서 부수효과를 실행하면 StrictMode/concurrent 재실행 시
    // 콤보·사운드가 중복된다. districtsRef를 진실의 원천으로 삼아 모든 로직을
    // 핸들러 본문(1회 실행 보장)에서 처리하고, setDistricts에는 결과만 넘긴다.
    const target = districtsRef.current.find(d => d.id === selectedId);
    if (!target || target.owner === 'player') return;

    // 콤보 배율은 하루 1시간 '콤보 타임'에만 열린다 — 평상시 탭은 고정 1 데미지
    let dmg = 1;
    if (comboTimeRef.current) {
      comboRef.current += 1;
      const c = comboRef.current;
      dmg = comboMultiplier(c);
      setCombo(c);
      if (c > bestCombo) setBestCombo(c);
      clearTimeout(comboTimer.current);
      comboTimer.current = window.setTimeout(() => { comboRef.current = 0; setCombo(0); }, 1500);
      if ([5, 15, 30, 50].includes(c)) sound.current.combo(Math.ceil(c / 15));
    }
    setTotalTaps(t => t + 1);

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

    const updated = districtsRef.current.map(d =>
      d.id === target.id
        ? (won ? { ...d, currentHp: d.maxHp, owner: 'player' } : { ...d, currentHp: hp })
        : d);
    districtsRef.current = updated;
    setDistricts(updated);

    if (won) {
      sound.current.conquest();
      if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
      setConquestName(districtLabel(target));
      setTimeout(() => setConquestName(null), 1500);
      addFeed(`🏴 [${districtLabel(target)}] 점령 완료!`, 'player');
      const nxt = nextTarget(target, updated);
      setTimeout(() => setSelectedId(nxt), 200);
    }
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

  const ranking = (() => {
    const counts: Record<string, number> = {};
    for (const d of districts) {
      if (d.owner) {
        counts[d.owner] = (counts[d.owner] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  })();

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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowRanking(true)}
              style={{
                background: '#1a1a35',
                border: '2px solid #2a2a45',
                padding: '4px 8px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 12 }}>🏆</span>
              <span style={{ fontSize: 9, fontWeight: 900, color: '#fbbf24', letterSpacing: 1 }}>RANK</span>
            </button>
            <div className="text-right">
              <div className="text-[9px] tracking-[2px]" style={{ color: '#5a5a8a' }}>점령</div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold" style={{ color: PLAYER_COLOR }}>{playerCount}</span>
                <span className="text-xs" style={{ color: '#3a3a5a' }}>/{DISTRICT_DATA.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Map ─────────────────────────────────── */}
      <div className="flex-none flex justify-center py-2 overflow-hidden">
        <div style={{
          display: 'inline-grid',
          gridTemplateColumns: 'repeat(22, 12px)',
          gridTemplateRows: 'repeat(25, 10px)',
          gap: '1px',
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
                  width: 12, height: 10,
                  background: color,
                  border: isSel ? '1px solid #fff' : `1px solid ${d.owner ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'}`,
                  cursor: 'pointer',
                  boxShadow: isSel ? `0 0 6px ${PLAYER_COLOR}66` : 'none',
                  position: 'relative',
                }}
                animate={isSel ? { opacity: [1, 0.55, 1] } : { opacity: 1 }}
                transition={isSel ? { repeat: Infinity, duration: 0.7, ease: 'easeInOut' } : { duration: 0.15 }}
              >
                {d.owner === 'player' && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 5, color: '#0a0a1e', fontWeight: 900,
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
          <div style={{ width: 6, height: 6, background: PLAYER_COLOR }} />
          <span className="text-[8px]" style={{ color: '#6a6a9a' }}>나</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 6, height: 6, background: '#ff6b6b' }} />
          <span className="text-[8px]" style={{ color: '#6a6a9a' }}>적</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 6, height: 6, background: UNCLAIMED_BG, border: '1px solid #333' }} />
          <span className="text-[8px]" style={{ color: '#6a6a9a' }}>미점령</span>
        </div>
      </div>

      {/* ── Combo Time Banner ────────────────────── */}
      <div className="flex-none px-5 pb-1">
        {comboTime ? (() => {
          const w = comboWindowFor(new Date());
          const remain = Math.max(0, w.end - Date.now());
          const mm = Math.floor(remain / 60000);
          const ss = Math.floor((remain % 60000) / 1000);
          return (
            <motion.div
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                border: '2px solid #fbbf24',
                background: 'rgba(251,191,36,0.1)',
                padding: '4px 8px',
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fbbf24' }}>
                🔥 콤보 타임! 배율 최대 ×8
              </span>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fbbf24' }}>
                {mm}:{String(ss).padStart(2, '0')} 남음
              </span>
            </motion.div>
          );
        })() : (() => {
          const w = nextComboWindow();
          const startDate = new Date(w.start);
          const isToday = startDate.getDate() === new Date().getDate();
          const hh = String(startDate.getHours()).padStart(2, '0');
          const eh = String(new Date(w.end).getHours()).padStart(2, '0');
          return (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '2px solid #1a1a35',
              padding: '4px 8px',
            }}>
              <span style={{ fontSize: 9, color: '#5a5a8a', fontWeight: 700 }}>
                ⚡ {isToday ? '오늘' : '내일'}의 콤보 타임
              </span>
              <span style={{ fontSize: 10, color: '#8888bb', fontWeight: 900 }}>
                {hh}:00 ~ {eh}:00
              </span>
            </div>
          );
        })()}
      </div>

      {/* ── Selected District HP ────────────────── */}
      <div className="flex-none px-5 py-1">
        {selected && (
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: ownerColor(selected.owner) }}>
                  [{districtLabel(selected)}]
                </span>
                {!DUP_NAMES.has(selected.name) && (
                  <span className="text-[9px]" style={{ color: '#5a5a8a' }}>{selected.region}</span>
                )}
              </div>
              <span className="text-[10px] font-bold" style={{ color: isOwned ? '#4ade80' : '#ccccee' }}>
                {isOwned
                  ? (selected.currentHp < selected.maxHp
                    ? `방어중 ${selected.currentHp}/${selected.maxHp}`
                    : '방어중')
                  : `${selected.currentHp}/${selected.maxHp}`}
              </span>
            </div>
            {(!isOwned || selected.currentHp < selected.maxHp) && (
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
                onPointerDown={(e) => handleTap(e, i)}
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

      {/* ── Combo Time Toast ─────────────────────── */}
      <AnimatePresence>
        {comboToast && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 75 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.3, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16 }}
              style={{
                background: '#0a0a1e',
                border: '4px solid',
                borderColor: '#fbbf24 #7a5a10 #7a5a10 #fbbf24',
                padding: '16px 28px',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(251,191,36,0.35)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 4 }}>🔥</div>
              <div style={{ color: '#fbbf24', fontSize: 16, fontWeight: 900, letterSpacing: 2 }}>
                콤보 타임 시작!
              </div>
              <div style={{ color: '#ccccee', fontSize: 10, fontWeight: 700, marginTop: 4 }}>
                지금부터 1시간, 콤보 배율 최대 ×8
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invasion Report (부재 중 침공 알림) ──── */}
      <AnimatePresence>
        {invasionReport && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 85 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(0,0,0,0.75)' }}
              onClick={() => setInvasionReport(null)}
            />
            <motion.div
              className="relative"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                width: 'min(320px, 85vw)',
                background: '#0a0a1e',
                border: '4px solid',
                borderColor: '#ff6b6b #661111 #661111 #ff6b6b',
                padding: '20px 20px 16px',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(255,107,107,0.3)',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 6 }}>🚨</div>
              <div style={{ color: '#ff6b6b', fontSize: 15, fontWeight: 900, letterSpacing: 2, marginBottom: 4 }}>
                침공 알림
              </div>
              {invasionReport.thefts.length > 0 ? (
                <>
                  <div style={{ color: '#ccccee', fontSize: 11, marginBottom: 10 }}>
                    자리 비운 사이 영토 <span style={{ color: '#ff6b6b', fontWeight: 900 }}>{invasionReport.thefts.length}개</span>를 뺏겼습니다!
                  </div>
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: 4,
                    maxHeight: 150, overflowY: 'auto', marginBottom: 12,
                  }}>
                    {invasionReport.thefts.slice(0, 6).map(t => (
                      <div key={t.districtId} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '5px 8px',
                        background: 'rgba(255,107,107,0.07)',
                        border: '2px solid rgba(255,107,107,0.15)',
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: ownerColor(t.npc) }}>{t.npc}</span>
                        <span style={{ fontSize: 10, color: '#ccccee' }}>[{t.districtName}]</span>
                      </div>
                    ))}
                    {invasionReport.thefts.length > 6 && (
                      <div style={{ fontSize: 9, color: '#5a5a8a' }}>
                        외 {invasionReport.thefts.length - 6}개…
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const first = invasionReport.thefts[0];
                      setSelectedId(first.districtId);
                      setInvasionReport(null);
                    }}
                    style={{
                      width: '100%', padding: '10px 0',
                      background: '#ff6b6b',
                      border: '3px solid',
                      borderColor: '#ff9999 #cc3333 #cc3333 #ff9999',
                      color: '#0a0a1e',
                      fontSize: 12, fontWeight: 900, letterSpacing: 2,
                      cursor: 'pointer',
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    ⚔ 되찾으러 가기
                  </button>
                </>
              ) : (
                <>
                  <div style={{ color: '#ccccee', fontSize: 11, marginBottom: 12 }}>
                    자리 비운 사이 NPC들이 <span style={{ color: '#fbbf24', fontWeight: 900 }}>{invasionReport.otherConquests}개</span> 지역을 점령했습니다
                  </div>
                  <button
                    onClick={() => setInvasionReport(null)}
                    style={{
                      width: '100%', padding: '10px 0',
                      background: '#1a1a35',
                      border: '3px solid #2a2a45',
                      color: '#ccccee',
                      fontSize: 12, fontWeight: 900, letterSpacing: 2,
                      cursor: 'pointer',
                      fontFamily: "'Courier New', monospace",
                    }}
                  >
                    확인
                  </button>
                </>
              )}
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

      {/* ── Ranking Panel ─────────────────────── */}
      <AnimatePresence>
        {showRanking && (
          <motion.div
            className="fixed inset-0 flex items-end justify-center"
            style={{ zIndex: 80 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => setShowRanking(false)} />
            <motion.div
              className="relative w-full max-w-md overflow-y-auto"
              style={{
                maxHeight: '70vh',
                background: '#0e0e2a',
                border: '3px solid #2a2a50',
                borderBottom: 'none',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div style={{ width: 40, height: 4, background: '#2a2a50', borderRadius: 2 }} />
              </div>

              <div className="px-5 pb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18 }}>🏆</span>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#fbbf24', letterSpacing: 2 }}>
                      실시간 랭킹
                    </span>
                  </div>
                  <span style={{ fontSize: 9, color: '#5a5a8a', letterSpacing: 1 }}>
                    LIVE · {DISTRICT_DATA.length}개 지역
                  </span>
                </div>

                {ranking.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#5a5a8a', fontSize: 12 }}>
                    아직 점령된 지역이 없습니다
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {ranking.map((entry, idx) => {
                      const isPlayer = entry.name === 'player';
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                      const pct = Math.round((entry.count / DISTRICT_DATA.length) * 100);
                      const color = isPlayer ? PLAYER_COLOR : (NPC_COLORS[entry.name] || '#ff6b6b');
                      return (
                        <motion.div
                          key={entry.name}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 10px',
                            background: isPlayer ? 'rgba(0,229,255,0.08)' : 'rgba(255,255,255,0.02)',
                            border: `2px solid ${isPlayer ? 'rgba(0,229,255,0.2)' : '#1a1a35'}`,
                          }}
                        >
                          <div style={{
                            width: 24, textAlign: 'center',
                            fontSize: medal ? 16 : 11,
                            fontWeight: 900,
                            color: medal ? undefined : '#5a5a8a',
                          }}>
                            {medal || (idx + 1)}
                          </div>

                          <div style={{
                            width: 10, height: 10,
                            background: color,
                            border: '1px solid rgba(255,255,255,0.15)',
                            flexShrink: 0,
                          }} />

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 11, fontWeight: 900,
                              color: isPlayer ? PLAYER_COLOR : '#ccccee',
                              marginBottom: 2,
                            }}>
                              {isPlayer ? '나' : entry.name}
                            </div>
                            <div style={{
                              height: 4,
                              background: '#111128',
                              border: '1px solid #1a1a35',
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${pct}%`,
                                background: color,
                                transition: 'width 0.3s',
                              }} />
                            </div>
                          </div>

                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{
                              fontSize: 14, fontWeight: 900,
                              color: isPlayer ? PLAYER_COLOR : '#ccccee',
                            }}>
                              {entry.count}
                            </div>
                            <div style={{ fontSize: 8, color: '#5a5a8a' }}>
                              {pct}%
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                {/* Unclaimed count */}
                {(() => {
                  const unclaimed = districts.filter(d => !d.owner).length;
                  if (unclaimed === 0) return null;
                  return (
                    <div style={{
                      marginTop: 8, padding: '6px 10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      border: '2px solid #1a1a35',
                    }}>
                      <span style={{ fontSize: 10, color: '#3a3a5a', fontWeight: 700 }}>
                        미점령 지역
                      </span>
                      <span style={{ fontSize: 12, color: '#3a3a5a', fontWeight: 900 }}>
                        {unclaimed}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
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
