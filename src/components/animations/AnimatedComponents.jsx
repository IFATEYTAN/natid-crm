import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

// Fade in animation wrapper
export function FadeIn({ children, delay = 0, duration = 0.3, className }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Slide up animation wrapper
export function SlideUp({ children, delay = 0, duration = 0.3, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Scale in animation wrapper
export function ScaleIn({ children, delay = 0, duration = 0.2, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Staggered list animation
export function StaggeredList({ children, staggerDelay = 0.05, className }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Individual staggered item
export function StaggeredItem({ children, className }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Animated card with hover effect
export function AnimatedCard({ children, className, onClick }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      className={cn("bg-white border border-[#e5e7eb] rounded-[8px]", className)}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// Animated button with press effect
export function AnimatedButton({ children, className, ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className={className}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// Number counter animation
export function AnimatedNumber({ value, duration = 1, className }) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={value}
      >
        {value}
      </motion.span>
    </motion.span>
  );
}

// Progress bar animation
export function AnimatedProgress({ value, className, color = "#3b82f6" }) {
  return (
    <div className={cn("h-2 bg-[#f3f4f6] rounded-full overflow-hidden", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ backgroundColor: color }}
        className="h-full rounded-full"
      />
    </div>
  );
}

// Pulse animation for notifications/badges
export function PulseBadge({ children, className, pulse = true }) {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.1, 1] } : {}}
      transition={{ repeat: Infinity, duration: 2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Skeleton pulse animation
export function SkeletonPulse({ className }) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5 }}
      className={cn("bg-[#f3f4f6] rounded", className)}
    />
  );
}

// Page transition wrapper
export function PageTransition({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// Success checkmark animation
export function SuccessAnimation({ show = true, size = 48 }) {
  if (!show) return null;
  
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
      className="flex items-center justify-center"
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 50 50"
        className="text-[#111827]"
      >
        <motion.circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3 }}
        />
        <motion.path
          d="M15 25 L22 32 L35 19"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        />
      </motion.svg>
    </motion.div>
  );
}

export default { FadeIn, SlideUp, ScaleIn, StaggeredList, StaggeredItem, AnimatedCard, AnimatedButton };