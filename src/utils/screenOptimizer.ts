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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.confirmedWidth === 'number') {
        return parsed;
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
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

  // 1. Set root CSS custom properties
  root.style.setProperty('--app-viewport-width', `${width}px`);
  root.style.setProperty('--app-ui-scale', `${scale}`);
  root.style.setProperty('--app-touch-target-min', `${touchMin}px`);

  // 2. Set root data attributes
  root.setAttribute('data-screen-width', `${width}`);
  root.setAttribute('data-device-category', config.deviceCategory);
  root.setAttribute('data-layout-optimized', config.isConfirmed ? 'true' : 'false');

  // 3. Inject dynamic CSS rules tailored to the confirmed screen width
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

  // Run immediately on page load
  runAutoOptimization();
  applyHardwareAndWorkloadOptimization();

  // Attach listener to keep optimized on window resize or device rotation
  window.addEventListener('resize', runAutoOptimization);
  window.addEventListener('orientationchange', runAutoOptimization);

  return () => {
    window.removeEventListener('resize', runAutoOptimization);
    window.removeEventListener('orientationchange', runAutoOptimization);
  };
}

/* ============================================================================
   CPU, GPU & HARDWARE WORKLOAD DISTRIBUTOR ENGINE
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

const HARDWARE_PROFILE_STORAGE_KEY = 'pitmaster_hardware_profile_v1';

/**
 * Runs a 2ms FLOPS benchmark on single-thread CPU performance
 */
export function runCpuFlopsBenchmark(): { scoreMs: number; opsPerSecFormatted: string } {
  const iterations = 150000;
  const start = performance.now();
  let dummy = 0;
  for (let i = 0; i < iterations; i++) {
    dummy += Math.sin(i) * Math.cos(i) + Math.sqrt(i + 1);
  }
  const duration = Math.max(0.1, performance.now() - start);
  const opsPerSec = Math.round((iterations / duration) * 1000);

  let opsFormatted = `${(opsPerSec / 1000000).toFixed(2)}M ops/sec`;
  if (opsPerSec < 1000000) {
    opsFormatted = `${Math.round(opsPerSec / 1000)}k ops/sec`;
  }

  return {
    scoreMs: Number(duration.toFixed(2)),
    opsPerSecFormatted: opsFormatted,
  };
}

/**
 * Detects CPU hardware capabilities & architecture
 */
