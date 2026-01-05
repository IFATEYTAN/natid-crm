import { useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createAppNotification, NotificationTypes } from '@/components/notifications/PushNotifications';

// Event types for real-time updates
export const RealtimeEvents = {
  CALL_CREATED: 'call.created',
  CALL_UPDATED: 'call.updated',
  CALL_DELETED: 'call.deleted',
  CALL_ASSIGNED: 'call.assigned',
  CALL_STATUS_CHANGED: 'call.status_changed',
  VENDOR_LOCATION_UPDATED: 'vendor.location_updated',
  VENDOR_STATUS_CHANGED: 'vendor.status_changed',
  NOTIFICATION_RECEIVED: 'notification.received',
  SLA_WARNING: 'sla.warning',
  SYSTEM_MESSAGE: 'system.message'
};

// Connection states
export const ConnectionState = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

// Simulated real-time update manager (uses polling with smart intervals)
// In production, replace with actual WebSocket connection
class RealtimeManager {
  constructor() {
    this.listeners = new Map();
    this.state = ConnectionState.DISCONNECTED;
    this.pollInterval = null;
    this.lastEventTimestamp = Date.now();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.basePollingInterval = 5000; // 5 seconds
    this.stateListeners = new Set();
  }

  // Connect to real-time updates
  connect() {
    if (this.state === ConnectionState.CONNECTED) return;

    this.setState(ConnectionState.CONNECTING);

    // Simulate connection delay
    setTimeout(() => {
      this.setState(ConnectionState.CONNECTED);
      this.startPolling();
      this.reconnectAttempts = 0;
    }, 500);
  }

  // Disconnect from real-time updates
  disconnect() {
    this.stopPolling();
    this.setState(ConnectionState.DISCONNECTED);
  }

  // Start polling for updates
  startPolling() {
    if (this.pollInterval) return;

    const poll = async () => {
      try {
        // In production, this would be a WebSocket message handler
        // For now, we simulate by checking for new data periodically
        await this.checkForUpdates();
      } catch (error) {
        console.error('Polling error:', error);
        this.handleError(error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    this.pollInterval = setInterval(poll, this.basePollingInterval);
  }

  // Stop polling
  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // Check for updates (simulated - in production use WebSocket)
  async checkForUpdates() {
    // This is where you would receive WebSocket messages
    // For simulation, we just emit a heartbeat
    this.emit('heartbeat', { timestamp: Date.now() });
  }

  // Handle connection error
  handleError(error) {
    this.setState(ConnectionState.ERROR);

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setState(ConnectionState.RECONNECTING);

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  // Set connection state
  setState(state) {
    this.state = state;
    this.stateListeners.forEach(listener => listener(state));
  }

  // Subscribe to state changes
  onStateChange(listener) {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  // Subscribe to events
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => {
      this.listeners.get(event).delete(callback);
    };
  }

  // Emit an event
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Event handler error:', error);
        }
      });
    }

    // Also emit to wildcard listeners
    const wildcardCallbacks = this.listeners.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(callback => {
        try {
          callback({ event, data });
        } catch (error) {
          console.error('Wildcard handler error:', error);
        }
      });
    }
  }

  // Simulate receiving an event (for testing/demo)
  simulateEvent(event, data) {
    this.emit(event, data);
  }
}

// Singleton instance
const realtimeManager = new RealtimeManager();

// Hook for using real-time updates
export function useRealtimeUpdates(options = {}) {
  const {
    autoConnect = true,
    onEvent,
    onStateChange
  } = options;

  const [connectionState, setConnectionState] = useState(realtimeManager.state);
  const queryClient = useQueryClient();
  const cleanupRef = useRef([]);

  // Handle connection state changes
  useEffect(() => {
    const unsubscribe = realtimeManager.onStateChange((state) => {
      setConnectionState(state);
      onStateChange?.(state);
    });

    cleanupRef.current.push(unsubscribe);
    return () => unsubscribe();
  }, [onStateChange]);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      realtimeManager.connect();
    }

    return () => {
      // Clean up all subscriptions
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, [autoConnect]);

  // Subscribe to an event
  const subscribe = useCallback((event, callback) => {
    const unsubscribe = realtimeManager.on(event, callback);
    cleanupRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // Subscribe to all events
  const subscribeAll = useCallback((callback) => {
    return subscribe('*', callback);
  }, [subscribe]);

  // Connect manually
  const connect = useCallback(() => {
    realtimeManager.connect();
  }, []);

  // Disconnect manually
  const disconnect = useCallback(() => {
    realtimeManager.disconnect();
  }, []);

  // Simulate an event (for testing)
  const simulateEvent = useCallback((event, data) => {
    realtimeManager.simulateEvent(event, data);
  }, []);

  return {
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    subscribe,
    subscribeAll,
    connect,
    disconnect,
    simulateEvent
  };
}

// Hook for subscribing to specific entity updates
export function useRealtimeEntity(entityType, options = {}) {
  const { onUpdate, onDelete, onCreate } = options;
  const { subscribe, isConnected } = useRealtimeUpdates();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const cleanups = [];

    // Subscribe to create events
    if (onCreate) {
      cleanups.push(subscribe(`${entityType}.created`, (data) => {
        onCreate(data);
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: [entityType] });
      }));
    }

    // Subscribe to update events
    if (onUpdate) {
      cleanups.push(subscribe(`${entityType}.updated`, (data) => {
        onUpdate(data);
        queryClient.invalidateQueries({ queryKey: [entityType] });
        queryClient.invalidateQueries({ queryKey: [entityType, data.id] });
      }));
    }

    // Subscribe to delete events
    if (onDelete) {
      cleanups.push(subscribe(`${entityType}.deleted`, (data) => {
        onDelete(data);
        queryClient.invalidateQueries({ queryKey: [entityType] });
      }));
    }

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [entityType, isConnected, onCreate, onUpdate, onDelete, subscribe, queryClient]);

  return { isConnected };
}

