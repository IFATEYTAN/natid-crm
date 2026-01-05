import { lazy, Suspense } from 'react';

/**
 * Performance optimization utilities for NATID CRM
 */

// ============================================
// LAZY LOADING
// ============================================

/**
 * Creates a lazy-loaded component with a loading fallback
 * @param {Function} importFn - Dynamic import function
 * @param {React.ReactNode} fallback - Loading fallback component
 */
export function lazyLoad(importFn, fallback = null) {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props) {
    return (
      <Suspense fallback={fallback || <LoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Default loading spinner component
 */
export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <div className="w-8 h-8 border-4 border-[#E5E7EB] border-t-[#3B82F6] rounded-full animate-spin" />
    </div>
  );
}

// ============================================
// DEBOUNCE & THROTTLE
// ============================================

/**
 * Debounce function - delays execution until after wait milliseconds
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait (default: 300)
 */
export function debounce(func, wait = 300) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait milliseconds
 * @param {Function} func - Function to throttle
 * @param {number} wait - Milliseconds between executions (default: 100)
 */
export function throttle(func, wait = 100) {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, wait);
    }
  };
}

// ============================================
// CACHING
// ============================================

/**
 * Simple in-memory cache with TTL
 */
class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return item.value;
  }

  /**
   * Set cached value with TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMinutes - Time to live in minutes (default: 5)
   */
  set(key, value, ttlMinutes = 5) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMinutes * 60 * 1000
    });
  }

  /**
   * Clear specific key or entire cache
   * @param {string} key - Optional key to clear
   */
  clear(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean}
   */
  has(key) {
    return this.get(key) !== undefined;
  }
}

export const cache = new SimpleCache();

// ============================================
// PAGINATION
// ============================================

/**
 * Default pagination settings
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

/**
 * Calculate pagination offset
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {number} Offset for query
 */
export function getOffset(page, pageSize = PAGINATION.DEFAULT_PAGE_SIZE) {
  return (page - 1) * pageSize;
}

/**
 * Calculate total pages
 * @param {number} totalItems - Total number of items
 * @param {number} pageSize - Items per page
 * @returns {number} Total pages
 */
export function getTotalPages(totalItems, pageSize = PAGINATION.DEFAULT_PAGE_SIZE) {
  return Math.ceil(totalItems / pageSize);
}

// ============================================
// VIRTUAL SCROLLING HELPERS
// ============================================

/**
 * Calculate visible items for virtual scrolling
 * @param {number} scrollTop - Current scroll position
 * @param {number} containerHeight - Height of visible container
 * @param {number} itemHeight - Height of each item
 * @param {number} totalItems - Total number of items
 * @param {number} buffer - Number of buffer items above/below visible area
 * @returns {Object} { startIndex, endIndex, offsetY }
 */
export function getVisibleItems(
  scrollTop,
  containerHeight,
  itemHeight,
  totalItems,
  buffer = 5
) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(totalItems - 1, startIndex + visibleCount + buffer * 2);
  const offsetY = startIndex * itemHeight;

  return { startIndex, endIndex, offsetY };
}

// ============================================
// IMAGE OPTIMIZATION
// ============================================

/**
 * Generate optimized image URL with size parameters
 * @param {string} url - Original image URL
 * @param {number} width - Desired width
 * @param {number} quality - Image quality (1-100)
 * @returns {string} Optimized URL
 */
export function getOptimizedImageUrl(url, width = 400, quality = 80) {
  if (!url) return url;

  // If using Supabase storage, add transformation parameters
  if (url.includes('supabase.co')) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${width}&quality=${quality}`;
  }

  return url;
}

// ============================================
// REQUEST DEDUPLICATION
// ============================================

const pendingRequests = new Map();

/**
 * Deduplicate concurrent requests for the same resource
 * @param {string} key - Unique key for the request
 * @param {Function} requestFn - Async function that performs the request
 * @returns {Promise} Result of the request
 */
export async function deduplicateRequest(key, requestFn) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = requestFn()
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);
  return promise;
}

export default {
  lazyLoad,
  LoadingSpinner,
  debounce,
  throttle,
  cache,
  PAGINATION,
  getOffset,
  getTotalPages,
  getVisibleItems,
  getOptimizedImageUrl,
  deduplicateRequest
};
