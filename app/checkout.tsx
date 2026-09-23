import { VoucherModal } from '@/components/ui/VoucherModal';
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Platform, TextInput, Alert , Modal} from 'react-native';
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
  const {
    items: allCartItems,
    selectedItems,
    subtotalPrice,
    discountAmount,
    totalPrice,
    clearCart,
    clearSelectedItems,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
    updateCartItemVariant,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    shippingFee,
    isFreeShipping,
  } = useCart();
  const cart = selectedItems.length > 0 ? selectedItems : allCartItems;
  const [orderNote, setOrderNote] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [tempSize, setTempSize] = useState<string>('M');
  const [tempColor, setTempColor] = useState<string>('#000000');

  const handleOpenVariantModal = (item: any) => {
    setEditingItem(item);
    setTempSize(item.size || 'M');
    setTempColor(item.color || '#000000');
  };
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);

  const fetchVouchers = async () => {
    try {
      setLoadingVouchers(true);
      const res = await fetch(`${API_URL}/api/vouchers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailableVouchers(data.data);
      }
    } catch (err) {
      console.log('Error fetching vouchers', err);
    } finally {
      setLoadingVouchers(false);
    }
  };

  React.useEffect(() => {
    fetchVouchers();
  }, []);

  // Customer form state & component mount state
  const [isMounted, setIsMounted] = useState(false);
  const [customerName, setCustomerName] = useState(user?.name || '');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(user?.address || '');
  const [formErrors, setFormErrors] = useState<{ name?: string; phone?: string; address?: string }>({});

  const saveDeliveryInfoToStorage = (name: string, phone: string, address: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('THOITRANGHD_DELIVERY_INFO', JSON.stringify({ name, phone, address }));
      } catch (err) {}
    }
  };

  React.useEffect(() => {
    setIsMounted(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('THOITRANGHD_DELIVERY_INFO');
        if (saved) {
          const p = JSON.parse(saved);
          if (!customerName && p.name) setCustomerName(p.name);
          if (!customerPhone && p.phone) setCustomerPhone(p.phone);
          if (!customerAddress && p.address) setCustomerAddress(p.address);
        }
        const savedList = window.localStorage.getItem('THOITRANGHD_ADDRESS_BOOK');
        if (savedList) {
          const parsed = JSON.parse(savedList);
          if (Array.isArray(parsed)) setSavedAddresses(parsed);
        }
      } catch (err) {}
    }
  }, []);

  const saveToAddressBook = (label: string, name: string, phone: string, address: string) => {
    if (!name.trim() || !phone.trim() || !address.trim()) return;
    const newEntry = { id: Date.now().toString(), label, name, phone, address };
    const updated = [newEntry, ...savedAddresses.filter(a => a.address !== address)];
    setSavedAddresses(updated);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('THOITRANGHD_ADDRESS_BOOK', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  React.useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      if (!customerAddress && user.address) setCustomerAddress(user.address);
    }
  }, [user]);

  
  const calcSavings = (v: any) => {
    const isPercent = v.discount_type === 'percent' || v.discountType === 'percent';
    if (isPercent) {
      return Math.round((subtotalPrice * Number(v.value)) / 100);
    }
    return Math.min(Number(v.value), subtotalPrice);
  };

  const eligibleVouchers = availableVouchers
    .filter((v) => subtotalPrice >= (v.min_spend || 0))
    .sort((a, b) => calcSavings(b) - calcSavings(a));

  const bestVoucher = eligibleVouchers.length > 0 ? eligibleVouchers[0] : null;
  const bestSavings = bestVoucher ? calcSavings(bestVoucher) : 0;

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
    if (!validateForm()) {
      setShowAddressModal(true);
      return;
    }
    if (cart.length === 0) return;

    saveDeliveryInfoToStorage(customerName, customerPhone, customerAddress);
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
          orderNote: orderNote.trim(),
          shippingFee: shippingFee || 0,
          subtotal: subtotalPrice,
          discountAmount,
          totalPrice,
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Không thể tạo đơn hàng');
      }
      if (clearSelectedItems) {
        clearSelectedItems();
      } else {
        clearCart();
      }
      
      const orderCode = data.orderCode || 'N/A';
      router.replace(`/payment-success?orderCode=${orderCode}&total=${data.totalPrice || totalPrice}`);
    } catch (err: any) {
      console.error("Lỗi gửi đơn hàng:", err);
      setOrderError(err?.message || 'Không thể tạo đơn hàng vào lúc này. Vui lòng kiểm tra lại kết nối mạng.');
      setIsSubmitting(false);
    }
  };

  if (isMounted && cart.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={24} color="#1a1c1c" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thanh toán</Text>
            <View style={styles.spacer} />
          </View>
        </View>
        <View style={styles.emptyScreenContainer}>
          <View style={styles.emptyIconCircle}>
            <IconSymbol name="bag" size={56} color="#747878" />
          </View>
          <Text style={styles.emptyScreenTitle}>Giỏ hàng của bạn đang trống</Text>
          <Text style={styles.emptyScreenDesc}>
            Bạn chưa có sản phẩm nào trong giỏ hàng để tiến hành thanh toán.
          </Text>
          <TouchableOpacity style={styles.emptyShopBtn} onPress={() => router.replace('/products')}>
            <Text style={styles.emptyShopBtnText}>KHÁM PHÁ SẢN PHẨM</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
        
        {/* Compact Delivery Address Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconSymbol name="location" size={18} color="#b78103" />
              <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
            </View>
            <TouchableOpacity 
              style={styles.changeAddressBtn}
              onPress={() => setShowAddressModal(true)}
            >
              <Text style={styles.changeAddressBtnText}>Thay đổi</Text>
            </TouchableOpacity>
          </View>

          {customerName || customerPhone || customerAddress ? (
            <TouchableOpacity 
              style={styles.addressSummaryCard}
              onPress={() => setShowAddressModal(true)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Text style={styles.addressRecipientName}>{customerName || 'Chưa có tên'}</Text>
                  <Text style={styles.addressDivider}>|</Text>
                  <Text style={styles.addressPhone}>{customerPhone || 'Chưa có SĐT'}</Text>
                </View>
                <Text style={styles.addressDetailText} numberOfLines={2}>
                  {customerAddress || 'Chưa có địa chỉ giao hàng'}
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color="#999" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={styles.emptyAddressPrompt}
              onPress={() => setShowAddressModal(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="plus" size={18} color="#b78103" />
                <Text style={{ fontSize: 13, color: '#b78103', fontWeight: '600' }}>Thêm thông tin nhận hàng</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color="#999" />
            </TouchableOpacity>
          )}

          {savedAddresses.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 12, color: '#747878', marginBottom: 6, fontWeight: '600' }}>SỔ ĐỊA CHỈ ĐÃ LƯU:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {savedAddresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.addressChip,
                      customerAddress === addr.address && styles.addressChipActive
                    ]}
                    onPress={() => {
                      setCustomerName(addr.name);
                      setCustomerPhone(addr.phone);
                      setCustomerAddress(addr.address);
                    }}
                  >
                    <IconSymbol name="location" size={12} color={customerAddress === addr.address ? '#b78103' : '#6b7280'} />
                    <Text style={[styles.addressChipText, customerAddress === addr.address && styles.addressChipTextActive]}>
                      {addr.label || 'Địa chỉ'}: {addr.address.slice(0, 24)}...
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
                      <TouchableOpacity 
                        style={styles.variantSelectorChip}
                        onPress={() => handleOpenVariantModal(item)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.variantColorDot, { backgroundColor: item.color || '#000' }]} />
                        <Text style={styles.variantSelectorText}>
                          {getColorLabel(item.color)} / Size {item.size || 'M'}
                        </Text>
                        <IconSymbol name="chevron.right" size={12} color="#747878" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.itemFooter}>
                      <View style={styles.quantityControl}>
                        <TouchableOpacity 
                          style={styles.qtyBtn} 
                          onPress={() => decreaseQuantity(item.cartItemId || item.id)}
                          activeOpacity={0.7}
                        >
                          <IconSymbol name="minus" size={14} color="#1a1c1c" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn} 
                          onPress={() => increaseQuantity(item.cartItemId || item.id)}
                          activeOpacity={0.7}
                        >
                          <IconSymbol name="plus" size={14} color="#1a1c1c" />
                        </TouchableOpacity>
                      </View>
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

        
        {/* Voucher Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <IconSymbol name="ticket.fill" size={18} color="#b78103" />
              <Text style={styles.sectionTitle}>Mã giảm giá</Text>
            </View>
            <TouchableOpacity 
              style={styles.selectVoucherBtn} 
              onPress={() => setShowVoucherModal(true)}
            >
              <Text style={styles.selectVoucherBtnText}>Chọn Voucher</Text>
            </TouchableOpacity>
          </View>

          {appliedVoucher ? (
            <View style={styles.appliedVoucherBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <View style={styles.voucherCodeBadgeSmall}>
                  <Text style={styles.voucherCodeBadgeSmallText}>{appliedVoucher.code}</Text>
                </View>
                <View>
                  <Text style={styles.appliedVoucherTitle}>
                    {(appliedVoucher.discount_type === 'percent' || appliedVoucher.discountType === 'percent') 
                      ? `Đã giảm ${appliedVoucher.value}%` 
                      : `Đã giảm ${formatVND(appliedVoucher.value)}`}
                  </Text>
                  <Text style={styles.appliedVoucherSub}>Tiết kiệm {formatVND(discountAmount)}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <TouchableOpacity onPress={() => setShowVoucherModal(true)}>
                  <Text style={{ color: '#b78103', fontSize: 13, fontWeight: '700' }}>Đổi mã</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={removeVoucher}>
                  <Text style={styles.removeVoucherText}>Gỡ bỏ</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.selectVoucherPrompt} 
              onPress={() => setShowVoucherModal(true)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <IconSymbol name="tag.fill" size={18} color="#b78103" />
                <Text style={styles.selectVoucherPromptText}>Chọn hoặc nhập mã khuyến mãi</Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color="#747878" />
            </TouchableOpacity>
          )}
        </View>

        {/* Order Note Section */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconSymbol name="pencil" size={18} color="#b78103" />
            <Text style={styles.sectionTitle}>Lời dặn Shipper & Ghi chú đơn hàng</Text>
          </View>
          <TextInput
            style={styles.orderNoteInput}
            placeholder="Ví dụ: Giao sau 17h, gọi trước khi đến 15 phút, gói hàng làm quà tặng..."
            placeholderTextColor="#9ca3af"
            value={orderNote}
            onChangeText={setOrderNote}
            multiline
            numberOfLines={2}
          />
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
            {isFreeShipping ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 13, textDecorationLine: 'line-through', color: '#9ca3af' }}>30.000₫</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#16a34a' }}>MIỄN PHÍ</Text>
              </View>
            ) : subtotalPrice === 0 ? (
              <Text style={styles.summaryValue}>0₫</Text>
            ) : (
              <Text style={styles.summaryValue}>{formatVND(shippingFee)}</Text>
            )}
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

      
      {/* Address Edit Modal */}
      <Modal
        visible={showAddressModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.addressModalOverlay}>
          <View style={styles.addressModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="location" size={20} color="#b78103" />
                <Text style={styles.modalTitle}>Thông tin nhận hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.closeBtn}>
                <IconSymbol name="xmark" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Họ và tên <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={[styles.formInput, formErrors.name ? styles.formInputError : null]}
                  placeholder="Nhập họ và tên người nhận"
                  placeholderTextColor="#999"
                  value={customerName}
                  onChangeText={(val) => { setCustomerName(val); if (formErrors.name) setFormErrors(p => ({...p, name: undefined})); }}
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
                  onChangeText={(val) => { setCustomerPhone(val); if (formErrors.phone) setFormErrors(p => ({...p, phone: undefined})); }}
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
                  onChangeText={(val) => { setCustomerAddress(val); if (formErrors.address) setFormErrors(p => ({...p, address: undefined})); }}
                />
                {formErrors.address && <Text style={styles.errorText}>{formErrors.address}</Text>}
              </View>
            </ScrollView>

            <View style={styles.addressModalFooter}>
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <TouchableOpacity 
                  style={[styles.saveAddressBtn, { flex: 1, backgroundColor: '#f3f4f6' }]}
                  onPress={() => {
                    if (validateForm()) {
                      saveToAddressBook('Nhà riêng', customerName, customerPhone, customerAddress);
                      saveDeliveryInfoToStorage(customerName, customerPhone, customerAddress);
                      setShowAddressModal(false);
                    }
                  }}
                >
                  <Text style={[styles.saveAddressBtnText, { color: '#374151' }]}>Lưu vào Sổ địa chỉ</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveAddressBtn, { flex: 1 }]}
                  onPress={() => {
                    if (validateForm()) {
                      saveDeliveryInfoToStorage(customerName, customerPhone, customerAddress);
                      setShowAddressModal(false);
                    }
                  }}
                >
                  <Text style={styles.saveAddressBtnText}>Xác nhận</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>


      {/* Confirm Delete Item Modal */}
      <ConfirmModal
        visible={!!itemToDelete}
        title="Xóa sản phẩm"
        message={'Bạn có chắc chắn muốn xóa ' + (itemToDelete?.name || 'sản phẩm này') + ' khỏi đơn hàng?'}
        confirmText="Xóa"
        cancelText="Giữ lại"
        confirmType="danger"
        onCancel={() => setItemToDelete(null)}
        onConfirm={() => {
          if (itemToDelete) {
            removeFromCart(itemToDelete.cartItemId || itemToDelete.id);
            setItemToDelete(null);
          }
        }}
      />

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
    
      {/* Voucher Modal */}
      <VoucherModal
        visible={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        subtotalPrice={subtotalPrice}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={async (code) => {
          return await applyVoucher(code, user?.id);
        }}
        onRemoveVoucher={removeVoucher}
      />
    
      {/* Edit Product Variant Modal */}
      <Modal
        visible={!!editingItem}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.addressModalOverlay}>
          <View style={styles.addressModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>{editingItem?.name}</Text>
                <Text style={{ fontSize: 13, color: '#b78103', fontWeight: '700', marginTop: 2 }}>
                  {editingItem ? formatVND(parsePrice(editingItem.price)) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingItem(null)} style={styles.closeBtn}>
                <IconSymbol name="xmark" size={22} color="#555" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
              {/* Color options */}
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.variantOptionTitle}>
                  MÀU SẮC: <Text style={{ fontWeight: '700', color: '#1a1c1c' }}>{getColorLabel(tempColor)}</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  {[
                    { color: '#000000', label: 'Đen' },
                    { color: '#E5D3B3', label: 'Beige' },
                    { color: '#1A237E', label: 'Xanh Navy' },
                  ].map((c) => {
                    const isSelected = tempColor === c.color || (tempColor === 'black' && c.color === '#000000');
                    return (
                      <TouchableOpacity
                        key={c.color}
                        style={[
                          styles.variantColorOption,
                          isSelected && styles.variantColorOptionSelected,
                        ]}
                        onPress={() => setTempColor(c.color)}
                      >
                        <View style={[styles.variantColorCircle, { backgroundColor: c.color }]} />
                        <Text style={[styles.variantColorName, isSelected && styles.variantColorNameSelected]}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Size options */}
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.variantOptionTitle}>
                  KÍCH THƯỚC: <Text style={{ fontWeight: '700', color: '#1a1c1c' }}>Size {tempSize}</Text>
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {(() => {
                    const isShoe = !isNaN(Number(editingItem?.size));
                    const isAccessory = editingItem?.size === 'Freesize';
                    const availableSizes = isShoe 
                      ? ['35', '36', '37', '38', '39', '40', '41', '42', '43'] 
                      : isAccessory 
                        ? ['Freesize'] 
                        : ['S', 'M', 'L', 'XL'];

                    return availableSizes.map((sz) => {
                      const isSelected = tempSize === sz;
                      return (
                        <TouchableOpacity
                          key={sz}
                          style={[
                            styles.variantSizeChip,
                            isSelected && styles.variantSizeChipSelected,
                          ]}
                          onPress={() => setTempSize(sz)}
                        >
                          <Text style={[styles.variantSizeText, isSelected && styles.variantSizeTextSelected]}>
                            {sz}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            </ScrollView>

            <View style={styles.addressModalFooter}>
              <TouchableOpacity 
                style={styles.saveAddressBtn}
                onPress={() => {
                  if (editingItem) {
                    updateCartItemVariant(editingItem.cartItemId || editingItem.id, tempSize, tempColor);
                    setEditingItem(null);
                  }
                }}
              >
                <Text style={styles.saveAddressBtnText}>Xác nhận thay đổi</Text>
              </TouchableOpacity>
            </View>
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
  bankInfoCard: {
    marginTop: 12,
    backgroundColor: '#fffdf6',
    borderWidth: 1,
    borderColor: '#e3d3b1',
    borderRadius: 10,
    padding: 14,
  },
  bankInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0d0aa',
  },
  bankInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b78103',
    letterSpacing: 0.5,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  bankDetailLabel: {
    fontSize: 13,
    color: '#666',
  },
  bankDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  bankDetailHighlight: {
    fontWeight: '800',
    color: '#b78103',
  },
  bankNoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#888',
    marginTop: 6,
  },
  emptyScreenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 400,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyScreenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1c1c',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyScreenDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyShopBtn: {
    backgroundColor: '#1a1c1c',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  emptyShopBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
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

  selectVoucherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fffcf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#f5d8a0',
  },
  selectVoucherBtnText: {
    color: '#b78103',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeBtn: {
    padding: 4,
  },
  modalScroll: {
    padding: 16,
  },
  modalVoucherCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modalVoucherLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalVoucherBadge: {
    backgroundColor: '#fff5e6',
    borderWidth: 1,
    borderColor: '#f5d8a0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  modalVoucherCode: {
    color: '#b78103',
    fontWeight: '700',
    fontSize: 14,
  },
  modalVoucherInfo: {
    flex: 1,
  },
  modalVoucherDesc: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  modalVoucherCondition: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalVoucherEligible: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '500',
  },
  modalVoucherMissing: {
    fontSize: 11,
    color: '#d32f2f',
  },
  modalApplyBtn: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 12,
  },
  modalApplyBtnDisabled: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalApplyBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  appliedVoucherBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#f2e4c2',
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  voucherCodeBadgeSmall: {
    backgroundColor: '#fcf8ec',
    borderWidth: 1,
    borderColor: '#ecd8ad',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  voucherCodeBadgeSmallText: {
    color: '#b78103',
    fontWeight: '700',
    fontSize: 12,
  },
  appliedVoucherTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  appliedVoucherSub: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '500',
    marginTop: 1,
  },
  selectVoucherPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 10,
  },
  selectVoucherPromptText: {
    fontSize: 13,
    color: '#555555',
  },
  removeVoucherText: {
    color: '#d32f2f',
    fontSize: 12,
    fontWeight: '600',
  },

  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffdf5',
    borderWidth: 1,
    borderColor: '#f2cd6d',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
    marginBottom: 4,
  },
  suggestionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8a5c00',
  },
  suggestionSub: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  suggestionApplyBtn: {
    backgroundColor: '#b78103',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginLeft: 8,
  },
  suggestionApplyText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  changeAddressBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  changeAddressBtnText: {
    color: '#b78103',
    fontSize: 13,
    fontWeight: '700',
  },
  addressSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 12,
  },
  addressRecipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  addressDivider: {
    color: '#ccc',
    fontSize: 13,
  },
  addressPhone: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  addressDetailText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  emptyAddressPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffdf9',
    borderWidth: 1,
    borderColor: '#ecd8ad',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
  },
  addressModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  addressModalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  addressModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  saveAddressBtn: {
    backgroundColor: '#1a1c1c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveAddressBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  variantSelectorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
    gap: 6,
  },
  variantColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  variantSelectorText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '600',
  },
  variantOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#747878',
    letterSpacing: 0.5,
  },
  variantColorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  variantColorOptionSelected: {
    borderColor: '#b78103',
    backgroundColor: '#fffdf5',
  },
  variantColorCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  variantColorName: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  variantColorNameSelected: {
    color: '#b78103',
    fontWeight: '700',
  },
  variantSizeChip: {
    minWidth: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantSizeChipSelected: {
    borderColor: '#b78103',
    backgroundColor: '#fffdf5',
  },
  variantSizeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
  },
  variantSizeTextSelected: {
    color: '#b78103',
    fontWeight: '700',
  },

  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#ffffff',
  },
  qtyBtn: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 13,
    backgroundColor: '#f3f3f3',
  },
  qtyText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 26,
    textAlign: 'center',
  },
  orderNoteInput: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1a1c1c',
    minHeight: 56,
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  addressChipActive: {
    borderColor: '#b78103',
    backgroundColor: '#fffdf5',
  },
  addressChipText: {
    fontSize: 12,
    color: '#4b5563',
  },
  addressChipTextActive: {
    color: '#b78103',
    fontWeight: '600',
  },
});