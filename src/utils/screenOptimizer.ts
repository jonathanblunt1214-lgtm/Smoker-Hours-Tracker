export interface ScreenOptimizerConfig {
  confirmedWidth: number;
  confirmedHeight: number;
  deviceCategory: 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
  uiScale: number; // e.g. 0.9, 1.0, 1.1
  touchTargetMinPx: number; // e.g. 44 for mobile, 36 for desktop
  customFontSize: 'sm' | 'base' | 'lg';
  autoConfirmedAt?: string;
  isConfirmed: boolean;
}

export interface DetectedScreenMetrics {
  width: number;
  height: number;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
  category: 'mobile' | 'tablet' | 'desktop' | 'ultrawide';
  recommendedScale: number;
  recommendedTouchTarget: number;
}

const STORAGE_KEY = 'pitmaster_screen_optimizer_config_v1';

export function getDetectedScreenMetrics(): DetectedScreenMetrics {
  const width = window.innerWidth || document.documentElement.clientWidth || 1280;
  const height = window.innerHeight || document.documentElement.clientHeight || 800;
  const pixelRatio = window.devicePixelRatio || 1;
  const orientation = width < height ? 'portrait' : 'landscape';

  let category: 'mobile' | 'tablet' | 'desktop' | 'ultrawide' = 'desktop';
  let recommendedScale = 1.0;
  let recommendedTouchTarget = 36;

  if (width < 640) {
    category = 'mobile';
    recommendedScale = width < 380 ? 0.9 : 0.95;
    recommendedTouchTarget = 44;
  } else if (width < 1024) {
    category = 'tablet';
    recommendedScale = 1.0;
    recommendedTouchTarget = 40;
  } else if (width < 1536) {
    category = 'desktop';
    recommendedScale = 1.0;
    recommendedTouchTarget = 36;
  } else {
    category = 'ultrawide';
    recommendedScale = 1.05;
    recommendedTouchTarget = 36;
  }

  return {
    width,
    height,
    pixelRatio,
    orientation,
    category,
    recommendedScale,
    recommendedTouchTarget,
  };
}

export function loadSavedScreenOptimizerConfig(): ScreenOptimizerConfig {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.confirmedWidth === 'number') {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load screen optimizer config', e);
  }

  const detected = getDetectedScreenMetrics();
  return {
    confirmedWidth: detected.width,
    confirmedHeight: detected.height,
    deviceCategory: detected.category,
    uiScale: detected.recommendedScale,
    touchTargetMinPx: detected.recommendedTouchTarget,
    customFontSize: 'base',
    isConfirmed: false,
  };
}

export function saveScreenOptimizerConfig(config: ScreenOptimizerConfig): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
  } catch (e) {
    console.error('Failed to save screen optimizer config', e);
  }
}

export function applyConfirmedScreenOptimization(config: ScreenOptimizerConfig): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const width = config.confirmedWidth;
  const scale = config.uiScale || 1.0;
  const touchMin = config.touchTargetMinPx || 44;

  root.style.setProperty('--app-viewport-width', `${width}px`);
  root.style.setProperty('--app-ui-scale', `${scale}`);
  root.style.setProperty('--app-touch-target-min', `${touchMin}px`);

  root.setAttribute('data-screen-width', `${width}`);
  root.setAttribute('data-device-category', config.deviceCategory);
  root.setAttribute('data-layout-optimized', config.isConfirmed ? 'true' : 'false');

  let styleEl = document.getElementById('dynamic-screen-optimizer-css') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-screen-optimizer-css';
    document.head.appendChild(styleEl);
  }

  const fontScaleFactor = scale;
  const containerMaxWidth = width > 1600 ? '1536px' : width > 1200 ? '1280px' : '100%';
  const paddingX = width < 640 ? '0.75rem' : width < 1024 ? '1.25rem' : '1.75rem';

  styleEl.textContent = `
    /* Dynamic Screen Optimizer CSS generated for confirmed width: ${width}px */
    :root {
      --confirmed-screen-width: ${width}px;
      --app-font-scale: ${fontScaleFactor};
      --app-container-padding-x: ${paddingX};
    }

    [data-layout-optimized="true"] button,
    [data-layout-optimized="true"] input,
    [data-layout-optimized="true"] select {
      min-height: max(${touchMin}px, 2rem);
    }

    [data-layout-optimized="true"] .optimized-container {
      max-width: ${containerMaxWidth};
      padding-left: var(--app-container-padding-x);
      padding-right: var(--app-container-padding-x);
      margin-left: auto;
      margin-right: auto;
    }

    @media (max-width: ${width}px) {
      .responsive-grid-optimized {
        grid-template-columns: ${width < 640 ? '1fr' : width < 1024 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)'};
      }
    }
  `;

  saveScreenOptimizerConfig(config);
}

