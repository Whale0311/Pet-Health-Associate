import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, ImageBackground, InteractionManager, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import io from 'socket.io-client';

const bleManager = new BleManager();

const SERVICE_UUID = "19b10000-e8f2-537e-4f6c-d104768a1214";
const BEHAVIOR_CHAR_UUID = "19b10001-e8f2-537e-4f6c-d104768a1214";
const HEARTRATE_CHAR_UUID = "19b10002-e8f2-537e-4f6c-d104768a1214";
const TEMPERATURE_CHAR_UUID = "19b10003-e8f2-537e-4f6c-d104768a1214";

const BEHAVIOR_LABELS = [
  "Idle (Nghỉ ngơi)", 
  "Playing (Đang chơi)", 
  "Trotting (Chạy kiệu)", 
  "Walking (Đang đi)"
];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function PetDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const petId = params.id;
  const mac = params.mac as string;

  const [petInfo, setPetInfo] = useState({
    name: params.name as string,
    gender: params.gender as string,
    weight: params.weight as string,
    dob: params.dob as string,
    image_url: params.image_url as string
  });

  const [connectionStatus, setConnectionStatus] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState(false); // Thêm state kiểm soát kết nối thực sự
  const [heartRate, setHeartRate] = useState<number | string>('--');
  const [temperature, setTemperature] = useState<string>('--');
  const [behaviorCode, setBehaviorCode] = useState<number>(0); 
  const [activeTab, setActiveTab] = useState<'HR' | 'TEMP'>('HR');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);

  // --- STATE MODAL EDIT ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editGender, setEditGender] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDob, setEditDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // --- STATE CHO ẢNH MỚI ---
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);

  const isBase64Valid = petInfo.image_url && petInfo.image_url.startsWith('data:image');
  const defaultAvatar = isBase64Valid ? petInfo.image_url : 'https://cdn-icons-png.flaticon.com/512/8204/8204652.png';

  const calculateAge = (dobString: string) => {
    if (!dobString || dobString === 'undefined' || dobString === 'null') return 'Unknown Age';
    const birthDate = new Date(dobString);
    if (isNaN(birthDate.getTime())) return 'Unknown Age';

    const diffMs = Date.now() - birthDate.getTime();
    const ageDt = new Date(diffMs); 
    const years = Math.abs(ageDt.getUTCFullYear() - 1970);
    const months = ageDt.getUTCMonth();

    if (years > 0) return `${years} years old`;
    if (months > 0) return `${months} months old`;
    return 'Under 1 month';
  };

  const latestData = useRef({ heartRate: 0, temperature: 0, behaviorCode: 0 });

  useEffect(() => {
    latestData.current = {
      heartRate: typeof heartRate === 'number' ? heartRate : 0,
      temperature: parseFloat(temperature) || 0,
      behaviorCode: behaviorCode
    };
  }, [heartRate, temperature, behaviorCode]);

  useEffect(() => {
    const forwardDataToServer = async () => {
      const { heartRate, temperature, behaviorCode } = latestData.current;
      
      // Không gửi nếu nhịp tim = 0 (khắc phục lỗi spam cảnh báo)
      if (heartRate > 0 && temperature > 0) {
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) return;

          const SERVER_URL = 'https://pet-collar-backend.onrender.com/api/health-logs'; 
          
          const payload = {
            pet_id: petId,
            behavior_code: behaviorCode,
            heart_rate: heartRate,
            temp_celsius: temperature,
            humidity: 60
          };

          await axios.post(SERVER_URL, payload, { headers: { Authorization: `Bearer ${token}` } });
        } catch (error: any) {
          console.log("Sync error:", error.message);
        }
      }
    };

    const syncInterval = setInterval(forwardDataToServer, 10000);
    return () => clearInterval(syncInterval);
  }, [petId]);

  useEffect(() => {
    let socket: any;

    const fetchHistoryAndSetupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const historyResponse = await axios.get(`https://pet-collar-backend.onrender.com/api/pets/${petId}/health-logs`, { headers: { Authorization: `Bearer ${token}` } });
        if (historyResponse.data.status === 'success') {
          setHistoryLogs(historyResponse.data.data);
        }
      } catch (error) {}

      const { status } = await Notifications.requestPermissionsAsync();
      
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const user = JSON.parse(userInfoString);
        const userId = user.user_id || user.id;

        socket = io('https://pet-collar-backend.onrender.com'); 

        socket.on(`new_alert_user_${userId}`, (alertData: any) => {
          Notifications.scheduleNotificationAsync({
            content: { title: alertData.title, body: alertData.message, sound: true },
            trigger: null,
          });
        });

        socket.on(`new_health_data_${petId}`, (newData: any) => {
          setConnectionStatus((currentStatus) => {
            if (currentStatus !== 'Connected') {
              setHeartRate(newData.heart_rate);
              setTemperature(newData.temp_celsius);
              setBehaviorCode(newData.behavior_code);
            }
            return currentStatus;
          });

          setHistoryLogs((prev) => {
            const updated = [newData, ...prev];
            return updated.slice(0, 6); // Tuân thủ Ledger: Chỉ hiển thị 6 điểm gần nhất
          });
        });
      }
    };

    fetchHistoryAndSetupSocket();
    return () => { if (socket) socket.disconnect(); };
  }, [petId]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      handleConnect(); // Tự động kết nối khi vào trang
    });
    return () => {
      task.cancel();
      // Không tự động ngắt kết nối khi back ra nữa để giữ background
    };
  }, [mac]);

  // HÀM CHỦ ĐỘNG KẾT NỐI
  const handleConnect = async () => {
    if (!mac) return;
    setConnectionStatus('Connecting...');
    setIsConnected(false);
    try {
      const device = await bleManager.connectToDevice(mac);
      await device.discoverAllServicesAndCharacteristics();
      setConnectionStatus('Connected');
      setIsConnected(true);

      device.monitorCharacteristicForService(SERVICE_UUID, HEARTRATE_CHAR_UUID, (error, char) => {
        if (char?.value) setHeartRate(atob(char.value).charCodeAt(0));
      });
      device.monitorCharacteristicForService(SERVICE_UUID, TEMPERATURE_CHAR_UUID, (error, char) => {
        if (char?.value) setTemperature(atob(char.value));
      });
      device.monitorCharacteristicForService(SERVICE_UUID, BEHAVIOR_CHAR_UUID, (error, char) => {
        if (char?.value) setBehaviorCode(atob(char.value).charCodeAt(0));
      });

      bleManager.onDeviceDisconnected(mac, () => {
        setConnectionStatus('Disconnected');
        setIsConnected(false);
        setHeartRate('--');
        setTemperature('--');
      });
    } catch (error) {
      setConnectionStatus('Disconnected');
      setIsConnected(false);
    }
  };

  // HÀM CHỦ ĐỘNG NGẮT KẾT NỐI
  const handleDisconnect = async () => {
    try {
      await bleManager.cancelDeviceConnection(mac);
      setConnectionStatus('Disconnected');
      setIsConnected(false);
      setHeartRate('--');
      setTemperature('--');
    } catch (error) {
      console.log("Disconnect error", error);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setEditImageUri(result.assets[0].uri);
      setEditImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const openEditModal = () => {
    setEditName(petInfo.name || '');
    setEditGender(petInfo.gender && petInfo.gender !== 'undefined' ? petInfo.gender : '');
    setEditWeight(petInfo.weight && petInfo.weight !== 'undefined' && petInfo.weight !== 'null' ? petInfo.weight : '');
    setEditDob(petInfo.dob && petInfo.dob !== 'undefined' && petInfo.dob !== 'null' ? new Date(petInfo.dob) : null);
    setEditImageUri(isBase64Valid ? petInfo.image_url : null);
    setEditImageBase64(null); 
    setShowEditModal(true);
  };

  const handleUpdatePet = async () => {
    if (!editName) { Alert.alert("Error", "Name cannot be empty!"); return; }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const SERVER_URL = `https://pet-collar-backend.onrender.com/api/pets/${petId}`;

      const payload = { 
        name: editName, 
        gender: editGender || null, 
        dob: editDob ? editDob.toISOString().split('T')[0] : null, 
        weight: editWeight ? parseFloat(editWeight) : null,
        image_url: editImageBase64 || null 
      };

      const response = await axios.put(SERVER_URL, payload, { headers: { Authorization: `Bearer ${token}` } });
      
      if (response.data.status === 'success') {
        Alert.alert("Success", "Profile updated!");
        setShowEditModal(false);
        setPetInfo({ ...petInfo, name: payload.name, gender: payload.gender ?? '', dob: payload.dob ?? '', weight: payload.weight !== null && payload.weight !== undefined ? String(payload.weight) : '', image_url: editImageBase64 || petInfo.image_url });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update profile.");
    }
  };

  const currentBehaviorText = BEHAVIOR_LABELS[behaviorCode] || "Analyzing...";
  const petAge = calculateAge(petInfo.dob);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FDCB58' }}>
      <StatusBar backgroundColor="#FDCB58" barStyle="dark-content" />

      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* --- MODAL EDIT --- */}
        <Modal visible={showEditModal} transparent={true} animationType="fade">
          <View style={styles.modalContainer}>
            <View style={[styles.modalContent, { maxHeight: '85%' }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                
                <TouchableOpacity style={styles.imagePickerContainer} onPress={pickImage}>
                  {editImageUri ? (
                    <Image source={{ uri: editImageUri }} style={styles.pickedImage} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Ionicons name="camera-outline" size={32} color="#8D6E63" />
                      <Text style={styles.imagePlaceholderText}>Change Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Pet Name" value={editName} onChangeText={setEditName} />
                </View>

                {/* KHU VỰC ĐỔI NÚT CHỌN GIỚI TÍNH CÓ MÀU XANH HỒNG */}
                <View style={styles.genderRow}>
                  <TouchableOpacity 
                    onPress={() => setEditGender(editGender === 'Male' ? '' : 'Male')} 
                    style={[
                      styles.genderBtn, 
                      editGender === 'Male' ? { backgroundColor: '#E3F2FD', borderColor: '#2196F3', borderWidth: 2 } : { backgroundColor: '#F5F5F5', borderWidth: 2, borderColor: 'transparent' }
                    ]}
                  >
                    <Text style={[styles.genderText, { fontSize: 24 }, editGender === 'Male' ? { color: '#1976D2' } : { color: '#AAA' }]}>♂</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setEditGender(editGender === 'Female' ? '' : 'Female')} 
                    style={[
                      styles.genderBtn, 
                      editGender === 'Female' ? { backgroundColor: '#FCE4EC', borderColor: '#E91E63', borderWidth: 2 } : { backgroundColor: '#F5F5F5', borderWidth: 2, borderColor: 'transparent' }
                    ]}
                  >
                    <Text style={[styles.genderText, { fontSize: 24 }, editGender === 'Female' ? { color: '#C2185B' } : { color: '#AAA' }]}>♀</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowDatePicker(true)}>
                  <Text style={{ flex: 1, fontSize: 15, color: editDob ? '#333' : '#888', marginTop: 14 }}>
                    {editDob ? editDob.toISOString().split('T')[0] : 'Date of Birth (Optional)'}
                  </Text>
                </TouchableOpacity>

                {showDatePicker && (
                  <DateTimePicker value={editDob || new Date()} mode="date" display="default" maximumDate={new Date()} onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) setEditDob(selectedDate); }} />
                )}

                <View style={styles.inputWrapper}>
                  <TextInput style={styles.input} placeholderTextColor="#888" placeholder="Weight (kg)" keyboardType="numeric" value={editWeight} onChangeText={setEditWeight} />
                </View>

                <View style={styles.modalActionRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowEditModal(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleUpdatePet}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* --- HEADER HÌNH ẢNH --- */}
        <ImageBackground source={{ uri: defaultAvatar }} style={styles.headerImage} imageStyle={{ resizeMode: 'cover' }}>
          <View style={{ paddingTop: 10 }}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
              {/* Nút bấm trạng thái góc trên bên phải */}
              <TouchableOpacity 
                style={styles.bleStatus} 
                activeOpacity={0.8}
                onPress={() => {
                  if (isConnected) {
                    Alert.alert("Disconnect", `Do you want to disconnect ${petInfo.name}'s collar?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Disconnect", onPress: handleDisconnect, style: "destructive" }
                    ]);
                  } else {
                    handleConnect();
                  }
                }}
              >
                <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF5252' }]} />
                <Text style={styles.bleText}>{connectionStatus}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>

        {/* --- THÂN TRANG --- */}
        <ScrollView style={styles.sheetContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.infoRow}>
            <View>
              <Text style={styles.petName}>{petInfo.name}</Text>
              <Text style={styles.petSub}>{petAge}</Text> 
            </View>
            <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
              <Ionicons name="pencil" size={16} color="#3E2723" />
              <Text style={styles.editText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* HIỂN THỊ ICON GIỚI TÍNH */}
          <View style={styles.miniStatsRow}>
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatLabel}>Gender</Text>
              <View style={[
                  styles.genderCardBadge,
                  petInfo.gender === 'Male' ? { backgroundColor: '#E3F2FD' } : petInfo.gender === 'Female' ? { backgroundColor: '#FCE4EC' } : { backgroundColor: '#E0E0E0' }
                ]}>
                <Text style={[
                  styles.genderCardText,
                  petInfo.gender === 'Male' ? { color: '#1976D2' } : petInfo.gender === 'Female' ? { color: '#C2185B' } : { color: '#666' }
                ]}>
                  {petInfo.gender === 'Male' ? '♂' : petInfo.gender === 'Female' ? '♀' : '--'}
                </Text>
              </View>
            </View>
            
            <View style={styles.miniStatBox}>
              <Text style={styles.miniStatLabel}>Weight</Text>
              <Text style={styles.miniStatValue}>{petInfo.weight && petInfo.weight !== 'null' && petInfo.weight !== 'undefined' ? `${petInfo.weight} kg` : '--'}</Text>
            </View>
          </View>
          <View style={styles.healthRow}>
            <View style={styles.healthCard}>
              <Ionicons name="heart" size={38} color="#E53935" />
              <Text style={styles.cardValue}>{heartRate} <Text style={styles.cardUnit}>bpm</Text></Text>
              <Text style={styles.cardTitle}>Heart Rate</Text>
            </View>

            <View style={styles.healthCard}>
              <Ionicons name="thermometer" size={38} color="#FF9800" />
              <Text style={[styles.cardValue, { color: '#FF9800' }]}>{temperature} <Text style={styles.cardUnit}>°C</Text></Text>
              <Text style={styles.cardTitle}>Temperature</Text>
            </View>
          </View>
          <View style={styles.chartCard}>
            <View style={styles.chartTabs}>
              <TouchableOpacity style={[styles.chartTabBtn, activeTab === 'HR' && styles.chartTabBtnActive]} onPress={() => setActiveTab('HR')}>
                <Text style={[styles.chartTabBtnText, activeTab === 'HR' && styles.chartTabBtnTextActive]}>Heart Rate</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chartTabBtn, activeTab === 'TEMP' && styles.chartTabBtnActive]} onPress={() => setActiveTab('TEMP')}>
                <Text style={[styles.chartTabBtnText, activeTab === 'TEMP' && styles.chartTabBtnTextActive]}>Temperature</Text>
              </TouchableOpacity>
            </View>

            {historyLogs.length > 0 ? (
              <BarChart
                data={{
                  labels: [...historyLogs].reverse().map(log => {
                    const d = new Date(log.timestamp);
                    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
                  }),
                  datasets: [{ data: [...historyLogs].reverse().map(log => activeTab === 'HR' ? log.heart_rate : log.temp_celsius) }]
                }}
                width={Dimensions.get("window").width - 90}
                height={220}
                yAxisLabel=""
                yAxisSuffix={activeTab === 'HR' ? " bpm" : " °C"}
                fromZero={true}
                showBarTops={false}
                withInnerLines={true}
                chartConfig={{
                  backgroundColor: "#FFF",
                  backgroundGradientFrom: "#FFF",
                  backgroundGradientTo: "#FFF",
                  decimalPlaces: activeTab === 'HR' ? 0 : 1,
                  color: (opacity = 1) => activeTab === 'HR' ? `rgba(229, 57, 53, ${opacity})` : `rgba(253, 203, 88, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 100, 100, ${opacity})`,
                  barPercentage: 0.6,
                  fillShadowGradient: activeTab === 'HR' ? "#E53935" : "#FDCB58",
                  fillShadowGradientOpacity: 0.8,
                }}
                style={{ borderRadius: 16, marginTop: 15 }}
              />
            ) : (
              <Text style={{ textAlign: 'center', color: '#888', marginTop: 40, marginBottom: 40 }}>No historical data</Text>
            )}
          </View>
          
          <View style={styles.behaviorSection}>
            <Text style={styles.sectionTitle}>Current Activity</Text>
            <View style={styles.behaviorBox}>
              <View style={styles.aiIconContainer}>
                <Ionicons name="hardware-chip" size={32} color="#3E2723" />
              </View>
              <View style={styles.behaviorInfo}>
                <Text style={styles.behaviorLabel}>Behavior:</Text>
                <Text style={styles.behaviorName}>{currentBehaviorText}</Text>
              </View>
            </View>
          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Nút Kết nối / Ngắt kết nối
  connectBtn: { flexDirection: 'row', backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  disconnectBtn: { flexDirection: 'row', backgroundColor: '#E53935', paddingVertical: 12, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Huy hiệu giới tính
  genderCardBadge: { paddingHorizontal: 15, paddingVertical: 4, borderRadius: 15, justifyContent: 'center', alignItems: 'center', elevation: 1 },
  genderCardText: { fontSize: 18, fontWeight: 'bold' },

  chartCard: { backgroundColor: '#FFF', borderRadius: 25, padding: 20, marginTop: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, borderWidth: 1, borderColor: '#F5F5F5' },
  chartTabs: { flexDirection: 'row', backgroundColor: '#F5F5F5', borderRadius: 20, padding: 5 },
  chartTabBtn: { flex: 1, paddingVertical: 10, borderRadius: 15, alignItems: 'center' },
  chartTabBtnActive: { backgroundColor: '#D7CCC8' },
  chartTabBtnText: { color: '#8D6E63', fontWeight: 'bold' },
  chartTabBtnTextActive: { color: '#3E2723' },
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  headerImage: { width: '100%', height: 350, backgroundColor: '#D7CCC8' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  
  bleStatus: { flexDirection: 'row', backgroundColor: 'rgba(253, 203, 88, 0.95)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignItems: 'center', height: 32, elevation: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  bleText: { color: '#3E2723', fontSize: 13, fontWeight: 'bold' },
  
  sheetContainer: { flex: 1, marginTop: -40, backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, paddingHorizontal: 25, paddingTop: 30 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  petName: { fontSize: 28, fontWeight: '900', color: '#3E2723' },
  petSub: { fontSize: 15, color: '#888', marginTop: 4, fontWeight: '500' },
  
  editBtn: { flexDirection: 'row', backgroundColor: '#FDCB58', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, alignItems: 'center', elevation: 2 },
  editText: { color: '#3E2723', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },

  miniStatsRow: { flexDirection: 'row', justifyContent: 'flex-start', gap: 40, marginTop: 15, marginBottom: 20, paddingHorizontal: 5 },
  miniStatBox: { alignItems: 'flex-start' },
  miniStatLabel: { fontSize: 13, color: '#888', marginBottom: 6 },
  miniStatValue: { fontSize: 18, fontWeight: 'bold', color: '#3E2723' },

  healthRow: { flexDirection: 'row', justifyContent: 'space-between' },
  healthCard: { width: '47%', borderRadius: 25, padding: 20, height: 160, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, borderWidth: 1, borderColor: '#F5F5F5' },
  cardValue: { color: '#E53935', fontSize: 32, fontWeight: '900', marginTop: 12 },
  cardUnit: { fontSize: 14, fontWeight: '600' },
  cardTitle: { color: '#888', fontSize: 14, fontWeight: '600', marginTop: 5 },
  
  behaviorSection: { marginTop: 30, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#3E2723', marginBottom: 15 },
  behaviorBox: { flexDirection: 'row', backgroundColor: '#FFF8E1', borderRadius: 20, padding: 15, alignItems: 'center', borderWidth: 1, borderColor: '#FDCB58' },
  aiIconContainer: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#FDCB58', justifyContent: 'center', alignItems: 'center' },
  behaviorInfo: { flex: 1, marginLeft: 15 },
  behaviorLabel: { fontSize: 13, color: '#888', marginBottom: 4 },
  behaviorName: { fontSize: 20, fontWeight: 'bold', color: '#3E2723' },

  // --- STYLE MODAL EDIT ---
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 25, padding: 25, elevation: 10 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#3E2723', marginBottom: 20, textAlign: 'center' },
  inputWrapper: { backgroundColor: '#F5F5F5', borderRadius: 15, height: 50, justifyContent: 'center', paddingHorizontal: 15, marginBottom: 15 },
  input: { flex: 1, color: '#333', fontSize: 15 },
  genderRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  genderBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#F5F5F5', borderRadius: 15, alignItems: 'center', marginHorizontal: 5 },
  genderBtnActive: { backgroundColor: '#FDCB58' },
  genderText: { color: '#888', fontWeight: 'bold' },
  genderTextActive: { color: '#3E2723' },
  modalActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#E0E0E0', alignItems: 'center', marginRight: 10 },
  cancelBtnText: { color: '#555', fontWeight: 'bold', fontSize: 16 },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 20, backgroundColor: '#3E2723', alignItems: 'center', marginLeft: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  // --- STYLE CHO ẢNH TRONG MODAL ---
  imagePickerContainer: { alignSelf: 'center', marginBottom: 20 },
  pickedImage: { width: 100, height: 100, borderRadius: 50 },
  imagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D7CCC8', borderStyle: 'dashed' },
  imagePlaceholderText: { color: '#8D6E63', fontSize: 12, marginTop: 5 },
});