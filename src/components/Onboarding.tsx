import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OnboardingProps {
  onComplete: () => void;
}

const STEPS = [
  {
    emoji: '👊',
    title: '동네 탭 전쟁에 오신 걸 환영합니다!',
    desc: '탭을 눌러 우리 동네를 강남 No.1으로 만드세요',
  },
  {
    emoji: '🔥',
    title: '50콤보 = 피버 모드',
    desc: '1초 안에 계속 탭하면 콤보가 올라가고\n50콤보에서 피버 모드(x3 점수)가 발동됩니다',
  },
  {
    emoji: '📋',
    title: '일일 미션 & 레벨업',
    desc: '매일 새로운 미션을 완료하고 경험치를 모아\n레벨을 올리세요',
  },
  {
    emoji: '🗺️',
    title: '실시간 지도로 확인',
    desc: '강남 일대 동네별 점령 현황을\n지도에서 실시간으로 확인하세요',
  },
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-gradient-to-b from-blue-600 to-indigo-900 flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className="flex flex-col items-center text-center max-w-xs"
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -60 }}
          transition={{ duration: 0.3 }}
        >
          <motion.span
            className="text-8xl mb-8"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            {STEPS[step].emoji}
          </motion.span>
          <h1 className="text-2xl font-black text-white mb-4 leading-tight">
            {STEPS[step].title}
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed whitespace-pre-line">
            {STEPS[step].desc}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="flex gap-2 mt-12 mb-8">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === step ? 'bg-white' : 'bg-white/30'
            }`}
          />
        ))}
      </div>

      {/* Button */}
      <motion.button
        onClick={() => (isLast ? onComplete() : setStep(step + 1))}
        className="w-full max-w-xs py-4 rounded-2xl bg-white text-blue-600 font-black text-lg active:scale-[0.97] transition-transform"
        whileTap={{ scale: 0.97 }}
      >
        {isLast ? '시작하기!' : '다음'}
      </motion.button>

      {!isLast && (
        <button
          onClick={onComplete}
          className="mt-4 text-white/50 text-sm"
        >
          건너뛰기
        </button>
      )}
    </motion.div>
  );
}
