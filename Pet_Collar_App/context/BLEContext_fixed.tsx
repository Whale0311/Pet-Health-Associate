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
  const isConnectingRef = useRef(false);
  const locationStartedRef = useRef(false);

  const processBackgroundSync = async () => {
    const now = Date.now();
    if (now - lastSyncTime.current >= 10000) {
      const { hr, temp, behavior } = bleDataRef.current;
      if (hr > 0 && temp > 0) {
        lastSyncTime.current = now;
        try {
          const token = await AsyncStorage.getItem('userToken');
          const petId = await AsyncStorage.getItem('currentPetId');
          if (!token || !petId) return;

          const payload = { 
            pet_id: parseInt(petId), 
            behavior_code: behavior, 
            heart_rate: hr, 
            temp_celsius: temp, 
            humidity: 60 
          };
          
          await axios.post('https://pet-collar-backend.onrender.com/api/health-logs', payload, { 
            headers: { Authorization: `Bearer ${token}` } 
          });
        } catch (error) {
          console.log("Background sync error:", error);
        }
      }
    }
  };

  const startLocationServiceIfNeeded = async () => {
    if (locationStartedRef.current) return;
    
    try {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_BLE_TASK);
      if (hasStarted) {
        locationStartedRef.current = true;
        return;
      }

      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== 'granted') return;

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') return;

      try {
        await Location.startLocationUpdatesAsync(BACKGROUND_BLE_TASK, {
          accuracy: Location.Accuracy.Low,
          showsBackgroundLocationIndicator: false,
          foregroundService: {
            notificationTitle: 'Pet Smart Collar',
            notificationBody: 'Đang theo dõi sức khỏe thú cưng...',
            notificationColor: '#FDCB58',
          },
        });
        locationStartedRef.current = true;
      } catch (e) {
        console.log("Location service start (non-blocking):", e);
      }
    } catch (error) {
      console.log("Location setup error:", error);
    }
  };

  const connectDevice = async (mac: string) => {
    if (!mac || isConnectingRef.current) return;
    
    try {
      const isAlreadyConnected = await bleService.manager.isDeviceConnected(mac);
      if (isAlreadyConnected) {
        setIsConnected(true);
        setConnectionStatus('Connected');
        currentMacRef.current = mac;
        startLocationServiceIfNeeded();
        return;
      }
    } catch (e) {
      console.log("Connection check error:", e);
    }

    isConnectingRef.current = true;
    currentMacRef.current = mac;
    setConnectionStatus('Connecting...');

    try {
      startLocationServiceIfNeeded();

      const device = await bleService.manager.connectToDevice(mac);
      await device.discoverAllServicesAndCharacteristics();
      bleService.setConnectedDevice(device);
      
      setIsConnected(true);
      setConnectionStatus('Connected');

      device.monitorCharacteristicForService('19b10000-e8f2-537e-4f6c-d104768a1214', '19b10002-e8f2-537e-4f6c-d104768a1214', (error, char) => {
        if (char?.value) {
          try {
            const val = atob(char.value).charCodeAt(0);
            setHeartRate(val);
            bleDataRef.current.hr = val;
            processBackgroundSync();
          } catch (e) {}
        }
      });

      device.monitorCharacteristicForService('19b10000-e8f2-537e-4f6c-d104768a1214', '19b10003-e8f2-537e-4f6c-d104768a1214', (error, char) => {
        if (char?.value) {
          try {
            const val = parseFloat(atob(char.value));
            setTemperature(val.toString());
            bleDataRef.current.temp = val;
            processBackgroundSync();
          } catch (e) {}
        }
      });

      device.monitorCharacteristicForService('19b10000-e8f2-537e-4f6c-d104768a1214', '19b10001-e8f2-537e-4f6c-d104768a1214', (error, char) => {
        if (char?.value) {
          try {
            const val = atob(char.value).charCodeAt(0);
            setBehaviorCode(val);
            bleDataRef.current.behavior = val;
            processBackgroundSync();
          } catch (e) {}
        }
      });

      bleService.manager.onDeviceDisconnected(mac, () => {
        setIsConnected(false);
        setConnectionStatus('Disconnected');
        setHeartRate('--');
        setTemperature('--');
        isConnectingRef.current = false;
      });

    } catch (error) {
      console.log("Connect Error:", error);
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      isConnectingRef.current = false;
    }
  };

  const disconnectDevice = async () => {
    if (currentMacRef.current) {
      try {
        await bleService.manager.cancelDeviceConnection(currentMacRef.current);
      } catch (e) {
        console.log("Disconnect error:", e);
      }
    }
    isConnectingRef.current = false;
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

export { BLEContext };
