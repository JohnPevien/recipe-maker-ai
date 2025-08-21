"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

export interface StickyScrollRevealProps {
  content: {
    title: string;
    description: string;
    content?: React.ReactNode;
  }[];
  className?: string;
}

export const StickyScrollReveal = ({ content, className }: StickyScrollRevealProps) => {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const scrollPosition = window.scrollY;
      const sectionTop = ref.current.offsetTop;
      const sectionHeight = ref.current.offsetHeight;
      
      const cardHeight = sectionHeight / content.length;
      const cardIndex = Math.floor((scrollPosition - sectionTop) / cardHeight);
      
      if (cardIndex >= 0 && cardIndex < content.length) {
        setActiveCard(cardIndex);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [content.length]);

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative flex h-[60vh] items-center justify-center overflow-hidden rounded-2xl bg-transparent",
        className
      )}
    >
      <div className="absolute inset-0 z-0 flex">
        <motion.div
          className="h-full w-full bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100"
          style={{ y: backgroundY }}
        />
      </div>
      
      <div className="relative z-10 flex w-full max-w-7xl flex-col items-center justify-center px-4 py-20 md:px-8">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-bold text-gray-900 md:text-5xl">
            {content[activeCard]?.title}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-gray-700 md:text-xl">
            {content[activeCard]?.description}
          </p>
        </div>
        
        <div className="relative flex w-full max-w-5xl items-center justify-center">
          <div className="relative flex w-full flex-col items-center justify-center gap-8 md:flex-row">
            <div className="flex w-full flex-col items-center justify-center gap-8 md:w-1/2">
              {content.map((item, index) => (
                <motion.div
                  key={index}
                  className={cn(
                    "w-full cursor-pointer rounded-xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-all duration-300",
                    index === activeCard
                      ? "scale-105 border-2 border-indigo-500 opacity-100"
                      : "scale-95 opacity-60 hover:opacity-80"
                  )}
                  onClick={() => setActiveCard(index)}
                  whileHover={{ scale: index === activeCard ? 1.05 : 1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <h3 className="text-xl font-semibold text-gray-900">{item.title}</h3>
                  <p className="mt-2 text-gray-700">{item.description}</p>
                </motion.div>
              ))}
            </div>
            
            <div className="flex h-[400px] w-full items-center justify-center md:w-1/2">
              <motion.div
                key={activeCard}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex h-full w-full items-center justify-center rounded-xl bg-white/80 p-8 shadow-lg backdrop-blur-sm"
              >
                {content[activeCard]?.content || (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-xl font-bold text-indigo-600">
                          {activeCard + 1}
                        </span>
                      </div>
                      <p className="text-gray-700">Content for {content[activeCard]?.title}</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};