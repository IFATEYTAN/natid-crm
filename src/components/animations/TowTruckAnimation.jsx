import React, { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import { Truck } from 'lucide-react';

// Inline Lottie animation data for a tow truck
const towTruckAnimation = {
  "v": "5.7.4",
  "fr": 30,
  "ip": 0,
  "op": 60,
  "w": 120,
  "h": 120,
  "nm": "Tow Truck",
  "ddd": 0,
  "assets": [],
  "layers": [
    {
      "ddd": 0,
      "ind": 1,
      "ty": 4,
      "nm": "Truck",
      "sr": 1,
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { 
          "a": 1,
          "k": [
            { "t": 0, "s": [0], "e": [-2] },
            { "t": 15, "s": [-2], "e": [2] },
            { "t": 30, "s": [2], "e": [-2] },
            { "t": 45, "s": [-2], "e": [0] },
            { "t": 60, "s": [0] }
          ]
        },
        "p": { 
          "a": 1,
          "k": [
            { "t": 0, "s": [60, 60], "e": [60, 58] },
            { "t": 30, "s": [60, 58], "e": [60, 60] },
            { "t": 60, "s": [60, 60] }
          ]
        },
        "a": { "a": 0, "k": [0, 0, 0] },
        "s": { "a": 0, "k": [100, 100, 100] }
      },
      "ao": 0,
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "rc",
              "d": 1,
              "s": { "a": 0, "k": [50, 30] },
              "p": { "a": 0, "k": [0, 0] },
              "r": { "a": 0, "k": 4 }
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [0.05, 0.28, 0.63, 1] },
              "o": { "a": 0, "k": 100 }
            }
          ],
          "nm": "Body"
        }
      ],
      "ip": 0,
      "op": 60,
      "st": 0
    }
  ]
};

export default function TowTruckAnimation({ trigger = 0, state = 'idle' }) {
  const [animationState, setAnimationState] = useState('idle');
  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(1);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    switch (state) {
      case 'loading':
        setOpacity(1);
        setScale(1);
        setSpeed(1.5);
        setAnimationState('loading');
        break;
      case 'success':
        setOpacity(1);
        setScale(1.1);
        setSpeed(1);
        setAnimationState('success');
        setTimeout(() => {
          setOpacity(0.5);
          setScale(1);
          setAnimationState('idle');
        }, 2000);
        break;
      case 'error':
        setOpacity(1);
        setScale(1);
        setSpeed(1);
        setAnimationState('error');
        setTimeout(() => {
          setOpacity(0.5);
          setScale(1);
          setAnimationState('idle');
        }, 1000);
        break;
      case 'driving':
        setOpacity(1);
        setScale(1.05);
        setSpeed(1.5);
        setAnimationState('driving');
        break;
      default:
        setOpacity(0.5);
        setScale(1);
        setSpeed(1);
        setAnimationState('idle');
    }
  }, [state]);

  useEffect(() => {
    if (trigger > 0) {
      setAnimationState('success');
      setOpacity(1);
      setScale(1.1);
      setTimeout(() => {
        setOpacity(0.5);
        setScale(1);
        setAnimationState('idle');
      }, 2000);
    }
  }, [trigger]);

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .lottie-container {
          position: fixed;
          bottom: 24px;
          left: 24px;
          width: 120px;
          height: 120px;
          z-index: 999;
          pointer-events: none;
          transition: all 0.3s ease;
        }

        .lottie-container.error {
          animation: shake 0.5s ease-in-out;
          filter: hue-rotate(-10deg) brightness(1.1);
        }

        @media (max-width: 1200px) {
          .lottie-container {
            width: 100px;
            height: 100px;
            bottom: 16px;
            left: 16px;
          }
        }

        @media (max-width: 768px) {
          .lottie-container {
            width: 80px;
            height: 80px;
            bottom: 12px;
            left: 12px;
          }
        }
      `}</style>
      
      <div 
        className={`lottie-container ${animationState}`}
        style={{ 
          opacity: opacity,
          transform: `scale(${scale})`
        }}
      >
        <div className="w-full h-full bg-white/80 backdrop-blur-sm rounded-full shadow-lg flex items-center justify-center">
          <Lottie
            animationData={towTruckAnimation}
            loop={true}
            autoplay={true}
            speed={speed}
            style={{ width: '70%', height: '70%' }}
          />
        </div>
      </div>
    </>
  );
}