import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FDCB58', // Màu vàng cam khi được chọn
        tabBarInactiveTintColor: '#BCAAA4', // Màu xám nâu khi không chọn
        headerShown: false, // Ẩn cái header chữ to xấu xí mặc định ở trên cùng
        tabBarStyle: {
          backgroundColor: '#FFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 65,
          paddingBottom: 10,
          paddingTop: 5,
        },
      }}
    >
      {/* 1. ẨN MÀN HÌNH LOGIN */}
      <Tabs.Screen
        name="index"
        options={{
          href: null, // "Phép thuật" nằm ở đây: Vẫn chuyển trang được nhưng KHÔNG hiện nút
        }}
      />

      {/* 2. ẨN MÀN HÌNH REGISTER */}
      <Tabs.Screen
        name="register"
        options={{
          href: null, 
        }}
      />

      {/* 3. HIỂN THỊ MÀN HÌNH HOME */}
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />

      {/* 4. HIỂN THỊ MÀN HÌNH EXPLORE (Bạn có thể đổi tên thành Notifications/Settings sau này) */}
      <Tabs.Screen
        name="explore" // Nếu bạn có file explore.tsx thì giữ lại, không thì bạn có thể đổi tên
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <Ionicons name="compass" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}