export function autoOptimizeScreenOnLoadAndResize(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const runAutoOptimization = () => {
    const metrics = getDetectedScreenMetrics();
    const config: ScreenOptimizerConfig = {
      confirmedWidth: metrics.width,
      confirmedHeight: metrics.height,
      deviceCategory: metrics.category,
      uiScale: metrics.recommendedScale,
      touchTargetMinPx: metrics.recommendedTouchTarget,
      customFontSize: 'base',
      isConfirmed: true,
      autoConfirmedAt: new Date().toISOString(),
    };
    applyConfirmedScreenOptimization(config);
  };

  runAutoOptimization();
  applyHardwareAndWorkloadOptimization();

  window.addEventListener('resize', runAutoOptimization);
  window.addEventListener('orientationchange', runAutoOptimization);

  return () => {
    window.removeEventListener('resize', runAutoOptimization);
    window.removeEventListener('orientationchange', runAutoOptimization);
  };
}

/* ============================================================================
   BROWSER HARDWARE CAPABILITY & PERFORMANCE POLICY ENGINE
   ============================================================================ */

export interface CpuHardwareInfo {
  logicalCores: number;
  architecture: string;
  cpuTier: 'low' | 'medium' | 'high';
  flopsScoreMs: number;
  opsPerSecFormatted: string;
  optimizationStrategy: string;
}

export interface GpuHardwareInfo {
  hasHardwareGpu: boolean;
  gpuName: string;
  gpuVendor: string;
  gpuTier: 'dedicated' | 'integrated' | 'software' | 'unsupported';
  maxTextureSize: number;
  webgpuSupported: boolean;
  accelerationEnabled: boolean;
  optimizationStrategy: string;
}

export interface RamHardwareInfo {
  capacityGb: number;
  ramTier: 'low' | 'medium' | 'high';
  maxCacheAllocMb: number;
  optimizationStrategy: string;
  isEstimated?: boolean;
}

export interface WorkloadTaskAssignment {
  cpuTasks: string[];
  gpuTasks: string[];
  ramTasks: string[];
  summary: string;
  recommendedMode: 'high_performance' | 'balanced' | 'power_saver';
}

export interface FullHardwareProfile {
  cpu: CpuHardwareInfo;
  gpu: GpuHardwareInfo;
  ram: RamHardwareInfo;
  workload: WorkloadTaskAssignment;
  benchmarkedAt: string;
}

// v2 intentionally invalidates older profiles that contained simulated workload claims.
const HARDWARE_PROFILE_STORAGE_KEY = 'pitmaster_hardware_profile_v2';

/**
 * Runs a short main-thread math benchmark. This is a browser performance sample,
 * not a physical CPU FLOPS measurement.
 */
export function runCpuFlopsBenchmark(): { scoreMs: number; opsPerSecFormatted: string } {
  const iterations = 150000;
  const now = typeof performance !== 'undefined' ? () => performance.now() : () => Date.now();
  const start = now();
  let dummy = 0;

  for (let i = 0; i < iterations; i++) {
    dummy += Math.sin(i) * Math.cos(i) + Math.sqrt(i + 1);
  }

  // Keep the calculation observable to the engine without exposing it to the UI.
  if (!Number.isFinite(dummy)) {
    console.warn('Hardware benchmark produced a non-finite result');
  }

  const duration = Math.max(0.1, now() - start);
  const opsPerSec = Math.round((iterations / duration) * 1000);

  let opsFormatted = `${(opsPerSec / 1000000).toFixed(2)}M sample ops/sec`;
  if (opsPerSec < 1000000) {
    opsFormatted = `${Math.round(opsPerSec / 1000)}k sample ops/sec`;
  }

  return {
    scoreMs: Number(duration.toFixed(2)),
    opsPerSecFormatted: opsFormatted,
  };
}

