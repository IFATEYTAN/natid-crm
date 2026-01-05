import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// Animation presets
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  fadeInRight: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  },
  fadeInLeft: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
  },
  slideInRight: {
    initial: { x: '100%' },
    animate: { x: 0 },
    exit: { x: '100%' },
  },
  slideInLeft: {
    initial: { x: '-100%' },
    animate: { x: 0 },
    exit: { x: '-100%' },
  },
  bounceIn: {
    initial: { opacity: 0, scale: 0.3 },
    animate: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 25,
      },
    },
    exit: { opacity: 0, scale: 0.3 },
  },
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 },
  },
};

// Animated Container - wraps children with animation
export function AnimatedContainer({
  children,
  animation = 'fadeInUp',
  delay = 0,
  duration = 0.3,
  className,
  ...props
}) {
  const preset = typeof animation === 'string' ? animations[animation] : animation;

  return (
    <motion.div
      initial={preset.initial}
      animate={preset.animate}
      exit={preset.exit}
      transition={{ duration, delay, ease: 'easeOut' }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Animated List - stagger animation for list items
export function AnimatedList({
  children,
  animation = 'fadeInUp',
  staggerDelay = 0.05,
  className,
}) {
  const preset = typeof animation === 'string' ? animations[animation] : animation;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={{
        animate: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            initial: preset.initial,
            animate: preset.animate,
            exit: preset.exit,
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}

// Animated Card with hover effects
export function AnimatedCard({
  children,
  className,
  hoverScale = 1.02,
  hoverShadow = true,
  onClick,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{
        scale: hoverScale,
        y: -4,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "transition-shadow duration-200",
        hoverShadow && "hover:shadow-lg",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

// Animated Counter - counts up to a number
export function AnimatedCounter({
  value,
  duration = 1,
  className,
  prefix = '',
  suffix = '',
  decimals = 0,
}) {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = displayValue;
    const endValue = Number(value) || 0;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;

      setDisplayValue(current);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </motion.span>
  );
}

// Animated Progress Bar
export function AnimatedProgress({
  value = 0,
  max = 100,
  color = '#FF0000',
  height = 8,
  showLabel = true,
  className,
}) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">התקדמות</span>
          <motion.span
            key={percentage}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-medium"
          >
            {Math.round(percentage)}%
          </motion.span>
        </div>
      )}
      <div
        className="w-full bg-gray-200 rounded-full overflow-hidden"
        style={{ height }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Pulse animation for notifications/alerts
export function PulseIndicator({
  color = '#FF0000',
  size = 12,
  className,
}) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <motion.span
        className="absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
        animate={{
          scale: [1, 1.5, 1.5],
          opacity: [0.75, 0, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ backgroundColor: color, width: size, height: size }}
      />
    </span>
  );
}

// Animated Skeleton Loader
export function AnimatedSkeleton({
  width,
  height = 20,
  rounded = 'md',
  className,
}) {
  return (
    <motion.div
      className={cn(
        "bg-gray-200",
        rounded === 'sm' && "rounded",
        rounded === 'md' && "rounded-md",
        rounded === 'lg' && "rounded-lg",
        rounded === 'full' && "rounded-full",
        className
      )}
      style={{ width, height }}
      animate={{
        opacity: [0.5, 1, 0.5],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// Animated Badge with entrance
export function AnimatedBadge({
  children,
  color = 'red',
  className,
}) {
  const colors = {
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        colors[color] || colors.gray,
        className
      )}
    >
      {children}
    </motion.span>
  );
}

// Page transition wrapper
export function PageTransition({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Floating action button with animation
export function AnimatedFAB({
  icon: Icon,
  onClick,
  className,
  color = '#FF0000',
}) {
  return (
    <motion.button
      onClick={onClick}
      className={cn(
        "fixed bottom-6 left-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white z-50",
        className
      )}
      style={{ backgroundColor: color }}
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
    >
      <Icon className="w-6 h-6" />
    </motion.button>
  );
}

// Animated Tooltip
export function AnimatedTooltip({
  children,
  content,
  position = 'top',
}) {
  const [isVisible, setIsVisible] = React.useState(false);

  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-50 px-2 py-1 text-xs bg-gray-900 text-white rounded whitespace-nowrap",
              positionStyles[position]
            )}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Success checkmark animation
export function SuccessCheckmark({ size = 80, className }) {
  return (
    <motion.div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <motion.svg
        viewBox="0 0 50 50"
        className="w-full h-full"
      >
        {/* Circle */}
        <motion.circle
          cx="25"
          cy="25"
          r="22"
          fill="none"
          stroke="#22C55E"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        {/* Checkmark */}
        <motion.path
          d="M14 25 L22 33 L38 17"
          fill="none"
          stroke="#22C55E"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.5, ease: 'easeOut' }}
        />
      </motion.svg>
    </motion.div>
  );
}

// Loading spinner with brand color
export function BrandSpinner({ size = 40, className }) {
  return (
    <motion.div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
    >
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-gray-200"
      />
      <motion.div
        className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#FF0000]"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </motion.div>
  );
}
