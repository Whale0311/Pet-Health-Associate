import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
const bleManager = new BleManager();

interface Pet {
  pet_id: number;
  name: string;
  gender: string | null;
  dob: string | null;
  weight: number | null;
  mac_address: string;
  image_url: string;
}

interface AppNotification {
  noti_id: number;
  pet_id: number;
  pet_name?: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
interface DeviceStatus {
  status: 'Disconnected' | 'Connecting' | 'Connected';
  heartRate: number | string;
  temperature: number | string;
}
const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BEHAVIOR_CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const HEARTRATE_CHAR_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214";
const TEMPERATURE_CHAR_UUID = "19b10003-e8f2-537e-4f6c-d104768a1214";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
const CARD_COLORS = ['#B3A4D4', '#A2C2D6', '#D9A8D4', '#E8ABA2', '#E2CAAA'];

export default function HomeScreen() {
  const router = useRouter();
  const [userName, setUserName] = useState('User');
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  // Global Real-time States for Multiple Devices
  const [devicesState, setDevicesState] = useState<Record<number, DeviceStatus>>({});
  const activeConnections = useRef<Record<number, Device>>({});

  // --- STATE THÔNG BÁO ---
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifModal, setShowNotifModal] = useState(false);

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [isInSelectionMode, setIsInSelectionMode] = useState(false);
  const [selectedPetIds, setSelectedPetIds] = useState<Set<number>>(new Set());

  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDevices, setScannedDevices] = useState<Device[]>([]);
  const [showAddPetModal, setShowAddPetModal] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetGender, setNewPetGender] = useState('Male');
  const [newPetWeight, setNewPetWeight] = useState('');
  const [newPetMac, setNewPetMac] = useState('');
  const [newPetDob, setNewPetDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);  
  const [newPetImageUri, setNewPetImageUri] = useState<string | null>(null);
  const [newPetImageBase64, setNewPetImageBase64] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      fetchNotifications();
    }, [])
  );

  // 1. Hệ thống Nghe Thông báo Khẩn cấp Toàn cục (Global Socket)
  useEffect(() => {
    let socket: any;
    const setupGlobalRealtimeEngine = async () => {
      await Notifications.requestPermissionsAsync();
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const user = JSON.parse(userInfoString);
        const userId = user.user_id || user.id;
        socket = io('https://pet-collar-backend.onrender.com'); 
        socket.on(`new_alert_user_${userId}`, (alertData: any) => {
          fetchNotifications();
          if (alertData && alertData.title) {
            Notifications.scheduleNotificationAsync({
              content: { title: alertData.title, body: alertData.message, sound: true },
              trigger: null, 
            });
          }
        });
      }
    };
    setupGlobalRealtimeEngine();
    return () => { if (socket) socket.disconnect(); };
  }, []);

  // 2. Hệ thống Theo dõi Thiết bị & Đa kết nối BLE
  useEffect(() => {
    if (pets.length === 0) return;
    const devicesToConnect = pets.slice(0, 3); // Giới hạn tối đa 3 thiết bị

    devicesToConnect.forEach((pet) => {
      if (activeConnections.current[pet.pet_id] || devicesState[pet.pet_id]?.status === 'Connected') return;
      connectDeviceInBackground(pet.pet_id, pet.mac_address);
    });

    const socket = io('https://pet-collar-backend.onrender.com');
    devicesToConnect.forEach((pet) => {
      socket.off(`new_health_data_${pet.pet_id}`);
      socket.on(`new_health_data_${pet.pet_id}`, (newData: any) => {
        setDevicesState(prev => {
          if (prev[pet.pet_id]?.status === 'Connected') return prev; 
          return {
            ...prev,
            [pet.pet_id]: { status: 'Disconnected', heartRate: newData.heart_rate, temperature: newData.temp_celsius }
          };
        });
      });
    });
    return () => { socket.disconnect(); };
  }, [pets]);

  // 3. Hàm Xử lý Kết nối BLE Ngầm
  const connectDeviceInBackground = async (petId: number, macAddress: string) => {
    if (!macAddress) return;
    setDevicesState(prev => ({ ...prev, [petId]: { status: 'Connecting', heartRate: '--', temperature: '--' } }));

    try {
      const device = await bleManager.connectToDevice(macAddress);
      await device.discoverAllServicesAndCharacteristics();
      activeConnections.current[petId] = device;

      setDevicesState(prev => ({ ...prev, [petId]: { ...prev[petId], status: 'Connected' } }));

      let localHR: number | string = '--';
      let localTemp: string | number = '--';
      let localBehavior = 0;

      const dataSyncTimer = setInterval(async () => {
        if (localHR !== '--' && localTemp !== '--') {
          try {
            const token = await AsyncStorage.getItem('userToken');
            if (token) {
              await axios.post('https://pet-collar-backend.onrender.com/api/health-logs', {
                pet_id: petId, behavior_code: localBehavior, heart_rate: Number(localHR), temp_celsius: Number(localTemp), humidity: 60
              }, { headers: { Authorization: `Bearer ${token}` } });
            }
          } catch (err) {}
        }
      }, 10000);

      device.monitorCharacteristicForService(SERVICE_UUID, HEARTRATE_CHAR_UUID, (err, char) => {
        if (char?.value) {
          localHR = atob(char.value).charCodeAt(0);
          setDevicesState(prev => ({ ...prev, [petId]: { ...prev[petId], heartRate: localHR } }));
        }
      });

      device.monitorCharacteristicForService(SERVICE_UUID, TEMPERATURE_CHAR_UUID, (err, char) => {
        if (char?.value) {
          localTemp = atob(char.value);
          setDevicesState(prev => ({ ...prev, [petId]: { ...prev[petId], temperature: localTemp } }));
        }
      });

      device.monitorCharacteristicForService(SERVICE_UUID, BEHAVIOR_CHAR_UUID, (err, char) => {
        if (char?.value) localBehavior = atob(char.value).charCodeAt(0);
      });

      bleManager.onDeviceDisconnected(macAddress, () => {
        clearInterval(dataSyncTimer);
        delete activeConnections.current[petId];
        setDevicesState(prev => ({ ...prev, [petId]: { status: 'Disconnected', heartRate: '--', temperature: '--' } }));
      });
    } catch (error) {
      setDevicesState(prev => ({ ...prev, [petId]: { status: 'Disconnected', heartRate: '--', temperature: '--' } }));
    }
  };

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await axios.get('https://pet-collar-backend.onrender.com/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.status === 'success') {
        const notifs = response.data.data;
        setNotifications(notifs);
        const unread = notifs.filter((n: AppNotification) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (error) { console.log('Lỗi tải thông báo'); }
  };

  const handleOpenNotifications = async () => {
    setShowNotifModal(true);
    if (unreadCount > 0) {
      try {
        const token = await AsyncStorage.getItem('userToken');
        await axios.put('https://pet-collar-backend.onrender.com/api/notifications/read-all', {}, { headers: { Authorization: `Bearer ${token}` } });
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      } catch (error) { console.log('Lỗi cập nhật đã đọc'); }
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    date.setHours(date.getHours() + 7);
    
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate()}/${date.getMonth()+1}`;
  };

  const loadUserData = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const token = await AsyncStorage.getItem('userToken');

      if (userInfoString) {
        const user = JSON.parse(userInfoString);
        setUserName(user.name || user.full_name || 'User');
      }

      if (token) {
        const SERVER_URL = 'https://pet-collar-backend.onrender.com/api/pets'; 
        const response = await axios.get(SERVER_URL, { headers: { Authorization: `Bearer ${token}` } });
        if (response.data.status === 'success') {
          setPets(response.data.data);
        }
      }
    } catch (error) {
      console.error("Lỗi tải dữ liệu Pets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await AsyncStorage.clear(); router.replace('/'); } }
    ]);
  };

  const toggleSelection = (petId: number) => {
    setSelectedPetIds((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      if (next.size === 0) setIsInSelectionMode(false);
      return next;
    });
  };

  const handleLongPress = (petId: number) => {
    if (!isInSelectionMode) {
      setIsInSelectionMode(true);
      setSelectedPetIds(new Set([petId]));
    }
  };

  const exitSelectionMode = () => { setIsInSelectionMode(false); setSelectedPetIds(new Set()); };

  const confirmDeleteSelected = () => {
    Alert.alert("Remove Pet", `Are you sure you want to remove ${selectedPetIds.size} selected pets?`, [
      { text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: executeDeleteSelected }
    ]);
  };

  const executeDeleteSelected = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const idsArray = Array.from(selectedPetIds);
      const SERVER_URL_BASE = 'https://pet-collar-backend.onrender.com/api/pets'; 
      const deletePromises = idsArray.map(petId => axios.delete(`${SERVER_URL_BASE}/${petId}`, { headers: { Authorization: `Bearer ${token}` } }));
      await Promise.all(deletePromises);
      Alert.alert("Success", `Successfully removed ${idsArray.length} pets from the system.`);
      loadUserData(); exitSelectionMode();
    } catch (error) {
      Alert.alert("Error", "Failed to delete pet profiles."); exitSelectionMode();
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewPetImageUri(result.assets[0].uri);
      setNewPetImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };
  const onChangeDate = (event: any, selectedDate?: Date) => { setShowDatePicker(false); if (selectedDate) setNewPetDob(selectedDate); };

  const startScanBLE = async () => {
    try {
      // 1. Thuật toán xin quyền Bluetooth chuẩn cho mọi đời Android
      let permissionGranted = false;
      if (Platform.OS === 'android' && Platform.Version >= 31) {
        // Dành cho Android 12+: Xin quyền "Thiết bị ở gần"
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        permissionGranted = 
          result['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          result['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED;
      } else if (Platform.OS === 'android') {
        // Dành cho Android 11 trở xuống: Vẫn cần quyền Vị trí
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        permissionGranted = result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        permissionGranted = true; // iOS
      }

      if (!permissionGranted) {
        Alert.alert("Permission Denied", "Please allow 'Nearby Devices' permission to scan for collars.");
        return;
      }

      // 2. Bắt đầu quét
      setShowScanModal(true); 
      setIsScanning(true); 
      setScannedDevices([]);

      bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) { 
          setIsScanning(false); 
          return; 
        }
        
        if (device && (device.name && device.name.includes("Pet_Smart_Collar"))) {
          setScannedDevices((prev) => {
            if (!prev.find((d) => d.id === device.id)) return [...prev, device]; 
            return prev;
          });
        }
      });

      // Tự động dừng quét sau 10 giây
      setTimeout(() => { 
        bleManager.stopDeviceScan(); 
        setIsScanning(false); 
      }, 10000);

    } catch (err) { 
      console.warn("Scan Error:", err); 
    }
  };
  
  const handleSelectDevice = (device: Device) => { bleManager.stopDeviceScan(); setIsScanning(false); setShowScanModal(false); setNewPetMac(device.id); setShowAddPetModal(true); };
  
  // --- HÀM HỖ TRỢ: Dọn dẹp form sau khi thêm/join thành công ---
  const resetAddPetForm = () => {
    setShowAddPetModal(false); 
    setNewPetName(''); 
    setNewPetWeight(''); 
    setNewPetGender('Male'); 
    setNewPetDob(null); 
    setNewPetMac(''); 
    setNewPetImageUri(null); 
    setNewPetImageBase64(null); 
    setLoading(true); 
    loadUserData(); 
  };

  // --- HÀM JOIN THÚ CƯNG (Khi vòng cổ đã có chủ) ---
  const handleJoinPet = async (macAddress: string) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const JOIN_URL = 'https://pet-collar-backend.onrender.com/api/pets/join';
      
      const response = await axios.post(JOIN_URL, { mac_address: macAddress }, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      if (response.data.status === 'success') {
        Alert.alert("Success!", "Successfully connected to follow the pet.");
        resetAddPetForm();
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to join pet following.");
    }
  };

  // --- HÀM TẠO THÚ CƯNG MỚI ---
  const handleAddPet = async () => {
    if (!newPetName || !newPetMac) { Alert.alert("Error", "Please enter the pet's name and scan the MAC address!"); return; }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const SERVER_URL = 'https://pet-collar-backend.onrender.com/api/pets'; 
      const payload = { 
        name: newPetName, 
        gender: newPetGender || null, 
        dob: newPetDob ? newPetDob.toISOString().split('T')[0] : null, 
        weight: newPetWeight ? parseFloat(newPetWeight) : null, 
        mac_address: newPetMac, 
        image_url: newPetImageBase64 || null 
      };
      
      const response = await axios.post(SERVER_URL, payload, { headers: { Authorization: `Bearer ${token}` } });
      
      if (response.data.status === 'success') {
        Alert.alert("Success!", "Successfully added new pet."); 
        resetAddPetForm();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "";
      
      // KIỂM TRA LỖI TRÙNG MAC TỪ BACKEND
      // (Lưu ý: Chữ "tồn tại" hoặc "already" tùy thuộc vào câu báo lỗi mà Backend của bạn trả về)
      if (errorMsg.includes("tồn tại") || errorMsg.includes("already") || error.response?.status === 400) {
        Alert.alert(
          "Device Detected",
          "This device has already been registered in the system. Do you want to join following this pet?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Join", onPress: () => handleJoinPet(newPetMac) }
          ]
        );
      } else {
        Alert.alert("Error", errorMsg || "Failed to connect to the server.");
      }
    }
  };

const handleChangePassword = async () => {
    // 1. Kiểm tra xem người dùng đã nhập đủ các ô chưa
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      Alert.alert("Error", "Please fill in all fields!");
      return;
    }

    // 2. Kiểm tra mật khẩu xác nhận
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Error", "The confirmation password does not match!");
      return;
    }

    try {
      // 3. Lấy thẻ căn cước (Token) để chứng minh mình đã đăng nhập
      const token = await AsyncStorage.getItem('userToken');
      
      // Chú ý: Đổi IP này thành đường link Render.com nếu bạn đang test bằng server Cloud
      const SERVER_URL = 'https://pet-collar-backend.onrender.com/api/auth/change-password'; 

      // 4. Gửi yêu cầu đổi mật khẩu xuống Server Node.js
      const response = await axios.put(SERVER_URL, {
        old_password: currentPassword,
        new_password: newPassword,
        confirm_new_password: confirmNewPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 5. Nếu thành công, thông báo và dọn dẹp Form
      if (response.data.status === 'success') {
        Alert.alert("Success!", response.data.message);
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (error: any) {
      // 6. Bắt lỗi (sai mật khẩu cũ, trùng mật khẩu...) từ Backend gửi lên
      if (error.response && error.response.data && error.response.data.message) {
        Alert.alert("Error", error.response.data.message);
      } else {
        Alert.alert("Error", "Failed to connect to the server.");
      }
    }
  };
  const renderPetCard = ({ item, index }: { item: Pet; index: number }) => {
    const bgColor = CARD_COLORS[index % CARD_COLORS.length];
    const isSelected = selectedPetIds.has(item.pet_id);
    const liveState = devicesState[item.pet_id] || { status: 'Disconnected', heartRate: '--', temperature: '--' };
    const dotColor = liveState.status === 'Connected' ? '#4CAF50' : liveState.status === 'Connecting' ? '#FFC107' : 'rgba(255,255,255,0.4)';

    return (
      <TouchableOpacity 
        style={[styles.petCard, { backgroundColor: bgColor }, isSelected && { borderWidth: 3, borderColor: '#FDCB58', padding: 12 }]}
        onPress={() => {
          if (isInSelectionMode) toggleSelection(item.pet_id);
          else router.push({ pathname: '/pet/[id]', params: { id: item.pet_id, mac: item.mac_address, name: item.name, gender: item.gender ? String(item.gender) : '', weight: item.weight ? String(item.weight) : '', dob: item.dob ? String(item.dob) : '', image_url: item.image_url ? String(item.image_url) : '' } });
        }}
        onLongPress={() => handleLongPress(item.pet_id)}
        activeOpacity={0.8}
      >
        <View style={styles.avatarContainer}><Image source={{ uri: item.image_url }} style={styles.petAvatar} /></View>
        <View style={styles.petInfo}>
          <View style={styles.petHeaderRow}>
            <Text style={styles.petName} numberOfLines={1}>{item.name}</Text>
            {isInSelectionMode ? (
              <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={26} color="#FDCB58" />
            ) : (
              <View style={styles.cardStatusBadge}>
                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                <Text style={styles.statusLabelText}>{liveState.status}</Text>
              </View>
            )}
          </View>
          
          {/* Hàng ngang chứa Huy hiệu Giới tính và Cân nặng */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 }}>
            <View style={[
              styles.genderCardBadge,
              item.gender === 'Male' ? { backgroundColor: '#E3F2FD' } : item.gender === 'Female' ? { backgroundColor: '#FCE4EC' } : { backgroundColor: '#E0E0E0' }
            ]}>
              <Text style={[
                styles.genderCardText,
                item.gender === 'Male' ? { color: '#1976D2' } : item.gender === 'Female' ? { color: '#C2185B' } : { color: '#666' }
              ]}>
                {item.gender === 'Male' ? '♂' : item.gender === 'Female' ? '♀' : '🐾'}
              </Text>
            </View>
            
            {item.weight ? (
              <Text style={[styles.petDetail, { marginTop: 0 }]}>• {item.weight} kg</Text>
            ) : null}
          </View>

          <View style={styles.quickStatsGrid}>
            <Text style={styles.quickStatText}>❤️ {liveState.heartRate} bpm</Text>
            <Text style={styles.quickStatText}>🌡️ {liveState.temperature} °C</Text>
          </View>
          
          <View style={styles.macContainer}><Ionicons name="bluetooth" size={14} color="#FFF" style={styles.macIcon} /><Text style={styles.petMac}>MAC: {item.mac_address}</Text></View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDCB58' }}>
      <StatusBar backgroundColor="#FDCB58" barStyle="dark-content" />

      <View style={styles.container}>
        
        <View style={styles.header}>
          <View style={styles.userInfoRow}>
            <TouchableOpacity onPress={() => setShowProfileMenu(true)} style={styles.profileBtn} activeOpacity={0.7}>
               <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' }} style={styles.profileAvatar} />
            </TouchableOpacity>
            <View style={styles.welcomeContainer}>
              <Text style={styles.welcomeText}>Welcome,</Text>
              <Text style={styles.welcomeName}>{userName}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.bellBtn} onPress={handleOpenNotifications} activeOpacity={0.7}>
             <Ionicons name="notifications-outline" size={24} color="#3E2723" />
             {unreadCount > 0 && (
               <View style={styles.badge}>
                 <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
               </View>
             )}
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          {isInSelectionMode ? (
            <View style={styles.selectionModeHeader}>
              <TouchableOpacity onPress={exitSelectionMode} style={styles.selectionCancelBtn}><Ionicons name="close" size={24} color="#FFF" /></TouchableOpacity>
              <Text style={styles.selectionCount}>{selectedPetIds.size} selected</Text>
              <TouchableOpacity onPress={confirmDeleteSelected} style={styles.selectionDeleteBtn}>
                  <Ionicons name="trash" size={20} color="#FFF" /><Text style={styles.selectionDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.mainTitle}>My Pets</Text>
              <TouchableOpacity style={styles.addBtn} onPress={startScanBLE} activeOpacity={0.7}>
                  <Ionicons name="add" size={24} color="#3E2723" />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="large" color="#FDCB58" style={{ marginTop: 50 }} />
          ) : pets.length === 0 ? (
            <View style={styles.emptyState}>
              <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3047/3047886.png' }} style={styles.emptyImage} />
              <Text style={styles.emptyText}>No pets yet!</Text>
              <Text style={styles.emptySubText}>Attach a collar to start monitoring your pet's health.</Text>
              <TouchableOpacity style={styles.bigAddBtn} onPress={startScanBLE} activeOpacity={0.8}>
                <Text style={styles.bigAddBtnText}>Scan Collar & Add Pet</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <FlatList data={pets} keyExtractor={(item) => item.pet_id.toString()} renderItem={renderPetCard} contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false} />
          )}
        </View>

        {/* =========================================
            MODAL TRUNG TÂM THÔNG BÁO DẠNG DROPDOWN
            ========================================= */}
        <Modal visible={showNotifModal} transparent={true} animationType="fade">
          {/* View bọc ngoài cùng thay vì TouchableOpacity */}
          <View style={styles.modalOverlay}>
            
            {/* Lớp nền tàng hình chiếm trọn màn hình, bấm ra ngoài sẽ đóng Modal */}
            <TouchableOpacity 
              style={StyleSheet.absoluteFill} 
              activeOpacity={1} 
              onPress={() => setShowNotifModal(false)} 
            />
            
            {/* Khối dropdown (Dùng View bình thường để KHÔNG chặn thao tác cuộn của FlatList) */}
            <View style={styles.notifDropdown}>
              <View style={styles.notifHeaderRow}>
                <Text style={styles.notifModalTitle}>Notifications</Text>
              </View>

              {notifications.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 30, marginBottom: 40, color: '#888' }}>No notifications yet.</Text>
              ) : (
                <FlatList
                  data={notifications}
                  keyExtractor={(item) => item.noti_id.toString()}
                  showsVerticalScrollIndicator={true} /* Bật thanh cuộn cho dễ nhìn */
                  renderItem={({ item }) => (
                    <View style={[styles.notifItem, !item.is_read && styles.notifItemUnread]}>
                      <View style={styles.notifIconBox}>
                        <Ionicons name={item.title.includes('Khẩn cấp') || item.title.includes('cao') ? "warning" : "information-circle"} size={22} color={item.title.includes('Khẩn cấp') || item.title.includes('cao') ? "#E53935" : "#FDCB58"} />
                      </View>
                      <View style={styles.notifTextContainer}>
                        <Text style={[styles.notifTitle, !item.is_read && { fontWeight: 'bold', color: '#000' }]}>
                          {item.pet_name ? `[${item.pet_name}] ` : ''}{item.title}
                        </Text>
                        <Text style={styles.notifMessage}>{item.message}</Text>
                        <Text style={styles.notifTime}>{formatTime(item.created_at)}</Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>

          </View>
        </Modal>

        {/* CÁC MODAL CÒN LẠI */}
        <Modal visible={showProfileMenu} transparent={true} animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProfileMenu(false)}>
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowProfileMenu(false); setShowPasswordModal(true); }}>
                <Ionicons name="lock-closed-outline" size={20} color="#3E2723" /><Text style={styles.dropdownText}>Change Password</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity style={styles.dropdownItem} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color="#E53935" /><Text style={[styles.dropdownText, { color: '#E53935' }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showPasswordModal} transparent={true} animationType="slide">
          <View style={styles.passwordModalContainer}>
            <View style={styles.passwordModalContent}>
              <Text style={styles.modalTitle}>Change Password</Text>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholderTextColor="#888" placeholder="Current Password" secureTextEntry={!showPass} value={currentPassword} onChangeText={setCurrentPassword} /></View>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholderTextColor="#888" placeholder="New Password" secureTextEntry={!showPass} value={newPassword} onChangeText={setNewPassword} /></View>
              <View style={styles.inputWrapper}><TextInput style={styles.input} placeholderTextColor="#888" placeholder="Confirm New Password" secureTextEntry={!showPass} value={confirmNewPassword} onChangeText={setConfirmNewPassword} /></View>
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}><Text style={styles.eyeText}>{showPass ? 'Hide Password' : 'Show Password'}</Text></TouchableOpacity>
              <View style={styles.modalActionRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowPasswordModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showScanModal} transparent={true} animationType="slide">
          <View style={styles.passwordModalContainer}>
            <View style={[styles.passwordModalContent, { minHeight: 400 }]}>
              <Text style={styles.modalTitle}>Scan for Collar</Text>
              {isScanning && <ActivityIndicator size="large" color="#FDCB58" style={{ marginVertical: 20 }} />}
              {!isScanning && scannedDevices.length === 0 && <Text style={{ textAlign: 'center', color: '#888', marginVertical: 20 }}>No collars found nearby.</Text>}
              <FlatList
                data={scannedDevices} keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.deviceItem} onPress={() => handleSelectDevice(item)}>
                    <Ionicons name="bluetooth" size={24} color="#3E2723" style={{marginRight: 10}} />
                    <View>
                      <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }}>{item.name || 'Unknown Device'}</Text>
                      <Text style={{ color: '#888', fontSize: 12 }}>MAC: {item.id}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
              <TouchableOpacity style={[styles.cancelBtn, { marginTop: 20, width: '100%', paddingVertical: 15 }]} onPress={() => { bleManager.stopDeviceScan(); setIsScanning(false); setShowScanModal(false); }}>
                <Text style={styles.cancelBtnText}>Cancel Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal visible={showAddPetModal} transparent={true} animationType="fade">
          <View style={styles.passwordModalContainer}>
            <View style={[styles.passwordModalContent, { maxHeight: '80%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Pet Profile</Text>
                <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
                  {newPetImageUri ? <Image source={{ uri: newPetImageUri }} style={styles.pickedImage} /> : (
                    <View style={styles.imagePlaceholder}><Ionicons name="camera-outline" size={32} color="#8D6E63" /><Text style={styles.imagePlaceholderText}>Add Image</Text></View>
                  )}
                </TouchableOpacity>
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholderTextColor="#888" placeholder="Pet's Name (e.g., Lu)" value={newPetName} onChangeText={setNewPetName} /></View>
                <View style={styles.genderRow}>
                  <TouchableOpacity 
                    onPress={() => setNewPetGender('Male')} 
                    style={[
                      styles.genderBtn, 
                      newPetGender === 'Male' ? { backgroundColor: '#E3F2FD', borderColor: '#2196F3', borderWidth: 2 } : { backgroundColor: '#F5F5F5', borderWidth: 2, borderColor: 'transparent' }
                    ]}
                  >
                    <Text style={[styles.genderText, { fontSize: 24 }, newPetGender === 'Male' ? { color: '#1976D2' } : { color: '#AAA' }]}>♂</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setNewPetGender('Female')} 
                    style={[
                      styles.genderBtn, 
                      newPetGender === 'Female' ? { backgroundColor: '#FCE4EC', borderColor: '#E91E63', borderWidth: 2 } : { backgroundColor: '#F5F5F5', borderWidth: 2, borderColor: 'transparent' }
                    ]}
                  >
                    <Text style={[styles.genderText, { fontSize: 24 }, newPetGender === 'Female' ? { color: '#C2185B' } : { color: '#AAA' }]}>♀</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowDatePicker(true)}><Text style={{ flex: 1, fontSize: 15, color: newPetDob ? '#333' : '#888', marginTop: 14 }}>{newPetDob ? newPetDob.toISOString().split('T')[0] : 'Date of Birth (Optional)'}</Text></TouchableOpacity>
                {showDatePicker && <DateTimePicker value={newPetDob || new Date()} mode="date" display="default" maximumDate={new Date()} onChange={onChangeDate} />}
                <View style={styles.inputWrapper}><TextInput style={styles.input} placeholderTextColor="#888" placeholder="Weight (kg)" keyboardType="numeric" value={newPetWeight} onChangeText={setNewPetWeight} /></View>
                <View style={[styles.inputWrapper, { backgroundColor: '#E0E0E0' }]}><TextInput style={[styles.input, { color: '#666' }]} placeholderTextColor="#888" placeholder="MAC Address" value={newPetMac} editable={false} /></View>
                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddPetModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleAddPet}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  genderCardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1, // Tạo bóng đổ nhẹ cho nút nổi lên
  },
  genderCardText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardStatusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusLabelText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  quickStatsGrid: { flexDirection: 'row', gap: 15, marginTop: 8, backgroundColor: 'rgba(255,255,255,0.15)', padding: 8, borderRadius: 12, width: '90%' },
  quickStatText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, zIndex: 10 },
  userInfoRow: { flexDirection: 'row', alignItems: 'center' },
  profileBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, borderWidth: 2, borderColor: '#FDCB58' },
  profileAvatar: { width: 46, height: 46, borderRadius: 23 },
  welcomeContainer: { marginLeft: 12 },
  welcomeText: { color: '#888', fontSize: 14 },
  welcomeName: { color: '#3E2723', fontWeight: 'bold', fontSize: 18 },
  
  bellBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#F0F0F0' },
  badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E53935', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },

  // --- STYLE MỚI CHO DROPDOWN THÔNG BÁO ---
  notifDropdown: {
    position: 'absolute',
    top: 75, // Trượt xuống ngay dưới phần header
    right: 20, // Canh lề phải khớp với nút chuông
    width: '85%', // Không chiếm toàn bộ màn hình
    maxHeight: '70%', // Tránh bị tràn ra khỏi màn hình
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 15,
    elevation: 15, // Tạo bóng đổ cho giống thẻ nổi
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  notifHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingHorizontal: 5 },
  notifModalTitle: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
  
  notifItem: { flexDirection: 'row', backgroundColor: '#FFF', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  notifItemUnread: { backgroundColor: '#FFF8E1', borderRadius: 10, paddingHorizontal: 10, borderBottomWidth: 0, marginBottom: 5 },
  notifIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  notifTextContainer: { flex: 1 },
  notifTitle: { fontSize: 14, color: '#444', fontWeight: '500', marginBottom: 2 },
  notifMessage: { fontSize: 12, color: '#666', lineHeight: 16 },
  notifTime: { fontSize: 10, color: '#AAA', marginTop: 6 },
  // ------------------------------------------

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 30, marginBottom: 20, minHeight: 45 },
  mainTitle: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A' },
  addBtn: { backgroundColor: '#FDCB58', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 3 },
  
  selectionModeHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#3E2723', borderRadius: 25, paddingHorizontal: 15, height: 55, elevation: 4 },
  selectionCancelBtn: { padding: 5 },
  selectionCount: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  selectionDeleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E53935', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 15 },
  selectionDeleteText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },

  petCard: { flexDirection: 'row', padding: 18, borderRadius: 25, marginBottom: 20, alignItems: 'center', elevation: 4 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', overflow: 'hidden' },
  petAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  petInfo: { flex: 1, marginLeft: 15 },
  petHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  petName: { fontSize: 24, fontWeight: 'bold', color: '#FFF', flex: 1, paddingRight: 10 },
  petDetail: { fontSize: 14, color: 'rgba(255, 255, 255, 0.9)', marginTop: 6, fontWeight: '500' },
  macContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  macIcon: { marginRight: 4 },
  petMac: { fontSize: 12, color: 'rgba(255, 255, 255, 0.9)', fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.2)' },
  dropdownMenu: { position: 'absolute', top: 80, left: 20, width: 220, backgroundColor: '#FFF', borderRadius: 20, paddingVertical: 10, elevation: 10 },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20 },
  dropdownText: { fontSize: 16, color: '#3E2723', fontWeight: 'bold', marginLeft: 12 },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginHorizontal: 20 },

  passwordModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  passwordModalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 25, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#3E2723', marginBottom: 20, textAlign: 'center' },
  inputWrapper: { backgroundColor: '#F5F5F5', borderRadius: 15, height: 50, justifyContent: 'center', paddingHorizontal: 15, marginBottom: 15 },
  input: { flex: 1, color: '#333', fontSize: 15 },
  
  imagePickerContainer: { alignSelf: 'center', marginBottom: 20 },
  pickedImage: { width: 100, height: 100, borderRadius: 50 },
  imagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D7CCC8', borderStyle: 'dashed' },
  imagePlaceholderText: { color: '#8D6E63', fontSize: 12, marginTop: 5 },
  
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  genderBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 15, alignItems: 'center', marginHorizontal: 5 },
  genderBtnActive: { backgroundColor: '#FDCB58' },
  genderText: { color: '#888', fontWeight: 'bold' },
  genderTextActive: { color: '#3E2723' },
  eyeBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  eyeText: { color: '#8D6E63', fontWeight: 'bold' },
  
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#E0E0E0', alignItems: 'center', marginRight: 10 },
  cancelBtnText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#3E2723', alignItems: 'center', marginLeft: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  deviceItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 15, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E0E0E0' },

  content: { flex: 1, paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', marginTop: 40, paddingHorizontal: 10 },
  emptyImage: { width: 180, height: 180, marginBottom: 20, resizeMode: 'contain' },
  emptyText: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },
  emptySubText: { fontSize: 15, color: '#8D6E63', textAlign: 'center', marginTop: 10, lineHeight: 22 },
  bigAddBtn: { marginTop: 30, backgroundColor: '#FDCB58', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 25, elevation: 5 },
  bigAddBtnText: { color: '#3E2723', fontSize: 16, fontWeight: 'bold' },
});