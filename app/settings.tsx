import { StyleSheet, View, SafeAreaView, TouchableOpacity, ScrollView, Text, Switch, Modal } from 'react-native';
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [infoModal, setInfoModal] = useState<{ title: string; content: string } | null>(null);

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

  const confirmDeleteAccount = async () => {
    setShowDeleteModal(false);
    await logout();
    router.replace('/(tabs)/user');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt hệ thống</Text>
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
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setInfoModal({
                title: 'Đổi mật khẩu',
                content: 'Để bảo vệ an toàn cho tài khoản, mật khẩu có thể được đổi trực tiếp tại trang Chỉnh sửa hồ sơ hoặc liên hệ quản trị viên hệ thống để cấp lại mã xác thực.'
              })}
            >
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
              <Text style={styles.menuText}>Đăng nhập bằng Face ID / Sinh trắc</Text>
              <Switch 
                value={faceId} 
                onValueChange={setFaceId}
                trackColor={{ false: '#e2e2e2', true: '#000000' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Hỗ trợ & Pháp lý</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setInfoModal({
                title: 'Điều khoản dịch vụ',
                content: '1. Khách hàng được cam kết bảo hành sản phẩm chính hãng trong 6 tháng.\n2. Miễn phí đổi trả trong 7 ngày nếu không vừa kích cỡ hoặc có lỗi kỹ thuật.\n3. Đơn hàng từ 300.000đ được hỗ trợ phí vận chuyển toàn quốc.'
              })}
            >
              <Text style={styles.menuText}>Điều khoản dịch vụ</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setInfoModal({
                title: 'Chính sách bảo mật',
                content: 'Thời Trang HD cam kết bảo mật 100% thông tin cá nhân, số điện thoại và địa chỉ giao hàng của quý khách. Mọi dữ liệu giao dịch trực tuyến đều được mã hóa theo chuẩn an toàn quốc tế.'
              })}
            >
              <Text style={styles.menuText}>Chính sách bảo mật</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => setInfoModal({
                title: 'Trung tâm Hỗ trợ & CSKH',
                content: '• Hotline miễn cước: 1900 6868 (8:00 - 22:00 hàng ngày)\n• Email hỗ trợ: cskh@thoitranghd.com\n• Zalo CSKH: 0912 345 678\n• Địa chỉ trụ sở: Hà Nội & TP. Hồ Chí Minh.'
              })}
            >
              <Text style={styles.menuText}>Trợ giúp & Hỗ trợ</Text>
              <IconSymbol name="chevron.right" size={20} color="#c4c7c7" />
            </TouchableOpacity>
          </View>

          {user ? (
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          ) : null}

          {user ? (
            <TouchableOpacity 
              style={styles.deleteAccountButton}
              onPress={() => setShowDeleteModal(true)}
            >
              <Text style={styles.deleteAccountText}>Yêu cầu xóa tài khoản</Text>
            </TouchableOpacity>
          ) : null}
          
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>

      {/* Logout Confirmation Modal */}
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

      {/* Delete Account Confirmation Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Xóa tài khoản vĩnh viễn"
        message="Cảnh báo: Toàn bộ lịch sử mua hàng, điểm tích lũy và voucher của bạn sẽ bị hủy bỏ và không thể khôi phục."
        confirmText="Xác nhận xóa"
        cancelText="Hủy"
        confirmType="danger"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDeleteAccount}
      />

      {/* Info Modal for Terms, Privacy, Support */}
      <Modal
        visible={!!infoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModal(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setInfoModal(null)} 
          />
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>{infoModal?.title}</Text>
              <TouchableOpacity onPress={() => setInfoModal(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <IconSymbol name="xmark" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 300, marginVertical: 12 }}>
              <Text style={styles.infoModalContent}>{infoModal?.content}</Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.infoModalCloseBtn}
              onPress={() => setInfoModal(null)}
            >
              <Text style={styles.infoModalCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  infoModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  infoModalContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  infoModalCloseBtn: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  infoModalCloseText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
