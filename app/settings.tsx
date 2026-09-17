import { StyleSheet, View, SafeAreaView, TouchableOpacity, ScrollView, Text, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const [notifications, setNotifications] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [faceId, setFaceId] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
    router.replace('/(tabs)/user');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        <View style={styles.contentWrapper}>
          
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
              <Text style={styles.menuText}>Chỉnh sửa hồ sơ</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Đổi mật khẩu</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Thông báo</Text>
          <View style={styles.card}>
            <View style={styles.menuItem}>
              <Text style={styles.menuText}>Thông báo đẩy (Push)</Text>
              <Switch 
                value={notifications} 
                onValueChange={setNotifications}
                trackColor={{ false: '#e2e2e2', true: '#000000' }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.menuItem}>
              <Text style={styles.menuText}>Nhận email khuyến mãi</Text>
              <Switch 
                value={newsletter} 
                onValueChange={setNewsletter}
                trackColor={{ false: '#e2e2e2', true: '#000000' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Bảo mật</Text>
          <View style={styles.card}>
            <View style={styles.menuItem}>
              <Text style={styles.menuText}>Đăng nhập bằng Face ID</Text>
              <Switch 
                value={faceId} 
                onValueChange={setFaceId}
                trackColor={{ false: '#e2e2e2', true: '#000000' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Khác</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Điều khoản dịch vụ</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Chính sách bảo mật</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuText}>Trợ giúp & Hỗ trợ</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
          </View>

          {user ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.deleteAccountButton}>
            <Text style={styles.deleteAccountText}>Xóa tài khoản</Text>
          </TouchableOpacity>
          
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* Custom Professional Confirmation Modal */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Đăng xuất tài khoản"
        message="Bạn có chắc chắn muốn đăng xuất? Mọi phiên làm việc hiện tại sẽ kết thúc."
        confirmText="Đăng xuất"
        cancelText="Hủy"
        confirmType="danger"
        loading={isLoggingOut}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(249, 249, 249, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 199, 199, 0.3)',
    zIndex: 50,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: -0.2,
  },
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444748',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 199, 199, 0.3)',
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(196, 199, 199, 0.3)',
    marginLeft: 16,
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 12,
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ba1a1a',
  },
  deleteAccountButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteAccountText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9ca3af',
  }
});
