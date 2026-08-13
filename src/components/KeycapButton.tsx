import { motion } from 'framer-motion';

interface KeycapButtonProps {
  imageUrl: string | null;
  isFever: boolean;
  label: string;
  onTap: (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => void;
  onCustomize: () => void;
}

export function KeycapButton({ imageUrl, isFever, label, onTap, onCustomize }: KeycapButtonProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="keycap-wrapper relative">
        <motion.button
          id="tap-button"
          onMouseDown={onTap}
          onTouchStart={onTap}
          className="keycap-outer"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          whileTap="pressed"
          initial="idle"
          animate={isFever ? 'fever' : 'idle'}
          variants={{
            idle: { y: 0 },
            pressed: { y: 6 },
            fever: { y: 0 },
          }}
        >
          {/* Keycap body (sides) */}
          <div className={`keycap-body ${isFever ? 'keycap-body--fever' : ''}`}>
            {/* Keycap top face */}
            <motion.div
              className={`keycap-top ${isFever ? 'keycap-top--fever' : ''}`}
              variants={{
                idle: { y: 0 },
                pressed: { y: 2 },
                fever: { y: 0 },
              }}
            >
              {imageUrl ? (
                <div
                  className="keycap-image"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
              ) : (
                <div className="keycap-default-face">
                  <span className="text-3xl">{isFever ? '🔥' : '👊'}</span>
                </div>
              )}

              {/* Label overlay */}
              <div className="keycap-label">
                <span className={`text-[10px] font-black tracking-wider uppercase ${
                  imageUrl ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : (isFever ? 'text-yellow-300' : 'text-white/80')
                }`}>
                  {label}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Fever pulse ring */}
          {isFever && (
            <motion.div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              animate={{
                boxShadow: [
                  '0 0 0 0 rgba(239,68,68,0.4)',
                  '0 0 0 12px rgba(239,68,68,0)',
                ],
              }}
              transition={{ repeat: Infinity, duration: 0.8 }}
            />
          )}
        </motion.button>
      </div>

      {/* Customize button */}
      <button
        onClick={onCustomize}
        className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors ${
          isFever ? 'text-indigo-300 bg-white/5 active:bg-white/10' : 'text-gray-400 bg-gray-100 active:bg-gray-200'
        }`}
      >
        🎨 키캡 꾸미기
      </button>

      <style>{`
        .keycap-wrapper {
          perspective: 800px;
        }

        .keycap-outer {
          display: block;
          padding: 0;
          border: none;
          background: transparent;
          cursor: pointer;
          outline: none;
          -webkit-tap-highlight-color: transparent;
          user-select: none;
        }

        .keycap-body {
          position: relative;
          width: 140px;
          height: 140px;
          border-radius: 18px;
          background: linear-gradient(to bottom, #c8ccd0, #9ea3a8);
          box-shadow:
            0 8px 0 0 #787d82,
            0 10px 0 0 #6b7075,
            0 12px 15px rgba(0,0,0,0.3),
            inset 0 -1px 0 rgba(255,255,255,0.15);
          transition: box-shadow 0.05s ease;
        }

        .keycap-outer:active .keycap-body,
        .keycap-body.pressed {
          box-shadow:
            0 2px 0 0 #787d82,
            0 3px 0 0 #6b7075,
            0 4px 8px rgba(0,0,0,0.2),
            inset 0 -1px 0 rgba(255,255,255,0.15);
        }

        .keycap-body--fever {
          background: linear-gradient(to bottom, #7c3aed, #4c1d95);
          box-shadow:
            0 8px 0 0 #3b0764,
            0 10px 0 0 #2e0554,
            0 12px 20px rgba(124,58,237,0.4),
            inset 0 -1px 0 rgba(255,255,255,0.1);
        }

        .keycap-outer:active .keycap-body--fever {
          box-shadow:
            0 2px 0 0 #3b0764,
            0 3px 0 0 #2e0554,
            0 4px 10px rgba(124,58,237,0.3),
            inset 0 -1px 0 rgba(255,255,255,0.1);
        }

        .keycap-top {
          position: absolute;
          top: 6px;
          left: 6px;
          right: 6px;
          bottom: 6px;
          border-radius: 14px;
          overflow: hidden;
          background: linear-gradient(145deg, #e8ecf0, #d1d5db);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.6),
            inset 0 -1px 2px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .keycap-top--fever {
          background: linear-gradient(145deg, #8b5cf6, #6d28d9);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.2),
            inset 0 -1px 2px rgba(0,0,0,0.15);
        }

        .keycap-image {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          border-radius: 14px;
        }

        .keycap-default-face {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .keycap-label {
          position: absolute;
          bottom: 6px;
          left: 0;
          right: 0;
          text-align: center;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
