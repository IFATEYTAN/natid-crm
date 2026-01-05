import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Wifi, WifiOff } from 'lucide-react';

export const useRealtimeUpdates = (entityName, query = {}, options = {}) => {
  const [data, setData] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    let intervalId;
    
    const fetchData = async () => {
      try {
        const result = await base44.entities[entityName].filter(query, options.sort, options.limit);
        setData(result);
        setIsConnected(true);
        setLastUpdate(new Date());
      } catch (error) {
        console.error(`Error fetching ${entityName}:`, error);
        setIsConnected(false);
      }
    };

    fetchData();
    
    if (options.interval) {
      intervalId = setInterval(fetchData, options.interval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [entityName, JSON.stringify(query), JSON.stringify(options)]);

  return { data, isConnected, lastUpdate };
};

export const ConnectionStatusIndicator = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const config = isOnline 
    ? { color: 'bg-green-500', text: 'מחובר', icon: Wifi }
    : { color: 'bg-red-500', text: 'לא מחובר', icon: WifiOff };

  return (
    <div className="flex items-center gap-2 text-sm bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow-sm border border-gray-100">
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-gray-600 font-medium text-xs">{config.text}</span>
    </div>
  );
};