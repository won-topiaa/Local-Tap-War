import { motion, AnimatePresence } from 'framer-motion';

interface FeverOverlayProps {
  active: boolean;
}

export function FeverOverlay({ active }: FeverOverlayProps) {
  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Left edge glow */}
          <motion.div
            className="fixed left-0 top-0 bottom-0 w-8 z-40 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, rgba(239,68,68,0.6), transparent)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
          {/* Right edge glow */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-8 z-40 pointer-events-none"
            style={{
              background: 'linear-gradient(to left, rgba(239,68,68,0.6), transparent)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.8 }}
          />
          {/* Top edge glow */}
          <motion.div
            className="fixed top-0 left-0 right-0 h-6 z-40 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(239,68,68,0.5), transparent)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          />
          {/* Bottom edge glow */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 h-6 z-40 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, rgba(239,68,68,0.5), transparent)',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.2, 0.7, 0.2] }}
            exit={{ opacity: 0 }}
            transition={{ repeat: Infinity, duration: 0.6 }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
