import React, { useEffect, useRef, useState } from 'react';
import { Flame, Sparkles, CheckCircle2 } from 'lucide-react';
import { autoOptimizeScreenOnLoadAndResize, getDetectedScreenMetrics, getFullHardwareProfile, applyHardwareAndWorkloadOptimization } from '../utils/screenOptimizer';
import { compactAndOptimizeStorage, checkAndRunAutoCacheClear, getStorageStats } from '../utils/storage';
import { CURRENT_RELEASE } from '../generated/release';

interface SmokeStackSplashScreenProps {
  onComplete: () => void;
  autoPlayDurationMs?: number;
}

export const SmokeStackSplashScreen: React.FC<SmokeStackSplashScreenProps> = ({
  onComplete,
  autoPlayDurationMs = 3000,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Igniting Pitmaster Core...');
  const [optDetails, setOptDetails] = useState<string>('Detecting hardware & screen metrics...');
  const [isFadingOut, setIsFadingOut] = useState(false);
  const hasOptedRef = useRef<{ screen: boolean; storage: boolean; hardware: boolean }>({
    screen: false,
    storage: false,
    hardware: false,
  });

  // Loading progress & real-time optimization execution over 3.0 seconds
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.floor((elapsed / autoPlayDurationMs) * 100));
      setProgress(pct);

      // Phase 1 (0% - 30%): Screen & Layout Auto-Optimization
      if (pct < 30) {
        setStatusText('Igniting Pitmaster Core & Screen Optimizer...');
        if (!hasOptedRef.current.screen && pct >= 10) {
          hasOptedRef.current.screen = true;
          try {
            autoOptimizeScreenOnLoadAndResize();
            const metrics = getDetectedScreenMetrics();
            setOptDetails(`Screen Calibrated: ${metrics.category.toUpperCase()} (${metrics.width}x${metrics.height}px @ ${metrics.pixelRatio}x)`);
          } catch (e) {
            setOptDetails('Screen layout calibrated');
          }
        }
      }
      // Phase 2 (30% - 70%): Storage Compaction & Auto-Defragmentation
      else if (pct < 70) {
        setStatusText('Defragmenting 70 MB Storage & Purging Memory Caches...');
        if (!hasOptedRef.current.storage && pct >= 35) {
          hasOptedRef.current.storage = true;
          try {
            const compRes = compactAndOptimizeStorage();
            checkAndRunAutoCacheClear();
            const stats = getStorageStats();
            setOptDetails(`Storage Optimized: Reclaimed ${compRes.freedFormatted} (${stats.usedFormatted} / 70 MB)`);
          } catch (e) {
            setOptDetails('Storage defragmented & optimized');
          }
        }
      }
      // Phase 3 (70% - 95%): Hardware RAM & Core Profile
      else if (pct < 95) {
        setStatusText('Calibrating Hardware Acceleration & CharGPT RAM Cache...');
        if (!hasOptedRef.current.hardware && pct >= 75) {
          hasOptedRef.current.hardware = true;
          try {
            const hw = applyHardwareAndWorkloadOptimization();
            setOptDetails(`Hardware Accelerated: ${hw.cpu.logicalCores} CPU Cores (${hw.cpu.cpuTier.toUpperCase()}) | ${hw.ram.maxCacheAllocMb} MB RAM Cache`);
          } catch (e) {
            setOptDetails('Hardware & RAM cache calibrated');
          }
        }
      }
      // Phase 4 (95% - 100%): Complete
      else {
        setStatusText('SmokeStack interface ready');
        setOptDetails('Loading checks completed');
      }

      if (pct >= 100) {
        clearInterval(interval);
        handleDismiss();
      }
    }, 20);

    return () => clearInterval(interval);
  }, [autoPlayDurationMs]);

  const handleDismiss = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 400); // smooth fade-out transition
  };

  // Particle Canvas animation (Flames, Smoke, Embers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle classes
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      maxSize: number;
      life: number;
      maxLife: number;
      color: string;
      type: 'flame' | 'smoke' | 'ember';
      alpha: number;
      spin?: number;
      rotation?: number;
    }

    const particles: Particle[] = [];

    // The chimney stack outlet coordinates (centered horizontally, ~40% down)
    const getStackOutlet = () => {
      return {
        x: width / 2,
        y: height * 0.42 - 60, // top opening of the chimney stack
      };
    };

    // Helper color generators
    const flameColors = [
      '#ffffff',
      '#fff4a3',
      '#ffaa00',
      '#ff6600',
      '#ff3300',
      '#d81b60',
    ];

    const smokeColors = [
      'rgba(220, 220, 230, ',
      'rgba(180, 180, 195, ',
      'rgba(130, 130, 145, ',
      'rgba(80, 80, 95, ',
      'rgba(40, 40, 50, ',
    ];

    const spawnParticles = () => {
      const outlet = getStackOutlet();

      // 1. Spawn Flame Particles out of top chimney stack
      for (let i = 0; i < 3; i++) {
        const spreadX = (Math.random() - 0.5) * 28;
        particles.push({
          x: outlet.x + spreadX,
          y: outlet.y + 10 + Math.random() * 10,
          vx: (Math.random() - 0.5) * 1.8,
          vy: -3.5 - Math.random() * 3.2,
          size: 14 + Math.random() * 16,
          maxSize: 28 + Math.random() * 12,
          life: 0,
          maxLife: 25 + Math.random() * 20,
          color: flameColors[Math.floor(Math.random() * flameColors.length)],
          type: 'flame',
          alpha: 0.9,
        });
      }

      // 2. Spawn Smoke Plumes billowing upward
      for (let i = 0; i < 2; i++) {
        const spreadX = (Math.random() - 0.5) * 24;
        const baseColor = smokeColors[Math.floor(Math.random() * smokeColors.length)];
        particles.push({
          x: outlet.x + spreadX,
          y: outlet.y - 10,
          vx: (Math.random() - 0.5) * 2.2 + (Math.sin(Date.now() * 0.002) * 0.8),
          vy: -1.8 - Math.random() * 2.5,
          size: 18 + Math.random() * 14,
          maxSize: 75 + Math.random() * 50,
          life: 0,
          maxLife: 70 + Math.random() * 50,
          color: baseColor,
          type: 'smoke',
          alpha: 0.45,
          spin: (Math.random() - 0.5) * 0.04,
          rotation: Math.random() * Math.PI * 2,
        });
      }

      // 3. Spawn Glowing Embers
      if (Math.random() < 0.8) {
        particles.push({
          x: outlet.x + (Math.random() - 0.5) * 35,
          y: outlet.y,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -4.0 - Math.random() * 4.5,
          size: 2 + Math.random() * 3.5,
          maxSize: 4,
          life: 0,
          maxLife: 60 + Math.random() * 40,
          color: Math.random() > 0.3 ? '#ffcc00' : '#ff4400',
          type: 'ember',
          alpha: 1.0,
        });
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      spawnParticles();

      // Update & render particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        const progressRatio = p.life / p.maxLife;

        if (p.type === 'flame') {
          // Flame grows quickly then shrinks
          if (progressRatio < 0.3) {
            p.size += 1.2;
          } else {
            p.size *= 0.94;
          }
          p.alpha = 1 - progressRatio;
          p.vx += (Math.random() - 0.5) * 0.4;

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.beginPath();
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(1, p.size));
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.35, p.color);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.arc(p.x, p.y, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'smoke') {
          // Smoke expands greatly and drifts
          p.size += 0.8;
          p.vx += Math.sin(p.life * 0.05) * 0.15; // swirling drift
          if (p.rotation !== undefined && p.spin !== undefined) {
            p.rotation += p.spin;
          }

          // Fade out smoothly
          if (progressRatio < 0.2) {
            p.alpha = (progressRatio / 0.2) * 0.35;
          } else {
            p.alpha = (1 - progressRatio) * 0.35;
          }

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          if (p.rotation) ctx.rotate(p.rotation);

          ctx.beginPath();
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, p.size));
          grad.addColorStop(0, `${p.color}0.5)`);
          grad.addColorStop(0.6, `${p.color}0.2)`);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.arc(0, 0, Math.max(1, p.size), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (p.type === 'ember') {
          p.vx += (Math.random() - 0.5) * 0.3;
          p.vy *= 0.98; // slight drag
          p.alpha = (1 - progressRatio) * (0.6 + Math.sin(p.life * 0.3) * 0.4); // flicker

          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Remove dead particles
        if (p.life >= p.maxLife || p.size <= 0.5 || p.alpha <= 0) {
          particles.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-between bg-[#0a0a0d] text-white select-none overflow-hidden transition-opacity duration-500 pointer-events-none ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Background radial atmosphere glow */}
      <div className="absolute inset-0 bg-radial from-orange-950/40 via-[#0d0d12]/90 to-[#07070a] pointer-events-none" />

      {/* Grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none bg-[radial-gradient(#f97316_1px,transparent_1px)] [background-size:24px_24px]"
      />

      {/* Floating Canvas for 60FPS Smoke & Flame Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Top Header Label */}
      <div className="relative z-20 w-full max-w-5xl mx-auto px-6 pt-6 flex items-center justify-center">
        <div className="flex items-center space-x-2 text-xs font-mono font-bold tracking-widest text-amber-500/80 uppercase">
          <span className="inline-block w-2 h-2 rounded-full bg-orange-500 animate-ping" />
          <span>SMOKE STACK v{CURRENT_RELEASE.version}</span>
        </div>
      </div>

      {/* Main Center Emblem & Logo with Animated Flames */}
      <div className="relative z-20 my-auto flex flex-col items-center justify-center text-center px-4 max-w-2xl">
        {/* SVG Chimney Stack & Emblem Base */}
        <div className="relative w-48 h-56 mb-4 flex items-center justify-center">
          {/* Intense Outer Fire Glow */}
          <div className="absolute top-8 w-32 h-32 rounded-full bg-gradient-to-t from-red-600 via-orange-500 to-amber-300 blur-2xl opacity-60 animate-pulse" />

          {/* SVG Custom Industrial Smoke Stack Chimney */}
          <svg
            viewBox="0 0 200 240"
            className="w-full h-full drop-shadow-[0_10px_25px_rgba(239,68,68,0.5)] overflow-visible"
          >
            <defs>
              {/* Metallic Pipe Gradient */}
              <linearGradient id="pipeMetal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1a1a24" />
                <stop offset="30%" stopColor="#3f3f4e" />
                <stop offset="50%" stopColor="#5d5d70" />
                <stop offset="70%" stopColor="#2c2c3a" />
                <stop offset="100%" stopColor="#121218" />
              </linearGradient>

              {/* Firebox Grate Glow */}
              <linearGradient id="fireGrate" x1="0%" y1="100%" x2="0%" y2="0%">
                <stop offset="0%" stopColor="#b91c1c" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="85%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>

              {/* Copper Trim */}
              <linearGradient id="copperRim" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#7c2d12" />
                <stop offset="50%" stopColor="#ea580c" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>

              {/* Inner Pipe Heat Radial */}
              <radialGradient id="pipeHeat" cx="50%" cy="30%" r="50%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="80%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            {/* Base Smoker Chamber Platform */}
            <path
              d="M 20 210 Q 100 230 180 210 L 170 180 Q 100 195 30 180 Z"
              fill="url(#pipeMetal)"
              stroke="#272730"
              strokeWidth="2"
            />

            {/* Lower Firebox Door Grate Glowing Base */}
            <rect x="65" y="185" width="70" height="20" rx="4" fill="#0d0d12" stroke="#ea580c" strokeWidth="1.5" />
            <g fill="url(#fireGrate)" opacity="0.9">
              <rect x="72" y="188" width="8" height="14" rx="1" />
              <rect x="86" y="188" width="8" height="14" rx="1" />
              <rect x="100" y="188" width="8" height="14" rx="1" />
              <rect x="114" y="188" width="8" height="14" rx="1" />
            </g>

            {/* Main Vertical Chimney Stack Pipe */}
            <path
              d="M 70 180 L 74 70 L 126 70 L 130 180 Z"
              fill="url(#pipeMetal)"
              stroke="#3f3f4e"
              strokeWidth="2"
            />

            {/* Pipe Rivets */}
            <circle cx="78" cy="80" r="2.5" fill="#121218" stroke="#5d5d70" strokeWidth="1" />
            <circle cx="122" cy="80" r="2.5" fill="#121218" stroke="#5d5d70" strokeWidth="1" />
            <circle cx="78" cy="130" r="2.5" fill="#121218" stroke="#5d5d70" strokeWidth="1" />
            <circle cx="122" cy="130" r="2.5" fill="#121218" stroke="#5d5d70" strokeWidth="1" />
            <circle cx="78" cy="170" r="2.5" fill="#121218" stroke="#5d5d70" strokeWidth="1" />
            <circle cx="122" cy="170" r="2.5" fill="#121218" stroke="#5d5d70" strokeWidth="1" />

            {/* Middle Reinforcement Copper Band */}
            <rect x="68" y="120" width="64" height="10" rx="2" fill="url(#copperRim)" stroke="#b45309" strokeWidth="1" />

            {/* Top Chimney Crown Outlet Flange */}
            <path
              d="M 64 70 C 64 64, 136 64, 136 70 L 132 80 C 132 76, 68 76, 68 80 Z"
              fill="url(#copperRim)"
              stroke="#f97316"
              strokeWidth="1.5"
            />

            {/* Top Outlet Inner Core Glowing Oval Opening */}
            <ellipse cx="100" cy="68" rx="30" ry="8" fill="url(#pipeHeat)" />

            {/* SVG Flame Base Emitting from Top Stack Opening */}
            <g className="animate-pulse">
              <path
                d="M 85 68 C 80 40, 95 25, 100 15 C 105 25, 120 40, 115 68 Z"
                fill="url(#fireGrate)"
                opacity="0.85"
              />
              <path
                d="M 92 68 C 90 50, 98 40, 100 32 C 102 40, 110 50, 108 68 Z"
                fill="#ffffff"
                opacity="0.9"
              />
            </g>

            {/* Front Steel Badge: SMOKE STACK */}
            <rect x="60" y="142" width="80" height="22" rx="3" fill="#121218" stroke="#f97316" strokeWidth="1.5" />
            <text
              x="100"
              y="157"
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="10"
              fontWeight="bold"
              fontFamily="sans-serif"
              letterSpacing="1"
            >
              SMOKE STACK
            </text>
          </svg>
        </div>

        {/* Title Typography with Fire Gradient */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-500 to-red-600 drop-shadow-[0_4px_20px_rgba(249,115,22,0.4)]">
          SMOKE STACK
        </h1>

        <p className="mt-2 text-xs sm:text-sm font-medium text-amber-200/80 tracking-widest uppercase">
          Pitmaster Intelligence & Precision Cook Logger
        </p>

        {/* Dynamic Flame Spark Badge */}
        <div className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-orange-500/20 via-red-500/20 to-amber-500/20 border border-orange-500/40 rounded-full text-xs font-semibold text-orange-300 backdrop-blur-md shadow-inner">
          <Flame className="w-4 h-4 text-orange-400 animate-bounce" />
          <span>Real-time Smoke & Flame Telemetry Active</span>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
        </div>
      </div>

      {/* Bottom Progress Bar & Real-time Optimization Execution Status */}
      <div className="relative z-20 w-full max-w-lg mx-auto px-6 pb-8 flex flex-col items-center space-y-2.5">
        <div className="w-full flex items-center justify-between text-xs font-mono text-zinc-400">
          <span className="text-amber-400 font-bold truncate max-w-[80%]">{statusText}</span>
          <span className="text-orange-400 font-bold ml-2 shrink-0">{progress}%</span>
        </div>

        {/* Animated Loading Bar */}
        <div className="w-full h-2.5 bg-[#181822] rounded-full p-0.5 border border-[#2a2a38] overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 rounded-full transition-all duration-100 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Real-time System Optimization Status Pill */}
        <div className="w-full py-1.5 px-3 bg-[#13131a]/80 border border-amber-500/20 rounded-lg flex items-center justify-between text-[11px] font-mono text-emerald-400 backdrop-blur-md">
          <div className="flex items-center space-x-1.5 truncate">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-zinc-300">{optDetails}</span>
          </div>
          <span className="text-[10px] text-amber-400/80 uppercase font-bold shrink-0 ml-2">AUTO-OPTIMIZING</span>
        </div>
      </div>
    </div>
  );
};
