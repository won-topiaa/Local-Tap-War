import { motion } from 'framer-motion';

interface KeycapButtonProps {
  imageUrl: string | null;
  isFever: boolean;
  label: string;
  buttonId?: string;
  compact?: boolean;
  onTap: (e: React.MouseEvent<HTMLButtonElement> | React.TouchEvent<HTMLButtonElement>) => void;
}

export function KeycapButton({ imageUrl, isFever, label, buttonId, compact, onTap }: KeycapButtonProps) {
  const pressY = compact ? 4 : 6;
  const topPressY = compact ? 1.5 : 2;
  const bodyClass = compact ? 'keycap-body-sm' : 'keycap-body';
  const topClass = compact ? 'keycap-top-sm' : 'keycap-top';

  return (
    <div className="keycap-wrapper relative">
      <motion.button
        id={buttonId}
        onMouseDown={onTap}
        onTouchStart={onTap}
        className="keycap-outer"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        whileTap="pressed"
        initial="idle"
        animate={isFever ? 'fever' : 'idle'}
        variants={{
          idle: { y: 0 },
          pressed: { y: pressY },
          fever: { y: 0 },
        }}
      >
        <div className={`${bodyClass} ${isFever ? `${bodyClass}--fever` : ''}`}>
          <motion.div
            className={`${topClass} ${isFever ? `${topClass}--fever` : ''}`}
            variants={{
              idle: { y: 0 },
              pressed: { y: topPressY },
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
                <span className={compact ? 'text-xl' : 'text-3xl'}>{isFever ? '🔥' : '👊'}</span>
              </div>
            )}

            <div className={compact ? 'keycap-label-sm' : 'keycap-label'}>
              <span className={`${compact ? 'text-[8px]' : 'text-[10px]'} font-black tracking-wider uppercase ${
                imageUrl ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]' : (isFever ? 'text-yellow-300' : 'text-white/80')
              }`}>
                {label}
              </span>
            </div>
          </motion.div>
        </div>

        {isFever && (
          <motion.div
            className={`absolute inset-0 ${compact ? 'rounded-xl' : 'rounded-2xl'} pointer-events-none`}
            animate={{
              boxShadow: [
                '0 0 0 0 rgba(239,68,68,0.4)',
                `0 0 0 ${compact ? '8' : '12'}px rgba(239,68,68,0)`,
              ],
            }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
        )}
      </motion.button>
    </div>
  );
}

export function KeycapStyles() {
  return (
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

      /* Large keycap */
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

      .keycap-outer:active .keycap-body {
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

      /* Compact keycap */
      .keycap-body-sm {
        position: relative;
        width: 100px;
        height: 100px;
        border-radius: 14px;
        background: linear-gradient(to bottom, #c8ccd0, #9ea3a8);
        box-shadow:
          0 6px 0 0 #787d82,
          0 7px 0 0 #6b7075,
          0 9px 12px rgba(0,0,0,0.25),
          inset 0 -1px 0 rgba(255,255,255,0.15);
        transition: box-shadow 0.05s ease;
      }

      .keycap-outer:active .keycap-body-sm {
        box-shadow:
          0 2px 0 0 #787d82,
          0 2px 0 0 #6b7075,
          0 3px 6px rgba(0,0,0,0.2),
          inset 0 -1px 0 rgba(255,255,255,0.15);
      }

      .keycap-body-sm--fever {
        background: linear-gradient(to bottom, #7c3aed, #4c1d95);
        box-shadow:
          0 6px 0 0 #3b0764,
          0 7px 0 0 #2e0554,
          0 9px 15px rgba(124,58,237,0.4),
          inset 0 -1px 0 rgba(255,255,255,0.1);
      }

      .keycap-outer:active .keycap-body-sm--fever {
        box-shadow:
          0 2px 0 0 #3b0764,
          0 2px 0 0 #2e0554,
          0 3px 8px rgba(124,58,237,0.3),
          inset 0 -1px 0 rgba(255,255,255,0.1);
      }

      .keycap-top-sm {
        position: absolute;
        top: 5px;
        left: 5px;
        right: 5px;
        bottom: 5px;
        border-radius: 10px;
        overflow: hidden;
        background: linear-gradient(145deg, #e8ecf0, #d1d5db);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.6),
          inset 0 -1px 2px rgba(0,0,0,0.08);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .keycap-top-sm--fever {
        background: linear-gradient(145deg, #8b5cf6, #6d28d9);
        box-shadow:
          inset 0 1px 0 rgba(255,255,255,0.2),
          inset 0 -1px 2px rgba(0,0,0,0.15);
      }

      /* Shared */
      .keycap-image {
        position: absolute;
        inset: 0;
        background-size: cover;
        background-position: center;
        border-radius: inherit;
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

      .keycap-label-sm {
        position: absolute;
        bottom: 3px;
        left: 0;
        right: 0;
        text-align: center;
        pointer-events: none;
      }
    `}</style>
  );
}
