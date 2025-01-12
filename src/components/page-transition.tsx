'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useCallback } from 'react';
import { create } from 'zustand';

interface TransitionStore {
  isTransitioning: boolean;
  setTransitioning: (value: boolean) => void;
  message: string;
  setMessage: (value: string) => void;
}

const useTransitionStore = create<TransitionStore>((set) => ({
  isTransitioning: false,
  setTransitioning: (value) => set({ isTransitioning: value }),
  message: '',
  setMessage: (value) => set({ message: value }),
}));

const funnyMessages = [
  "Preparing beautiful charts... 📊",
  "Calculating all the numbers... 🔢",
  "Making statistics look pretty... 📈",
  "Feeding the data hamsters... 🐹",
  "Brewing coffee for the servers... ☕",
  "Polishing pixels to perfection... ✨",
  "Teaching charts to dance... 💃",
  "Waking up sleepy graphs... 😴",
  "Counting downloads with care... 🎮",
  "Making math fun again... 🎯",
];

function TransitionScreen() {
  const message = useTransitionStore((state) => state.message);
  
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-500/90 to-indigo-600/90 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="text-center space-y-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-white/20" />
          <div className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin" />
        </div>
        <p className="text-xl font-medium text-white">{message}</p>
      </motion.div>
    </motion.div>
  );
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isFirstMount, setIsFirstMount] = useState(true);
  const { isTransitioning, setTransitioning, setMessage } = useTransitionStore();

  const getRandomMessage = useCallback(() => {
    return funnyMessages[Math.floor(Math.random() * funnyMessages.length)];
  }, []);

  useEffect(() => {
    if (isFirstMount) {
      setIsFirstMount(false);
      return;
    }

    // Only show transition for analytics page
    if (pathname === '/analytics') {
      setMessage(getRandomMessage());
      setTransitioning(true);

      // Show transition for 1 second
      const timer = setTimeout(() => {
        setTransitioning(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [pathname, isFirstMount, getRandomMessage, setMessage, setTransitioning]);

  return (
    <AnimatePresence mode="wait">
      {isTransitioning ? (
        <TransitionScreen />
      ) : (
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}