/**
 * Detects browser-exposed CPU capability. Browsers do not reliably expose the
 * physical CPU model or architecture, so architecture is reported conservatively.
 */
export function detectCpuHardware(): CpuHardwareInfo {
  const logicalCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

  let architecture = 'CPU architecture not exposed by browser';
  if (/Macintosh|Mac OS X|iPhone|iPad/i.test(ua)) {
    architecture = 'Apple platform (CPU architecture hidden by browser)';
  } else if (/Android|Mobile/i.test(ua)) {
    architecture = 'Mobile platform (CPU architecture hidden by browser)';
  } else if (/Windows/i.test(ua)) {
    architecture = 'Windows platform (CPU architecture hidden by browser)';
  } else if (/Linux/i.test(ua)) {
    architecture = 'Linux platform (CPU architecture hidden by browser)';
  }

  const bench = runCpuFlopsBenchmark();
  let cpuTier: 'low' | 'medium' | 'high' = 'medium';

  if (logicalCores >= 8 && bench.scoreMs < 12.0) {
    cpuTier = 'high';
  } else if (logicalCores <= 4 && bench.scoreMs > 12.0) {
    cpuTier = 'low';
  }

  let optimizationStrategy = '';
  if (cpuTier === 'high') {
    optimizationStrategy = 'Keeps normal UI motion and permits opt-in compositing hints. No background worker pool is created by this optimizer.';
  } else if (cpuTier === 'medium') {
    optimizationStrategy = 'Uses balanced rendering hints and avoids persistent will-change allocations.';
  } else {
    optimizationStrategy = 'Selects power-saver rendering rules and disables elements explicitly marked as heavy animations.';
  }

  return {
    logicalCores,
    architecture,
    cpuTier,
    flopsScoreMs: bench.scoreMs,
    opsPerSecFormatted: bench.opsPerSecFormatted,
    optimizationStrategy,
  };
}

/**
 * Detects browser-exposed WebGL/GPU capability. A WebGL context can identify
 * known software renderers; otherwise hardware acceleration is treated as likely,
 * not guaranteed.
 */
export function detectGpuHardware(): GpuHardwareInfo {
  let hasHardwareGpu = false;
  let gpuName = 'WebGL unavailable';
  let gpuVendor = 'Unknown';
  let gpuTier: 'dedicated' | 'integrated' | 'software' | 'unsupported' = 'unsupported';
  let maxTextureSize = 0;
  const webgpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;

  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;

      if (gl) {
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gl.getParameter(gl.RENDERER) || ''
          : gl.getParameter(gl.RENDERER) || '';
        const vendor = debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gl.getParameter(gl.VENDOR) || ''
          : gl.getParameter(gl.VENDOR) || '';

        if (renderer) gpuName = String(renderer);
        if (vendor) gpuVendor = String(vendor);

        const isSoftware = /swiftshader|software|llvmpipe|basic render/i.test(String(renderer));
        const isDedicated = /NVIDIA|GeForce|RTX|GTX|Radeon RX|Radeon Pro/i.test(String(renderer));

        if (isSoftware) {
          gpuTier = 'software';
          hasHardwareGpu = false;
        } else {
          gpuTier = isDedicated ? 'dedicated' : 'integrated';
          hasHardwareGpu = true;
          if (!debugInfo && /webgl/i.test(gpuName)) {
            gpuName = 'WebGL renderer (details hidden by browser)';
          }
        }
      }
    }
  } catch (e) {
    console.error('Failed GPU detection', e);
  }

  let optimizationStrategy = '';
  if (hasHardwareGpu) {
    optimizationStrategy = 'Enables conservative CSS compositing hints only on elements that opt in with the hardware-accelerated class.';
  } else if (gpuTier === 'software') {
    optimizationStrategy = 'Uses software-safe rendering rules and removes expensive backdrop filters from opted-in heavy elements.';
  } else {
    optimizationStrategy = 'WebGL is unavailable; GPU-specific rendering hints remain disabled.';
  }

  return {
    hasHardwareGpu,
    gpuName,
    gpuVendor,
    gpuTier,
    maxTextureSize,
    webgpuSupported,
    accelerationEnabled: hasHardwareGpu,
    optimizationStrategy,
  };
}

