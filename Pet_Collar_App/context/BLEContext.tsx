import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Device } from 'react-native-ble-plx';
import bleService from '../services/BLEService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';

interface BLEContextType {
  isConnected: boolean;
  connectionStatus: string;
  heartRate: number | string;
  temperature: string;
  behaviorCode: number;
  connectDevice: (mac: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
}

const BLEContext = createContext<BLEContextType | undefined>(undefined);
const BACKGROUND_BLE_TASK = 'BACKGROUND_BLE_TASK';

export function BLEProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [heartRate, setHeartRate] = useState<number | string>('--');
  const [temperature, setTemperature] = useState<string>('--');
  const [behaviorCode, setBehaviorCode] = useState<number>(0);

  const bleDataRef = useRef({ hr: 0, temp: 0, behavior: 0 });
  const lastSyncTime = useRef(0);
  const currentMacRef = useRef<string | null>(null);

  const processBackgroundSync = async () => {
    const now = Date.now();
    if (now - lastSyncTime.current >= 10000) {
      const { hr, temp, behavior } = bleDataRef.current;
      if (hr > 0 && temp > 0) {
        lastSyncTime.current = now;
        try {
          const token = await AsyncStorage.getItem('userToken');
          const petId = await AsyncStorage.getItem('currentPetId'); // Lưu ý: Cần set cái này khi user chọn pet
          if (!token || !petId) return;

          const payload = { pet_id: parseInt(petId), behavior_code: behavior, heart_rate: hr, temp_celsius: temp, humidity: 60 };
          const response = await axios.post('https://pet-collar-backend.onrender.com/api/health-logs', payload, { headers: { Authorization: `Bearer ${token}` } });

          if (response.data.alert) {
            Notifications.scheduleNotificationAsync({
              content: { title: response.data.alert.title, body: response.data.alert.message, sound: true },
              trigger: null,
            });
          }
        } catch (error) {
          console.log("Global Background sync error:", error);
        }
      }
    }
  };

  const connectDevice = async (mac: string) => {
    if (!mac) return;
    currentMacRef.current = mac;
    setConnectionStatus('Connecting...');

    try {
      // Bật Foreground Service
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus === 'granted') {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          await Location.startLocationUpdatesAsync(BACKGROUND_BLE_TASK, {
            accuracy: Location.Accuracy.Low,
            showsBackgroundLocationIndicator: false,
            foregroundService: {
              notificationTitle: 'Pet Smart Collar',
              notificationBody: 'Hệ thống AI đang bảo vệ thú cưng chạy ngầm...',
              notificationColor: '#FDCB58',
            },
          });
        }
      }

      const device = await bleService.manager.connectToDevice(mac);
      await device.discoverAllServicesAndCharacteristics();
      bleService.setConnectedDevice(device);
      
      setIsConnected(true);
      setConnectionStatus('Connected');

      // Đăng ký luồng lắng nghe độc nhất từ một Instance
      device.monitorCharacteristicForService('19b10000-e8f2-537e-4f6c-d104768a1214', '19b10002-e8f2-537e-4f6c-d104768a1214', (error, char) => {
        if (char?.value) {
          const val = atob(char.value).charCodeAt(0);
          setHeartRate(val);
          bleDataRef.current.hr = val;
          processBackgroundSync();
        }
      });

      device.monitorCharacteristicForService('19b10000-e8f2-537e-4f6c-d104768a1214', '19b10003-e8f2-537e-4f6c-d104768a1214', (error, char) => {
        if (char?.value) {
          const val = parseFloat(atob(char.value));
          setTemperature(val.toString());
          bleDataRef.current.temp = val;
          processBackgroundSync();
        }
      });

      device.monitorCharacteristicForService('19b10000-e8f2-537e-4f6c-d104768a1214', '19b10001-e8f2-537e-4f6c-d104768a1214', (error, char) => {
        if (char?.value) {
          const val = atob(char.value).charCodeAt(0);
          setBehaviorCode(val);
          bleDataRef.current.behavior = val;
          processBackgroundSync();
        }
      });

      bleService.manager.onDeviceDisconnected(mac, () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setHeartRate('--');
        setTemperature('--');
      });

    } catch (error) {
      console.log("Global Connect Error:", error);
      setIsConnected(false);
      setConnectionStatus('Disconnected');
    }
  };

  const disconnectDevice = async () => {
    if (currentMacRef.current) {
      try {
        await bleService.manager.cancelDeviceConnection(currentMacRef.current);
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_BLE_TASK);
        if (hasStarted) await Location.stopLocationUpdatesAsync(BACKGROUND_BLE_TASK);
      } catch (e) {
        console.log("Global Disconnect Error", e);
      }
    }
    setIsConnected(false);
    setConnectionStatus('Disconnected');
    setHeartRate('--');
    setTemperature('--');
  };

  return (
    <BLEContext.Provider value={{ isConnected, connectionStatus, heartRate, temperature, behaviorCode, connectDevice, disconnectDevice }}>
      {children}
    </BLEContext.Provider>
  );
}

export function useBLE() {
  const context = useContext(BLEContext);
  if (!context) throw new Error('useBLE phải được bọc trong BLEProvider');
  return context;
}