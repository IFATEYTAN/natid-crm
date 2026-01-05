import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';

// Inline celebration animation data
const celebrationAnimation = {
  "v": "5.7.4",
  "fr": 60,
  "ip": 0,
  "op": 120,
  "w": 200,
  "h": 200,
  "nm": "Celebration",
  "ddd": 0,
  "assets": [],
  "layers": [
    // Confetti particles
    ...Array.from({ length: 12 }, (_, i) => ({
      "ddd": 0,
      "ind": i + 1,
      "ty": 4,
      "nm": `Confetti ${i}`,
      "sr": 1,
      "ks": {
        "o": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0] },
            { "t": 20, "s": [100] },
            { "t": 100, "s": [100] },
            { "t": 120, "s": [0] }
          ]
        },
        "r": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0] },
            { "t": 120, "s": [360 + Math.random() * 360] }
          ]
        },
        "p": {
          "a": 1,
          "k": [
            { "t": 0, "s": [100, 100] },
            { "t": 120, "s": [
              50 + Math.random() * 100,
              150 + Math.random() * 50
            ]}
          ]
        },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0, 0] },
            { "t": 20, "s": [100, 100] },
            { "t": 120, "s": [50, 50] }
          ]
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "rc",
              "d": 1,
              "s": { "a": 0, "k": [8, 8] },
              "p": { "a": 0, "k": [0, 0] },
              "r": { "a": 0, "k": 2 }
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [
                [0.23, 0.51, 0.98, 1], // Blue
                [0.06, 0.73, 0.56, 1], // Green
                [0.96, 0.62, 0.04, 1], // Orange
                [0.55, 0.36, 0.96, 1], // Purple
              ][i % 4] },
              "o": { "a": 0, "k": 100 }
            }
          ],
          "nm": "Rectangle"
        }
      ],
      "ip": 0,
      "op": 120,
      "st": i * 5
    })),
    // Checkmark
    {
      "ddd": 0,
      "ind": 20,
      "ty": 4,
      "nm": "Check",
      "sr": 1,
      "ks": {
        "o": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0] },
            { "t": 30, "s": [100] }
          ]
        },
        "r": { "a": 0, "k": 0 },
        "p": { "a": 0, "k": [100, 100] },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": {
          "a": 1,
          "k": [
            { "t": 0, "s": [0, 0] },
            { "t": 20, "s": [120, 120] },
            { "t": 40, "s": [100, 100] }
          ]
        }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "el",
              "d": 1,
              "s": { "a": 0, "k": [60, 60] },
              "p": { "a": 0, "k": [0, 0] }
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [0.23, 0.51, 0.98, 1] },
              "o": { "a": 0, "k": 100 }
            }
          ],
          "nm": "Circle"
        }
      ],
      "ip": 0,
      "op": 120,
      "st": 0
    }
  ]
};

export default function CelebrationAnimation({
  show = false,
  duration = 2000,
  onComplete
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onComplete]);

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes celebrationFadeIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes celebrationFadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.2); }
        }

        .celebration-container {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 200px;
          height: 200px;
          z-index: 9999;
          pointer-events: none;
          animation: celebrationFadeIn 0.3s ease-out;
        }

        .celebration-container.fadeOut {
          animation: celebrationFadeOut 0.3s ease-in forwards;
        }
      `}</style>

      <div className="celebration-container">
        <div className="w-full h-full flex items-center justify-center">
          <Lottie
            animationData={celebrationAnimation}
            loop={false}
            autoplay={true}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>
    </>
  );
}
