import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Accessibility,
  ZoomIn,
  ZoomOut,
  Contrast,
  Palette,
  Link as LinkIcon,
  Type,
  AlignLeft,
  Pause,
  Keyboard,
  MousePointer,
  Volume2,
  Eye,
  RotateCcw,
  X
} from 'lucide-react';

const DEFAULT_SETTINGS = {
  fontSize: 100,
  highContrast: false,
  grayscale: false,
  highlightLinks: false,
  readableFont: false,
  textSpacing: false,
  pauseAnimations: false,
  keyboardNav: false,
  largeCursor: false,
  highlightHeadings: false
};

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('accessibility_settings');
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load accessibility settings');
      }
    }
  }, []);

  // Apply settings
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    root.style.fontSize = `${settings.fontSize}%`;
    
    // High contrast
    if (settings.highContrast) {
      root.classList.add('a11y-high-contrast');
    } else {
      root.classList.remove('a11y-high-contrast');
    }
    
    // Grayscale
    if (settings.grayscale) {
      root.classList.add('a11y-grayscale');
    } else {
      root.classList.remove('a11y-grayscale');
    }
    
    // Highlight links
    if (settings.highlightLinks) {
      root.classList.add('a11y-highlight-links');
    } else {
      root.classList.remove('a11y-highlight-links');
    }
    
    // Readable font
    if (settings.readableFont) {
      root.classList.add('a11y-readable-font');
    } else {
      root.classList.remove('a11y-readable-font');
    }
    
    // Text spacing
    if (settings.textSpacing) {
      root.classList.add('a11y-text-spacing');
    } else {
      root.classList.remove('a11y-text-spacing');
    }
    
    // Pause animations
    if (settings.pauseAnimations) {
      root.classList.add('a11y-pause-animations');
    } else {
      root.classList.remove('a11y-pause-animations');
    }
    
    // Keyboard navigation
    if (settings.keyboardNav) {
      root.classList.add('a11y-keyboard-nav');
    } else {
      root.classList.remove('a11y-keyboard-nav');
    }
    
    // Large cursor
    if (settings.largeCursor) {
      root.classList.add('a11y-large-cursor');
    } else {
      root.classList.remove('a11y-large-cursor');
    }
    
    // Highlight headings
    if (settings.highlightHeadings) {
      root.classList.add('a11y-highlight-headings');
    } else {
      root.classList.remove('a11y-highlight-headings');
    }
    
    // Save to localStorage
    localStorage.setItem('accessibility_settings', JSON.stringify(settings));
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const increaseFontSize = () => {
    setSettings(prev => ({ ...prev, fontSize: Math.min(prev.fontSize + 10, 150) }));
  };

  const decreaseFontSize = () => {
    setSettings(prev => ({ ...prev, fontSize: Math.max(prev.fontSize - 10, 80) }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const readText = () => {
    if (!('speechSynthesis' in window)) {
      alert('הדפדפן שלך אינו תומך בקריאת טקסט');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const selection = window.getSelection().toString();
    const textToRead = selection || document.body.innerText.substring(0, 500);
    
    if (!textToRead) {
      alert('לא נמצא טקסט לקריאה');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = 'he-IL';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <>
      <style>{`
        .a11y-high-contrast {
          filter: contrast(1.5);
        }
        .a11y-high-contrast body {
          background: #000 !important;
          color: #fff !important;
        }
        .a11y-high-contrast * {
          border-color: #fff !important;
        }
        
        .a11y-grayscale {
          filter: grayscale(100%);
        }
        
        .a11y-highlight-links a {
          background: #ffff00 !important;
          color: #000 !important;
          text-decoration: underline !important;
          padding: 2px 4px;
          border-radius: 2px;
        }
        
        .a11y-readable-font,
        .a11y-readable-font * {
          font-family: Arial, sans-serif !important;
        }
        
        .a11y-text-spacing {
          line-height: 1.8 !important;
          letter-spacing: 0.12em !important;
          word-spacing: 0.16em !important;
        }
        .a11y-text-spacing * {
          line-height: inherit !important;
          letter-spacing: inherit !important;
          word-spacing: inherit !important;
        }
        
        .a11y-pause-animations,
        .a11y-pause-animations * {
          animation-play-state: paused !important;
          transition: none !important;
        }
        
        .a11y-keyboard-nav *:focus {
          outline: 3px solid #0078D4 !important;
          outline-offset: 2px !important;
        }
        
        .a11y-large-cursor,
        .a11y-large-cursor * {
          cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="black" stroke="white" stroke-width="2" d="M4 4 L4 24 L10 18 L14 28 L18 26 L14 16 L22 16 Z"/></svg>') 4 4, auto !important;
        }
        
        .a11y-highlight-headings h1,
        .a11y-highlight-headings h2,
        .a11y-highlight-headings h3,
        .a11y-highlight-headings button,
        .a11y-highlight-headings [role="button"] {
          background: #E3F2FD !important;
          padding: 8px !important;
          border: 2px solid #0078D4 !important;
          border-radius: 4px !important;
        }
        
        .accessibility-widget {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 9999;
          direction: rtl;
        }
        
        .accessibility-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #0078D4;
          color: white;
          border: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, background 0.2s;
        }
        
        .accessibility-button:hover {
          background: #1976D2;
          transform: scale(1.1);
        }
        
        .accessibility-button:focus {
          outline: 3px solid #fff;
          outline-offset: 2px;
        }
        
        .accessibility-menu {
          position: absolute;
          bottom: 70px;
          right: 0;
          width: 320px;
          max-height: 500px;
          overflow-y: auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
          padding: 16px;
          animation: slideUp 0.3s ease;
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .accessibility-menu-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E0E0E0;
        }
        
        .accessibility-menu-title {
          font-size: 18px;
          font-weight: bold;
          color: #0078D4;
        }
        
        .accessibility-option {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 8px;
          background: #FAFAFA;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .accessibility-option:hover {
          background: #F0F0F0;
        }
        
        .accessibility-option-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #212121;
        }
        
        .accessibility-option-icon {
          width: 20px;
          height: 20px;
          color: #0078D4;
        }
        
        .accessibility-toggle {
          width: 44px;
          height: 24px;
          background: #E0E0E0;
          border-radius: 12px;
          position: relative;
          transition: background 0.2s;
        }
        
        .accessibility-toggle.active {
          background: #2E7D32;
        }
        
        .accessibility-toggle::after {
          content: '';
          position: absolute;
          top: 2px;
          right: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
        }
        
        .accessibility-toggle.active::after {
          transform: translateX(-20px);
        }
        
        .accessibility-font-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .accessibility-font-btn {
          padding: 6px 12px;
          border: 1px solid #E0E0E0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .accessibility-font-btn:hover {
          background: #F0F0F0;
        }
        
        .accessibility-font-size {
          font-size: 14px;
          color: #616161;
          min-width: 50px;
          text-align: center;
        }
        
        @media (max-width: 768px) {
          .accessibility-widget {
            bottom: 16px;
            right: 16px;
          }
          
          .accessibility-menu {
            width: calc(100vw - 32px);
            right: -16px;
          }
        }
      `}</style>

      <div className="accessibility-widget">
        {isOpen && (
          <div className="accessibility-menu" role="dialog" aria-label="תפריט נגישות">
            <div className="accessibility-menu-header">
              <h2 className="accessibility-menu-title">נגישות</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="accessibility-font-btn"
                aria-label="סגור תפריט נגישות"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Font Size */}
            <div className="accessibility-option">
              <div className="accessibility-option-label">
                <Type className="accessibility-option-icon" />
                <span>גודל טקסט</span>
              </div>
              <div className="accessibility-font-controls">
                <button
                  onClick={decreaseFontSize}
                  className="accessibility-font-btn"
                  aria-label="הקטן טקסט"
                  disabled={settings.fontSize <= 80}
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="accessibility-font-size">{settings.fontSize}%</span>
                <button
                  onClick={increaseFontSize}
                  className="accessibility-font-btn"
                  aria-label="הגדל טקסט"
                  disabled={settings.fontSize >= 150}
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* High Contrast */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('highContrast', !settings.highContrast)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('highContrast', !settings.highContrast)}
            >
              <div className="accessibility-option-label">
                <Contrast className="accessibility-option-icon" />
                <span>ניגודיות גבוהה</span>
              </div>
              <div className={`accessibility-toggle ${settings.highContrast ? 'active' : ''}`} />
            </div>

            {/* Grayscale */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('grayscale', !settings.grayscale)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('grayscale', !settings.grayscale)}
            >
              <div className="accessibility-option-label">
                <Palette className="accessibility-option-icon" />
                <span>גווני אפור</span>
              </div>
              <div className={`accessibility-toggle ${settings.grayscale ? 'active' : ''}`} />
            </div>

            {/* Highlight Links */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('highlightLinks', !settings.highlightLinks)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('highlightLinks', !settings.highlightLinks)}
            >
              <div className="accessibility-option-label">
                <LinkIcon className="accessibility-option-icon" />
                <span>הדגשת קישורים</span>
              </div>
              <div className={`accessibility-toggle ${settings.highlightLinks ? 'active' : ''}`} />
            </div>

            {/* Readable Font */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('readableFont', !settings.readableFont)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('readableFont', !settings.readableFont)}
            >
              <div className="accessibility-option-label">
                <Type className="accessibility-option-icon" />
                <span>גופן קריא</span>
              </div>
              <div className={`accessibility-toggle ${settings.readableFont ? 'active' : ''}`} />
            </div>

            {/* Text Spacing */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('textSpacing', !settings.textSpacing)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('textSpacing', !settings.textSpacing)}
            >
              <div className="accessibility-option-label">
                <AlignLeft className="accessibility-option-icon" />
                <span>ריווח טקסט</span>
              </div>
              <div className={`accessibility-toggle ${settings.textSpacing ? 'active' : ''}`} />
            </div>

            {/* Pause Animations */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('pauseAnimations', !settings.pauseAnimations)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('pauseAnimations', !settings.pauseAnimations)}
            >
              <div className="accessibility-option-label">
                <Pause className="accessibility-option-icon" />
                <span>השהיית אנימציות</span>
              </div>
              <div className={`accessibility-toggle ${settings.pauseAnimations ? 'active' : ''}`} />
            </div>

            {/* Keyboard Navigation */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('keyboardNav', !settings.keyboardNav)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('keyboardNav', !settings.keyboardNav)}
            >
              <div className="accessibility-option-label">
                <Keyboard className="accessibility-option-icon" />
                <span>ניווט מקלדת</span>
              </div>
              <div className={`accessibility-toggle ${settings.keyboardNav ? 'active' : ''}`} />
            </div>

            {/* Large Cursor */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('largeCursor', !settings.largeCursor)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('largeCursor', !settings.largeCursor)}
            >
              <div className="accessibility-option-label">
                <MousePointer className="accessibility-option-icon" />
                <span>סמן גדול</span>
              </div>
              <div className={`accessibility-toggle ${settings.largeCursor ? 'active' : ''}`} />
            </div>

            {/* Read Text */}
            <div
              className="accessibility-option"
              onClick={readText}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && readText()}
            >
              <div className="accessibility-option-label">
                <Volume2 className="accessibility-option-icon" />
                <span>{isSpeaking ? 'עצור קריאה' : 'קריאת טקסט'}</span>
              </div>
              <div className={`accessibility-toggle ${isSpeaking ? 'active' : ''}`} />
            </div>

            {/* Highlight Headings */}
            <div
              className="accessibility-option"
              onClick={() => updateSetting('highlightHeadings', !settings.highlightHeadings)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => e.key === 'Enter' && updateSetting('highlightHeadings', !settings.highlightHeadings)}
            >
              <div className="accessibility-option-label">
                <Eye className="accessibility-option-icon" />
                <span>הדגשת כותרות ופקדים</span>
              </div>
              <div className={`accessibility-toggle ${settings.highlightHeadings ? 'active' : ''}`} />
            </div>

            {/* Reset */}
            <button
              onClick={resetSettings}
              className="accessibility-option"
              style={{ justifyContent: 'center', marginTop: '16px', background: '#FFEBEE' }}
              aria-label="איפוס הגדרות נגישות"
            >
              <div className="accessibility-option-label">
                <RotateCcw className="accessibility-option-icon" style={{ color: '#D32F2F' }} />
                <span style={{ color: '#D32F2F', fontWeight: 'bold' }}>איפוס הגדרות</span>
              </div>
            </button>
          </div>
        )}

        <button
          className="accessibility-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'סגור תפריט נגישות' : 'פתח תפריט נגישות'}
          aria-expanded={isOpen}
        >
          <Accessibility className="w-7 h-7" />
        </button>
      </div>
    </>
  );
}