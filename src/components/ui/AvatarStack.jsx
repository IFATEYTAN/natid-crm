import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AvatarStack({ users, max = 5, size = 'md', onShowAll, className }) {
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

  const getRandomColor = (name) => {
    if (!name) return 'bg-gray-500';
    const colors = [
      'bg-red-500', 'bg-blue-500', 'bg-green-500', 
      'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-indigo-500', 'bg-teal-500'
    ];
    return colors[name.charCodeAt(0) % colors.length];
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center", className)}>
        <AnimatePresence mode='popLayout'>
          {displayUsers.map((user, index) => {
            const userName = user.vendor_name || user.full_name || user.name || 'Unknown';
            const userImage = user.profile_image || user.image;
            
            return (
              <Tooltip key={user.id || index}>
                <TooltipTrigger asChild>
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.8 }}
                    animate={{ 
                      opacity: 1, 
                      x: index * -15, // Negative margin logic handled by translation for smoother animation
                      scale: 1 
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                      delay: index * 0.05
                    }}
                    whileHover={{ 
                      scale: 1.15, 
                      zIndex: 50,
                      y: -5,
                      transition: { duration: 0.2 }
                    }}
                    style={{ zIndex: displayUsers.length - index }}
                    className={cn(
                      "relative rounded-full border-2 border-white flex items-center justify-center font-semibold text-white shadow-sm cursor-pointer overflow-hidden bg-white",
                      sizes[size],
                      !userImage && getRandomColor(userName)
                    )}
                  >
                    {userImage ? (
                      <img src={userImage} alt={userName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white drop-shadow-md">
                        {getInitials(userName)}
                      </span>
                    )}
                    
                    {/* Active Status Dot */}
                    {(user.is_available || user.status === 'active') && (
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"
                      />
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{userName}</p>
                  {user.role && <p className="text-xs text-gray-400 capitalize">{user.role}</p>}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </AnimatePresence>

        {remainingCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: 1, 
              scale: 1,
              x: displayUsers.length * -15
            }}
            whileHover={{ scale: 1.1 }}
            onClick={onShowAll}
            style={{ zIndex: 0 }}
            className={cn(
              "relative rounded-full border-2 border-white bg-gray-100 flex items-center justify-center font-bold text-gray-600 shadow-sm cursor-pointer hover:bg-gray-200 transition-colors",
              sizes[size]
            )}
          >
            <span className="text-xs">+{remainingCount}</span>
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}