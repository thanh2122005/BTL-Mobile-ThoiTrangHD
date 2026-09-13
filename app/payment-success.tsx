import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, Dimensions, Platform, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useResponsive } from '@/hooks/useResponsive';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { isLargeScreen } = useResponsive();
  const { orderCode, total } = useLocalSearchParams<{ orderCode?: string; total?: string }>();

  const displayOrderCode = orderCode ? (orderCode.startsWith('#') ? orderCode : `#${orderCode}`) : '#HD-PENDING';
  const displayTotal = total ? `${Number(total).toLocaleString('vi-VN')}đ` : '0đ';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Illustration */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDsV1qAFLaFhZlx8jYtF1HCg4tGgDACDAOb0VP0Pt8jrBXxD3mouI8syJgf_0WcT3z35Cpsy82MP313revWfLcUO4r55AuG2bVSNy2AFCo_GXsZnzHSparSJVw9hFPakG4NYOe9x6-Dmp3ny0JYOmm2Hqmnr9oCTGGmW13HSST4VqeNr4H1h2AQzBNJo0cCCwz1r9eiJiQYiqqVGhgQLqzRPD55meEbbG052c13OPrMqctzfyHwvDTwCw' }} 
            style={styles.illustration} 
            contentFit="cover"
          />
        </View>

        {/* Success Icon */}
        <View style={styles.iconContainer}>
          <IconSymbol name="checkmark.circle.fill" size={48} color="#725b2f" />
        </View>

        {/* Heading & Message */}
        <Text style={styles.heading}>Đặt hàng thành công!</Text>
        <Text style={styles.message}>
          Cảm ơn bạn đã mua sắm tại ThoiTrangHD. Đơn hàng của bạn đang được xử lý và sẽ sớm được giao đến bạn.
        </Text>

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>THÔNG TIN ĐƠN HÀNG</Text>
          
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Mã đơn hàng</Text>
            <Text style={styles.cardValue}>{displayOrderCode}</Text>
          </View>
          
          <View style={[styles.cardRow, styles.cardRowNoBorder]}>
            <Text style={styles.cardLabel}>Tổng tiền</Text>
            <Text style={styles.cardValue}>{displayTotal}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.viewOrderBtn} 
            onPress={() => {
              if (orderCode) {
                router.push(`/order-details?id=${orderCode}`);
              } else {
                router.push('/orders');
              }
            }}
          >
            <IconSymbol name="doc.plaintext" size={20} color="#000000" />
            <Text style={styles.viewOrderText}>Xem đơn hàng</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.continueShoppingBtn} onPress={() => router.push('/')}>
            <Text style={styles.continueShoppingText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  illustrationContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#ffffff',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 15,
    color: '#444748',
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: 36,
    lineHeight: 22,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 12,
    padding: 24,
    marginBottom: 36,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e1c28e',
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444748',
    letterSpacing: 2,
    marginBottom: 20,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  cardRowNoBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  cardLabel: {
    fontSize: 15,
    color: '#1a1c1c',
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  actionsContainer: {
    width: '100%',
    flexDirection: 'column',
    gap: 12,
    justifyContent: 'center',
  },
  viewOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 1.5,
    borderColor: '#000000',
    borderRadius: 28,
    gap: 8,
  },
  viewOrderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000000',
  },
  continueShoppingBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#000000',
    borderRadius: 28,
  },
  continueShoppingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
