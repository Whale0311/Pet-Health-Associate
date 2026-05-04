import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Hàm xử lý đăng nhập (Sẽ ghép API sau)
  // Hàm xử lý đăng nhập gọi API
  const handleLogin = async () => {
    // 1. Kiểm tra không được để trống
    if (!email || !password) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ Email và Mật khẩu!");
      return;
    }

    try {
      const SERVER_URL = 'https://pet-collar-backend.onrender.com/api/auth/login'; 
      
      const response = await axios.post(SERVER_URL, {
        email: email,
        password: password
      });

      // 2. Nếu Server trả về thành công
      if (response.data.status === 'success') {
        const token = response.data.token;
        const userInfo = response.data.user;

        // 3. Cất Token và thông tin User vào két sắt điện thoại
        await AsyncStorage.setItem('userToken', token);
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));

       router.replace('/home');
      }

    } catch (error) {
      // 4. Chứng minh với TypeScript đây là lỗi do gọi API (Axios)
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // Lỗi do Server trả về (VD: Sai pass, sai email, lỗi 400, 401...)
          Alert.alert("Lỗi đăng nhập", error.response.data.message || "Thông tin không chính xác.");
        } else {
          // Lỗi do không gọi được tới Server (VD: Sập mạng, sai IP, chưa bật Node.js)
          Alert.alert("Lỗi kết nối", "Không thể gọi tới Server. Hãy kiểm tra lại IP hoặc Server đang chạy.");
        }
      } else {
        // Các lỗi lập trình khác không liên quan đến API
        Alert.alert("Lỗi hệ thống", "Đã xảy ra sự cố bất ngờ trong ứng dụng.");
        console.error("Lỗi không xác định:", error);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        {/* Header Logo */}
        <View style={styles.header}>
          <Text style={styles.logoText}>PET COLLAR</Text>
          <Text style={styles.subtitle}>Easy way to monitor your furry friend</Text>
        </View>

        {/* Ảnh Thú cưng (Bạn sẽ thay link ảnh đã tách nền vào đây) */}
        <View style={styles.imageContainer}>
          <Image
            // Thay uri bằng require và trỏ đúng đường dẫn ra thư mục assets
            source={require('../../assets/images/pet-login.png')} 
            style={styles.petImage}
            resizeMode="contain"
          />
        </View>

        {/* Form Nhập liệu */}
        <View style={styles.formContainer}>
          {/* Ô nhập Email */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Email / User Name"
              placeholderTextColor="#BCAAA4"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Ô nhập Mật khẩu */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#BCAAA4"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
              <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={24} color="#BCAAA4" />
            </TouchableOpacity>
          </View>

          {/* Nút Log In */}
          <TouchableOpacity style={styles.mainButton} onPress={handleLogin}>
            <Text style={styles.mainButtonText}>Log In</Text>
          </TouchableOpacity>

          {/* Link sang Đăng ký */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            
            {/* MỚI: Bấm vào đây để gọi router chuyển sang trang register */}
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDCB58', // Nền vàng cam giống mẫu
  },
  content: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: 'space-evenly',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: 'bold',
    marginTop: 5,
  },
  imageContainer: {
    alignItems: 'center',
    height: 180,
    justifyContent: 'flex-end',
    zIndex: 1, // Đẩy ảnh lên trên Form
  },
  petImage: {
    width: 250,
    height: 200,
    marginBottom: -20, // Kéo ảnh đè xuống Form nhập liệu một chút
  },
  formContainer: {
    zIndex: 0,
  },
  inputWrapper: {
    backgroundColor: '#5D4037', // Màu nâu cà phê
    borderRadius: 30,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  eyeIcon: {
    padding: 10,
  },
  mainButton: {
    backgroundColor: '#3E2723', // Nâu đậm hơn cho nút bấm
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  mainButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  registerText: {
    color: '#5D4037',
    fontSize: 15,
  },
  registerLink: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  socialContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#5D4037',
    opacity: 0.3,
  },
  orText: {
    color: '#5D4037',
    paddingHorizontal: 15,
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButton: {
    backgroundColor: '#FFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});