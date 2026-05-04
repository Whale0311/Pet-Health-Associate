import { Tabs } from 'expo-router';
import React from 'react';
export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      
      {/* 1. MÀN HÌNH ĐĂNG NHẬP: Ẩn hoàn toàn thanh Tab ở dưới */}
      <Tabs.Screen
        name="index" 
        options={{
          title: 'Login',
          tabBarStyle: { display: 'none' }, // Dòng này làm phép tàng hình thanh Tab!
          tabBarButton: () => null, // Ẩn luôn cái icon của nó
        }}
      />

      {/* 2. MÀN HÌNH HOME (Màn hình chính của App) */}
      <Tabs.Screen
        name="home" // Tên file màn hình chính của bạn (ví dụ home.tsx)
        options={{
          title: 'Home',
          tabBarStyle: { display: 'none' },
        }}
      />
    	{/* 2. ẨN MÀN HÌNH REGISTER */}
      <Tabs.Screen
        name="register"
        options={{
          href: null, 
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* 3. ẨN LUÔN MÀN HÌNH EXPLORE (Nếu bạn không dùng đến) */}
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Xóa nút Explore khỏi thanh Tab
        }}
      />

    </Tabs>
  );
}