import React, { useId } from 'react';

export type StickerVisualType = 'rose' | 'heart' | 'bell' | 'fireworks';

interface AnimatedStickerProps {
  type: StickerVisualType;
  selected?: boolean;
}

const FIREWORK_SHELLS = [
  { angle: -72, radius: 38, color: '#5fd4ff', tip: '#f8fdff', width: 3.8 },
  { angle: -54, radius: 42, color: '#8d7cff', tip: '#fff7ff', width: 4.1 },
  { angle: -36, radius: 46, color: '#ff6f91', tip: '#fff4fb', width: 4.4 },
  { angle: -18, radius: 49, color: '#ffb347', tip: '#fff8e8', width: 4.7 },
  { angle: 0, radius: 52, color: '#ffe066', tip: '#fffde8', width: 5 },
  { angle: 18, radius: 49, color: '#7ef29a', tip: '#f0fff7', width: 4.7 },
  { angle: 36, radius: 46, color: '#ff7bdb', tip: '#fff4fd', width: 4.4 },
  { angle: 54, radius: 42, color: '#ff8359', tip: '#fff3ec', width: 4.1 },
  { angle: 72, radius: 38, color: '#6de4c6', tip: '#effffb', width: 3.8 }
];

const FIREWORK_SPARKS = [
  { x: 22, y: 40, radius: 2.6, color: '#66d9ff', delay: '120ms' },
  { x: 30, y: 27, radius: 2.8, color: '#9d88ff', delay: '260ms' },
  { x: 46, y: 18, radius: 2.4, color: '#ff8db0', delay: '420ms' },
  { x: 60, y: 14, radius: 3.1, color: '#fff07d', delay: '560ms' },
  { x: 74, y: 19, radius: 2.5, color: '#80f6aa', delay: '700ms' },
  { x: 90, y: 29, radius: 2.8, color: '#ff8ae8', delay: '840ms' },
  { x: 98, y: 42, radius: 2.6, color: '#ff9a63', delay: '980ms' },
  { x: 38, y: 52, radius: 2.1, color: '#ffd37a', delay: '1120ms' },
  { x: 82, y: 53, radius: 2.1, color: '#9cecca', delay: '1260ms' }
];

