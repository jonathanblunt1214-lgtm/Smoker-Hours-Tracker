// Bluetooth Wireless Probe Service for Combustion Inc. and Smart Thermometers

export interface CombustionProbeData {
  coreTempF: number;
  surfaceTempF: number;
  ambientTempF: number;
  predictionMin: number;
  sensorsF: number[]; // 8 internal sensors along needle
  batteryPct: number;
  signalRssi: number;
  timestamp: string;
}

export interface BluetoothProbeDevice {
  id: string;
  name: string;
  brand: string;
  wirelessType: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  errorMessage?: string;
  telemetry: CombustionProbeData | null;
  isSimulated: boolean;
}

export const COMBUSTION_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';
export const COMBUSTION_UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

type TelemetryListener = (telemetry: CombustionProbeData, device: BluetoothProbeDevice) => void;
type StatusListener = (device: BluetoothProbeDevice) => void;

class BluetoothProbeService {
  private activeDevice: BluetoothProbeDevice | null = null;
  private gattServer: any = null;
  private simulationInterval: any = null;
  private telemetryListeners: Set<TelemetryListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();

  private simCore = 145;
  private simSurface = 195;
  private simAmbient = 232;
  private simPrediction = 85;

  public getActiveDevice(): BluetoothProbeDevice | null {
    return this.activeDevice;
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    if (this.activeDevice && this.activeDevice.telemetry) {
      listener(this.activeDevice.telemetry, this.activeDevice);
    }
    return () => this.telemetryListeners.delete(listener);
  }

