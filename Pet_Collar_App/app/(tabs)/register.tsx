import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Hàm xử lý Đăng ký gọi xuống Server
  const handleRegister = async () => {
    // 1. Kiểm tra không được bỏ trống
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert("Thông báo", "Vui lòng nhập đầy đủ thông tin!");
      return;
    }

    // 2. Kiểm tra mật khẩu khớp nhau (Đã làm ở Server, nhưng nên chặn trước ở App cho nhanh)
    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp!");
      return;
    }

    try {
      const SERVER_URL = 'http://192.168.1.72:3000/api/auth/register';

      const response = await axios.post(SERVER_URL, {
        full_name: fullName,
        email: email,
        password: password,
        confirm_password: confirmPassword
      });

      if (response.data.status === 'success') {
        Alert.alert(
          "Tuyệt vời!", 
          "Đăng ký tài khoản thành công. Vui lòng đăng nhập để tiếp tục.",
          [{ text: "Đồng ý", onPress: () => router.back() }] // Bấm OK sẽ lùi về trang Login
        );
      }

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          Alert.alert("Lỗi đăng ký", error.response.data.message);
        } else {
          Alert.alert("Lỗi kết nối", "Không thể gọi tới Server. Hãy kiểm tra lại IP.");
        }
      } else {
        Alert.alert("Lỗi hệ thống", "Đã xảy ra sự cố bất ngờ.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Nút quay lại */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#5D4037" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join PET COLLAR now!</Text>
          </View>

          <View style={styles.formContainer}>
            {/* Tên hiển thị */}
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color="#BCAAA4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#BCAAA4"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color="#BCAAA4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#BCAAA4"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Mật khẩu */}
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#BCAAA4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#BCAAA4"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#BCAAA4" />
              </TouchableOpacity>
            </View>

            {/* Xác nhận mật khẩu */}
            <View style={styles.inputWrapper}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#BCAAA4" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#BCAAA4"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword} 
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} size={22} color="#BCAAA4" />
              </TouchableOpacity>
            </View>

            {/* Nút Đăng ký */}
            <TouchableOpacity style={styles.mainButton} onPress={handleRegister}>
              <Text style={styles.mainButtonText}>Sign Up</Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDCB58' },
  scrollContent: { flexGrow: 1, paddingHorizontal: 25, justifyContent: 'center' },
  backButton: { position: 'absolute', top: 20, left: 10, zIndex: 10, padding: 10 },
  header: { alignItems: 'center', marginBottom: 40, marginTop: 60 },
  title: { fontSize: 36, fontWeight: '900', color: '#FFF' },
  subtitle: { fontSize: 16, color: '#5D4037', fontWeight: 'bold', marginTop: 5 },
  formContainer: { zIndex: 0 },
  inputWrapper: {
    backgroundColor: '#5D4037',
    borderRadius: 30,
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 16 },
  mainButton: {
    backgroundColor: '#3E2723',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    elevation: 5,
  },
  mainButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});