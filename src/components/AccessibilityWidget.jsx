import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Type, Sun, Activity, X, Accessibility } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    fontSize: 0, // 0 = normal, 1 = large, 2 = extra large
    highContrast: false,
    grayscale: false,
    readableFont: false,
    highlightLinks: false,
  });

  useEffect(() => {
    // Apply settings to document
    const root = document.documentElement;

    // Font Size
    const sizeMap = { 0: '100%', 1: '110%', 2: '125%' };
    root.style.fontSize = sizeMap[settings.fontSize];

    // High Contrast
    if (settings.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // Grayscale
    if (settings.grayscale) {
      document.body.style.filter = 'grayscale(100%)';
    } else {
      document.body.style.filter = 'none';
    }

    // Readable Font
    if (settings.readableFont) {
      document.body.style.fontFamily = 'Arial, Helvetica, sans-serif';
    } else {
      document.body.style.fontFamily = '';
    }

    // Highlight Links
    if (settings.highlightLinks) {
      document.body.classList.add('highlight-links');
    } else {
      document.body.classList.remove('highlight-links');
    }
  }, [settings]);

  // Inject styles for high contrast and links
  useEffect(() => {
    const styleId = 'accessibility-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
        .high-contrast {
          background-color: #000 !important;
          color: #fff !important;
        }
        .high-contrast * {
          background-color: #000 !important;
          color: #fff !important;
          border-color: #fff !important;
        }
        .high-contrast img {
          filter: grayscale(100%) contrast(120%);
        }
        .highlight-links a {
          text-decoration: underline !important;
          font-weight: bold !important;
          color: #2563eb !important;
          background-color: #eff6ff !important;
        }
        .high-contrast.highlight-links a {
          color: #ffff00 !important;
          background-color: #000 !important;
          text-decoration: underline !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const toggleSetting = (key) => {
    if (key === 'fontSize') {
      setSettings((prev) => ({ ...prev, fontSize: (prev.fontSize + 1) % 3 }));
    } else {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    }
  };

  const resetSettings = () => {
    setSettings({
      fontSize: 0,
      highContrast: false,
      grayscale: false,
      readableFont: false,
      highlightLinks: false,
    });
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 accessibility-widget">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 left-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2">
                <Accessibility className="w-5 h-5" />
                כלי נגישות
              </h3>
              <button
                onClick={() => resetSettings()}
                className="text-xs hover:underline text-blue-100"
              >
                איפוס
              </button>
            </div>

            <div className="p-4 space-y-3">
              <Button
                variant="outline"
                className={`w-full justify-between ${settings.fontSize > 0 ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => toggleSetting('fontSize')}
              >
                <span className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  גודל טקסט
                </span>
                <span className="text-xs font-bold bg-gray-100 px-2 py-0.5 rounded">
                  {['רגיל', 'גדול', 'ענק'][settings.fontSize]}
                </span>
              </Button>

              <Button
                variant="outline"
                className={`w-full justify-between ${settings.highContrast ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => toggleSetting('highContrast')}
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  ניגודיות גבוהה
                </span>
                {settings.highContrast && <Activity className="w-3 h-3 text-blue-600" />}
              </Button>

              <Button
                variant="outline"
                className={`w-full justify-between ${settings.grayscale ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => toggleSetting('grayscale')}
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  גווני אפור
                </span>
                {settings.grayscale && <Activity className="w-3 h-3 text-blue-600" />}
              </Button>

              <Button
                variant="outline"
                className={`w-full justify-between ${settings.readableFont ? 'border-blue-500 bg-blue-50' : ''}`}
                onClick={() => toggleSetting('readableFont')}
              >
                <span className="flex items-center gap-2">
                  <Type className="w-4 h-4" />
                  גופן קריא
                </span>
                {settings.readableFont && <Activity className="w-3 h-3 text-blue-600" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        aria-label="Accessibility options"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Accessibility className="w-6 h-6" />}
      </motion.button>
    </div>
  );
}
