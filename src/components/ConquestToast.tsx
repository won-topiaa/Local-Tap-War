import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConquestToastProps {
  message: string | null;
  onDone: () => void;
}

export function ConquestToast({ message, onDone }: ConquestToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2000);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="bg-gradient-to-r from-yellow-400 via-red-500 to-purple-600 text-white px-10 py-5 rounded-2xl shadow-2xl"
            initial={{ scale: 0.3, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: -50 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 15,
            }}
          >
            <p className="text-3xl font-black text-center whitespace-nowrap">
              {message}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