const stickerVisualStyles = `
  .sticker-visual {
    position: relative;
    width: 100%;
    height: 100%;
    pointer-events: none;
    transform-origin: center;
    filter: drop-shadow(0 10px 18px rgba(88, 36, 47, 0.16));
  }

  .sticker-visual.is-selected {
    filter: drop-shadow(0 12px 24px rgba(196, 120, 138, 0.28)) drop-shadow(0 0 16px rgba(255, 227, 210, 0.85));
  }

  .sticker-scene,
  .sticker-svg {
    width: 100%;
    height: 100%;
  }

  .sticker-svg {
    overflow: visible;
  }

  .sticker-scene {
    position: relative;
  }

  .sticker-overlay {
    position: absolute;
    inset: 0;
  }

  .rose-sway {
    animation: stickerRoseSway 4.6s ease-in-out infinite;
  }

  .rose-bloom {
    transform-origin: 50% 40%;
    animation: stickerRoseBloom 3.8s ease-in-out infinite;
  }

  .rose-core {
    transform-origin: 50% 38%;
    animation: stickerRoseCore 2.6s ease-in-out infinite;
  }

  .rose-floating-petal {
    position: absolute;
    width: 12%;
    height: 17%;
    border-radius: 70% 30% 70% 30%;
    background: radial-gradient(circle at 35% 35%, rgba(255, 214, 221, 0.95) 0%, rgba(228, 78, 112, 0.92) 48%, rgba(146, 26, 55, 0.95) 100%);
    box-shadow: 0 3px 8px rgba(168, 42, 72, 0.24);
    opacity: 0.82;
  }

  .rose-floating-left {
    left: 19%;
    top: 28%;
    transform: rotate(-26deg);
    animation: stickerPetalDriftLeft 5.1s ease-in-out infinite;
  }

  .rose-floating-right {
    right: 17%;
    top: 19%;
    transform: rotate(28deg);
    animation: stickerPetalDriftRight 5.7s ease-in-out infinite;
  }

  .rose-dew {
    transform-origin: center;
    animation: stickerDewTwinkle 3.2s ease-in-out infinite;
  }

  .heart-float {
    animation: stickerHeartFloat 4.4s ease-in-out infinite;
  }

  .heart-core {
    transform-origin: 50% 52%;
    animation: stickerHeartBeat 1.85s ease-in-out infinite;
  }

  .heart-sparkle {
    position: absolute;
    width: 8%;
    height: 8%;
    opacity: 0.9;
    background: radial-gradient(circle, rgba(255, 255, 255, 1) 0%, rgba(255, 228, 236, 0.95) 30%, rgba(255, 195, 214, 0) 72%);
    animation: stickerSparkle 2.3s ease-in-out infinite;
  }

  .heart-sparkle::before,
  .heart-sparkle::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    background: rgba(255, 250, 252, 0.95);
    transform: translate(-50%, -50%);
    border-radius: 999px;
  }

  .heart-sparkle::before {
    width: 115%;
    height: 26%;
  }

  .heart-sparkle::after {
    width: 26%;
    height: 115%;
  }

  .heart-sparkle-a {
    top: 15%;
    left: 16%;
  }

  .heart-sparkle-b {
    top: 11%;
    right: 19%;
    animation-delay: 620ms;
  }

  .heart-sparkle-c {
    right: 11%;
    bottom: 24%;
    animation-delay: 1050ms;
  }

  .luxury-glint {
    animation: stickerLuxuryGleam 3.8s ease-in-out infinite;
  }

  .bell-float {
    animation: stickerBellFloat 5.3s ease-in-out infinite;
  }

  .bell-swing {
    transform-origin: 50% 20%;
    animation: stickerBellSwing 2.8s cubic-bezier(0.445, 0.05, 0.55, 0.95) infinite;
  }

  .bell-shine {
    opacity: 0.86;
    animation: stickerBellShine 2.8s ease-in-out infinite;
  }

  .bell-ring {
    position: absolute;
    border: 2px solid rgba(249, 221, 138, 0.72);
    border-bottom-color: transparent;
    border-left-color: transparent;
    border-radius: 999px;
    opacity: 0;
  }

  .bell-ring-left {
    left: 11%;
    top: 27%;
    width: 26%;
    height: 26%;
    transform: rotate(-115deg);
    animation: stickerBellRingLeft 2.8s ease-out infinite;
  }

  .bell-ring-right {
    right: 11%;
    top: 27%;
    width: 26%;
    height: 26%;
    transform: rotate(65deg);
    animation: stickerBellRingRight 2.8s ease-out infinite;
  }

  .fireworks-float {
    animation: stickerFireworksFloat 5.8s ease-in-out infinite;
  }

  .fireworks-burst-main {
    transform-origin: 50% 50%;
    animation: stickerFireworksUmbrellaBurst 3.4s cubic-bezier(0.2, 0.85, 0.25, 1) infinite;
  }

  .fireworks-burst-second {
    transform-origin: 50% 50%;
    animation: stickerFireworksUmbrellaBurst 3.4s cubic-bezier(0.2, 0.85, 0.25, 1) infinite 220ms;
  }

  .fireworks-particle {
    transform-origin: 50% 50%;
    animation: stickerFireworksSparkFade 3.4s ease-out infinite;
  }

  .fireworks-smoke {
    transform-origin: 50% 50%;
    animation: stickerFireworksSmoke 3.4s ease-out infinite;
  }

  .fireworks-trail {
    transform-origin: 50% 50%;
    animation: stickerFireworksTrail 3.4s ease-out infinite;
  }

  .fireworks-shell {
    transform-origin: 60px 58px;
    animation: stickerFireworksShellArc 3.4s cubic-bezier(0.2, 0.85, 0.25, 1) infinite;
  }

  .fireworks-shell-tip {
    transform-origin: center;
    animation: stickerFireworksTipFade 3.4s ease-out infinite;
  }

  .fireworks-ring {
    position: absolute;
    inset: 18%;
    border-radius: 999px;
    border: 1px solid rgba(255, 235, 177, 0.65);
    opacity: 0;
    animation: stickerFireworksHalo 2.9s ease-out infinite;
  }

  .fireworks-ring-secondary {
    inset: 8%;
    animation-delay: 640ms;
  }

  @keyframes stickerRoseSway {
    0%, 100% { transform: rotate(-4deg) translateY(0); }
    50% { transform: rotate(4deg) translateY(-2px); }
  }

  @keyframes stickerRoseBloom {
    0%, 100% { transform: scale(0.98) translateY(0); }
    50% { transform: scale(1.03) translateY(-1px); }
  }

  @keyframes stickerRoseCore {
    0%, 100% { transform: scale(0.96); }
    50% { transform: scale(1.06); }
  }

  @keyframes stickerPetalDriftLeft {
    0%, 100% { transform: translate(0, 0) rotate(-26deg); opacity: 0.76; }
    50% { transform: translate(-6px, 10px) rotate(-10deg); opacity: 0.22; }
  }

  @keyframes stickerPetalDriftRight {
    0%, 100% { transform: translate(0, 0) rotate(28deg); opacity: 0.7; }
    50% { transform: translate(6px, 12px) rotate(44deg); opacity: 0.18; }
  }

  @keyframes stickerHeartFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  @keyframes stickerHeartBeat {
    0%, 18%, 38%, 100% { transform: scale(1); }
    12% { transform: scale(1.08); }
    28% { transform: scale(1.14); }
  }

  @keyframes stickerSparkle {
    0%, 100% { transform: scale(0.6); opacity: 0.12; }
    45% { transform: scale(1.2); opacity: 0.95; }
    70% { transform: scale(0.8); opacity: 0.36; }
  }

  @keyframes stickerLuxuryGleam {
    0%, 100% { opacity: 0.16; transform: translateX(-10px) scaleX(0.78); }
    42% { opacity: 0.86; transform: translateX(12px) scaleX(1.08); }
  }

  @keyframes stickerDewTwinkle {
    0%, 100% { opacity: 0.4; transform: scale(0.92); }
    50% { opacity: 0.95; transform: scale(1.08); }
  }

  @keyframes stickerBellFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  @keyframes stickerBellSwing {
    0%, 100% { transform: rotate(0deg); }
    15% { transform: rotate(-12deg); }
    35% { transform: rotate(9deg); }
    55% { transform: rotate(-6deg); }
    72% { transform: rotate(4deg); }
  }

  @keyframes stickerBellShine {
    0%, 100% { opacity: 0.16; transform: translateX(-8px) scaleX(0.8); }
    42% { opacity: 0.78; transform: translateX(12px) scaleX(1.05); }
  }

  @keyframes stickerBellRingLeft {
    0%, 100% { opacity: 0; transform: rotate(-115deg) scale(0.75); }
    24%, 38% { opacity: 0.82; transform: rotate(-115deg) scale(1.06); }
    52% { opacity: 0; transform: rotate(-115deg) scale(1.24); }
  }

  @keyframes stickerBellRingRight {
    0%, 100% { opacity: 0; transform: rotate(65deg) scale(0.75); }
    24%, 38% { opacity: 0.82; transform: rotate(65deg) scale(1.06); }
    52% { opacity: 0; transform: rotate(65deg) scale(1.24); }
  }

  @keyframes stickerFireworksFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes stickerFireworksUmbrellaBurst {
    0%, 10%, 100% { opacity: 0; transform: scale(0.22); }
    18% { opacity: 0.95; transform: scale(0.58); }
    28% { opacity: 1; transform: scale(0.9); }
    40% { opacity: 0.98; transform: scale(1.02); }
    58% { opacity: 0.4; transform: scale(1.08); }
    72% { opacity: 0; transform: scale(1.13); }
  }

  @keyframes stickerFireworksShellArc {
    0%, 10%, 100% { opacity: 0; transform: scale(0.24); }
    18% { opacity: 0.78; transform: scale(0.68); }
    30% { opacity: 1; transform: scale(0.98); }
    46% { opacity: 0.86; transform: scale(1.06); }
    64% { opacity: 0.26; transform: scale(1.12); }
    76% { opacity: 0; transform: scale(1.15); }
  }

  @keyframes stickerFireworksSparkFade {
    0%, 12%, 100% { opacity: 0; transform: scale(0.2); }
    22% { opacity: 1; transform: scale(0.92); }
    38% { opacity: 0.95; transform: scale(1.08); }
    58% { opacity: 0.22; transform: scale(1.22); }
    72% { opacity: 0; transform: scale(1.32); }
  }

  @keyframes stickerFireworksTipFade {
    0%, 12%, 100% { opacity: 0; transform: scale(0.4); }
    22% { opacity: 1; transform: scale(0.95); }
    40% { opacity: 0.92; transform: scale(1.16); }
    60% { opacity: 0.18; transform: scale(1.35); }
    72% { opacity: 0; transform: scale(1.5); }
  }

  @keyframes stickerFireworksHalo {
    0%, 12%, 100% { opacity: 0; transform: scale(0.28); }
    22% { opacity: 0.68; transform: scale(0.72); }
    40% { opacity: 0.24; transform: scale(1.02); }
    62% { opacity: 0; transform: scale(1.18); }
  }

  @keyframes stickerFireworksSmoke {
    0%, 10%, 100% { opacity: 0; transform: scale(0.18); }
    22% { opacity: 0.38; transform: scale(0.62); }
    40% { opacity: 0.24; transform: scale(0.94); }
    60% { opacity: 0.08; transform: scale(1.14); }
    74% { opacity: 0; transform: scale(1.24); }
  }

  @keyframes stickerFireworksTrail {
    0%, 100% { opacity: 0; transform: scaleY(0.26) translateY(22px); }
    10% { opacity: 0.86; transform: scaleY(0.92) translateY(5px); }
    18% { opacity: 0.46; transform: scaleY(1.08) translateY(-2px); }
    28% { opacity: 0; transform: scaleY(1.18) translateY(-10px); }
  }
`;

