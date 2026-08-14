/**
 * 앱인토스(Apps in Toss) 플랫폼 어댑터.
 *
 * 게임은 토스 웹뷰 안에서도, 일반 브라우저(개발/테스트)에서도 동작해야 한다.
 * SDK 호출은 전부 이 파일을 거치고, 토스 밖에서는 웹 표준으로 폴백한다.
 *
 * 참고: @apps-in-toss/web-framework v3 — 플랫 함수(generateHapticFeedback 등)는
 * deprecated 이고 네임스페이스 객체(Device/SafeArea/Screen/Game/User/Environment)가 최신 API다.
 */
import {
  Device,
  Environment,
  Game,
  SafeArea,
  Screen,
  User,
  graniteEvent,
} from '@apps-in-toss/web-framework';

/** 토스 앱(또는 샌드박스) 안에서 실행 중인지 */
export function isInToss(): boolean {
  try {
    return Environment.environment === 'toss' || Environment.environment === 'sandbox';
  } catch {
    return false;
  }
}

// ── 햅틱 ─────────────────────────────────────────────
// iOS Safari/WKWebView에는 navigator.vibrate가 없어서 웹 API만으로는 무음 기기에
// 아무 피드백도 줄 수 없다. 토스 안에서는 네이티브 햅틱을 쓴다.
export type Haptic = 'tap' | 'success' | 'error' | 'confetti' | 'tickWeak';

const WEB_VIBRATION: Record<Haptic, number | number[]> = {
  tap: 12,
  tickWeak: 8,
  success: [40, 20, 40],
  error: [60, 30, 60],
  confetti: [60, 40, 60, 40, 100],
};

export function haptic(type: Haptic): void {
  try {
    if (isInToss()) {
      void Device.triggerHaptic({ type }).catch(() => {});
      return;
    }
  } catch { /* SDK 미탑재 환경 */ }
  try {
    navigator.vibrate?.(WEB_VIBRATION[type]);
  } catch { /* 미지원 */ }
}

// ── Safe Area ────────────────────────────────────────
export interface Insets { top: number; bottom: number; left: number; right: number; }

export function getSafeAreaInsets(): Insets | null {
  try {
    if (!isInToss()) return null;
    const i = SafeArea.get();
    return { top: i.top, bottom: i.bottom, left: i.left, right: i.right };
  } catch {
    return null;
  }
}

export function subscribeSafeArea(cb: (i: Insets) => void): () => void {
  try {
    if (!isInToss()) return () => {};
    return SafeArea.subscribe({
      onEvent: (i) => cb({ top: i.top, bottom: i.bottom, left: i.left, right: i.right }),
    });
  } catch {
    return () => {};
  }
}

// ── 화면 제어 ────────────────────────────────────────
/** 연타 중 화면이 꺼지지 않도록. 반환값으로 해제한다. */
export function keepScreenAwake(enabled: boolean): void {
  try {
    if (isInToss()) void Screen.setAwakeMode({ enabled }).catch(() => {});
  } catch { /* 미지원 */ }
}

/** 미니앱 종료 (뒤로가기로 더 닫을 화면이 없을 때) */
export function closeApp(): void {
  try {
    if (isInToss()) void Screen.close().catch(() => {});
  } catch { /* 미지원 */ }
}

// ── 시스템 뒤로가기 / 홈 ─────────────────────────────
// 심사 기준: "모든 화면에서 뒤로가기가 정상 동작해야 한다".
// 열린 모달이 있으면 모달만 닫고, 없으면 앱을 종료한다.
export function subscribeBack(onBack: () => void): () => void {
  try {
    if (!isInToss()) return () => {};
    return graniteEvent.addEventListener('backEvent', { onEvent: onBack });
  } catch {
    return () => {};
  }
}

// ── 서버 시간 ────────────────────────────────────────
// 콤보 타임은 모든 유저에게 같은 시각에 열려야 한다. 기기 시계는 조작 가능하므로
// 토스 서버 시간과의 오차를 구해 보정한다. (미지원 버전이면 오차 0)
let clockSkewMs = 0;

export async function syncServerClock(): Promise<void> {
  try {
    if (!isInToss() || !Environment.getServerTime.isSupported()) return;
    const server = await Environment.getServerTime();
    if (typeof server === 'number' && Number.isFinite(server)) {
      clockSkewMs = server - Date.now();
    }
  } catch { /* 미지원 또는 실패 시 기기 시계 사용 */ }
}

/** 서버 보정이 적용된 현재 시각 */
export function now(): number {
  return Date.now() + clockSkewMs;
}

// ── 유저 식별 ────────────────────────────────────────
// 게임 카테고리 필수 항목: 유저를 식별해야 리더보드·보상을 붙일 수 있다.
export async function getUserKey(): Promise<string | null> {
  try {
    if (!isInToss() || !User.getAnonymousKey.isSupported()) return null;
    const res = await User.getAnonymousKey();
    return (res as { key?: string } | undefined)?.key ?? null;
  } catch {
    return null;
  }
}

// ── 게임 리더보드 (토스 게임센터) ────────────────────
export function isLeaderboardAvailable(): boolean {
  try {
    return isInToss() && Game.openLeaderboard.isSupported();
  } catch {
    return false;
  }
}

/** 점령한 영토 수를 게임센터 리더보드에 제출 */
export async function submitLeaderboardScore(score: number): Promise<void> {
  try {
    if (!isInToss() || !Game.setLeaderboardScore.isSupported()) return;
    await Game.setLeaderboardScore({ score: String(score) });
  } catch { /* 제출 실패는 게임 진행을 막지 않는다 */ }
}

export async function openLeaderboard(): Promise<void> {
  try {
    if (!isInToss() || !Game.openLeaderboard.isSupported()) return;
    await Game.openLeaderboard();
  } catch { /* 미지원 */ }
}

// ── 카메라 / 사진 ────────────────────────────────────
// 키캡 커스터마이징용. 토스 안에서는 네이티브 피커를 쓰고(호스트 웹뷰의
// <input type=file> 구현에 의존하지 않는다), 밖에서는 파일 입력으로 폴백한다.
export function isNativeMediaAvailable(): boolean {
  return isInToss();
}

/** 앨범에서 사진 1장 선택 → dataURI, 취소/미지원이면 null */
export async function pickPhoto(): Promise<string | null> {
  try {
    if (!isInToss()) return null;
    const photos = await Device.getPhotos({ maxCount: 1, maxWidth: 512 });
    return photos?.[0]?.dataUri ?? null;
  } catch {
    return null;
  }
}

/** 카메라 촬영 → dataURI, 취소/미지원이면 null */
export async function takePhoto(): Promise<string | null> {
  try {
    if (!isInToss()) return null;
    const shot = await Device.openCamera({ maxWidth: 512 });
    return shot?.dataUri ?? null;
  } catch {
    return null;
  }
}