/**
 * Reads the coarse deviceMemory browser hint when available. When unavailable,
 * a conservative 4 GB planning baseline is used and marked as estimated.
 */
export function detectRamHardware(): RamHardwareInfo {
  const exposedMemory =
    typeof navigator !== 'undefined' && typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number'
      ? (navigator as Navigator & { deviceMemory?: number }).deviceMemory
      : undefined;
  const capacityGb = exposedMemory || 4;
  const isEstimated = exposedMemory === undefined;

  let ramTier: 'low' | 'medium' | 'high' = 'medium';
  let maxCacheAllocMb = 50;

  if (!isEstimated && capacityGb >= 8) {
    ramTier = 'high';
    maxCacheAllocMb = 100;
  } else if (!isEstimated && capacityGb <= 2) {
    ramTier = 'low';
    maxCacheAllocMb = 20;
  }

  let optimizationStrategy = '';
  if (isEstimated) {
    optimizationStrategy = 'Browser did not expose deviceMemory; uses a conservative 4 GB planning baseline and a 50 MB cache-budget hint.';
  } else if (ramTier === 'high') {
    optimizationStrategy = 'Exposes a 100 MB cache-budget hint to components that explicitly consume the optimizer profile.';
  } else if (ramTier === 'medium') {
    optimizationStrategy = 'Exposes a 50 MB cache-budget hint to components that explicitly consume the optimizer profile.';
  } else {
    optimizationStrategy = 'Exposes a 20 MB cache-budget hint and selects the power-saver rendering policy.';
  }

  return {
    capacityGb,
    ramTier,
    maxCacheAllocMb,
    optimizationStrategy,
    isEstimated,
  };
}

/**
 * Computes a truthful browser performance policy. This function does not move
 * arbitrary application work between CPU, GPU, and RAM; JavaScript workloads
 * must explicitly consume this profile to change their own scheduling behavior.
 */
export function computeWorkloadDistribution(
  cpu: CpuHardwareInfo,
  gpu: GpuHardwareInfo,
  ram: RamHardwareInfo
): WorkloadTaskAssignment {
  let recommendedMode: 'high_performance' | 'balanced' | 'power_saver' = 'balanced';

  if (cpu.cpuTier === 'high' && gpu.hasHardwareGpu && ram.ramTier !== 'low') {
    recommendedMode = 'high_performance';
  } else if (cpu.cpuTier === 'low' || !gpu.hasHardwareGpu || ram.ramTier === 'low') {
    recommendedMode = 'power_saver';
  }

  const cpuTasks: string[] = [
    `Browser CPU capability sampled from ${cpu.logicalCores} logical cores and a short main-thread benchmark`,
    `Rendering policy selected: ${recommendedMode.replace('_', ' ')}`,
  ];
  if (recommendedMode === 'power_saver') {
    cpuTasks.push('Heavy animations are disabled for elements explicitly marked with .heavy-animation');
  } else {
    cpuTasks.push('Normal UI motion remains available; user reduced-motion preferences are still respected');
  }

  const gpuTasks: string[] = gpu.hasHardwareGpu
    ? [
        'WebGL capability detected; opted-in .hardware-accelerated elements receive conservative compositing hints',
        recommendedMode === 'high_performance'
          ? 'High-performance mode may apply will-change to opted-in accelerated elements'
          : 'Balanced mode avoids persistent will-change allocations',
      ]
    : [
        gpu.gpuTier === 'software'
          ? 'Known software WebGL renderer detected; GPU-specific acceleration claims are disabled'
          : 'WebGL unavailable; GPU-specific acceleration claims are disabled',
        'Heavy backdrop filters are removed from opted-in accelerated elements in power-saver mode',
      ];

  const ramTasks: string[] = [
    `${ram.isEstimated ? 'Estimated' : 'Browser-reported'} memory baseline: ${ram.capacityGb} GB`,
    `Cache-budget hint exposed to consumers: ${ram.maxCacheAllocMb} MB`,
    'The optimizer does not reserve RAM or claim to cache telemetry/CharGPT data unless those systems explicitly use this profile',
  ];

  const summary = `Browser capability policy: ${recommendedMode.replace('_', ' ')}. SmokeStack applies rendering and CSS hints only; it does not claim to reroute thermodynamics, encryption, CharGPT, telemetry, or other JavaScript workloads without explicit integration.`;

  return {
    cpuTasks,
    gpuTasks,
    ramTasks,
    summary,
    recommendedMode,
  };
}