export const StickerVisualStyles = () => <style>{stickerVisualStyles}</style>;

export const getStickerFrameSize = (size: number) => Math.round(Math.max(60, size * 1.8));

const RoseSticker = ({ selected }: { selected: boolean }) => {
  const id = useId().replace(/:/g, '');
  const petalGradient = `rosePetal${id}`;
  const petalDeepGradient = `rosePetalDeep${id}`;
  const petalShadowGradient = `rosePetalShadow${id}`;
  const stemGradient = `roseStem${id}`;
  const leafGradient = `roseLeaf${id}`;
  const roseGlow = `roseGlow${id}`;
  const roseOuterGradient = `roseOuter${id}`;
  const goldEdgeGradient = `roseGoldEdge${id}`;

  return (
    <div className={`sticker-visual ${selected ? 'is-selected' : ''}`}>
      <div className="sticker-scene rose-sway">
        <svg viewBox="0 0 120 120" className="sticker-svg" aria-hidden="true">
          <defs>
            <linearGradient id={petalGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd5df" />
              <stop offset="38%" stopColor="#ef5f87" />
              <stop offset="78%" stopColor="#bc214c" />
              <stop offset="100%" stopColor="#7c1732" />
            </linearGradient>
            <linearGradient id={petalDeepGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffecf1" />
              <stop offset="36%" stopColor="#f87da1" />
              <stop offset="100%" stopColor="#941b3d" />
            </linearGradient>
            <radialGradient id={petalShadowGradient} cx="50%" cy="55%" r="60%">
              <stop offset="0%" stopColor="#6d1027" stopOpacity="0" />
              <stop offset="100%" stopColor="#5f0f23" stopOpacity="0.55" />
            </radialGradient>
            <linearGradient id={stemGradient} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7fb76a" />
              <stop offset="100%" stopColor="#2e6e43" />
            </linearGradient>
            <linearGradient id={leafGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b6e19a" />
              <stop offset="55%" stopColor="#5ba45e" />
              <stop offset="100%" stopColor="#2d7048" />
            </linearGradient>
            <radialGradient id={roseGlow} cx="45%" cy="28%" r="55%">
              <stop offset="0%" stopColor="#fff6f8" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#ffd4df" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffd4df" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={roseOuterGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffe6ed" />
              <stop offset="34%" stopColor="#f38aab" />
              <stop offset="75%" stopColor="#ba294f" />
              <stop offset="100%" stopColor="#7f1631" />
            </linearGradient>
            <linearGradient id={goldEdgeGradient} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f7d98a" />
              <stop offset="50%" stopColor="#fff1c6" />
              <stop offset="100%" stopColor="#caa24c" />
            </linearGradient>
          </defs>

          <ellipse cx="61" cy="42" rx="24" ry="18" fill="#631324" opacity="0.16" />
          <g className="rose-bloom">
            <ellipse cx="60" cy="33" rx="24" ry="22" fill={`url(#${roseGlow})`} />
            <ellipse cx="60" cy="36" rx="21" ry="19" fill={`url(#${roseOuterGradient})`} opacity="0.92" />
            <path d="M37 40c3-12 12-19 23-20 11-1 21 7 23 19-6 8-18 12-32 10-8-1-11-4-14-9z" fill={`url(#${petalShadowGradient})`} opacity="0.42" />
            <ellipse cx="60" cy="34" rx="15" ry="17" fill={`url(#${petalGradient})`} />
            <ellipse cx="47" cy="39" rx="14" ry="18" fill={`url(#${petalDeepGradient})`} transform="rotate(-20 47 39)" />
            <ellipse cx="73" cy="39" rx="14" ry="18" fill={`url(#${petalDeepGradient})`} transform="rotate(18 73 39)" />
            <ellipse cx="57" cy="22" rx="11" ry="15" fill={`url(#${petalDeepGradient})`} transform="rotate(-8 57 22)" />
            <ellipse cx="69" cy="23" rx="10" ry="14" fill={`url(#${petalGradient})`} transform="rotate(14 69 23)" />
            <ellipse cx="60" cy="44" rx="13" ry="12" fill={`url(#${petalGradient})`} />
            <path d="M44 42c5 7 27 10 34 3-5 12-24 15-34-3z" fill="#7b1530" opacity="0.42" />
            <g className="rose-core">
              <path d="M54 32c2-6 10-8 15-4 4 3 4 8 0 12-4 5-11 6-16 3 3-1 6-4 7-8-3 1-5 1-6-3z" fill="#ffd3dd" opacity="0.92" />
              <path d="M60 28c6 1 9 6 6 11-2 3-6 5-10 4 3-2 5-4 5-7-2 0-4-1-5-3 1-3 2-4 4-5z" fill="#ffe8ee" opacity="0.95" />
            </g>
            <path d="M48 20c4-3 10-4 14-2" stroke="#fff1f4" strokeWidth="2.3" strokeLinecap="round" opacity="0.72" />
            <path d="M64 18c5 0 9 2 12 5" stroke="#ffd9e3" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
            <path d="M39 44c8 9 34 11 42 2" stroke={`url(#${goldEdgeGradient})`} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.72" />
          </g>

          <path d="M50 53l10-8 11 8-6 7H56z" fill="#3a7b50" />
          <path d="M59 54C55 66 55 80 60 102" stroke={`url(#${stemGradient})`} strokeWidth="6" strokeLinecap="round" fill="none" />
          <path d="M60 57C58 71 58 86 62 102" stroke="#bce7b4" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.68" />
          <path d="M58 74c-17-9-24 7-9 16 10 5 16-5 9-16z" fill={`url(#${leafGradient})`} transform="rotate(-18 49 81)" />
          <path d="M63 78c16-7 23 11 6 18-10 4-14-7-6-18z" fill={`url(#${leafGradient})`} transform="rotate(16 73 86)" />
          <path d="M47 76c5 1 8 5 10 9" stroke="#dff4cb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.74" />
          <path d="M73 80c-5 1-8 5-10 10" stroke="#dff4cb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.74" />
          <path d="M57 70c-7-3-11 2-8 8" stroke="#dff4cb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
          <path d="M63 76c7-3 10 4 7 9" stroke="#dff4cb" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.7" />
          <path d="M57 84l-4 6 6 1" fill="#7f4b18" opacity="0.58" />
          <circle className="rose-dew" cx="45" cy="49" r="2.5" fill="#eefaff" opacity="0.9" />
          <circle className="rose-dew" cx="70" cy="27" r="2.1" fill="#eefaff" opacity="0.78" style={{ animationDelay: '900ms' }} />
          <circle className="rose-dew" cx="78" cy="44" r="1.9" fill="#eefaff" opacity="0.72" style={{ animationDelay: '1500ms' }} />
        </svg>

        <div className="sticker-overlay">
          <span className="rose-floating-petal rose-floating-left" />
          <span className="rose-floating-petal rose-floating-right" />
        </div>
      </div>
    </div>
  );
};

const HeartSticker = ({ selected }: { selected: boolean }) => {
  const id = useId().replace(/:/g, '');
  const heartGradient = `heartGradient${id}`;
  const heartGlow = `heartGlow${id}`;
  const heartShade = `heartShade${id}`;
  const heartGoldRim = `heartGoldRim${id}`;
  const heartCrystal = `heartCrystal${id}`;

  return (
    <div className={`sticker-visual ${selected ? 'is-selected' : ''}`}>
      <div className="sticker-scene heart-float">
        <svg viewBox="0 0 120 120" className="sticker-svg" aria-hidden="true">
          <defs>
            <linearGradient id={heartGradient} x1="15%" y1="10%" x2="85%" y2="90%">
              <stop offset="0%" stopColor="#ffd6e3" />
              <stop offset="36%" stopColor="#ff6f9a" />
              <stop offset="72%" stopColor="#ec3c6f" />
              <stop offset="100%" stopColor="#b51f4a" />
            </linearGradient>
            <radialGradient id={heartGlow} cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#fff7fb" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#ffe6f0" stopOpacity="0.62" />
              <stop offset="100%" stopColor="#ffc3d5" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={heartShade} cx="50%" cy="82%" r="58%">
              <stop offset="0%" stopColor="#8f1d44" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#8f1d44" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={heartGoldRim} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f6d785" />
              <stop offset="35%" stopColor="#fff4cc" />
              <stop offset="68%" stopColor="#d8ae54" />
              <stop offset="100%" stopColor="#a27424" />
            </linearGradient>
            <linearGradient id={heartCrystal} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fff7fb" />
              <stop offset="34%" stopColor="#ffdce8" />
              <stop offset="74%" stopColor="#ff83a9" />
              <stop offset="100%" stopColor="#d34273" />
            </linearGradient>
          </defs>

          <g className="heart-core">
            <ellipse cx="60" cy="60" rx="40" ry="38" fill={`url(#${heartGlow})`} />
            <path
              d="M60 96C32 78 16 59 16 38C16 23 27 14 40 14c10 0 17 5 20 13 3-8 10-13 20-13 13 0 24 9 24 24 0 21-16 40-44 58z"
              fill={`url(#${heartGoldRim})`}
            />
            <path
              d="M60 90C35 74 22 57 22 39c0-12 8-18 18-18 9 0 15 5 20 13 5-8 11-13 20-13 10 0 18 6 18 18 0 18-13 35-38 51z"
              fill={`url(#${heartCrystal})`}
            />
            <path
              d="M60 96C32 78 16 59 16 38C16 23 27 14 40 14c10 0 17 5 20 13 3-8 10-13 20-13 13 0 24 9 24 24 0 21-16 40-44 58z"
              fill={`url(#${heartShade})`}
            />
            <path d="M37 22c9-6 20-3 26 7" stroke="#fff8fb" strokeWidth="5.5" strokeLinecap="round" fill="none" opacity="0.82" />
            <path d="M69 27c7 5 10 10 12 18" stroke="#ffd3df" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.62" />
            <path d="M31 56c11 12 26 21 29 23" stroke="#ff9fbc" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.26" />
            <ellipse cx="72" cy="78" rx="18" ry="10" fill="#981a43" opacity="0.16" transform="rotate(-15 72 78)" />
            <path d="M30 43c10 1 20 0 31-6" stroke="#fff9df" strokeWidth="2.3" strokeLinecap="round" fill="none" opacity="0.72" />
            <ellipse className="luxury-glint" cx="45" cy="46" rx="8" ry="24" fill="#fff9e6" transform="rotate(18 45 46)" opacity="0.78" />
            <path d="M64 39l9 11-11 2z" fill="#fff8fc" opacity="0.78" />
            <path d="M57 64l13 6-10 8z" fill="#ffbfd1" opacity="0.42" />
          </g>
        </svg>

        <div className="sticker-overlay">
          <span className="heart-sparkle heart-sparkle-a" />
          <span className="heart-sparkle heart-sparkle-b" />
          <span className="heart-sparkle heart-sparkle-c" />
        </div>
      </div>
    </div>
  );
};

const BellSticker = ({ selected }: { selected: boolean }) => {
  const id = useId().replace(/:/g, '');
  const goldGradient = `bellGold${id}`;
  const goldDarkGradient = `bellGoldDark${id}`;
  const ribbonGradient = `bellRibbon${id}`;
  const bellInnerGradient = `bellInner${id}`;
  const bellGlow = `bellGlow${id}`;
  const satinGradient = `bellSatin${id}`;

  return (
    <div className={`sticker-visual ${selected ? 'is-selected' : ''}`}>
      <div className="sticker-scene bell-float">
        <svg viewBox="0 0 120 120" className="sticker-svg bell-swing" aria-hidden="true">
          <defs>
            <linearGradient id={goldGradient} x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#fff2b0" />
              <stop offset="35%" stopColor="#ffd55d" />
              <stop offset="72%" stopColor="#e2a82d" />
              <stop offset="100%" stopColor="#996213" />
            </linearGradient>
            <linearGradient id={goldDarkGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f9dd8a" />
              <stop offset="100%" stopColor="#b57a19" />
            </linearGradient>
            <linearGradient id={ribbonGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffd8de" />
              <stop offset="38%" stopColor="#f57497" />
              <stop offset="100%" stopColor="#c94263" />
            </linearGradient>
            <linearGradient id={bellInnerGradient} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#a96b16" />
              <stop offset="100%" stopColor="#5b3508" />
            </linearGradient>
            <radialGradient id={bellGlow} cx="46%" cy="35%" r="58%">
              <stop offset="0%" stopColor="#fff6d1" stopOpacity="0.96" />
              <stop offset="48%" stopColor="#ffeaa1" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#ffeaa1" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={satinGradient} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffe7ef" />
              <stop offset="34%" stopColor="#ef87a5" />
              <stop offset="70%" stopColor="#d1567c" />
              <stop offset="100%" stopColor="#9f3657" />
            </linearGradient>
          </defs>

          <ellipse cx="60" cy="84" rx="28" ry="7" fill="#8b5b11" opacity="0.18" />
          <path d="M49 24 36 36c8 6 17 7 24 3-1-8-4-12-11-15z" fill={`url(#${satinGradient})`} />
          <path d="M71 24 84 36c-8 6-17 7-24 3 1-8 4-12 11-15z" fill={`url(#${satinGradient})`} />
          <path d="M42 28c4 3 8 5 12 5" stroke="#fff4f7" strokeWidth="1.6" strokeLinecap="round" opacity="0.78" />
          <path d="M78 28c-4 3-8 5-12 5" stroke="#fff4f7" strokeWidth="1.6" strokeLinecap="round" opacity="0.78" />
          <circle cx="60" cy="25" r="9" fill={`url(#${ribbonGradient})`} />
          <rect x="54" y="25" width="12" height="10" rx="5" fill="#d84c72" opacity="0.72" />
          <rect x="52" y="31" width="16" height="10" rx="4" fill={`url(#${goldDarkGradient})`} />
          <ellipse cx="58" cy="57" rx="30" ry="29" fill={`url(#${bellGlow})`} />
          <path d="M33 77c0-24 12-38 27-38s27 14 27 38H33z" fill={`url(#${goldGradient})`} />
          <path d="M35 77c4-18 19-31 26-33 10-3 23 5 26 33" stroke="#8b5f11" strokeWidth="1.6" fill="none" opacity="0.34" />
          <path d="M41 51c4-5 9-8 16-9" stroke="#fff2c7" strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.76" />
          <path d="M56 41c9 1 16 8 19 18" stroke="#fff7d9" strokeWidth="2.2" strokeLinecap="round" fill="none" opacity="0.56" />
          <path d="M44 44c-2 10-2 20-1 30" stroke="#f8df90" strokeWidth="1.2" fill="none" opacity="0.5" />
          <path d="M76 44c2 10 2 20 1 30" stroke="#8f5d14" strokeWidth="1.1" fill="none" opacity="0.24" />
          <path d="M37 77h46c-3 10-11 15-23 15S40 87 37 77z" fill={`url(#${bellInnerGradient})`} opacity="0.88" />
          <path d="M33 77h54c-3 8-11 13-27 13S36 85 33 77z" fill={`url(#${goldDarkGradient})`} />
          <ellipse cx="60" cy="90" rx="11" ry="5" fill="#c2861d" opacity="0.78" />
          <path d="M60 77v15" stroke="#8f5d14" strokeWidth="4" strokeLinecap="round" />
          <circle cx="60" cy="93" r="6" fill="#b9781b" />
          <circle cx="58.5" cy="91.5" r="2.2" fill="#fff0b8" opacity="0.7" />
          <ellipse className="bell-shine" cx="48" cy="62" rx="9" ry="23" fill="#fff6cf" transform="rotate(12 48 62)" />
          <ellipse className="luxury-glint" cx="67" cy="61" rx="5" ry="19" fill="#fff8d8" transform="rotate(-8 67 61)" opacity="0.56" />
        </svg>

        <div className="sticker-overlay">
          <span className="bell-ring bell-ring-left" />
          <span className="bell-ring bell-ring-right" />
        </div>
      </div>
    </div>
  );
};

const FireworksSticker = ({ selected }: { selected: boolean }) => {
  const id = useId().replace(/:/g, '');
  const coreGradient = `fireworkCore${id}`;
  const smokeGradient = `fireworkSmoke${id}`;
  const petalTrailGradient = `fireworkPetalTrail${id}`;
  const haloGradient = `fireworkHalo${id}`;

  return (
    <div className={`sticker-visual ${selected ? 'is-selected' : ''}`}>
      <div className="sticker-scene fireworks-float">
        <svg viewBox="0 0 120 120" className="sticker-svg" aria-hidden="true">
          <defs>
            <radialGradient id={coreGradient} cx="50%" cy="50%" r="55%">
              <stop offset="0%" stopColor="#fffdf4" />
              <stop offset="40%" stopColor="#ffe7ab" />
              <stop offset="100%" stopColor="#ff9e51" />
            </radialGradient>
            <radialGradient id={smokeGradient} cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor="#fff4cb" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ffdca2" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ffdca2" stopOpacity="0" />
            </radialGradient>
            <linearGradient id={petalTrailGradient} x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor="#fff7e9" />
              <stop offset="35%" stopColor="#ffd9a8" />
              <stop offset="72%" stopColor="#f2a06d" />
              <stop offset="100%" stopColor="#d36882" />
            </linearGradient>
            <radialGradient id={haloGradient} cx="50%" cy="48%" r="60%">
              <stop offset="0%" stopColor="#fffef0" stopOpacity="0.95" />
              <stop offset="45%" stopColor="#ffe7b2" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#ffd785" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle className="fireworks-smoke" cx="60" cy="58" r="30" fill={`url(#${smokeGradient})`} />
          <g className="fireworks-trail">
            <path d="M60 88C60 78 60 69 60 58" stroke={`url(#${petalTrailGradient})`} strokeWidth="4.6" strokeLinecap="round" opacity="0.96" />
            <path d="M60 82c-4 5-7 10-8 14" stroke="#ffe7be" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.76" />
            <path d="M60 81c4 5 7 10 8 14" stroke="#fff4db" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.72" />
            <circle cx="60" cy="58" r="4" fill="#fff8d6" opacity="0.88" />
          </g>
          <g className="fireworks-burst-main">
            {FIREWORK_SHELLS.map((shell) => {
              const rad = (shell.angle * Math.PI) / 180;
              const tipX = 60 + Math.sin(rad) * shell.radius;
              const tipY = 58 - Math.cos(rad) * shell.radius;
              const controlX = 60 + Math.sin(rad) * shell.radius * 0.38;
              const controlY = 58 - Math.cos(rad) * shell.radius * 0.52 - 9;
              const endControlX = tipX - Math.sin(rad) * 9;
              const endControlY = tipY + 12;
              const arcPath = `M60 58 C ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endControlX.toFixed(1)} ${endControlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`;

              return (
                <g key={`main-shell-${shell.angle}`} className="fireworks-shell">
                  <path d={arcPath} stroke={shell.color} strokeWidth={shell.width} strokeLinecap="round" fill="none" opacity="0.94" />
                  <path d={arcPath} stroke="#fff7e7" strokeWidth="1.1" strokeLinecap="round" fill="none" opacity="0.42" />
                  <circle className="fireworks-shell-tip" cx={tipX} cy={tipY} r={shell.width + 0.9} fill={shell.tip} opacity="0.96" />
                  <circle className="fireworks-shell-tip" cx={tipX} cy={tipY} r={shell.width + 2.8} fill={shell.color} opacity="0.2" />
                </g>
              );
            })}
            {FIREWORK_SPARKS.map((particle) => (
              <circle
                key={`main-particle-${particle.x}-${particle.y}`}
                className="fireworks-particle"
                cx={particle.x}
                cy={particle.y}
                r={particle.radius}
                fill={particle.color}
                style={{ animationDelay: particle.delay }}
              />
            ))}
          </g>

          <g className="fireworks-burst-second">
            {FIREWORK_SHELLS.filter((_, index) => index % 2 === 0).map((shell) => {
              const adjustedAngle = shell.angle * 0.78;
              const rad = (adjustedAngle * Math.PI) / 180;
              const radius = shell.radius * 0.72;
              const tipX = 60 + Math.sin(rad) * radius;
              const tipY = 58 - Math.cos(rad) * radius;
              const controlX = 60 + Math.sin(rad) * radius * 0.34;
              const controlY = 58 - Math.cos(rad) * radius * 0.5 - 6;
              const endControlX = tipX - Math.sin(rad) * 6;
              const endControlY = tipY + 8;
              const arcPath = `M60 58 C ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endControlX.toFixed(1)} ${endControlY.toFixed(1)} ${tipX.toFixed(1)} ${tipY.toFixed(1)}`;

              return (
                <g key={`second-shell-${shell.angle}`} className="fireworks-shell">
                  <path d={arcPath} stroke={shell.tip} strokeWidth={shell.width - 1.2} strokeLinecap="round" fill="none" opacity="0.88" />
                  <circle className="fireworks-shell-tip" cx={tipX} cy={tipY} r={shell.width + 0.3} fill="#fffdf4" opacity="0.9" />
                </g>
              );
            })}
          </g>

          <circle cx="60" cy="58" r="18" fill={`url(#${haloGradient})`} opacity="0.6" />
          <circle cx="60" cy="58" r="10.5" fill={`url(#${coreGradient})`} />
          <circle cx="60" cy="58" r="4.8" fill="#fff8de" opacity="0.95" />
          <circle className="rose-dew" cx="79" cy="46" r="1.8" fill="#fff7f2" opacity="0.82" style={{ animationDelay: '800ms' }} />
          <circle className="rose-dew" cx="42" cy="33" r="1.6" fill="#fff7f2" opacity="0.72" style={{ animationDelay: '1400ms' }} />
        </svg>

        <div className="sticker-overlay">
          <span className="fireworks-ring" />
          <span className="fireworks-ring fireworks-ring-secondary" />
        </div>
      </div>
    </div>
  );
};

export const AnimatedSticker = ({ type, selected = false }: AnimatedStickerProps) => {
  if (type === 'rose') return <RoseSticker selected={selected} />;
  if (type === 'heart') return <HeartSticker selected={selected} />;
  if (type === 'bell') return <BellSticker selected={selected} />;
  return <FireworksSticker selected={selected} />;
};