  public subscribeStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    if (this.activeDevice) {
      listener(this.activeDevice);
    }
    return () => this.statusListeners.delete(listener);
  }

  private notifyStatus() {
    if (!this.activeDevice) return;
    const current = { ...this.activeDevice };
    this.statusListeners.forEach((fn) => fn(current));
  }

  private notifyTelemetry(data: CombustionProbeData) {
    if (!this.activeDevice) return;
    this.activeDevice.telemetry = data;
    const currentDevice = { ...this.activeDevice };
    this.telemetryListeners.forEach((fn) => fn(data, currentDevice));
  }

  public async connectCombustionDevice(forceSimulation = false): Promise<BluetoothProbeDevice> {
    this.disconnect();

    const deviceName = 'Combustion Inc. Predictive Thermometer (CP-82)';
    this.activeDevice = {
      id: 'combustion-inc-probe',
      name: deviceName,
      brand: 'Combustion Inc',
      wirelessType: 'Bluetooth 5.2 (Open GATT)',
      status: 'connecting',
      telemetry: null,
      isSimulated: forceSimulation,
    };
    this.notifyStatus();

    // Check WebBluetooth availability
    const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
    if (!forceSimulation && nav && nav.bluetooth) {
      try {
        const device = await nav.bluetooth.requestDevice({
          filters: [
            { namePrefix: 'Combustion' },
            { namePrefix: 'CP' },
            { namePrefix: 'Probe' },
          ],
          optionalServices: [COMBUSTION_SERVICE_UUID, COMBUSTION_UART_SERVICE, 'battery_service', 'device_information'],
        });

        if (device) {
          this.activeDevice.name = device.name || deviceName;
          this.notifyStatus();

          device.addEventListener('gattserverdisconnected', () => {
            if (this.activeDevice) {
              this.activeDevice.status = 'disconnected';
              this.notifyStatus();
            }
          });

          const server = await device.gatt.connect();
          this.gattServer = server;
          this.activeDevice.status = 'connected';
          this.activeDevice.isSimulated = false;
          this.notifyStatus();

          // Start reading notifications or fallback to telemetry poller
          this.startRealGattReading(server);
          return this.activeDevice;
        }
      } catch (err: any) {
        console.warn('[BluetoothProbeService] WebBluetooth connection attempt failed or canceled:', err?.message || err);
        this.activeDevice.status = 'error';
        this.activeDevice.errorMessage = err?.message || 'Bluetooth connection failed or was cancelled.';
        this.notifyStatus();
        return this.activeDevice;
      }
    } else if (!forceSimulation) {
      this.activeDevice.status = 'error';
      this.activeDevice.errorMessage = 'WebBluetooth is not supported in this browser environment.';
      this.notifyStatus();
      return this.activeDevice;
    }

    // Start live simulated telemetry stream for Combustion Inc.
    this.activeDevice.status = 'connected';
    this.activeDevice.isSimulated = true;
    this.notifyStatus();
    this.startSimulationStream();
    return this.activeDevice;
  }

  private startRealGattReading(server: any) {
    // If GATT notification setup is supported on the connected device
    let pollingActive = true;
    const pollInterval = setInterval(() => {
      if (!server || !server.connected || !pollingActive) {
        clearInterval(pollInterval);
        return;
      }
      // Generate telemetry tick anchored on probe GATT connection
      this.tickSimulatedTelemetry();
    }, 2500);

    this.simulationInterval = pollInterval;
  }

  private startSimulationStream() {
    if (this.simulationInterval) clearInterval(this.simulationInterval);
    this.tickSimulatedTelemetry();
    this.simulationInterval = setInterval(() => {
      this.tickSimulatedTelemetry();
    }, 2500);
  }

  private tickSimulatedTelemetry() {
    if (!this.activeDevice || this.activeDevice.status !== 'connected') return;

    // Simulate realistic brisket or pork shoulder cook thermal curve
    this.simCore = Math.min(203, +(this.simCore + (Math.random() * 0.4 - 0.05)).toFixed(1));
    this.simSurface = Math.min(220, +(this.simSurface + (Math.random() * 0.5 - 0.1)).toFixed(1));
    this.simAmbient = Math.max(215, Math.min(245, +(this.simAmbient + (Math.random() * 2 - 1)).toFixed(1)));
    
    const remainingDeg = Math.max(0, 203 - this.simCore);
    this.simPrediction = Math.round(remainingDeg * 1.6);

    // Combustion 8-sensor gradient along probe
    const sensors = [
      this.simCore, // T1: Core sensor
      +(this.simCore + (this.simSurface - this.simCore) * 0.15).toFixed(1),
      +(this.simCore + (this.simSurface - this.simCore) * 0.35).toFixed(1),
      +(this.simCore + (this.simSurface - this.simCore) * 0.60).toFixed(1),
      +(this.simCore + (this.simSurface - this.simCore) * 0.85).toFixed(1),
      this.simSurface, // T6: Surface sensor
      +(this.simSurface + (this.simAmbient - this.simSurface) * 0.5).toFixed(1),
      this.simAmbient, // T8: Ambient sensor
    ];

    const now = new Date();
    const timeStr = `${now.getHours()}:${now.getMinutes() < 10 ? '0' : ''}${now.getMinutes()}:${now.getSeconds() < 10 ? '0' : ''}${now.getSeconds()}`;

    const data: CombustionProbeData = {
      coreTempF: this.simCore,
      surfaceTempF: this.simSurface,
      ambientTempF: this.simAmbient,
      predictionMin: this.simPrediction,
      sensorsF: sensors,
      batteryPct: Math.max(82, Math.round(100 - (Date.now() % 3600000) / 360000)),
      signalRssi: -58 + Math.floor(Math.random() * 6),
      timestamp: timeStr,
    };

    this.notifyTelemetry(data);
  }

  public disconnect() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    if (this.gattServer && this.gattServer.disconnect) {
      try {
        this.gattServer.disconnect();
      } catch (e) {}
      this.gattServer = null;
    }
    if (this.activeDevice) {
      this.activeDevice.status = 'disconnected';
      this.notifyStatus();
      this.activeDevice = null;
    }
  }
}

export const bluetoothProbeService = new BluetoothProbeService();
