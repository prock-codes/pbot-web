'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './pokemon-card.css';

// --- Math helpers (from pokemon-cards-css) ---
const round = (value: number, precision = 3) => parseFloat(value.toFixed(precision));
const clamp = (value: number, min = 0, max = 100) => Math.min(Math.max(value, min), max);
const adjust = (value: number, fromMin: number, fromMax: number, toMin: number, toMax: number) =>
  round(toMin + ((toMax - toMin) * (value - fromMin)) / (fromMax - fromMin));

interface CardState {
  interacting: boolean;
  rotate: { x: number; y: number };
  glare: { x: number; y: number; o: number };
  background: { x: number; y: number };
}

const defaultState: CardState = {
  interacting: false,
  rotate: { x: 0, y: 0 },
  glare: { x: 50, y: 50, o: 0 },
  background: { x: 50, y: 50 },
};

function useCardInteraction() {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<CardState>(defaultState);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    const percent = {
      x: clamp(round((100 / rect.width) * (e.clientX - rect.left))),
      y: clamp(round((100 / rect.height) * (e.clientY - rect.top))),
    };

    const center = { x: percent.x - 50, y: percent.y - 50 };

    setState({
      interacting: true,
      background: {
        x: adjust(percent.x, 0, 100, 37, 63),
        y: adjust(percent.y, 0, 100, 33, 67),
      },
      rotate: {
        x: round(-(center.x / 3.5)),
        y: round(center.y / 3.5),
      },
      glare: {
        x: round(percent.x),
        y: round(percent.y),
        o: 1,
      },
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    setState(defaultState);
  }, []);

  const reset = useCallback(() => {
    setState(defaultState);
  }, []);

  return { ref, state, handlePointerMove, handlePointerLeave, reset };
}

function getDynamicStyles(state: CardState) {
  const pointerFromCenter = clamp(
    Math.sqrt(
      (state.glare.y - 50) * (state.glare.y - 50) +
      (state.glare.x - 50) * (state.glare.x - 50)
    ) / 50,
    0,
    1
  );

  return {
    '--pointer-x': `${state.glare.x}%`,
    '--pointer-y': `${state.glare.y}%`,
    '--pointer-from-center': `${pointerFromCenter}`,
    '--pointer-from-top': `${state.glare.y / 100}`,
    '--pointer-from-left': `${state.glare.x / 100}`,
    '--card-opacity': `${state.glare.o}`,
    '--rotate-x': `${state.rotate.x}deg`,
    '--rotate-y': `${state.rotate.y}deg`,
    '--background-x': `${state.background.x}%`,
    '--background-y': `${state.background.y}%`,
    '--card-scale': '1',
    '--translate-x': '0px',
    '--translate-y': '0px',
  } as React.CSSProperties;
}

interface CardConfig {
  id: string;
  src: string;
  alt: string;
}

const cards: CardConfig[] = [
  { id: 'bomb', src: '/bomb.png', alt: 'Bomb Pokemon Card, Holographic' },
  { id: 'crunch', src: '/crunch-card1.png', alt: 'Crunch Pokemon Card, Holographic' },
  { id: 'prock', src: '/card2.png', alt: 'Prock - Stage 1 Pokemon Card, Holographic' },
  { id: 'ice', src: '/ice-card2.png', alt: 'Monkey D. Ice - Basic Pokemon Card, Holographic' },
];

function HoloCard({ card, onClick }: { card: CardConfig; onClick: () => void }) {
  const { ref, state, handlePointerMove, handlePointerLeave, reset } = useCardInteraction();

  const handleClick = useCallback(() => {
    reset();
    onClick();
  }, [reset, onClick]);

  return (
    <div
      className={`card ${state.interacting ? 'interacting' : ''}`}
      style={{
        ...getDynamicStyles(state),
        width: 'min(300px, 40vw)',
      }}
    >
      <div className="card__translater">
        <div
          ref={ref}
          className="card__rotator"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={handleClick}
        >
          <div className="card__front">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.src}
              alt={card.alt}
              width={660}
              height={921}
              draggable={false}
            />
            <div className="card__shine" />
            <div className="card__glare" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpandedCard({ card, onClose }: { card: CardConfig; onClose: () => void }) {
  const { ref, state, handlePointerMove, handlePointerLeave } = useCardInteraction();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className={`card ${state.interacting ? 'interacting' : ''} relative z-10`}
        style={{
          ...getDynamicStyles(state),
          width: 'min(420px, 85vw)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card__translater">
          <div
            ref={ref}
            className="card__rotator"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <div className="card__front">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.src}
                alt={card.alt}
                width={660}
                height={921}
                draggable={false}
              />
              <div className="card__shine" />
              <div className="card__glare" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardDemoPage() {
  const [expandedCard, setExpandedCard] = useState<CardConfig | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 -mt-8">
      <h1 className="text-3xl font-bold text-center">
        Powerspike Cards
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-12">
        {cards.map((card) => (
          <HoloCard
            key={card.id}
            card={card}
            onClick={() => setExpandedCard(card)}
          />
        ))}
      </div>

      {expandedCard && (
        <ExpandedCard
          card={expandedCard}
          onClose={() => setExpandedCard(null)}
        />
      )}
    </div>
  );
}
