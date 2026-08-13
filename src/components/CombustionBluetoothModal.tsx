import React from 'react';
import { BluetoothProbeDevice, CombustionProbeData } from '../services/bluetoothProbeService';
import { convertTemp, formatTemp, TempUnit } from '../utils/tempUtils';
import {
  Bluetooth,
  X,
  Radio,
  Cpu,
  BatteryCharging,
  Zap,
  Thermometer,
  Activity,
  CheckCircle2,
  AlertCircle,
  Wifi,
  Sparkles,
  Layers,
} from 'lucide-react';

interface CombustionBluetoothModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDevice: BluetoothProbeDevice | null;
  telemetry: CombustionProbeData | null;
  onConnect: (forceSimulation?: boolean) => void;
  onDisconnect: () => void;
  tempUnit: TempUnit;
}

export const CombustionBluetoothModal: React.FC<CombustionBluetoothModalProps> = ({
  isOpen,
  onClose,
  activeDevice,
  telemetry,
  onConnect,
  onDisconnect,
  tempUnit,
}) => {
  if (!isOpen) return null;

  const isConnected = activeDevice?.status === 'connected';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-2xl overflow-hidden my-auto text-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#181818] border-b border-[#2a2a2a]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl text-blue-400">
              <Bluetooth className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white">Combustion Inc. Predictive Thermometer</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-mono uppercase font-bold">
                  BLE 5.2 GATT
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Wireless 8-sensor probe telemetry & real-time predictive analytics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#222] text-zinc-400 hover:text-white hover:bg-[#333] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Connection Controls Banner */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#2e2e2e] space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className={`w-3 h-3 rounded-full shrink-0 ${isConnected ? 'bg-emerald-500 animate-ping' : 'bg-zinc-600'}`} />
                <div>
                  <div className="text-xs font-bold text-white">
                    Status: {isConnected ? (activeDevice?.isSimulated ? '🟢 Live Combustion Stream (CP-82)' : '🟢 WebBluetooth Connected') : '🔴 Disconnected'}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    {isConnected
                      ? `${activeDevice?.name} • Signal ${telemetry?.signalRssi || -55} dBm • Batt ${telemetry?.batteryPct || 95}%`
                      : 'Connect via WebBluetooth or start live simulated stream'}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                {!isConnected ? (
                  <>
                    <button
                      onClick={() => onConnect(false)}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                    >
                      <Bluetooth className="w-4 h-4" />
                      <span>Pair WebBluetooth</span>
                    </button>
                    <button
                      onClick={() => onConnect(true)}
                      className="flex-1 sm:flex-none px-3.5 py-2 bg-orange-600/20 border border-orange-500/40 text-orange-400 hover:bg-orange-600/30 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Radio className="w-4 h-4" />
                      <span>Start Live Stream</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={onDisconnect}
                    className="px-3.5 py-2 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Disconnect Probe</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Live Telemetry Overview Cards */}
          {isConnected && telemetry && (
            <div className="space-y-4">
              {/* Top Readouts Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-[#181818] border border-red-500/30 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-red-400 font-medium">
                    <span>Core Temp (T1)</span>
                    <Thermometer className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {formatTemp(telemetry.coreTempF, tempUnit)}
                  </div>
                  <div className="text-[10px] text-zinc-400">Deepest internal muscle</div>
                </div>

                <div className="p-3 bg-[#181818] border border-amber-500/30 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-medium">
                    <span>Surface Temp (T6)</span>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {formatTemp(telemetry.surfaceTempF, tempUnit)}
                  </div>
                  <div className="text-[10px] text-zinc-400">Meat surface boundary</div>
                </div>

                <div className="p-3 bg-[#181818] border border-orange-500/30 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-orange-400 font-medium">
                    <span>Ambient Pit (T8)</span>
                    <Zap className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-white font-mono">
                    {formatTemp(telemetry.ambientTempF, tempUnit)}
                  </div>
                  <div className="text-[10px] text-zinc-400">Convection cook chamber</div>
                </div>

                <div className="p-3 bg-[#181818] border border-emerald-500/30 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                    <span>Target Prediction</span>
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
                    ~{telemetry.predictionMin} min
                  </div>
                  <div className="text-[10px] text-zinc-400">Estimated finish time</div>
                </div>
              </div>

              {/* 8-Sensor Internal Needle Gradient Visualizer */}
              <div className="p-4 bg-[#161616] border border-[#2c2c2c] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="w-4 h-4 text-blue-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      8-Sensor Temperature Profile (Needle Gradient)
                    </h4>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono">
                    Timestamp: {telemetry.timestamp}
                  </span>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                  {telemetry.sensorsF.map((tempF, idx) => {
                    const isCore = idx === 0;
                    const isSurface = idx === 5;
                    const isAmbient = idx === 7;
                    let badgeColor = 'bg-[#222] border-zinc-700 text-zinc-300';
                    if (isCore) badgeColor = 'bg-red-500/20 border-red-500/40 text-red-300 font-bold';
                    else if (isSurface) badgeColor = 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold';
                    else if (isAmbient) badgeColor = 'bg-orange-500/20 border-orange-500/40 text-orange-300 font-bold';

                    return (
                      <div key={idx} className={`p-2 rounded-lg border text-center space-y-1 ${badgeColor}`}>
                        <div className="text-[9px] font-mono opacity-80">
                          {isCore ? 'T1 Core' : isSurface ? 'T6 Surf' : isAmbient ? 'T8 Amb' : `T${idx + 1}`}
                        </div>
                        <div className="text-xs font-black font-mono">
                          {formatTemp(tempF, tempUnit)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Manual Monitoring Mode Note */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2.5 text-xs text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Manual Monitoring Note:</span> Non-Combustion probes, analog dials, and standard offline cook logs rely on manual temperature logging. Connecting a Combustion Inc probe feeds live real-time graph points into the thermal analytics automatically!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#181818] border-t border-[#2a2a2a] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
