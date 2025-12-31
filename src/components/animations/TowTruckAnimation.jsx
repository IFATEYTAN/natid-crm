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

export default function TowTruckAnimation({ trigger = 0, error = false }) {
  const [opacity, setOpacity] = useState(0.5);
  const [scale, setScale] = useState(1);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (trigger > 0) {
      // Celebration animation on action
      setOpacity(1);
      setScale(1.1);
      setTimeout(() => {
        setScale(1);
        setTimeout(() => setOpacity(0.5), 300);
      }, 200);
    }
  }, [trigger]);

  useEffect(() => {
    if (error) {
      // Shake animation on error
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [error]);

  return (
    <div
      className="fixed bottom-6 left-6 z-[999] pointer-events-none transition-all duration-300"
      style={{
        opacity,
        transform: `scale(${scale}) ${shake ? 'translateX(-5px)' : ''}`,
        animation: shake ? 'shake 0.5s' : 'none'
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        @keyframes driveIn {
          from {
            transform: translateX(-150px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 0.5;
          }
        }
        .truck-container {
          animation: driveIn 1s ease-out;
        }
      `}</style>
      
      <div className="truck-container w-[120px] h-[120px] md:w-[120px] md:h-[120px] sm:w-[80px] sm:h-[80px]">
        <div className="w-full h-full bg-[#0D47A1]/5 rounded-full flex items-center justify-center">
          <Truck className="w-12 h-12 text-[#0D47A1]" strokeWidth={1.5} />
        </div>
      </div>
    </div>
  );
}