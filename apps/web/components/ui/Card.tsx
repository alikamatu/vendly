"use client";

import React from "react";
import clsx from "@/utils/clsx";
import { motion, HTMLMotionProps } from "framer-motion";

interface CardProps extends HTMLMotionProps<"div"> {
  hoverEffect?: boolean;
}

function Card({ children, className, hoverEffect = true, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, scale: 1.005 } : {}}
      transition={{ duration: 0.2 }}
      className={clsx(
        "border border-border/50 rounded-[2rem] overflow-hidden cursor-pointer",
        hoverEffect && "hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300",
        className
      )}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

export default Card;
