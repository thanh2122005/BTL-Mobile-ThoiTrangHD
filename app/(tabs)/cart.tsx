import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions, TextInput } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCart, parsePrice } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';

import { getImageSource } from '@/constants/images';


const getColorLabel = (color?: string) => {
  if (!color) return 'Đen';
  if (color === '#000000' || color.toLowerCase() === 'black') return 'Đen';
  if (color === '#E5D3B3' || color.toLowerCase() === 'beige') return 'Beige';
  if (color === '#1A237E' || color.toLowerCase() === 'navy') return 'Xanh Navy';
  return color;
};

export default function CartScreen() {
  const router = useRouter();
  const { isMobile, isLargeScreen } = useResponsive();
  const { user } = useAuth();
  const {
    items: cart,
    removeFromCart,
    increaseQuantity,
    decreaseQuantity,
    subtotalPrice,
    discountAmount,
    totalPrice,
    appliedVoucher,
    applyVoucher,
    removeVoucher,
  } = useCart();

  const [inputCode, setInputCode] = useState('');
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const formatVND = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

  const handleApplyVoucher = async () => {
    const res = await applyVoucher(inputCode, user?.id);
    setVoucherMsg({ text: res.message, isError: !res.success });
    if (res.success) setInputCode('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Web */}
      {isLargeScreen && (
        <View style={styles.headerWeb}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/')}>
            <IconSymbol name="line.3.horizontal" size={24} color="#1a1c1c" />
          </TouchableOpacity>
          <Text style={styles.brandTextWeb}>ThoiTrangHD</Text>
          <View style={styles.headerRightWeb}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/products')}>
              <IconSymbol name="magnifyingglass" size={24} color="#747878" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <IconSymbol name="bag.fill" size={24} color="#000000" />
              {cart.length > 0 && (
                <View style={styles.badgeWeb}>
                  <Text style={styles.badgeTextWeb}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Header Mobile */}
      {!isLargeScreen && (
        <View style={styles.headerMobile}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/')}>
            <IconSymbol name="line.3.horizontal" size={24} color="#1a1c1c" />
          </TouchableOpacity>
          <Text style={styles.brandTextMobile}>ThoiTrangHD</Text>
          <TouchableOpacity style={styles.iconButton}>
            <IconSymbol name="bag.fill" size={24} color="#000000" />
            {cart.length > 0 && (
              <View style={styles.badgeMobile}>
                <Text style={styles.badgeTextMobile}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Web Navigation */}
      {isLargeScreen && (
        <View style={styles.webNav}>
          <TouchableOpacity onPress={() => router.push('/')}>
            <Text style={styles.webNavItem}>Trang chủ</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/products')}>
            <Text style={styles.webNavItem}>Bộ sưu tập</Text>
          </TouchableOpacity>
          <Text style={[styles.webNavItem, styles.webNavActive]}>Giỏ hàng</Text>
          <TouchableOpacity onPress={() => router.push('/user')}>
            <Text style={styles.webNavItem}>Tài khoản</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.pageTitle}>Giỏ hàng của tôi ({cart.reduce((s, i) => s + i.quantity, 0)})</Text>

        {cart.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="bag" size={64} color="#c4c7c7" />
            </View>
            <Text style={styles.emptyTitle}>Giỏ hàng của bạn đang trống</Text>
            <Text style={styles.emptyDesc}>Có vẻ như bạn chưa chọn được món đồ nào. Hãy khám phá các bộ sưu tập mới nhất của ThoiTrangHD.</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/products')}>
              <Text style={styles.shopNowText}>MUA SẮM NGAY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.contentLayout, isLargeScreen && { flexDirection: 'row', gap: 32 }]}>
            
            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {cart.map((item, index) => {
                const imageSource = getImageSource(item.image);
                const itemPriceNum = parsePrice(item.price);
                const formattedPrice = formatVND(itemPriceNum * item.quantity);
                const itemKey = item.cartItemId || `${item.id}-${index}`;
                
                return (
                  <View key={itemKey}>
                    <View style={styles.cartItem}>
                      <View style={styles.itemImageContainer}>
                        <Image source={imageSource} style={styles.itemImage} contentFit="cover" />
                      </View>
                      
                      <View style={styles.itemDetails}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleContainer}>
                            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                            <Text style={styles.itemMeta}>
                              Size: {item.size || 'M'} | Màu: {getColorLabel(item.color)}
                            </Text>
                          </View>
                          <TouchableOpacity onPress={() => removeFromCart(item.cartItemId || item.id)} style={styles.removeBtn}>
                            <IconSymbol name="xmark" size={20} color="#747878" />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.itemFooter}>
                          <View style={styles.quantityControl}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => decreaseQuantity(item.cartItemId || item.id)}>
                              <IconSymbol name="minus" size={16} color="#1a1c1c" />
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => increaseQuantity(item.cartItemId || item.id)}>
                              <IconSymbol name="plus" size={16} color="#1a1c1c" />
                            </TouchableOpacity>
                          </View>
                          <Text style={styles.itemPrice}>{formattedPrice}</Text>
                        </View>
                      </View>
                    </View>
                    
                    {index < cart.length - 1 && <View style={styles.divider} />}
                  </View>
                );
              })}
            </View>

            {/* Order Summary */}
            <View style={[styles.summarySidebar, isLargeScreen && { width: 380 }]}>
              <View style={styles.summaryBox}>
                
                {/* Voucher Section */}
                <View style={styles.voucherSection}>
                  <Text style={styles.voucherLabel}>MÃ KHUYẾN MÃI (HD10, HD20, HD50K)</Text>
                  
                  {appliedVoucher ? (
                    <View style={styles.appliedVoucherBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <IconSymbol name="tag" size={18} color="#A68B5B" />
                        <Text style={styles.appliedVoucherText}>Mã: {appliedVoucher.code}</Text>
                      </View>
                      <TouchableOpacity onPress={removeVoucher}>
                        <Text style={styles.removeVoucherText}>Gỡ bỏ</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.voucherInputRow}>
                      <View style={styles.voucherInputWrapper}>
                        <IconSymbol name="tag" size={20} color="#747878" style={styles.voucherIcon} />
                        <TextInput 
                          style={styles.voucherInput}
                          placeholder="Nhập mã..."
                          placeholderTextColor="#c4c7c7"
                          value={inputCode}
                          onChangeText={setInputCode}
                          autoCapitalize="characters"
                        />
                      </View>
                      <TouchableOpacity style={styles.applyBtn} onPress={handleApplyVoucher}>
                        <Text style={styles.applyBtnText}>ÁP DỤNG</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {voucherMsg && (
                    <Text style={[styles.voucherMsgText, voucherMsg.isError ? styles.voucherMsgError : styles.voucherMsgSuccess]}>
                      {voucherMsg.text}
                    </Text>
                  )}
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Tạm tính ({cart.reduce((s, i) => s + i.quantity, 0)} món)</Text>
                  <Text style={styles.summaryRowValue}>{formatVND(subtotalPrice)}</Text>
                </View>

                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryRowLabel, { color: '#2e7d32' }]}>Giảm giá khuyến mãi</Text>
                    <Text style={[styles.summaryRowValue, { color: '#2e7d32', fontWeight: '600' }]}>-{formatVND(discountAmount)}</Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Phí vận chuyển</Text>
                  <Text style={styles.shippingFreeText}>MIỄN PHÍ</Text>
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalValue}>{formatVND(totalPrice)}</Text>
                    <Text style={styles.vatText}>Đã bao gồm VAT</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.checkoutBtn} onPress={() => router.push('/checkout')}>
                  <Text style={styles.checkoutBtnText}>THANH TOÁN NGAY</Text>
                  <IconSymbol name="arrow.right" size={18} color="#ffffff" />
                </TouchableOpacity>

                <View style={styles.trustBadges}>
                  <IconSymbol name="lock" size={20} color="#747878" />
                  <IconSymbol name="car" size={20} color="#747878" />
                  <IconSymbol name="headphones" size={20} color="#747878" />
                </View>
              </View>
            </View>

          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#f9f9f9',
    zIndex: 50,
  },
  headerRightWeb: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  brandTextWeb: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  badgeWeb: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#000000',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextWeb: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  headerMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#f9f9f9',
    zIndex: 50,
  },
  brandTextMobile: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: -0.5,
  },
  badgeMobile: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#000000',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextMobile: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  iconButton: {
    padding: 8,
  },
  webNav: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196, 199, 199, 0.3)',
    backgroundColor: '#f9f9f9',
  },
  webNavItem: {
    fontSize: 16,
    color: '#444748',
  },
  webNavActive: {
    color: '#000000',
    fontWeight: '700',
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 32,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 24,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    marginBottom: 32,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 16,
    color: '#444748',
    textAlign: 'center',
    maxWidth: 400,
    marginBottom: 32,
  },
  shopNowBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  shopNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  contentLayout: {
    flexDirection: 'column',
    gap: 24,
  },
  itemsList: {
    flex: 1,
  },
  cartItem: {
    flexDirection: 'row',
    gap: 16,
  },
  itemImageContainer: {
    width: 96,
    height: 120,
    backgroundColor: '#eeeeee',
    borderRadius: 6,
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  itemName: {
    fontSize: 16,
    color: '#000000',
    lineHeight: 24,
  },
  itemMeta: {
    fontSize: 14,
    color: '#444748',
    marginTop: 4,
  },
  removeBtn: {
    padding: 4,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196, 199, 199, 0.5)',
    borderRadius: 24,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f3f3f3',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '500',
    width: 24,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000000',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(196, 199, 199, 0.3)',
    marginVertical: 24,
  },
  summarySidebar: {
    width: '100%',
  },
  summaryBox: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(196, 199, 199, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.05,
    shadowRadius: 40,
    elevation: 5,
  },
  voucherSection: {
    marginBottom: 24,
  },
  voucherLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444748',
    letterSpacing: 1,
    marginBottom: 12,
  },
  voucherInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  voucherInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#747878',
  },
  voucherIcon: {
    marginRight: 8,
  },
  voucherInput: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#000000',
    outlineStyle: 'none' as any,
  },
  applyBtn: {
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: 1,
  },
  appliedVoucherBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5efe6',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e1c28e',
  },
  appliedVoucherText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#725b2f',
  },
  removeVoucherText: {
    fontSize: 12,
    color: '#ba1a1a',
    textDecorationLine: 'underline',
  },
  voucherMsgText: {
    fontSize: 12,
    marginTop: 8,
  },
  voucherMsgError: {
    color: '#ba1a1a',
  },
  voucherMsgSuccess: {
    color: '#2e7d32',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(196, 199, 199, 0.3)',
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryRowLabel: {
    fontSize: 16,
    color: '#444748',
  },
  summaryRowValue: {
    fontSize: 16,
    color: '#000000',
  },
  shippingFreeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(196, 199, 199, 0.5)',
    paddingTop: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  vatText: {
    fontSize: 12,
    color: '#444748',
    marginTop: 4,
  },
  checkoutBtn: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    marginBottom: 24,
  },
  checkoutBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 2,
  },
  trustBadges: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
});
