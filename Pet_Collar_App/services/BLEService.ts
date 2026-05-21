import { BleManager, Device } from 'react-native-ble-plx';

class BLEService {
  private static instance: BLEService;
  public manager: BleManager;
  private connectedDevice: Device | null = null;

  private constructor() {
    this.manager = new BleManager();
  }

  // Đảm bảo toàn bộ App chỉ có đúng 1 instance duy nhất được khởi tạo
  public static getInstance(): BLEService {
    if (!BLEService.instance) {
      BLEService.instance = new BLEService();
    }
    return BLEService.instance;
  }

  public setConnectedDevice(device: Device | null) {
    this.connectedDevice = device;
  }

  public getConnectedDevice(): Device | null {
    return this.connectedDevice;
  }
}

export default BLEService.getInstance();