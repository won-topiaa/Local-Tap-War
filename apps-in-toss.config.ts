import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에 등록한 appName과 반드시 일치해야 한다
  appName: 'tapwar-game',
  brand: {
    // 게임의 대표 색상 (플레이어 영토 색과 동일)
    primaryColor: '#00e5ff',
  },
  // 키캡 커스터마이징에서 사진 촬영/불러오기에 사용
  permissions: [
    { name: 'camera', access: 'access' },
    { name: 'photos', access: 'read' },
  ],
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
    withTitle: true,
    theme: 'dark',
  },
  webView: {
    // 탭 게임이라 스크롤 바운스/당겨서 새로고침이 오작동을 유발한다
    bounces: false,
    pullToRefreshEnabled: false,
    overScrollMode: 'never',
    // 8bit 효과음이 유저 제스처 없이도 재생돼야 한다
    mediaPlaybackRequiresUserAction: false,
    allowsInlineMediaPlayback: true,
    // 좌우 스와이프로 실수로 앱을 벗어나지 않도록
    allowsBackForwardNavigationGestures: false,
  },
  webBundleDir: 'dist',
});
