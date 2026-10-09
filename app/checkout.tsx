import { VoucherModal } from '@/components/ui/VoucherModal';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
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

const formatVND = (num: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMobile, isLargeScreen, width } = useResponsive();
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
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'bank'>('cod');
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

  useEffect(() => {
    fetchVouchers();
  }, []);

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

  useEffect(() => {
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
    const updated = [newEntry, ...savedAddresses.filter((a) => a.address !== address)];
    setSavedAddresses(updated);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('THOITRANGHD_ADDRESS_BOOK', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (user) {
      if (!customerName && user.name) setCustomerName(user.name);
      if (!customerPhone && user.phone) setCustomerPhone(user.phone);
      if (!customerAddress && user.address) setCustomerAddress(user.address);
    }
  }, [user]);

  const validateForm = () => {
    const errors: { name?: string; phone?: string; address?: string } = {};
    if (!customerName.trim()) errors.name = 'Vui lòng nhập họ và tên người nhận';
    if (!customerPhone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0[0-9]{9,10})$/.test(customerPhone.trim())) {
      errors.phone = 'Số điện thoại không hợp lệ (VD: 0912345678)';
    }
    if (!customerAddress.trim()) errors.address = 'Vui lòng nhập địa chỉ giao hàng';
    else if (customerAddress.trim().length < 8)
      errors.address = 'Địa chỉ cần ghi rõ số nhà, tên đường, phường/xã, quận/huyện';
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
          items: cart.map((item) => ({
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
        }),
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
      console.error('Lỗi gửi đơn hàng:', err);
      setOrderError(err?.message || 'Không thể tạo đơn hàng vào lúc này. Vui lòng kiểm tra lại kết nối mạng.');
      setIsSubmitting(false);
    }
  };

  const totalItemsCount = cart.reduce((s, it) => s + it.quantity, 0);

  if (isMounted && cart.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <IconSymbol name="arrow.left" size={22} color="#1a1c1c" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Thanh toán</Text>
            <View style={styles.spacer} />
          </View>
        </View>
        <View style={styles.emptyScreenContainer}>
          <View style={styles.emptyIconCircle}>
            <IconSymbol name="bag" size={52} color="#94a3b8" />
          </View>
          <Text style={styles.emptyScreenTitle}>Chưa chọn sản phẩm thanh toán</Text>
          <Text style={styles.emptyScreenDesc}>
            Vui lòng quay lại giỏ hàng và chọn sản phẩm bạn muốn đặt mua.
          </Text>
          <TouchableOpacity style={styles.emptyShopBtn} onPress={() => router.replace('/cart')}>
            <Text style={styles.emptyShopBtnText}>QUAY LẠI GIỎ HÀNG</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

﻿  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={[styles.headerContent, isLargeScreen && styles.containerWide]}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={22} color="#1a1c1c" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Thanh toán đơn hàng</Text>
            {isLargeScreen && (
              <View style={styles.stepsBreadcrumb}>
                <Text style={styles.stepDone}>1. Giỏ hàng</Text>
                <IconSymbol name="chevron.right" size={12} color="#9ca3af" />
                <Text style={styles.stepActive}>2. Thanh toán & Giao hàng</Text>
                <IconSymbol name="chevron.right" size={12} color="#9ca3af" />
                <Text style={styles.stepUpcoming}>3. Hoàn tất</Text>
              </View>
            )}
          </View>
          <View style={styles.spacer} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, isLargeScreen && styles.containerWide]}
      >
        {/* Main 2-Column Grid on Web/Desktop */}
        <View style={[styles.layoutWrapper, isLargeScreen && styles.layoutWrapperDesktop]}>
          
          {/* LEFT COLUMN: Delivery, Products, Payment, Order Note */}
          <View style={[styles.mainColumn, isLargeScreen && styles.mainColumnDesktop]}>
            
            {/* 1. Delivery Address Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleRow}>
                  <View style={styles.iconBadgeGold}>
                    <IconSymbol name="location" size={16} color="#b78103" />
                  </View>
                  <Text style={styles.cardTitle}>Thông tin & Địa chỉ nhận hàng</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeAddressBtn}
                  onPress={() => setShowAddressModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeAddressBtnText}>
                    {customerName || customerPhone || customerAddress ? 'Thay đổi' : '+ Thêm mới'}
                  </Text>
                </TouchableOpacity>
              </View>

              {customerName || customerPhone || customerAddress ? (
                <TouchableOpacity
                  style={styles.addressBox}
                  onPress={() => setShowAddressModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flex: 1 }}>
                    <View style={styles.addressUserRow}>
                      <Text style={styles.addressName}>{customerName || 'Chưa nhập họ tên'}</Text>
                      <View style={styles.userDot} />
                      <Text style={styles.addressPhone}>{customerPhone || 'Chưa có SĐT'}</Text>
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Giao tận nơi</Text>
                      </View>
                    </View>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {customerAddress || 'Vui lòng nhấn để cập nhật địa chỉ giao hàng'}
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyAddressPrompt}
                  onPress={() => setShowAddressModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={styles.addCircleSmall}>
                      <IconSymbol name="plus" size={16} color="#ffffff" />
                    </View>
                    <View>
                      <Text style={styles.emptyAddressTitle}>Chưa có thông tin nhận hàng</Text>
                      <Text style={styles.emptyAddressSub}>Bấm vào đây để nhập người nhận, SĐT và địa chỉ</Text>
                    </View>
                  </View>
                  <IconSymbol name="chevron.right" size={18} color="#94a3b8" />
                </TouchableOpacity>
              )}

              {/* Saved Address Chips */}
              {savedAddresses.length > 0 && (
                <View style={styles.savedAddressesContainer}>
                  <Text style={styles.savedAddressesLabel}>SỔ ĐỊA CHỈ NHANH:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {savedAddresses.map((addr) => {
                      const isActive = customerAddress === addr.address;
                      return (
                        <TouchableOpacity
                          key={addr.id}
                          style={[styles.addressChip, isActive && styles.addressChipActive]}
                          onPress={() => {
                            setCustomerName(addr.name);
                            setCustomerPhone(addr.phone);
                            setCustomerAddress(addr.address);
                          }}
                        >
                          <IconSymbol
                            name="location"
                            size={12}
                            color={isActive ? '#b78103' : '#64748b'}
                          />
                          <Text
                            style={[styles.addressChipText, isActive && styles.addressChipTextActive]}
                            numberOfLines={1}
                          >
                            {addr.name} - {addr.address.slice(0, 22)}...
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* 2. Order Items Card (Compact & Modern) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleRow}>
                  <View style={styles.iconBadgeDark}>
                    <IconSymbol name="bag" size={16} color="#ffffff" />
                  </View>
                  <Text style={styles.cardTitle}>Sản phẩm đặt mua ({cart.length} món, {totalItemsCount} cái)</Text>
                </View>
                <TouchableOpacity onPress={() => router.push('/cart')}>
                  <Text style={styles.editCartLink}>Xem giỏ hàng</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.compactItemsList}>
                {cart.map((item, index) => {
                  const imageSource = getImageSource(item.image);
                  const priceNum = parsePrice(item.price);
                  const formattedItemTotal = formatVND(priceNum * item.quantity);
                  const itemKey = item.cartItemId || `${item.id}-${index}`;

                  return (
                    <View key={itemKey} style={styles.compactItemRow}>
                      <View style={styles.itemThumbContainer}>
                        <Image source={imageSource} style={styles.itemThumb} contentFit="cover" />
                        <View style={styles.itemQtyBadge}>
                          <Text style={styles.itemQtyBadgeText}>x{item.quantity}</Text>
                        </View>
                      </View>

                      <View style={styles.itemMeta}>
                        <Text style={styles.compactItemName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        
                        <View style={styles.variantAndPriceRow}>
                          <TouchableOpacity
                            style={styles.compactVariantChip}
                            onPress={() => handleOpenVariantModal(item)}
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.variantDot,
                                { backgroundColor: item.color || '#000000' },
                              ]}
                            />
                            <Text style={styles.compactVariantText}>
                              {getColorLabel(item.color)} • Size {item.size || 'M'}
                            </Text>
                            <IconSymbol name="chevron.right" size={10} color="#94a3b8" />
                          </TouchableOpacity>

                          <View style={styles.qtyControlRow}>
                            <TouchableOpacity
                              style={styles.miniQtyBtn}
                              onPress={() => decreaseQuantity(item.cartItemId || item.id)}
                            >
                              <IconSymbol name="minus" size={12} color="#475569" />
                            </TouchableOpacity>
                            <Text style={styles.miniQtyText}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.miniQtyBtn}
                              onPress={() => increaseQuantity(item.cartItemId || item.id)}
                            >
                              <IconSymbol name="plus" size={12} color="#475569" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      <View style={styles.itemPriceCol}>
                        <Text style={styles.compactItemPrice}>{formattedItemTotal}</Text>
                        {item.quantity > 1 && (
                          <Text style={styles.compactUnitPrice}>{formatVND(priceNum)}/cái</Text>
                        )}
                        <TouchableOpacity
                          style={styles.deleteItemBtn}
                          onPress={() => setItemToDelete(item)}
                        >
                          <IconSymbol name="trash" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 3. Payment Method Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleRow}>
                  <View style={styles.iconBadgeDark}>
                    <IconSymbol name="creditcard" size={16} color="#ffffff" />
                  </View>
                  <Text style={styles.cardTitle}>Phương thức thanh toán</Text>
                </View>
              </View>

              <View style={styles.paymentMethodsGrid}>
                {/* Option 1: COD */}
                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    paymentMethod === 'cod' && styles.paymentMethodOptionActive,
                  ]}
                  onPress={() => setPaymentMethod('cod')}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentMethodTop}>
                    <View style={styles.radioIndicator}>
                      {paymentMethod === 'cod' && <View style={styles.radioIndicatorInner} />}
                    </View>
                    <IconSymbol name="car" size={20} color={paymentMethod === 'cod' ? '#111827' : '#64748b'} />
                    <Text style={styles.paymentMethodName}>Thanh toán khi nhận hàng (COD)</Text>
                  </View>
                  <Text style={styles.paymentMethodDesc}>
                    Kiểm tra hàng trước khi thanh toán tiền mặt cho shipper tại nhà.
                  </Text>
                </TouchableOpacity>

                {/* Option 2: Bank Transfer / QR */}
                <TouchableOpacity
                  style={[
                    styles.paymentMethodOption,
                    paymentMethod === 'bank' && styles.paymentMethodOptionActive,
                  ]}
                  onPress={() => setPaymentMethod('bank')}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentMethodTop}>
                    <View style={styles.radioIndicator}>
                      {paymentMethod === 'bank' && <View style={styles.radioIndicatorInner} />}
                    </View>
                    <IconSymbol
                      name="building.columns"
                      size={20}
                      color={paymentMethod === 'bank' ? '#111827' : '#64748b'}
                    />
                    <Text style={styles.paymentMethodName}>Chuyển khoản Ngân hàng / QR 24/7</Text>
                    <View style={styles.recomBadge}>
                      <Text style={styles.recomBadgeText}>Nhanh gọn</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentMethodDesc}>
                    Quét mã VietQR chuyển khoản tức thì, bảo mật và tiện lợi.
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 4. Order Note Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleRow}>
                  <View style={styles.iconBadgeGold}>
                    <IconSymbol name="pencil" size={15} color="#b78103" />
                  </View>
                  <Text style={styles.cardTitle}>Lời dặn Shipper & Ghi chú đơn</Text>
                </View>
              </View>
              <TextInput
                style={styles.orderNoteInput}
                placeholder="VD: Giao hàng giờ hành chính, gọi trước khi đến 15 phút, gói hàng làm quà tặng..."
                placeholderTextColor="#94a3b8"
                value={orderNote}
                onChangeText={setOrderNote}
                multiline
                numberOfLines={2}
              />
            </View>

          </View>

          {/* RIGHT COLUMN: Sticky Sidebar on Desktop / In-flow on Mobile */}
          <View style={[styles.sidebarColumn, isLargeScreen && styles.sidebarColumnDesktop]}>
            
            {/* Voucher Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderTitleRow}>
                  <IconSymbol name="ticket.fill" size={18} color="#b78103" />
                  <Text style={styles.cardTitle}>Mã giảm giá</Text>
                </View>
                <TouchableOpacity
                  style={styles.voucherPickerBtn}
                  onPress={() => setShowVoucherModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.voucherPickerBtnText}>Chọn Voucher</Text>
                </TouchableOpacity>
              </View>

              {appliedVoucher ? (
                <View style={styles.appliedVoucherContainer}>
                  <View style={styles.appliedVoucherLeft}>
                    <View style={styles.appliedVoucherTag}>
                      <Text style={styles.appliedVoucherCode}>{appliedVoucher.code}</Text>
                    </View>
                    <View>
                      <Text style={styles.appliedVoucherSavings}>
                        Tiết kiệm {formatVND(discountAmount)}
                      </Text>
                      <Text style={styles.appliedVoucherSub}>
                        {appliedVoucher.discount_type === 'percent' || appliedVoucher.discountType === 'percent'
                          ? `Giảm ${appliedVoucher.value}% trên giá trị đơn hàng`
                          : `Giảm ${formatVND(appliedVoucher.value)}`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.appliedVoucherActions}>
                    <TouchableOpacity onPress={() => setShowVoucherModal(true)}>
                      <Text style={styles.changeVoucherLink}>Đổi mã</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={removeVoucher}>
                      <Text style={styles.removeVoucherLink}>Gỡ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.selectVoucherPrompt}
                  onPress={() => setShowVoucherModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <IconSymbol name="tag.fill" size={16} color="#b78103" />
                    <Text style={styles.selectVoucherPromptText}>Nhấn để chọn hoặc nhập mã khuyến mại</Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            {/* Price Breakdown & Summary Card */}
            <View style={[styles.card, styles.summaryCard]}>
              <Text style={styles.summaryTitle}>Tóm tắt thanh toán</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tiền hàng ({totalItemsCount} sản phẩm)</Text>
                <Text style={styles.summaryValue}>{formatVND(subtotalPrice)}</Text>
              </View>

              {discountAmount > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: '#16a34a' }]}>Giảm giá voucher</Text>
                  <Text style={[styles.summaryValue, { color: '#16a34a', fontWeight: '700' }]}>
                    -{formatVND(discountAmount)}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                  {isFreeShipping && (
                    <View style={styles.freeshipPill}>
                      <Text style={styles.freeshipPillText}>FREESHIP</Text>
                    </View>
                  )}
                </View>

                {isFreeShipping ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.strikethroughPrice}>30.000 đ</Text>
                    <Text style={styles.freeShippingText}>MIỄN PHÍ</Text>
                  </View>
                ) : (
                  <Text style={styles.summaryValue}>{formatVND(shippingFee)}</Text>
                )}
              </View>

              {!isFreeShipping && (
                <View style={styles.freeshipNotice}>
                  <IconSymbol name="car" size={14} color="#0284c7" />
                  <Text style={styles.freeshipNoticeText}>
                    Mua thêm {formatVND(Math.max(0, 300000 - subtotalPrice))} để được Freeship toàn quốc!
                  </Text>
                </View>
              )}

              <View style={styles.summaryDivider} />

              <View style={styles.totalRow}>
                <View>
                  <Text style={styles.totalLabel}>TỔNG THANH TOÁN</Text>
                  <Text style={styles.vatNote}>(Đã bao gồm VAT & phí vận chuyển)</Text>
                </View>
                <Text style={styles.totalAmount}>{formatVND(totalPrice)}</Text>
              </View>

              {/* Desktop Place Order Button (Inside Sidebar) */}
              {isLargeScreen && (
                <TouchableOpacity
                  style={[
                    styles.desktopPlaceOrderBtn,
                    (cart.length === 0 || isSubmitting) && styles.placeOrderBtnDisabled,
                  ]}
                  onPress={handlePlaceOrder}
                  disabled={cart.length === 0 || isSubmitting}
                  activeOpacity={0.85}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.desktopPlaceOrderBtnText}>XÁC NHẬN ĐẶT HÀNG</Text>
                      <IconSymbol name="arrow.right" size={18} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Trust Badges */}
              <View style={styles.trustBadgesBox}>
                <View style={styles.trustItem}>
                  <IconSymbol name="checkmark.circle.fill" size={18} color="#16a34a" />
                  <Text style={styles.trustText}>Kiểm tra hàng trước khi nhận</Text>
                </View>
                <View style={styles.trustItem}>
                  <IconSymbol name="car" size={18} color="#16a34a" />
                  <Text style={styles.trustText}>Đổi size miễn phí trong 7 ngày</Text>
                </View>
                <View style={styles.trustItem}>
                  <IconSymbol name="lock" size={18} color="#16a34a" />
                  <Text style={styles.trustText}>Bảo mật thông tin đơn hàng 100%</Text>
                </View>
              </View>
            </View>

          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: isLargeScreen ? 60 : 120 }} />
      </ScrollView>

      {/* Mobile Sticky Bottom Bar (Only on Mobile) */}
      {!isLargeScreen && (
        <View style={styles.mobileBottomBar}>
          <View style={styles.mobileBottomBarContent}>
            <View style={styles.bottomTotalBox}>
              <Text style={styles.bottomTotalLabel}>Tổng thanh toán</Text>
              <Text style={styles.bottomTotalValue}>{formatVND(totalPrice)}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.mobilePlaceOrderBtn,
                (cart.length === 0 || isSubmitting) && styles.placeOrderBtnDisabled,
              ]}
              onPress={handlePlaceOrder}
              disabled={cart.length === 0 || isSubmitting}
              activeOpacity={0.85}
            >
              <Text style={styles.mobilePlaceOrderBtnText}>
                {isSubmitting ? 'ĐANG XỬ LÝ...' : 'ĐẶT HÀNG'}
              </Text>
              <IconSymbol name="arrow.right" size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      )}