/**
 * Gets the cached browser hardware profile, or creates one when none exists.
 */
export function getFullHardwareProfile(): FullHardwareProfile {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(HARDWARE_PROFILE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.cpu && parsed.gpu && parsed.ram && parsed.workload) {
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to load hardware optimizer profile', e);
  }

  const cpu = detectCpuHardware();
  const gpu = detectGpuHardware();
  const ram = detectRamHardware();
  const workload = computeWorkloadDistribution(cpu, gpu, ram);

  const profile: FullHardwareProfile = {
    cpu,
    gpu,
    ram,
    workload,
    benchmarkedAt: new Date().toISOString(),
  };

  saveHardwareProfile(profile);
  return profile;
}

export function saveHardwareProfile(profile: FullHardwareProfile): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HARDWARE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    }
  } catch (e) {
    console.warn('Failed to save hardware optimizer profile', e);
  }
}

/**
 * Applies browser-visible performance attributes and CSS policies based on the
 * measured profile. It deliberately does not claim to schedule unrelated app work.
 */
export function applyHardwareAndWorkloadOptimization(): FullHardwareProfile {
  const profile = getFullHardwareProfile();
  if (typeof document === 'undefined') return profile;

  const root = document.documentElement;
  const mode = profile.workload.recommendedMode;

  root.setAttribute('data-cpu-cores', `${profile.cpu.logicalCores}`);
  root.setAttribute('data-cpu-tier', profile.cpu.cpuTier);
  root.setAttribute('data-gpu-accelerated', profile.gpu.hasHardwareGpu ? 'true' : 'false');
  root.setAttribute('data-gpu-tier', profile.gpu.gpuTier);
  root.setAttribute('data-ram-tier', profile.ram.ramTier);
  root.setAttribute('data-performance-mode', mode);

  root.style.setProperty('--app-cpu-cores', `${profile.cpu.logicalCores}`);
  root.style.setProperty('--app-max-cache-mb', `${profile.ram.maxCacheAllocMb}MB`);

  let styleEl = document.getElementById('dynamic-hardware-optimizer-css') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-hardware-optimizer-css';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    /* Browser hardware capability policy. No simulated workload routing. */
    [data-gpu-accelerated="true"][data-performance-mode="high_performance"] .hardware-accelerated {
      will-change: transform;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
    }

    [data-gpu-accelerated="true"][data-performance-mode="balanced"] .hardware-accelerated {
      will-change: auto;
      backface-visibility: hidden;
    }

    [data-performance-mode="power_saver"] .hardware-accelerated {
      will-change: auto !important;
      transform: none !important;
      backdrop-filter: none !important;
    }

    [data-performance-mode="power_saver"] .heavy-animation,
    [data-cpu-tier="low"] .heavy-animation {
      animation: none !important;
      transition: none !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .heavy-animation {
        animation: none !important;
        transition: none !important;
      }
    }
  `;

  return profile;
}
