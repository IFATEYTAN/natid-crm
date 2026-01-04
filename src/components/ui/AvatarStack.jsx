import React from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function AvatarStack({ users, max = 5, size = 'md', onShowAll }) {
  const displayUsers = users.slice(0, max);
  const remainingCount = Math.max(0, users.length - max);

  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getColorForName = (name) => {
    if (!name) return 'bg-neutral-soft-500';
    // Soft color palette for avatars
    const colors = [
      'bg-primary-soft-500',
      'bg-secondary-soft-500',
      'bg-success-soft-500',
      'bg-warning-soft-500',
      'bg-info-soft-500',
      'bg-[#4ECDC4]', // chart-soft-2
      'bg-[#45B7D1]', // chart-soft-3
      'bg-[#FFA07A]'  // chart-soft-4
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex items-center -space-x-2 space-x-reverse">
      {displayUsers.map((user, index) => (
        <motion.div
          key={user.id || index}
          initial={{ opacity: 0, scale: 0, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: index * 0.1
          }}
          whileHover={{
            scale: 1.15,
            zIndex: 50,
            transition: { duration: 0.2 }
          }}
          className={cn(
            "relative rounded-full border-2 border-white flex items-center justify-center font-semibold text-white shadow-md cursor-pointer",
            sizes[size],
            getColorForName(user.vendor_name || user.full_name || user.name)
          )}
          title={user.vendor_name || user.full_name || user.name}
        >
          {user.vendor_name || user.full_name || user.name ? (
            <span>{getInitials(user.vendor_name || user.full_name || user.name)}</span>
          ) : (
            <User className="w-1/2 h-1/2" />
          )}
          
          {/* Status indicator - RTL: left instead of right */}
          {user.is_available !== undefined && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white",
                user.is_available ? "bg-success-soft-500" : "bg-neutral-soft-400"
              )}
            />
          )}
        </motion.div>
      ))}

      {remainingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20,
            delay: displayUsers.length * 0.1
          }}
          whileHover={{ scale: 1.1 }}
          onClick={onShowAll}
          className={cn(
            "relative rounded-full border-2 border-white bg-neutral-soft-700 flex items-center justify-center font-semibold text-white shadow-md cursor-pointer",
            sizes[size]
          )}
        >
          <span>+{remainingCount}</span>
        </motion.div>
      )}
    </div>
  );
}