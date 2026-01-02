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
    if (!name) return 'bg-gray-500';
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-orange-500'
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="flex items-center -space-x-2">
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
          
          {/* Status indicator */}
          {user.is_available !== undefined && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                user.is_available ? "bg-green-500" : "bg-gray-400"
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
            "relative rounded-full border-2 border-white bg-gray-700 flex items-center justify-center font-semibold text-white shadow-md cursor-pointer",
            sizes[size]
          )}
        >
          <span>+{remainingCount}</span>
        </motion.div>
      )}
    </div>
  );
}