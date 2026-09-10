import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';

export default function UserScreen() {
  const router = useRouter();
  const { user, logout, isAdmin } = useAuth();
  const { isDesktop, isTablet } = useResponsive();

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  React.useEffect(() => {
    if (user?.id) {
      import('@/constants/config').then(({ API_URL }) => {
        fetch(`${API_URL}/api/auth/profile/${user.id}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.success) setProfileData(d.data);
          })
          .catch(() => {});
      });
    }
  }, [user]);

  const spent = profileData?.total_spent || (user as any)?.total_spent || 0;
  const isDiamond = spent >= 2000000;
  const isGold = spent >= 500000 && !isDiamond;

  const nextTierName = isDiamond ? null : isGold ? 'VIP Kim Cương' : 'VIP Vàng';
  const nextTierThreshold = isDiamond ? 0 : isGold ? 2000000 : 500000;
  const remainingToNext = Math.max(0, nextTierThreshold - spent);
  const progressPercent = nextTierThreshold > 0 ? Math.min(100, (spent / nextTierThreshold) * 100) : 100;
  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    setIsLoggingOut(false);
    setShowLogoutModal(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)')}>
            <IconSymbol name="house" size={22} color="#1a1c1c" />
          </TouchableOpacity>
          <Text style={styles.brandText}>ThoiTrangHD</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(tabs)/cart')}>
            <IconSymbol name="bag" size={22} color="#1a1c1c" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          (isDesktop || isTablet) && styles.scrollContentDesktop,
        ]}
      >
        {user ? (
          /* Profile Card when Logged In */
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Image
                source={{
                  uri:
                    user.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
                }}
                style={styles.avatarImage}
                contentFit="cover"
              />
            </View>
            <Text style={styles.userName}>
              {user.name}
              {isDiamond && <Text style={{ color: '#0ea5e9', fontSize: 13, fontWeight: '700' }}> (VIP KIM CƯƠNG)</Text>}
              {isGold && <Text style={{ color: '#eab308', fontSize: 13, fontWeight: '700' }}> (VIP VÀNG)</Text>}
            </Text>
            <Text style={styles.userEmail}>{user.email}</Text>
            {user.phone ? (
              <Text style={styles.userPhone}>{user.phone}</Text>
            ) : null}

            {!isDiamond && (
              <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', marginTop: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#64748b' }}>Đã chi tiêu: {formatVND(spent)}</Text>
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>Hạng tiếp theo: {nextTierName}</Text>
                </View>
                <View style={{ width: '100%', height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                  <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: isGold ? '#0ea5e9' : '#eab308' }} />
                </View>
                <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 6 }}>
                  Mua thêm {formatVND(remainingToNext)} để lên hạng {nextTierName}
                </Text>
              </View>
            )}
            
            {isDiamond && (
              <View style={{ width: '100%', maxWidth: 320, alignSelf: 'center', marginTop: 16 }}>
                 <Text style={{ fontSize: 12, color: '#0ea5e9', textAlign: 'center', fontWeight: '600' }}>
                   Bạn đã đạt hạng VIP cao nhất. Chi tiêu: {formatVND(spent)}
                 </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.editProfileBtn, { marginTop: 16 }]}
              onPress={() => router.push('/edit-profile')}
            >
              <Text style={styles.editProfileText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Guest Welcome Banner when not Logged In */
          <View style={styles.guestCard}>
            <View style={styles.guestIconCircle}>
              <IconSymbol name="person" size={32} color="#1a1c1c" />
            </View>
            <Text style={styles.guestTitle}>Chào mừng quý khách</Text>
            <Text style={styles.guestSubtitle}>
              Đăng nhập để xem lịch sử đơn hàng, địa chỉ giao hàng và danh sách sản phẩm yêu thích
            </Text>
            <View style={styles.guestButtonGroup}>
              <TouchableOpacity
                style={styles.guestLoginBtn}
                onPress={() => router.push('/login')}
              >
                <Text style={styles.guestLoginBtnText}>Đăng nhập</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guestRegisterBtn}
                onPress={() => router.push('/register')}
              >
                <Text style={styles.guestRegisterBtnText}>Đăng ký</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Menu Navigation Items */}
        <View style={styles.menuList}>
          {[
            { id: 1, name: 'Đơn hàng của tôi', icon: 'cube.box', route: '/orders' },
            { id: 2, name: 'Sản phẩm yêu thích', icon: 'heart', route: '/favorites' },
            { id: 3, name: 'Cài đặt hệ thống', icon: 'gearshape', route: '/settings' },
            ...(isAdmin
              ? [
                  {
                    id: 4,
                    name: 'Quản trị hệ thống',
                    icon: 'square.grid.2x2',
                    route: '/admin',
                    badge: 'Admin Portal',
                  },
                ]
              : []),
          ].map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, item.badge ? styles.adminMenuItem : null]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuItemIconWrap, item.badge ? styles.adminIconWrap : null]}>
                  <IconSymbol name={item.icon as any} size={20} color={item.badge ? '#000000' : '#1a1c1c'} />
                </View>
                <View>
                  <Text style={styles.menuItemText}>{item.name}</Text>
                  {item.badge && <Text style={styles.menuItemSubText}>Quản lý đơn, người dùng & thống kê</Text>}
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {item.badge ? (
                  <View style={styles.adminBadge}>
                    <Text style={styles.adminBadgeText}>ADMIN</Text>
                  </View>
                ) : null}
                <IconSymbol name="chevron.right" size={18} color="#9ca3af" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button if logged in */}
        {user ? (
          <View style={styles.logoutSection}>
            <TouchableOpacity
              style={styles.logoutBtn}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <IconSymbol name="arrow.right.square" size={20} color="#ba1a1a" />
              <Text style={styles.logoutText}>Đăng xuất tài khoản</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Custom Professional Confirmation Modal */}
      <ConfirmModal
        visible={showLogoutModal}
        title="Đăng xuất tài khoản"
        message="Bạn có chắc chắn muốn đăng xuất khỏi ThoiTrangHD? Bạn sẽ cần đăng nhập lại để xem đơn hàng và danh sách yêu thích."
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
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  brandText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 6,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContentDesktop: {
    maxWidth: 600,
    paddingTop: 36,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    backgroundColor: '#ffffff',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef0f2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1c1c',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 13,
    color: '#8b949e',
    marginBottom: 16,
  },
  editProfileBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1a1c1c',
    marginTop: 8,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1c1c',
    letterSpacing: 0.5,
  },
  guestCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eef0f2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  guestIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1a1c1c',
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  guestButtonGroup: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  guestLoginBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#000000',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestLoginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  guestRegisterBtn: {
    flex: 1,
    height: 46,
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  guestRegisterBtnText: {
    color: '#1a1c1c',
    fontSize: 14,
    fontWeight: '600',
  },
  menuList: {
    gap: 12,
    marginBottom: 32,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f0f2f4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  menuItemSubText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  adminMenuItem: {
    backgroundColor: '#fafaf9',
    borderColor: '#e7e5e4',
    borderWidth: 1.5,
  },
  adminIconWrap: {
    backgroundColor: '#f5f5f4',
  },
  adminBadge: {
    backgroundColor: '#18181b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  logoutSection: {
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 20,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ba1a1a',
  },
});
