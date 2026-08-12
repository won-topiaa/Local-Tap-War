import { motion } from 'framer-motion';

interface TapParticleProps {
  x: number;
  y: number;
  value: number;
  isFever: boolean;
}

export function TapParticle({ x, y, value, isFever }: TapParticleProps) {
  return (
    <motion.div
      className="fixed pointer-events-none z-50 font-black text-3xl"
      style={{
        left: x,
        top: y,
        color: value > 1 ? '#FDE047' : isFever ? '#fff' : '#3B82F6',
        textShadow: value > 1 ? '0 0 12px rgba(253,224,71,0.8)' : 'none',
      }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -90, scale: 1.6 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
    >
      +{value}
    </motion.div>
  );
}
