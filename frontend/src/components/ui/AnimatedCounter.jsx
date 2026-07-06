import React, { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'motion/react';

export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1.5 }) {
  const [mounted, setMounted] = useState(false);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    setMounted(true);
    const controls = animate(count, value, {
      duration,
      ease: "easeOut"
    });
    return controls.stop;
  }, [value, duration, count]);

  if (!mounted) {
    return <span>{prefix}0{suffix}</span>;
  }

  return (
    <span>
      {prefix}
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}
