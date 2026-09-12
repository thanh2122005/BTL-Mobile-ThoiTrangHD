import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, TextInput, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useCart, parsePrice } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';

import { getImageSource } from '@/constants/images';


const getColorLabel = (color?: string) => {
  if (!color) return 'Đen';
  if (color === '#000000' || color.toLowerCase() === 'black') return 'Đen';
  if (color === '#E5D3B3' || color.toLowerCase() === 'beige') return 'Beige';
  if (color === '#1A237E' || color.toLowerCase() === 'navy') return 'Xanh Navy';
  return color;
};

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { items: cart, subtotalPrice, discountAmount, totalPrice, clearCart, appliedVoucher } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Customer form state
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(user?.address || '');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  React.useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      if (!customerAddress && user.address) setCustomerAddress(user.address);
    }
  }, [user]);

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const validateForm = () => {
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!customerName.trim()) errors.name = 'Vui lòng nhập họ tên';
    if (!customerPhone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0[0-9]{9,10})$/.test(customerPhone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    }
    if (!customerAddress.trim()) errors.address = 'Vui lòng nhập địa chỉ giao hàng';
    else if (customerAddress.trim().length < 10) errors.address = 'Địa chỉ nhận hàng cần ghi rõ số nhà, tên đường, phường/xã, quận/huyện';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) return;
    if (cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim(),
          paymentMethod,
          voucherCode: appliedVoucher?.code || null,
          items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: parsePrice(item.price),
            quantity: item.quantity,
            size: item.size || 'M',
            color: item.color || '#000000',
          })),
          subtotal: subtotalPrice,
          discountAmount,
          totalPrice,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo đơn hàng');
      }
      clearCart();
      
      const orderCode = data.orderCode || 'N/A';
      router.replace(`/payment-success?orderCode=${orderCode}&total=${data.totalPrice || totalPrice}`);
    } catch (err: any) {
      console.error("Lỗi gửi đơn hàng:", err);
      setOrderError(err?.message || 'Không thể tạo đơn hàng vào lúc này. Vui lòng kiểm tra lại kết nối mạng.');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={24} color="#1a1c1c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thanh toán</Text>
          <View style={styles.spacer} />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Customer Info Form */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thông tin nhận hàng</Text>
          </View>
          
          <View style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Họ và tên <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.formInput, formErrors.name ? styles.formInputError : null]}
                placeholder="Nhập họ và tên người nhận"
                placeholderTextColor="#999"
                value={customerName}
                onChangeText={(text) => { setCustomerName(text); if (formErrors.name) setFormErrors(p => ({...p, name: undefined})); }}
              />
              {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Số điện thoại <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.formInput, formErrors.phone ? styles.formInputError : null]}
                placeholder="VD: 0912345678"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={customerPhone}
                onChangeText={(text) => { setCustomerPhone(text); if (formErrors.phone) setFormErrors(p => ({...p, phone: undefined})); }}
              />
              {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Địa chỉ giao hàng <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea, formErrors.address ? styles.formInputError : null]}
                placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={customerAddress}
                onChangeText={(text) => { setCustomerAddress(text); if (formErrors.address) setFormErrors(p => ({...p, address: undefined})); }}
              />
              {formErrors.address && <Text style={styles.errorText}>{formErrors.address}</Text>}
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sản phẩm ({cart.length})</Text>
          </View>
          
          <View style={styles.itemsList}>
            {cart.map((item, index) => {
              const imageSource = getImageSource(item.image);
              const priceNum = parsePrice(item.price);
              const formattedPrice = formatVND(priceNum * item.quantity);
              const itemKey = item.cartItemId || `${item.id}-${index}`;

              return (
                <View key={itemKey} style={styles.itemCard}>
                  <View style={styles.itemImageContainer}>
                    <Image source={imageSource} style={styles.itemImage} contentFit="cover" />
                  </View>
                  <View style={styles.itemDetails}>
                    <View>
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.itemMeta}>{getColorLabel(item.color)} / {item.size || 'M'}</Text>
                    </View>
                    <View style={styles.itemFooter}>
                      <Text style={styles.itemQty}>SL: {item.quantity}</Text>
                      <Text style={styles.itemPrice}>{formattedPrice}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            
            {cart.length === 0 && (
              <Text style={styles.emptyText}>Giỏ hàng trống.</Text>
            )}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          </View>
          
          <View style={styles.paymentMethods}>
            {[
              { id: 'cod', title: 'Thanh toán khi nhận hàng (COD)', icon: 'car', desc: 'Thanh toán bằng tiền mặt khi nhận hàng' },
              { id: 'bank', title: 'Chuyển khoản ngân hàng', icon: 'building.columns', desc: 'Chuyển khoản trước khi giao hàng' },
            ].map(method => (
              <TouchableOpacity 
                key={method.id} 
                style={[styles.paymentOption, paymentMethod === method.id && styles.paymentOptionSelected]}
                onPress={() => setPaymentMethod(method.id)}
              >
                <View style={[styles.radioOuter, paymentMethod === method.id && styles.radioOuterSelected]}>
                  {paymentMethod === method.id && <View style={styles.radioInner} />}
                </View>
                <IconSymbol name={method.icon as any} size={24} color="#444748" style={styles.paymentIcon} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentTitle}>{method.title}</Text>
                  <Text style={styles.paymentDesc}>{method.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Total Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng tiền hàng</Text>
            <Text style={styles.summaryValue}>{formatVND(subtotalPrice)}</Text>
          </View>

          {discountAmount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#2e7d32' }]}>Giảm giá khuyến mãi</Text>
              <Text style={[styles.summaryValue, { color: '#2e7d32', fontWeight: '600' }]}>-{formatVND(discountAmount)}</Text>
            </View>
          )}

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryValue}>Miễn phí</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tổng thanh toán</Text>
            <Text style={styles.totalValue}>{formatVND(totalPrice)}</Text>
          </View>
        </View>


        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.bottomTotalBox}>
            <Text style={styles.bottomTotalLabel}>Tổng cộng</Text>
            <Text style={styles.bottomTotalValue}>{formatVND(totalPrice)}</Text>
          </View>
          <TouchableOpacity 
            style={[styles.placeOrderBtn, (cart.length === 0 || isSubmitting) && styles.placeOrderBtnDisabled]} 
            onPress={handlePlaceOrder} 
            disabled={cart.length === 0 || isSubmitting}
          >
            <Text style={styles.placeOrderText}>{isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Error Modal */}
      <ConfirmModal
        visible={!!orderError}
        title="Thông báo"
        message={orderError || ''}
        confirmText="Đã hiểu"
        confirmType="danger"
        onCancel={() => setOrderError(null)}
        onConfirm={() => setOrderError(null)}
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
    borderBottomColor: '#EAEAEA',
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  iconButton: {
    padding: 8,
    marginLeft: -8,
  },
  spacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
    gap: 48,
  },
  section: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 199, 199, 0.3)',
    paddingBottom: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  // Form styles
  formContainer: {
    gap: 20,
  },
  formGroup: {
    width: '100%',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1c',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  required: {
    color: '#ba1a1a',
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1c1c',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
  },
  formTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  formInputError: {
    borderColor: '#ba1a1a',
    borderWidth: 1.5,
  },
  errorText: {
    fontSize: 12,
    color: '#ba1a1a',
    marginTop: 6,
  },
  // Items
  itemsList: {
    gap: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    gap: 16,
  },
  itemImageContainer: {
    width: 96,
    height: 128,
    backgroundColor: '#eeeeee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 24,
  },
  itemMeta: {
    fontSize: 14,
    color: '#444748',
    marginTop: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  itemQty: {
    fontSize: 14,
    color: '#444748',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  emptyText: {
    fontSize: 14,
    color: '#444748',
    fontStyle: 'italic',
  },
  // Payment
  paymentMethods: {
    gap: 12,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  paymentOptionSelected: {
    backgroundColor: '#f3f3f3',
    borderColor: '#121212',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#747878',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#000000',
    borderWidth: 2,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentTitle: {
    fontSize: 16,
    color: '#1a1c1c',
    fontWeight: '500',
  },
  paymentDesc: {
    fontSize: 13,
    color: '#747878',
    marginTop: 2,
  },
  // Summary
  summarySection: {
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    paddingTop: 16,
    gap: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#444748',
  },
  summaryValue: {
    fontSize: 14,
    color: '#444748',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#EAEAEA',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  bottomBarContent: {
    flexDirection: 'row',
    maxWidth: 768,
    alignSelf: 'center',
    width: '100%',
    alignItems: 'center',
    gap: 16,
  },
  bottomTotalBox: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 14,
    color: '#444748',
  },
  bottomTotalValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000000',
  },
  placeOrderBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#000000',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeOrderBtnDisabled: {
    backgroundColor: '#999999',
  },
  placeOrderText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1,
  },
});
