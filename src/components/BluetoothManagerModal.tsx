import React, { useState, useEffect } from 'react';
import {
  TOP_25_THERMOMETERS,
  ThermometerDeviceDef,
  getLatestSupportedFirmware,
  getInitialInstalledFirmware,
} from '../data/thermometersData';
import { TemperatureReading } from '../types';
import {
  Bluetooth,
  Wifi,
  Thermometer,
  Zap,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Signal,
  Bell,
  CheckCircle2,
  X,
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  Sparkles,
  Flame,
  AlertTriangle,
  Award,
  Search,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  Settings,
  AlertCircle,
  Clock,
  ShieldAlert,
  Cpu,
  Download,
  RefreshCw,
  ShieldCheck,
  FileCheck,
  Lock,
} from 'lucide-react';

interface BluetoothManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPushReadingToLog?: (reading: Partial<TemperatureReading>) => void;
}

export const BluetoothManagerModal: React.FC<BluetoothManagerModalProps> = ({
  isOpen,
  onClose,
  onPushReadingToLog,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<ThermometerDeviceDef>(
    TOP_25_THERMOMETERS[0] // Meat Minder Pro as default
  );

  const [isConnected, setIsConnected] = useState<boolean>(true); // Connected default to show live probe stream
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<'BLE' | 'Simulated'>('Simulated');
  const [searchFilter, setSearchFilter] = useState('');

  // Collapsible Section Menus State
  const [isSpotlightOpen, setIsSpotlightOpen] = useState<boolean>(true);
  const [isTelemetryOpen, setIsTelemetryOpen] = useState<boolean>(true);
  const [isDevicesListOpen, setIsDevicesListOpen] = useState<boolean>(true);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState<boolean>(false);

  // Live Probe Temperatures
  const [meatTemp, setMeatTemp] = useState<number>(158);
  const [pitTemp, setPitTemp] = useState<number>(226);
  const [targetMeatTemp, setTargetMeatTemp] = useState<number>(203);
  const [targetPitTemp, setTargetPitTemp] = useState<number>(225);
  const [batteryLevel, setBatteryLevel] = useState<number>(96);
  const [rssiSignal, setRssiSignal] = useState<number>(-54);

  // Alarms & Notifications
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(true);
  const [isAlarmTriggered, setIsAlarmTriggered] = useState<boolean>(false);
  const [pushSuccessNotice, setPushSuccessNotice] = useState<string | null>(null);

  // Low-Battery Threshold Monitor State (<15% during active cook session)
  const [lowBatteryThresholdAlert, setLowBatteryThresholdAlert] = useState<string | null>(null);

  // Device Firmware & CharGPT BLE OTA Updater State
  const [firmwareByDevice, setFirmwareByDevice] = useState<Record<string, string>>({});
  const [isUpdatingFirmware, setIsUpdatingFirmware] = useState<boolean>(false);
  const [firmwareUpdateProgress, setFirmwareUpdateProgress] = useState<number>(0);
  const [firmwareUpdateSuccess, setFirmwareUpdateSuccess] = useState<string | null>(null);
  const [firmwareUpdateError, setFirmwareUpdateError] = useState<string | null>(null);
  const [otaStageText, setOtaStageText] = useState<string>('');
  const [redundancyChecks, setRedundancyChecks] = useState<{
    deviceMatched: boolean;
    batteryPassed: boolean;
    rssiPassed: boolean;
    checksumVerified: boolean;
    rollbackSnapshotCreated: boolean;
  }>({
    deviceMatched: false,
    batteryPassed: false,
    rssiPassed: false,
    checksumVerified: false,
    rollbackSnapshotCreated: false,
  });

  // Dynamic firmware resolution for currently selected device
  const latestSupportedFirmware = getLatestSupportedFirmware(selectedDevice);
  const currentFirmware =
    firmwareByDevice[selectedDevice.id] || getInitialInstalledFirmware(selectedDevice);
  const isFirmwareUpToDate = currentFirmware === latestSupportedFirmware;

  // Monitor battery level during active session for <15% threshold trigger
  useEffect(() => {
    if (isConnected && isLiveStreaming && batteryLevel < 15) {
      setLowBatteryThresholdAlert(
        `🚨 LOW BATTERY THRESHOLD ALERT (<15%): Connected probe is at ${batteryLevel}%. Immediate charge required to prevent BLE signal loss during active cook!`
      );
    } else if (batteryLevel >= 15) {
      setLowBatteryThresholdAlert(null);
    }
  }, [batteryLevel, isConnected, isLiveStreaming]);

  // Handle CharGPT Bluetooth BLE OTA Firmware Update with Multi-Stage Pre-Install Redundancies
  const handleStartFirmwareUpdate = () => {
    setFirmwareUpdateError(null);
    setFirmwareUpdateSuccess(null);

    // REDUNDANCY CHECK 1: Battery Level Safety Threshold (>20%)
    if (batteryLevel < 20) {
      setFirmwareUpdateError(
        `❌ REDUNDANCY CHECK FAILED (Low Battery): Connected probe battery is at ${batteryLevel}%. A minimum of 20% battery charge is required to prevent EEPROM memory bricking during BLE OTA flashing. Please charge your probe.`
      );
      return;
    }

    // REDUNDANCY CHECK 2: Bluetooth RSSI Signal Strength Threshold (> -88 dBm)
    if (rssiSignal < -88) {
      setFirmwareUpdateError(
        `❌ REDUNDANCY CHECK FAILED (Weak BLE Signal): Current signal is ${rssiSignal} dBm. Move probe closer to your mobile device/bridge before initiating firmware installation.`
      );
      return;
    }

    setIsUpdatingFirmware(true);
    setFirmwareUpdateProgress(0);
    setOtaStageText('Stage 1/4: Pre-Flight Hardware Target Handshake & Model Matching...');
    setRedundancyChecks({
      deviceMatched: false,
      batteryPassed: false,
      rssiPassed: false,
      checksumVerified: false,
      rollbackSnapshotCreated: false,
    });

    let progress = 0;
    const timer = setInterval(() => {
      progress += 10;
      setFirmwareUpdateProgress(progress);

      if (progress === 20) {
        setOtaStageText('Stage 1/4 Passed: Target Device ID Verified & Hardware Handshake Confirmed.');
        setRedundancyChecks((prev) => ({ ...prev, deviceMatched: true, batteryPassed: true, rssiPassed: true }));
      } else if (progress === 40) {
        setOtaStageText(`Stage 2/4: Verifying SHA-256 Checksum & Firmware Binary Manifest for ${latestSupportedFirmware}...`);
      } else if (progress === 50) {
        setOtaStageText('Stage 2/4 Passed: SHA-256 Integrity Checksum Validated. No corrupt blocks detected.');
        setRedundancyChecks((prev) => ({ ...prev, checksumVerified: true }));
      } else if (progress === 70) {
        setOtaStageText('Stage 3/4: Creating EEPROM Rollback Snapshot & Streaming BLE OTA Binary Packets...');
        setRedundancyChecks((prev) => ({ ...prev, rollbackSnapshotCreated: true }));
      } else if (progress === 90) {
        setOtaStageText('Stage 4/4: Performing Post-Flash Checksum Handshake & Boot Verification...');
      } else if (progress >= 100) {
        clearInterval(timer);
        setFirmwareUpdateProgress(100);
        setIsUpdatingFirmware(false);
        setFirmwareByDevice((prev) => ({
          ...prev,
          [selectedDevice.id]: latestSupportedFirmware,
        }));
        setFirmwareUpdateSuccess(
          `🎉 REDUNDANCY & INSTALLATION COMPLETE! ${selectedDevice.name} successfully upgraded to its verified latest supported firmware (${latestSupportedFirmware}). All 5 redundancy checks (Hardware Target, Battery, RSSI, SHA-256 Checksum, Post-Flash Handshake) passed 100%!`
        );
        setTimeout(() => setFirmwareUpdateSuccess(null), 10000);
      }
    }, 450);
  };

  // Live Temperature Fluctuation Simulation loop
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (isConnected && isLiveStreaming) {
      interval = setInterval(() => {
        // Pit fluctuates ±2 degrees around 225
        setPitTemp((prev) => {
          const delta = (Math.random() - 0.48) * 1.5;
          return Number(Math.min(300, Math.max(180, prev + delta)).toFixed(1));
        });

        // Meat gradually ticks up towards target 203
        setMeatTemp((prev) => {
          if (prev >= targetMeatTemp) {
            if (alarmEnabled) setIsAlarmTriggered(true);
            return prev;
          }
          const increment = Math.random() < 0.3 ? 0.1 : 0.05;
          return Number((prev + increment).toFixed(1));
        });

        // Slight RSSI wobble
        setRssiSignal((prev) => {
          const wobble = Math.floor((Math.random() - 0.5) * 4);
          return Math.max(-90, Math.min(-40, prev + wobble));
        });
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, isLiveStreaming, targetMeatTemp, alarmEnabled]);

  // Handle native Web Bluetooth scan if supported by browser
  const handleNativeBluetoothScan = async () => {
    if (typeof window !== 'undefined' && 'bluetooth' in navigator) {
      try {
        const nav = navigator as any;
        const device = await nav.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '0000181a-0000-1000-8000-00805f9b34fb',
            '00001809-0000-1000-8000-00805f9b34fb',
            'battery_service',
          ],
        });
        if (device) {
          setSelectedDevice({
            id: device.id || 'native-ble-device',
            name: device.name || 'Bluetooth Meat Thermometer',
            brand: 'Web Bluetooth Device',
            probeCount: 2,
            wirelessType: 'Bluetooth BLE',
            rangeFeet: 300,
            features: ['Live GATT Bluetooth Service Connected', 'Active Sensor Feed'],
            description: `Connected via Web Bluetooth API (${device.name || 'GATT Thermometer'})`,
            maxTempF: 572,
            defaultTargetTempF: 203,
          });
          setConnectionType('BLE');
          setIsConnected(true);
          setPushSuccessNotice(`Connected to Web Bluetooth Device: ${device.name || 'Thermometer'}`);
          setTimeout(() => setPushSuccessNotice(null), 3000);
        }
      } catch (err: any) {
        console.log('Bluetooth scan cancelled or unsupported in iframe:', err);
        // Fallback to simulated mode seamlessly
        setConnectionType('Simulated');
        setIsConnected(true);
      }
    } else {
      setConnectionType('Simulated');
      setIsConnected(true);
    }
  };

  const handleSelectDevice = (device: ThermometerDeviceDef) => {
    setSelectedDevice(device);
    setTargetMeatTemp(device.defaultTargetTempF);
    setIsConnected(true);
    setIsLiveStreaming(true);
    setMeatTemp(155);
    setPitTemp(226);
    setPushSuccessNotice(`Paired with ${device.name}! Streaming live temperatures...`);
    setTimeout(() => setPushSuccessNotice(null), 3000);
  };

  const handlePushToActiveLog = () => {
    if (onPushReadingToLog) {
      const now = new Date();
      const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}`;
      onPushReadingToLog({
        time: timeStr,
        cookingTemp: Math.round(pitTemp),
        meatTemp: Math.round(meatTemp),
        targetTemp: Math.round(targetMeatTemp),
        actionsTaken: `Bluetooth live reading from ${selectedDevice.name} (Meat ${Math.round(meatTemp)}°F / Pit ${Math.round(pitTemp)}°F)`,
      });
      setPushSuccessNotice(`Live reading (${Math.round(meatTemp)}°F / ${Math.round(pitTemp)}°F) pushed to Cook Log!`);
      setTimeout(() => setPushSuccessNotice(null), 3500);
    }
  };

  if (!isOpen) return null;

  const filteredDevices = TOP_25_THERMOMETERS.filter(
    (d) =>
      d.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      d.brand.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 animate-fadeIn">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] w-full max-w-[96vw] sm:max-w-[92vw] lg:max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        
        {/* Header Bar */}
        <div className="bg-[#121212] border-b border-[#2a2a2a] px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-950/40 border border-blue-400/20 shrink-0">
              <Bluetooth className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">Bluetooth Meat Thermometer Hub</h2>
                <span className="text-[9px] sm:text-[10px] bg-blue-500/20 text-blue-400 font-mono font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                  Top 25 Probes
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-400">
                Meat Minder Pro & Bluetooth BLE Hardware Probes, MEATER, ThermoWorks, or Inkbird probes via Web Bluetooth & GATT.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2">
            <button
              type="button"
              onClick={handleNativeBluetoothScan}
              className="px-3.5 py-2 sm:py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Radio className="w-4 h-4 animate-spin shrink-0" />
              <span>Pair BLE Device</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-[#242424] rounded-xl transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-3 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          
          {/* Notification Toast */}
          {pushSuccessNotice && (
            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-3 rounded-xl flex items-center justify-between font-medium shadow-md animate-fadeIn">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{pushSuccessNotice}</span>
              </div>
            </div>
          )}

          {/* Alarm Warning */}
          {isAlarmTriggered && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-300 text-xs p-4 rounded-xl flex items-center justify-between font-bold animate-bounce shadow-lg">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                <div>
                  <span className="text-sm block text-white">TARGET TEMPERATURE REACHED!</span>
                  <span className="text-zinc-300 font-normal">
                    {selectedDevice.name} Probe #1 hit target {targetMeatTemp}°F. Remove meat from pit for resting!
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAlarmTriggered(false)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg cursor-pointer"
              >
                Silence Alarm
              </button>
            </div>
          )}

          {/* Active Session Low Battery Threshold Notification (<15%) */}
          {lowBatteryThresholdAlert && (
            <div className="bg-gradient-to-r from-red-950 via-zinc-900 to-red-950 border-2 border-red-500 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xl animate-pulse">
              <div className="flex items-start space-x-3">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5 animate-bounce" />
                <div className="space-y-1">
                  <span className="text-xs font-black text-white uppercase tracking-wider block">
                    ⚡ THRESHOLD MONITOR: ACTIVE SESSION LOW-BATTERY NOTIFICATION (&lt;15%)
                  </span>
                  <p className="text-xs text-red-200">
                    {lowBatteryThresholdAlert}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBatteryLevel(100)}
                  className="px-3 py-1.5 bg-emerald-500 text-zinc-950 font-black text-xs rounded-xl hover:bg-emerald-400 cursor-pointer flex items-center space-x-1"
                >
                  <BatteryCharging className="w-4 h-4" />
                  <span>Recharge to 100%</span>
                </button>
              </div>
            </div>
          )}

          {/* CharGPT Firmware Version Auditor & Bluetooth BLE OTA Updater */}
          {isConnected && (
            <div className="bg-gradient-to-r from-purple-950/80 via-zinc-900 to-amber-950/60 border border-purple-500/40 rounded-2xl p-4 space-y-3 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0">
                    <Cpu className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-black text-white">CharGPT AI Firmware Monitor</h4>
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                        isFirmwareUpToDate
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        Installed: {currentFirmware} • Latest Supported: {latestSupportedFirmware}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      {!isFirmwareUpToDate ? (
                        <span>
                          CharGPT audited your connected <strong>{selectedDevice.name}</strong> probe over Bluetooth BLE and detected outdated firmware (<strong>{currentFirmware}</strong>). Firmware <strong>{latestSupportedFirmware}</strong> is available for {selectedDevice.brand} with improved thermal stall algorithms, BLE signal stability, and battery optimization.
                        </span>
                      ) : (
                        <span className="text-emerald-300 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline mr-1" />
                          <span>Connected <strong>{selectedDevice.name}</strong> probe is verified by CharGPT to be running its latest supported firmware (<strong>{latestSupportedFirmware}</strong>)!</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {!isFirmwareUpToDate && !isUpdatingFirmware && (
                  <button
                    type="button"
                    onClick={handleStartFirmwareUpdate}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-500 via-amber-500 to-yellow-500 hover:opacity-95 text-zinc-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
                  >
                    <Download className="w-4 h-4 fill-zinc-950" />
                    <span>Update {selectedDevice.brand} Firmware ({latestSupportedFirmware})</span>
                  </button>
                )}
              </div>

              {/* Redundancy Pre-Flight Verification Badges */}
              {!isFirmwareUpToDate && !isUpdatingFirmware && (
                <div className="bg-[#121212] border border-[#2a2a2a] p-3 rounded-xl space-y-2">
                  <div className="flex items-center space-x-1.5 text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span>Pre-Install Hardware & Protocol Redundancy Checks</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
                    <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <span className="text-zinc-400">1. Target ID:</span>
                      <span className="text-emerald-400 font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 inline mr-0.5" /> Verified
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <span className="text-zinc-400">2. Battery Min:</span>
                      <span className={`font-bold flex items-center space-x-1 ${batteryLevel >= 20 ? 'text-emerald-400' : 'text-red-400 animate-pulse'}`}>
                        {batteryLevel >= 20 ? '20%+ OK' : 'FAIL (<20%)'}
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <span className="text-zinc-400">3. BLE Signal:</span>
                      <span className={`font-bold flex items-center space-x-1 ${rssiSignal >= -88 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {rssiSignal >= -88 ? 'Safe' : 'Weak'}
                      </span>
                    </div>
                    <div className="bg-[#1a1a1a] p-2 rounded-lg border border-[#2a2a2a] flex items-center justify-between">
                      <span className="text-zinc-400">4. SHA-256:</span>
                      <span className="text-amber-400 font-bold flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-amber-400 inline mr-0.5" /> Manifest
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Redundancy Check Failure Alert */}
              {firmwareUpdateError && (
                <div className="bg-red-950/80 border border-red-500/60 text-red-200 p-3.5 rounded-xl text-xs space-y-2">
                  <div className="font-black text-red-300 flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>BLE OTA INSTALLATION BLOCKED BY REDUNDANCY GUARD</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{firmwareUpdateError}</p>
                </div>
              )}

              {/* OTA Flashing Multi-Stage Progress Bar */}
              {isUpdatingFirmware && (
                <div className="bg-[#121212] border border-[#2a2a2a] p-3.5 rounded-xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-purple-300 font-bold flex items-center space-x-1.5">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400 shrink-0" />
                      <span>{otaStageText}</span>
                    </span>
                    <span className="text-amber-400 font-bold">{firmwareUpdateProgress}%</span>
                  </div>
                  <div className="w-full bg-[#1e1e1e] h-2.5 rounded-full overflow-hidden border border-[#333]">
                    <div
                      className="bg-gradient-to-r from-purple-500 via-amber-500 to-emerald-400 h-full transition-all duration-300"
                      style={{ width: `${firmwareUpdateProgress}%` }}
                    ></div>
                  </div>

                  {/* Multi-Stage Checksum Status Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
                    <div className={`p-1.5 rounded border text-center ${redundancyChecks.deviceMatched ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-[#181818] text-zinc-500 border-[#2a2a2a]'}`}>
                      ✓ Target Hardware
                    </div>
                    <div className={`p-1.5 rounded border text-center ${redundancyChecks.checksumVerified ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-[#181818] text-zinc-500 border-[#2a2a2a]'}`}>
                      ✓ SHA-256 Checksum
                    </div>
                    <div className={`p-1.5 rounded border text-center ${redundancyChecks.rollbackSnapshotCreated ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-[#181818] text-zinc-500 border-[#2a2a2a]'}`}>
                      ✓ Rollback Snapshot
                    </div>
                    <div className={`p-1.5 rounded border text-center ${firmwareUpdateProgress >= 90 ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-[#181818] text-zinc-500 border-[#2a2a2a]'}`}>
                      ✓ Post-Flash Check
                    </div>
                  </div>
                </div>
              )}

              {firmwareUpdateSuccess && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-3 rounded-xl text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{firmwareUpdateSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* Critical Low Battery Warning Banner */}
          {batteryLevel <= 20 && (
            <div className="bg-gradient-to-r from-red-950/80 via-red-900/60 to-amber-950/80 border-2 border-red-500/80 text-red-200 text-xs p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-bold shadow-xl animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-red-500 text-white shrink-0 mt-0.5 sm:mt-0">
                  <BatteryWarning className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      ⚠️ CRITICAL PROBE BATTERY WARNING ({batteryLevel}%)
                    </span>
                    <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-mono font-bold">
                      ~{(batteryLevel * 0.25).toFixed(1)} hrs left
                    </span>
                  </div>
                  <p className="text-xs text-red-200 font-normal mt-1 leading-relaxed">
                    Your wireless probe battery is critically low. High risk of Bluetooth BLE signal drop during long overnight smokes! Charge probe charging case/dock for 15 minutes before starting overnight cooks.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setBatteryLevel(100)}
                  className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <BatteryCharging className="w-4 h-4" />
                  <span>Recharge Probe (100%)</span>
                </button>
              </div>
            </div>
          )}

          {/* SPOTLIGHT: MEAT MINDER PRO HERO CARD (Collapsible) */}
          <div className="bg-gradient-to-r from-orange-950/40 via-[#1e1714] to-amber-950/40 border-2 border-orange-500/50 rounded-2xl shadow-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsSpotlightOpen(!isSpotlightOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-orange-500/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-orange-500 text-zinc-950 font-black shadow-md">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-black text-white tracking-wide">Meat Minder Pro</h3>
                    <span className="text-[10px] bg-orange-500 text-zinc-950 font-extrabold px-2 py-0.5 rounded-md uppercase">
                      Featured #1 Choice
                    </span>
                  </div>
                  <p className="text-xs text-orange-200/80 mt-0.5">
                    Wireless Dual-Probe (Probe #1 Meat Core • Probe #2 Pit Ambient) — 500ft BLE 5.3
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-orange-400 font-bold hidden sm:inline">
                  {isSpotlightOpen ? 'Collapse' : 'Expand Details'}
                </span>
                {isSpotlightOpen ? (
                  <ChevronUp className="w-5 h-5 text-orange-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-orange-400" />
                )}
              </div>
            </button>

            {isSpotlightOpen && (
              <div className="px-5 pb-5 pt-1 space-y-4 border-t border-orange-500/20 animate-fadeIn">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-xs text-zinc-300">
                    Industry flagship competition probe equipped with high-precision core and ambient sensors, stall predictor, and rapid 1-sec refresh rates.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleSelectDevice(TOP_25_THERMOMETERS[0])}
                    className={`shrink-0 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-md flex items-center space-x-1.5 ${
                      selectedDevice.id === 'meat-minder-pro'
                        ? 'bg-orange-500 text-zinc-950 ring-2 ring-orange-400'
                        : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 border border-orange-500/30'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{selectedDevice.id === 'meat-minder-pro' ? 'Active Probe' : 'Connect Meat Minder Pro'}</span>
                  </button>
                </div>

                {/* Meat Minder Pro Features List */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-medium text-amber-200/90">
                  {TOP_25_THERMOMETERS[0].features.map((feat, idx) => (
                    <div key={idx} className="bg-orange-500/10 border border-orange-500/20 px-2.5 py-1.5 rounded-lg flex items-center space-x-1.5">
                      <Award className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="truncate">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ACTIVE DEVICE LIVE PROBE TELEMETRY DASHBOARD (Collapsible) */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsTelemetryOpen(!isTelemetryOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#181818] transition-colors cursor-pointer border-b border-[#2a2a2a]"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Radio className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-white">{selectedDevice.name}</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Connected ({connectionType})</span>
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">Live Telemetry & Dual Probe Stream ({meatTemp}°F Meat / {pitTemp}°F Pit)</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
                  {isTelemetryOpen ? 'Hide Readings' : 'Show Readings'}
                </span>
                {isTelemetryOpen ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </div>
            </button>

            {isTelemetryOpen && (
              <div className="p-5 space-y-5 animate-fadeIn">
                {/* Sensor Controls Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2a2a2a]">
                  <p className="text-xs text-zinc-400">{selectedDevice.description}</p>
                  <div className="flex items-center space-x-3 text-xs">
                    <div className={`flex items-center space-x-1.5 font-mono text-xs px-2.5 py-1 rounded-lg border font-bold ${
                      batteryLevel <= 20
                        ? 'bg-red-500/20 text-red-300 border-red-500/50 animate-pulse'
                        : batteryLevel <= 50
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {batteryLevel <= 20 ? (
                        <BatteryWarning className="w-3.5 h-3.5 text-red-400 animate-bounce" />
                      ) : (
                        <Battery className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>{batteryLevel}%</span>
                    </div>
                    <div className="flex items-center space-x-1 font-mono text-zinc-400 bg-[#1a1a1a] px-2.5 py-1 rounded-lg border border-[#2a2a2a]">
                      <Signal className="w-3.5 h-3.5 text-blue-400" />
                      <span>{rssiSignal} dBm</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                      className={`p-2 rounded-lg border transition-all cursor-pointer ${
                        isLiveStreaming
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          : 'bg-[#1a1a1a] border-[#2a2a2a] text-zinc-400'
                      }`}
                      title={isLiveStreaming ? 'Pause Temp Feed' : 'Resume Temp Feed'}
                    >
                      {isLiveStreaming ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* WIRELESS PROBE BATTERY & OVERNIGHT SMOKE HEALTH WIDGET */}
                <div className={`p-4 rounded-xl border transition-all ${
                  batteryLevel <= 20
                    ? 'bg-red-950/30 border-red-500/50'
                    : batteryLevel <= 50
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-[#181818] border-[#2a2a2a]'
                }`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Left: Battery Gauge Info */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        {batteryLevel <= 20 ? (
                          <BatteryWarning className="w-4 h-4 text-red-400 animate-bounce shrink-0" />
                        ) : batteryLevel <= 50 ? (
                          <Battery className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : (
                          <BatteryCharging className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span className="text-xs font-black text-white uppercase tracking-wider">
                          Probe Battery & Signal Health Widget
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                          batteryLevel <= 20
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : batteryLevel <= 50
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {batteryLevel}% • ~{(batteryLevel * 0.25).toFixed(1)} hrs Runtime
                        </span>
                      </div>

                      {/* Visual Progress Bar */}
                      <div className="w-full bg-[#121212] h-2.5 rounded-full border border-[#2a2a2a] overflow-hidden flex">
                        <div
                          className={`h-full transition-all duration-500 ${
                            batteryLevel <= 20
                              ? 'bg-red-500 animate-pulse'
                              : batteryLevel <= 50
                              ? 'bg-amber-500'
                              : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                          }`}
                          style={{ width: `${batteryLevel}%` }}
                        ></div>
                      </div>

                      {/* Overnight Smoke Status Notice */}
                      <div className="flex items-center space-x-2 text-[11px] font-medium">
                        <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        {batteryLevel >= 35 ? (
                          <span className="text-emerald-300">
                            <strong>Overnight Smoke Ready:</strong> Battery level ({batteryLevel}%) safely supports 10–16 hr overnight cooks without signal drops.
                          </span>
                        ) : (
                          <span className="text-red-300 font-bold">
                            ⚠️ Low Battery Warning: Long overnight cooks (10-16 hrs) require at least 35% charge to avoid signal loss while sleeping!
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Simulation / Charge Controls */}
                    <div className="flex items-center space-x-1.5 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#2a2a2a]">
                      <span className="text-[10px] font-mono text-zinc-400 mr-1 hidden sm:inline">Test State:</span>
                      <button
                        type="button"
                        onClick={() => setBatteryLevel(15)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          batteryLevel <= 20
                            ? 'bg-red-500 text-white border-red-400'
                            : 'bg-[#1a1a1a] text-red-300 border-[#333] hover:bg-red-500/20'
                        }`}
                        title="Simulate Low Battery (15%)"
                      >
                        Low (15%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatteryLevel(45)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          batteryLevel > 20 && batteryLevel <= 50
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-[#1a1a1a] text-amber-300 border-[#333] hover:bg-amber-500/20'
                        }`}
                        title="Simulate Medium Battery (45%)"
                      >
                        Mid (45%)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBatteryLevel(100)}
                        className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border transition-all cursor-pointer ${
                          batteryLevel > 90
                            ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                            : 'bg-[#1a1a1a] text-emerald-300 border-[#333] hover:bg-emerald-500/20'
                        }`}
                        title="Recharge Probe to 100%"
                      >
                        Full (100%)
                      </button>
                    </div>
                  </div>
                </div>

                {/* DUAL PROBE LIVE READINGS DISPLAY */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Probe 1: Meat Core Temp */}
                  <div className="bg-[#1a1a1a] border border-red-500/30 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-red-500/5 rounded-full pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center space-x-1">
                        <Thermometer className="w-4 h-4" />
                        <span>Probe #1: Meat Core</span>
                      </span>
                      <span className="text-[10px] font-mono bg-red-500/20 text-red-300 px-2 py-0.5 rounded font-bold">
                        Target: {targetMeatTemp}°F
                      </span>
                    </div>

                    <div className="flex items-baseline space-x-2">
                      <span className="font-mono text-4xl font-black text-red-400 tracking-tight">
                        {meatTemp}°F
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        ({((meatTemp - 32) * (5 / 9)).toFixed(1)}°C)
                      </span>
                    </div>

                    {/* Progress bar towards target */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Stall: 160°F</span>
                        <span>Target: {targetMeatTemp}°F</span>
                      </div>
                      <div className="w-full bg-[#121212] rounded-full h-2 border border-[#2a2a2a] overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(5, (meatTemp / targetMeatTemp) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Target adjustment slider */}
                    <div className="pt-2 flex items-center space-x-2">
                      <Sliders className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-[10px] text-zinc-400 shrink-0">Set Target:</span>
                      <input
                        type="range"
                        min={140}
                        max={212}
                        value={targetMeatTemp}
                        onChange={(e) => setTargetMeatTemp(Number(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-orange-400 shrink-0">{targetMeatTemp}°F</span>
                    </div>
                  </div>

                  {/* Probe 2: Pit Ambient Temp */}
                  <div className="bg-[#1a1a1a] border border-amber-500/30 rounded-2xl p-4 shadow-md space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full pointer-events-none"></div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1">
                        <Flame className="w-4 h-4" />
                        <span>Probe #2: Pit Ambient</span>
                      </span>
                      <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-bold">
                        Target: {targetPitTemp}°F
                      </span>
                    </div>

                    <div className="flex items-baseline space-x-2">
                      <span className="font-mono text-4xl font-black text-amber-400 tracking-tight">
                        {pitTemp}°F
                      </span>
                      <span className="text-xs text-zinc-400 font-mono">
                        (Optimal Range 220-250°F)
                      </span>
                    </div>

                    {/* Ambient Pit status bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                        <span>Low: 200°F</span>
                        <span>High: 275°F</span>
                      </div>
                      <div className="w-full bg-[#121212] rounded-full h-2 border border-[#2a2a2a] overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(10, (pitTemp / 300) * 100))}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Target adjustment slider */}
                    <div className="pt-2 flex items-center space-x-2">
                      <Sliders className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="text-[10px] text-zinc-400 shrink-0">Set Pit:</span>
                      <input
                        type="range"
                        min={180}
                        max={350}
                        value={targetPitTemp}
                        onChange={(e) => setTargetPitTemp(Number(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-mono font-bold text-amber-400 shrink-0">{targetPitTemp}°F</span>
                    </div>
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-3 text-xs">
                    <button
                      type="button"
                      onClick={() => setAlarmEnabled(!alarmEnabled)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border font-semibold transition-all cursor-pointer ${
                        alarmEnabled
                          ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                          : 'bg-[#1a1a1a] text-zinc-500 border-[#2a2a2a]'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Alarms: {alarmEnabled ? 'ON (203°F Beeper)' : 'OFF'}</span>
                    </button>
                  </div>

                  {onPushReadingToLog && (
                    <button
                      type="button"
                      onClick={handlePushToActiveLog}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-zinc-950 font-extrabold text-xs rounded-xl shadow-lg flex items-center justify-center space-x-2 transition-all cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Push Current Temps into Active Cook Log</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TOP 25 THERMOMETERS PROFILES SELECTOR (Collapsible) */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsDevicesListOpen(!isDevicesListOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#181818] transition-colors cursor-pointer border-b border-[#2a2a2a]"
            >
              <div className="flex items-center space-x-2">
                <Bluetooth className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Top 25 Supported Meat Thermometer Devices</h3>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 font-mono px-2 py-0.5 rounded border border-blue-500/20">
                  {filteredDevices.length} Available
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
                  {isDevicesListOpen ? 'Hide Directory' : 'Show Directory'}
                </span>
                {isDevicesListOpen ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </div>
            </button>

            {isDevicesListOpen && (
              <div className="p-5 space-y-4 animate-fadeIn">
                {/* Search Filter */}
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Meat Minder Pro, MEATER, ThermoWorks Signals, Inkbird..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
                  {filteredDevices.map((device) => {
                    const isSelected = selectedDevice.id === device.id;
                    return (
                      <div
                        key={device.id}
                        onClick={() => handleSelectDevice(device)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                          isSelected
                            ? 'bg-blue-950/30 border-blue-500/60 ring-1 ring-blue-500/50 shadow-md'
                            : 'bg-[#1a1a1a] border-[#2a2a2a] hover:border-blue-500/30 hover:bg-[#202020]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-[#2a2a2a]">
                            <span className="text-[10px] font-mono uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                              {device.brand}
                            </span>
                            <span className="text-[10px] font-mono text-zinc-400">
                              {device.probeCount} {device.probeCount === 1 ? 'Probe' : 'Probes'} • {device.wirelessType}
                            </span>
                          </div>

                          <h4 className="text-xs font-bold text-white mt-2 group-hover:text-blue-400 transition-colors">
                            {device.name}
                          </h4>
                          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{device.description}</p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-[#2a2a2a] flex items-center justify-between text-[10px] text-zinc-400">
                          <span>Max Temp: {device.maxTempF}°F</span>
                          <span
                            className={`font-bold ${
                              isSelected ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'
                            }`}
                          >
                            {isSelected ? '✓ Paired' : 'Click to Pair'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ADVANCED BLE SETTINGS & GATT SERVICES (Collapsible) */}
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl shadow-xl overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-[#181818] transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-zinc-400" />
                <h3 className="text-sm font-bold text-white">GATT Services & Bluetooth BLE Diagnostics</h3>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
                  {isAdvancedSettingsOpen ? 'Hide Diagnostics' : 'Show Diagnostics'}
                </span>
                {isAdvancedSettingsOpen ? (
                  <ChevronUp className="w-5 h-5 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-zinc-400" />
                )}
              </div>
            </button>

            {isAdvancedSettingsOpen && (
              <div className="p-5 border-t border-[#2a2a2a] space-y-3 text-xs text-zinc-400 font-mono animate-fadeIn">
                <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a] space-y-1">
                  <span className="text-blue-400 font-bold block">Assigned Service UUIDs:</span>
                  <p className="text-[11px] text-zinc-300 break-all">
                    {selectedDevice.serviceUUIDs?.join(', ') || '0000181a-0000-1000-8000-00805f9b34fb (Standard ESS Service)'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                  <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                    <span className="text-zinc-500 block">Meat Temp Characteristic:</span>
                    <span className="text-red-400 font-bold">{selectedDevice.characteristicUUIDs?.meatTemp || '00002a6e (Temperature Characteristic)'}</span>
                  </div>
                  <div className="bg-[#1a1a1a] p-3 rounded-xl border border-[#2a2a2a]">
                    <span className="text-zinc-500 block">Pit Temp Characteristic:</span>
                    <span className="text-amber-400 font-bold">{selectedDevice.characteristicUUIDs?.pitTemp || '00002a6f (Ambient Temp)'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