﻿      {/* Address Edit Modal */}
      <Modal
        visible={showAddressModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="location" size={20} color="#b78103" />
                <Text style={styles.modalTitle}>Địa chỉ nhận hàng</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddressModal(false)} style={styles.closeBtn}>
                <IconSymbol name="xmark" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Họ và tên người nhận <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formInput, formErrors.name ? styles.formInputError : null]}
                  placeholder="Nhập họ và tên đầy đủ"
                  placeholderTextColor="#94a3b8"
                  value={customerName}
                  onChangeText={(val) => {
                    setCustomerName(val);
                    if (formErrors.name) setFormErrors((p) => ({ ...p, name: undefined }));
                  }}
                />
                {formErrors.name && <Text style={styles.errorText}>{formErrors.name}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Số điện thoại <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formInput, formErrors.phone ? styles.formInputError : null]}
                  placeholder="VD: 0912345678"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={(val) => {
                    setCustomerPhone(val);
                    if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: undefined }));
                  }}
                />
                {formErrors.phone && <Text style={styles.errorText}>{formErrors.phone}</Text>}
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Địa chỉ chi tiết <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea, formErrors.address ? styles.formInputError : null]}
                  placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã, quận/huyện, tỉnh/TP"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  value={customerAddress}
                  onChangeText={(val) => {
                    setCustomerAddress(val);
                    if (formErrors.address) setFormErrors((p) => ({ ...p, address: undefined }));
                  }}
                />
                {formErrors.address && <Text style={styles.errorText}>{formErrors.address}</Text>}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <TouchableOpacity
                  style={[styles.saveAddressBtn, { flex: 1, backgroundColor: '#f1f5f9' }]}
                  onPress={() => {
                    if (validateForm()) {
                      saveToAddressBook('Nhà riêng', customerName, customerPhone, customerAddress);
                      saveDeliveryInfoToStorage(customerName, customerPhone, customerAddress);
                      setShowAddressModal(false);
                    }
                  }}
                >
                  <Text style={[styles.saveAddressBtnText, { color: '#334155' }]}>Lưu vào sổ</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {editingItem?.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#b78103', fontWeight: '700', marginTop: 2 }}>
                  {editingItem ? formatVND(parsePrice(editingItem.price)) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingItem(null)} style={styles.closeBtn}>
                <IconSymbol name="xmark" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 20, paddingVertical: 16 }} showsVerticalScrollIndicator={false}>
              {/* Color options */}
              <View style={{ marginBottom: 18 }}>
                <Text style={styles.variantOptionTitle}>
                  MÀU SẮC:{' '}
                  <Text style={{ fontWeight: '700', color: '#111827' }}>{getColorLabel(tempColor)}</Text>
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
                        style={[styles.variantColorOption, isSelected && styles.variantColorOptionSelected]}
                        onPress={() => setTempColor(c.color)}
                      >
                        <View style={[styles.variantColorCircle, { backgroundColor: c.color }]} />
                        <Text
                          style={[styles.variantColorName, isSelected && styles.variantColorNameSelected]}
                        >
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
                  KÍCH THƯỚC: <Text style={{ fontWeight: '700', color: '#111827' }}>{tempSize}</Text>
                </Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  {(() => {
                    const isShoe = editingItem?.category?.toLowerCase() === 'giày';
                    const isAccessory = editingItem?.category?.toLowerCase() === 'phụ kiện';
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
                          style={[styles.variantSizeChip, isSelected && styles.variantSizeChipSelected]}
                          onPress={() => setTempSize(sz)}
                        >
                          <Text
                            style={[styles.variantSizeText, isSelected && styles.variantSizeTextSelected]}
                          >
                            {sz}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.saveAddressBtn}
                onPress={() => {
                  if (editingItem) {
                    updateCartItemVariant(editingItem.cartItemId || editingItem.id, tempSize, tempColor);
                  }
                  setEditingItem(null);
                }}
              >
                <Text style={styles.saveAddressBtnText}>Lưu thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

﻿const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  containerWide: {
    maxWidth: 1180,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.2,
  },
  stepsBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stepDone: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
  },
  stepActive: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '700',
  },
  stepUpcoming: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  spacer: {
    width: 38,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  layoutWrapper: {
    flexDirection: 'column',
    gap: 20,
  },
  layoutWrapperDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 28,
  },
  mainColumn: {
    flex: 1,
    gap: 18,
  },
  mainColumnDesktop: {
    flex: 1.45,
  },
  sidebarColumn: {
    gap: 18,
  },
  sidebarColumnDesktop: {
    flex: 1,
    maxWidth: 420,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: 0.1,
  },
  iconBadgeGold: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fffbeb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  iconBadgeDark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeAddressBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  changeAddressBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b78103',
  },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  userDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#94a3b8',
  },
  addressPhone: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#e0f2fe',
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369a1',
  },
  addressText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  emptyAddressPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fffdf5',
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#f59e0b',
  },
  addCircleSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#b78103',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAddressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
  },
  emptyAddressSub: {
    fontSize: 12,
    color: '#b45309',
    marginTop: 2,
  },
  savedAddressesContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  savedAddressesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  addressChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  addressChipActive: {
    backgroundColor: '#fffbeb',
    borderColor: '#b78103',
  },
  addressChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  addressChipTextActive: {
    color: '#92400e',
    fontWeight: '700',
  },
  editCartLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  compactItemsList: {
    gap: 12,
  },
  compactItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  itemThumbContainer: {
    position: 'relative',
    width: 62,
    height: 62,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemThumb: {
    width: '100%',
    height: '100%',
  },
  itemQtyBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  itemQtyBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  itemMeta: {
    flex: 1,
    gap: 4,
  },
  compactItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    lineHeight: 18,
  },
  variantAndPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  compactVariantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  variantDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  compactVariantText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    backgroundColor: '#ffffff',
  },
  miniQtyBtn: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  miniQtyText: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 6,
    color: '#0f172a',
  },
  itemPriceCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  compactItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  compactUnitPrice: {
    fontSize: 11,
    color: '#94a3b8',
  },
  deleteItemBtn: {
    padding: 4,
    marginTop: 4,
  },
  paymentMethodsGrid: {
    gap: 10,
  },
  paymentMethodOption: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  paymentMethodOptionActive: {
    borderColor: '#0f172a',
    backgroundColor: '#fafafa',
  },
  paymentMethodTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radioIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIndicatorInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#0f172a',
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  recomBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  recomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
  },
  paymentMethodDesc: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 28,
  },
  orderNoteInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: 56,
  },
  voucherPickerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#0f172a',
    borderRadius: 6,
  },
  voucherPickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  appliedVoucherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#fffdf5',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
  },
  appliedVoucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  appliedVoucherTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#b78103',
    borderRadius: 6,
  },
  appliedVoucherCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  appliedVoucherSavings: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  appliedVoucherSub: {
    fontSize: 11,
    color: '#94a3b8',
  },
  appliedVoucherActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  changeVoucherLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b78103',
  },
  removeVoucherLink: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ef4444',
  },
  selectVoucherPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
  },
  selectVoucherPromptText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  freeshipPill: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  freeshipPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#15803d',
  },
  strikethroughPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  freeShippingText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16a34a',
  },
  freeshipNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  freeshipNoticeText: {
    fontSize: 11,
    color: '#0369a1',
    fontWeight: '500',
    flex: 1,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  vatNote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  desktopPlaceOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 15,
    borderRadius: 10,
    marginTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  desktopPlaceOrderBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  placeOrderBtnDisabled: {
    opacity: 0.5,
  },
  trustBadgesBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 8,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trustText: {
    fontSize: 12,
    color: '#475569',
  },
  mobileBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 100,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 8,
  },
  mobileBottomBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomTotalBox: {
    gap: 2,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  bottomTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  mobilePlaceOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
  },
  mobilePlaceOrderBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  emptyScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  emptyScreenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyScreenDesc: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyShopBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  emptyShopBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  formTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  formInputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  saveAddressBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAddressBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  variantOptionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  variantColorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
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
    borderColor: '#cbd5e1',
  },
  variantColorName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  variantColorNameSelected: {
    color: '#b78103',
    fontWeight: '700',
  },
  variantSizeChip: {
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
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
    color: '#475569',
  },
  variantSizeTextSelected: {
    color: '#b78103',
    fontWeight: '700',
  },
});
