export interface GameSettings {
  sound: boolean;
  haptic: boolean;
  showMap: boolean;
}

interface SettingsPanelProps {
  settings: GameSettings;
  onChange: (settings: GameSettings) => void;
  isFever: boolean;
  onReset: () => void;
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-blue-500' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  );
}

export function SettingsPanel({ settings, onChange, isFever, onReset }: SettingsPanelProps) {
  const items = [
    { label: '효과음', icon: '🔊', key: 'sound' as const, value: settings.sound },
    { label: '진동', icon: '📳', key: 'haptic' as const, value: settings.haptic },
    { label: '지도 표시', icon: '🗺️', key: 'showMap' as const, value: settings.showMap },
  ];

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-4 backdrop-blur-sm ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-lg`}>
        <h3 className={`text-sm font-bold mb-4 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
          설정
        </h3>
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <span className={`text-sm font-bold ${isFever ? 'text-white' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </div>
              <Toggle
                on={item.value}
                onToggle={() => onChange({ ...settings, [item.key]: !item.value })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className={`rounded-2xl p-4 backdrop-blur-sm ${isFever ? 'bg-white/10' : 'bg-white/70'} shadow-lg`}>
        <h3 className={`text-sm font-bold mb-3 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
          데이터
        </h3>
        <button
          onClick={onReset}
          className="w-full py-2.5 rounded-xl bg-red-500/10 text-red-500 text-sm font-bold active:scale-[0.98] transition-transform"
        >
          진행 상황 초기화
        </button>
        <p className={`text-[10px] mt-2 text-center ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>
          모든 레벨, 업적, 통계가 초기화됩니다
        </p>
      </div>

      <div className="text-center py-2">
        <p className={`text-[10px] ${isFever ? 'text-indigo-400' : 'text-gray-300'}`}>
          Local Tap War v1.0.0
        </p>
      </div>
    </div>
  );
}