// Hook for real-time call updates
export function useRealtimeCalls(options = {}) {
  const { onNewCall, onCallUpdate, onAssignment, showNotifications = true } = options;
  const { subscribe, isConnected } = useRealtimeUpdates();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const cleanups = [];

    // New call created
    cleanups.push(subscribe(RealtimeEvents.CALL_CREATED, (call) => {
      onNewCall?.(call);
      queryClient.invalidateQueries({ queryKey: ['calls'] });

      if (showNotifications) {
        createAppNotification(NotificationTypes.NEW_CALL, {
          callId: call.id,
          callNumber: call.call_number,
          customerName: call.customer_name,
          location: call.location_address
        });
      }
    }));

    // Call updated
    cleanups.push(subscribe(RealtimeEvents.CALL_UPDATED, (call) => {
      onCallUpdate?.(call);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['call', call.id] });
    }));

    // Call assigned
    cleanups.push(subscribe(RealtimeEvents.CALL_ASSIGNED, (data) => {
      onAssignment?.(data);
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });

      if (showNotifications) {
        createAppNotification(NotificationTypes.CALL_ASSIGNED, {
          callId: data.call_id,
          callNumber: data.call_number,
          location: data.location
        });
      }
    }));

    // Status changed
    cleanups.push(subscribe(RealtimeEvents.CALL_STATUS_CHANGED, (data) => {
      queryClient.invalidateQueries({ queryKey: ['calls'] });
      queryClient.invalidateQueries({ queryKey: ['call', data.call_id] });

      if (showNotifications) {
        createAppNotification(NotificationTypes.CALL_STATUS_CHANGE, {
          callId: data.call_id,
          callNumber: data.call_number,
          newStatus: data.new_status
        });
      }
    }));

    // SLA warning
    cleanups.push(subscribe(RealtimeEvents.SLA_WARNING, (data) => {
      if (showNotifications) {
        createAppNotification(NotificationTypes.SLA_WARNING, {
          callId: data.call_id,
          callNumber: data.call_number,
          minutesLeft: data.minutes_left
        });
      }
    }));

    return () => {
      cleanups.forEach(cleanup => cleanup());
    };
  }, [isConnected, onNewCall, onCallUpdate, onAssignment, showNotifications, subscribe, queryClient]);

  return { isConnected };
}

// Hook for real-time vendor location updates
export function useRealtimeVendorLocations(options = {}) {
  const { onLocationUpdate, vendorIds } = options;
  const { subscribe, isConnected } = useRealtimeUpdates();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isConnected) return;

    const cleanup = subscribe(RealtimeEvents.VENDOR_LOCATION_UPDATED, (data) => {
      // Filter by vendor IDs if specified
      if (vendorIds && !vendorIds.includes(data.vendor_id)) return;

      onLocationUpdate?.(data);
      queryClient.invalidateQueries({ queryKey: ['vendorLocations'] });
      queryClient.invalidateQueries({ queryKey: ['vendorLocation', data.vendor_id] });
    });

    return cleanup;
  }, [isConnected, vendorIds, onLocationUpdate, subscribe, queryClient]);

  return { isConnected };
}

// Connection status indicator component
export function ConnectionStatusIndicator() {
  const { connectionState, isConnected } = useRealtimeUpdates({ autoConnect: false });

  const statusConfig = {
    [ConnectionState.CONNECTED]: {
      color: 'bg-green-500',
      text: 'מחובר',
      pulse: false
    },
    [ConnectionState.CONNECTING]: {
      color: 'bg-yellow-500',
      text: 'מתחבר...',
      pulse: true
    },
    [ConnectionState.RECONNECTING]: {
      color: 'bg-yellow-500',
      text: 'מתחבר מחדש...',
      pulse: true
    },
    [ConnectionState.DISCONNECTED]: {
      color: 'bg-gray-400',
      text: 'מנותק',
      pulse: false
    },
    [ConnectionState.ERROR]: {
      color: 'bg-red-500',
      text: 'שגיאת חיבור',
      pulse: false
    }
  };

  const config = statusConfig[connectionState] || statusConfig[ConnectionState.DISCONNECTED];

  return (
    <div className="flex items-center gap-2 text-sm">
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.pulse ? 'animate-pulse' : ''}`} />
      <span className="text-gray-600">{config.text}</span>
    </div>
  );
}

export default {
  useRealtimeUpdates,
  useRealtimeEntity,
  useRealtimeCalls,
  useRealtimeVendorLocations,
  RealtimeEvents,
  ConnectionState,
  ConnectionStatusIndicator
};
