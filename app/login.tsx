import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { isDesktop, isTablet } = useResponsive();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    const res = await login(email.trim(), password);
    setLoading(false);

    if (res.success) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/user');
      }
    } else {
      setErrorMsg(res.message || 'Email hoặc mật khẩu không chính xác.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            (isDesktop || isTablet) && styles.scrollContentDesktop,
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/user'))}
          >
            <IconSymbol name="arrow.left" size={22} color="#1a1c1c" />
          </TouchableOpacity>

          {/* Header Branding */}
          <View style={styles.brandHeader}>
            <Text style={styles.brandLogo}>ThoiTrangHD</Text>
            <Text style={styles.subtitle}>Chào mừng bạn quay trở lại!</Text>
            <Text style={styles.description}>
              Đăng nhập để theo dõi đơn hàng và sản phẩm yêu thích của bạn
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.formContainer}>
            {errorMsg ? (
              <View style={styles.errorBox}>
                <IconSymbol name="exclamationmark.circle.fill" size={18} color="#ba1a1a" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputWrapper}>
                <IconSymbol name="envelope" size={20} color="#747878" />
                <TextInput
                  style={styles.input}
                  placeholder="name@example.com"
                  placeholderTextColor="#a0a4a5"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <View style={styles.inputWrapper}>
                <IconSymbol name="lock" size={20} color="#747878" />
                <TextInput
                  style={styles.input}
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#a0a4a5"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <IconSymbol
                    name={showPassword ? 'eye.slash' : 'eye'}
                    size={20}
                    color="#747878"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            {/* Register Link */}
            <View style={styles.registerPrompt}>
              <Text style={styles.promptText}>Chưa có tài khoản?</Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text style={styles.registerLink}>Đăng ký ngay</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Demo Credentials */}
            <View style={styles.demoBox}>
              <Text style={styles.demoTitle}>Tài khoản mẫu để thử nghiệm nhanh:</Text>
              <TouchableOpacity
                onPress={() => {
                  setEmail('test@thoitranghd.com');
                  setPassword('123456');
                }}
                style={styles.demoChip}
              >
                <Text style={styles.demoChipText}>test@thoitranghd.com / 123456 (Nhấn để điền)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    width: '100%',
    alignSelf: 'center',
  },
  scrollContentDesktop: {
    maxWidth: 480,
    paddingTop: 48,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  brandHeader: {
    marginBottom: 32,
  },
  brandLogo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1c1c',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1c1c',
    marginBottom: 6,
  },
  description: {
    fontSize: 14,
    color: '#747878',
    lineHeight: 20,
  },
  formContainer: {
    width: '100%',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdad6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#ba1a1a',
    flex: 1,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1c',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1a1c1c',
  },
  eyeBtn: {
    padding: 4,
  },
  loginBtn: {
    backgroundColor: '#000000',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  loginBtnDisabled: {
    opacity: 0.7,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  registerPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 32,
  },
  promptText: {
    fontSize: 14,
    color: '#747878',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    textDecorationLine: 'underline',
  },
  demoBox: {
    backgroundColor: '#f4f4f5',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#000000',
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444748',
    marginBottom: 8,
  },
  demoChip: {
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  demoChipText: {
    fontSize: 12,
    color: '#1a1c1c',
    fontWeight: '500',
  },
});