export function detectCpuHardware(): CpuHardwareInfo {
  const logicalCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';

  let architecture = 'x86_64 / Standard CPU';
  if (/Macintosh|Mac OS X|iPhone|iPad/i.test(ua)) {
    architecture = 'Apple Silicon (ARM64)';
  } else if (/Android|Mobile|ARM/i.test(ua)) {
    architecture = 'Mobile ARM64 Processor';
  } else if (/Win64|x64|x86_64/i.test(ua)) {
    architecture = 'x86_64 Desktop CPU';
  }

  const bench = runCpuFlopsBenchmark();
  let cpuTier: 'low' | 'medium' | 'high' = 'medium';

  if (logicalCores >= 8 || bench.scoreMs < 5.0) {
    cpuTier = 'high';
  } else if (logicalCores <= 4 && bench.scoreMs > 12.0) {
    cpuTier = 'low';
  }

  let optimizationStrategy = '';
  if (cpuTier === 'high') {
    optimizationStrategy = 'Multi-threaded Web Worker pools active for real-time smoker thermodynamics, polynomial ETA fitting, & fast log compression.';
  } else if (cpuTier === 'medium') {
    optimizationStrategy = 'Balanced background physics calculation ticks (1s polling) with async worker scheduling.';
  } else {
    optimizationStrategy = 'Throttled background physics loops (3s polling) to conserve CPU main-thread rendering budget.';
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
 * Detects WebGL/GPU hardware capabilities
 */
export function detectGpuHardware(): GpuHardwareInfo {
  let hasHardwareGpu = false;
  let gpuName = 'Standard WebGL Canvas Driver';
  let gpuVendor = 'Generic WebGL Vendor';
  let gpuTier: 'dedicated' | 'integrated' | 'software' | 'unsupported' = 'integrated';
  let maxTextureSize = 4096;
  const webgpuSupported = typeof navigator !== 'undefined' && 'gpu' in navigator;

  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;

      if (gl) {
        maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
          const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';

          if (renderer) gpuName = renderer;
          if (vendor) gpuVendor = vendor;

          const isSoftware = /swiftshader|software|llvmpipe|basic render/i.test(renderer);
          const isDedicated = /NVIDIA|GeForce|RTX|GTX|Radeon|AMD|Apple M/i.test(renderer);

          if (isSoftware) {
            gpuTier = 'software';
            hasHardwareGpu = false;
          } else if (isDedicated) {
            gpuTier = 'dedicated';
            hasHardwareGpu = true;
          } else {
            gpuTier = 'integrated';
            hasHardwareGpu = true;
          }
        } else {
          hasHardwareGpu = true;
        }
      }
    }
  } catch (e) {
    console.error('Failed GPU detection', e);
  }

  let optimizationStrategy = '';
  if (hasHardwareGpu && (gpuTier === 'dedicated' || gpuTier === 'integrated')) {
    optimizationStrategy = 'Hardware GPU acceleration ENABLED for CSS 3D transforms, WebGL smoke/flame particle visualizers, & zero-lag canvas charts.';
  } else {
    optimizationStrategy = 'Software fallback rendering ENABLED; disabled heavy CSS backdrop filters and shader animations to avoid frame drops.';
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
 * Detects RAM memory capacity
 */
export function detectRamHardware(): RamHardwareInfo {
  const capacityGb = typeof navigator !== 'undefined' ? (navigator as any).deviceMemory || 4 : 4;
  let ramTier: 'low' | 'medium' | 'high' = 'medium';
  let maxCacheAllocMb = 50;

  if (capacityGb >= 8) {
    ramTier = 'high';
    maxCacheAllocMb = 150;
  } else if (capacityGb <= 2) {
    ramTier = 'low';
    maxCacheAllocMb = 20;
  }

  let optimizationStrategy = '';
  if (ramTier === 'high') {
    optimizationStrategy = 'Expanded 150MB active in-memory cache for high-frequency telemetry streams and AI conversation context.';
  } else if (ramTier === 'medium') {
    optimizationStrategy = 'Standard 50MB in-memory telemetry buffer with automated LRU log recycling.';
  } else {
    optimizationStrategy = 'Compact 20MB telemetry buffer with aggressive memory garbage collection.';
  }

  return {
    capacityGb,
    ramTier,
    maxCacheAllocMb,
    optimizationStrategy,
  };
}

/**
 * Computes workload distribution across CPU, GPU, and RAM
 */
export function computeWorkloadDistribution(
  cpu: CpuHardwareInfo,
  gpu: GpuHardwareInfo,
  ram: RamHardwareInfo
): WorkloadTaskAssignment {
  const cpuTasks: string[] = [
    'Smoker Thermal Physics & Thermodynamics Simulation',
    'Predictive ETA Polynomial Regression Curve Fitting',
    'Cook Log JSON/XML Export-Import Encryption',
  ];

  if (cpu.cpuTier === 'high') {
    cpuTasks.push('Multi-Threaded Background Web Worker Pools');
  }

  const gpuTasks: string[] = [];
  if (gpu.hasHardwareGpu) {
    gpuTasks.push('Hardware-Accelerated CSS 3D Matrix Transforms');
    gpuTasks.push('WebGL Particle Smoke & Flame Visualizers');
    gpuTasks.push('Recharts GPU Hardware Composite Layering');
    if (gpu.gpuTier === 'dedicated') {
      gpuTasks.push('High-DPI 60 FPS Anti-Aliased Canvas Rendering');
    }
  } else {
    gpuTasks.push('Software 2D Canvas Fallback (Shader Filters Bypassed)');
  }

  const ramTasks: string[] = [
    `High-Frequency Telemetry In-Memory Buffer (${ram.maxCacheAllocMb}MB Limit)`,
    'CharGPT AI Context Conversation Store',
    'Live Chart Dataset Memory Caching',
  ];

  let recommendedMode: 'high_performance' | 'balanced' | 'power_saver' = 'balanced';
  if (cpu.cpuTier === 'high' && gpu.hasHardwareGpu && ram.ramTier === 'high') {
    recommendedMode = 'high_performance';
  } else if (cpu.cpuTier === 'low' || !gpu.hasHardwareGpu || ram.ramTier === 'low') {
    recommendedMode = 'power_saver';
  }

  const summary = `Workloads balanced: ${cpu.logicalCores}-core CPU handles thermodynamics & ETA physics, ${
    gpu.hasHardwareGpu ? 'GPU (' + gpu.gpuName + ') handles 3D/Canvas visuals' : 'CPU Software rasterizer handles 2D visuals'
  }, and RAM (${ram.capacityGb}GB) caches telemetry logs.`;

  return {
    cpuTasks,
    gpuTasks,
    ramTasks,
    summary,
    recommendedMode,
  };
}

/**
 * Gets full hardware profile and workload distribution plan
 */
export function getFullHardwareProfile(): FullHardwareProfile {
  try {
    const raw = localStorage.getItem(HARDWARE_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.cpu && parsed.gpu && parsed.ram) {
        return parsed;
      }
    }
  } catch (e) {
    /* ignore */
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
    localStorage.setItem(HARDWARE_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (e) {
    /* ignore */
  }
}

/**
 * Applies global CSS flags and hardware performance attributes based on hardware profile
 */
export function applyHardwareAndWorkloadOptimization(): FullHardwareProfile {
  const profile = getFullHardwareProfile();
  if (typeof document === 'undefined') return profile;

  const root = document.documentElement;

  // Set data attributes
  root.setAttribute('data-cpu-cores', `${profile.cpu.logicalCores}`);
  root.setAttribute('data-cpu-tier', profile.cpu.cpuTier);
  root.setAttribute('data-gpu-accelerated', profile.gpu.hasHardwareGpu ? 'true' : 'false');
  root.setAttribute('data-gpu-tier', profile.gpu.gpuTier);
  root.setAttribute('data-ram-tier', profile.ram.ramTier);

  // Set CSS variables
  root.style.setProperty('--app-cpu-cores', `${profile.cpu.logicalCores}`);
  root.style.setProperty('--app-max-cache-mb', `${profile.ram.maxCacheAllocMb}MB`);

  // Inject or update dynamic hardware styles
  let styleEl = document.getElementById('dynamic-hardware-optimizer-css') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-hardware-optimizer-css';
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = `
    /* Hardware Workload Optimization CSS */
    [data-gpu-accelerated="true"] .hardware-accelerated,
    [data-gpu-accelerated="true"] .recharts-wrapper {
      will-change: transform;
      transform: translate3d(0, 0, 0);
      backface-visibility: hidden;
    }

    [data-gpu-accelerated="false"] .hardware-accelerated {
      will-change: auto;
      transform: none;
      backdrop-filter: none !important;
    }

    [data-cpu-tier="low"] .heavy-animation {
      animation: none !important;
      transition: none !important;
    }
  `;

  return profile;
}

