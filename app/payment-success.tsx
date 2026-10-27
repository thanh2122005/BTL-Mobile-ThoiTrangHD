import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_URL } from '@/constants/config';

export default function PaymentSuccessScreen() {
  const router = useRouter();
  const { orderCode, total, paymentMethod } = useLocalSearchParams<{ 
    orderCode?: string; 
    total?: string; 
    paymentMethod?: string;
  }>();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSimulatedPaid, setIsSimulatedPaid] = useState(false);

  const cleanOrderCode = orderCode ? orderCode.replace(/^#/, '') : 'HD-PENDING';
  const displayOrderCode = `#${cleanOrderCode}`;
  const rawTotal = Number(total) || 0;
  const displayTotal = rawTotal > 0 ? `${rawTotal.toLocaleString('vi-VN')}₫` : '0₫';
  const isBankPayment = paymentMethod === 'bank' || paymentMethod === 'banking' || paymentMethod === 'vietqr';

  // Thông tin tài khoản ngân hàng của cửa hàng
  const bankInfo = {
    bankName: 'MB Bank (Ngân hàng Quân Đội)',
    accountNumber: '0988776655',
    accountName: 'CÔNG TY THỜI TRANG HD',
    transferContent: cleanOrderCode,
  };

  const qrUrl = `https://img.vietqr.io/image/MB-0988776655-compact2.png?amount=${rawTotal}&addInfo=${encodeURIComponent(cleanOrderCode)}&accountName=THOI%20TRANG%20HD`;

  const copyToClipboard = (text: string, field: string) => {
    setCopiedField(field);
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleSimulateBankPayment = async () => {
    if (isSimulating || isSimulatedPaid) return;
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${cleanOrderCode}/confirm-payment-transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data && data.success) {
        setIsSimulatedPaid(true);
      } else {
        alert(data.message || 'Không thể xác nhận giao dịch');
      }
    } catch (err) {
      console.error('Lỗi xác nhận chuyển khoản:', err);
      setIsSimulatedPaid(true);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Success Icon Badge */}
        <View style={styles.iconContainer}>
          <IconSymbol name="checkmark.circle.fill" size={54} color="#16a34a" />
        </View>

        {/* Heading & Message */}
        <Text style={styles.heading}>Đặt hàng thành công!</Text>
        <Text style={styles.message}>
          Cảm ơn bạn đã tin tưởng mua sắm tại ThoiTrangHD. Đơn hàng của bạn đã được ghi nhận vào hệ thống.
        </Text>

        {/* Bank Transfer / VietQR Section if Banking is selected */}
        {isBankPayment ? (
          <View style={styles.bankCard}>
            {isSimulatedPaid ? (
              <View style={styles.simulatedSuccessCard}>
                <View style={styles.simulatedSuccessIcon}>
                  <IconSymbol name="clock.arrow.circlepath" size={28} color="#7c3aed" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.simulatedSuccessTitle}>ĐÃ GỬI XÁC NHẬN CHUYỂN KHOẢN</Text>
                  <Text style={styles.simulatedSuccessSub}>
                    Hệ thống đã ghi nhận thông báo chuyển khoản cho đơn hàng {displayOrderCode}. Đơn hàng đang ở trạng thái &ldquo;Chờ hệ thống duyệt&rdquo;. Hệ thống sẽ đối soát thanh toán và xuất kho gửi hàng cho bạn ngay nhé!
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.bankHeaderRow}>
                  <IconSymbol name="qrcode" size={20} color="#b78103" />
                  <Text style={styles.bankCardTitle}>THANH TOÁN VIETQR 24/7</Text>
                </View>
                <Text style={styles.bankSubtitle}>
                  Quét mã QR dưới đây bằng ứng dụng ngân hàng hoặc ví điện tử để hoàn tất thanh toán tức thì:
                </Text>

                {/* QR Image */}
                <View style={styles.qrImageContainer}>
                  <Image 
                    source={{ uri: qrUrl }} 
                    style={styles.qrImage} 
                    contentFit="contain"
                  />
                </View>

                {/* Account Details Box */}
                <View style={styles.bankDetailsBox}>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Ngân hàng:</Text>
                    <Text style={styles.bankValueBold}>{bankInfo.bankName}</Text>
                  </View>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Số tài khoản:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.bankValueBold, { color: '#0f172a', fontSize: 16 }]}>{bankInfo.accountNumber}</Text>
                      <TouchableOpacity 
                        style={styles.copyBtn} 
                        onPress={() => copyToClipboard(bankInfo.accountNumber, 'stk')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.copyBtnText}>
                          {copiedField === 'stk' ? '✓ Đã chép' : 'Sao chép'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Chủ tài khoản:</Text>
                    <Text style={styles.bankValueBold}>{bankInfo.accountName}</Text>
                  </View>

                  <View style={styles.bankRow}>
                    <Text style={styles.bankLabel}>Số tiền:</Text>
                    <Text style={[styles.bankValueBold, { color: '#16a34a', fontSize: 17 }]}>{displayTotal}</Text>
                  </View>

                  <View style={[styles.bankRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.bankLabel}>Nội dung CK:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={[styles.bankValueBold, { color: '#b45309', fontSize: 16 }]}>{bankInfo.transferContent}</Text>
                      <TouchableOpacity 
                        style={styles.copyBtn} 
                        onPress={() => copyToClipboard(bankInfo.transferContent, 'nd')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.copyBtnText}>
                          {copiedField === 'nd' ? '✓ Đã chép' : 'Sao chép'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {/* Customer Transfer Confirmation Box */}
                <View style={styles.sandboxActionsBox}>
                  <TouchableOpacity 
                    style={styles.simulatePayBtn} 
                    onPress={handleSimulateBankPayment}
                    disabled={isSimulating}
                    activeOpacity={0.8}
                  >
                    {isSimulating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <IconSymbol name="checkmark.circle.fill" size={18} color="#ffffff" />
                        <Text style={styles.simulatePayBtnText}>Tôi đã chuyển khoản xong</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <View style={styles.sandboxTipRow}>
                    <IconSymbol name="info.circle" size={14} color="#64748b" />
                    <Text style={styles.sandboxTipText}>
                      Sau khi hoàn tất quét mã QR, bấm nút trên để thông báo cho Shop kiểm tra biến động số dư và duyệt đơn hàng.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        ) : (
          /* COD Guidance */
          <View style={styles.codCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <IconSymbol name="car" size={20} color="#15803d" />
              <Text style={styles.codTitle}>Thanh toán khi nhận hàng (COD)</Text>
            </View>
            <Text style={styles.codDesc}>
              Đơn hàng sẽ được nhân viên shipper chuyển phát đến tận nơi. Bạn vui lòng chuẩn bị số tiền {displayTotal} khi nhận kiện hàng.
            </Text>
          </View>
        )}

        {/* Order Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.cardAccent} />
          <Text style={styles.cardTitle}>THÔNG TIN ĐƠN HÀNG</Text>
          
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Mã đơn hàng</Text>
            <Text style={styles.cardValue}>{displayOrderCode}</Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Phương thức</Text>
            <Text style={[styles.cardValue, { fontSize: 13, flex: 1, textAlign: 'right' }]} numberOfLines={1}>
              {isBankPayment ? 'Chuyển khoản VietQR' : 'Tiền mặt khi nhận hàng (COD)'}
            </Text>
          </View>

          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Thanh toán</Text>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {isBankPayment ? (
                isSimulatedPaid ? (
                  <View style={styles.statusBadgePending}>
                    <IconSymbol name="clock.arrow.circlepath" size={12} color="#6d28d9" />
                    <Text style={styles.statusBadgePendingText}>Chờ hệ thống duyệt</Text>
                  </View>
                ) : (
                  <View style={styles.statusBadgeWaiting}>
                    <IconSymbol name="clock" size={12} color="#b45309" />
                    <Text style={styles.statusBadgeWaitingText}>Chờ chuyển khoản</Text>
                  </View>
                )
              ) : (
                <Text style={[styles.cardValue, { fontSize: 13, color: '#64748b', fontWeight: '600' }]} numberOfLines={1}>
                  Thanh toán khi nhận hàng
                </Text>
              )}
            </View>
          </View>
          
          <View style={[styles.cardRow, styles.cardRowNoBorder]}>
            <Text style={styles.cardLabel}>Tổng thanh toán</Text>
            <Text style={[styles.cardValue, { color: '#0f172a', fontWeight: '800' }]}>{displayTotal}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.viewOrderBtn} 
            onPress={() => {
              if (orderCode) {
                router.push(`/order-details?id=${cleanOrderCode}`);
              } else {
                router.push('/orders');
              }
            }}
          >
            <IconSymbol name="printer" size={20} color="#000000" />
            <Text style={styles.viewOrderText}>Xem chi tiết đơn & In hóa đơn</Text>
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
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 36,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 440,
    marginBottom: 24,
    lineHeight: 22,
  },
  bankCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  bankHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  bankCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#b78103',
    letterSpacing: 1,
  },
  bankSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 16,
    lineHeight: 18,
  },
  qrImageContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  qrImage: {
    width: 240,
    height: 240,
  },
  bankDetailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  bankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bankLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  bankValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  copyBtn: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  sandboxActionsBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  simulatePayBtn: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  simulatePayBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  sandboxTipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  sandboxTipText: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    lineHeight: 15,
  },
  simulatedSuccessCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    borderRadius: 12,
    padding: 16,
  },
  simulatedSuccessIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  simulatedSuccessTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6d28d9',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  simulatedSuccessSub: {
    fontSize: 13,
    color: '#5b21b6',
    lineHeight: 18,
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgePendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6d28d9',
  },
  statusBadgeWaiting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeWaitingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b45309',
  },
  codCard: {
    width: '100%',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  codTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#15803d',
  },
  codDesc: {
    fontSize: 13,
    color: '#166534',
    lineHeight: 18,
  },
  summaryCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 20,
    marginBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#0f172a',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  cardRowNoBorder: {
    borderBottomWidth: 0,
    paddingBottom: 0,
    marginBottom: 0,
  },
  cardLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
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
    borderColor: '#0f172a',
    borderRadius: 12,
    gap: 8,
    backgroundColor: '#ffffff',
  },
  viewOrderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  continueShoppingBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: '#0f172a',
    borderRadius: 12,
  },
  continueShoppingText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});