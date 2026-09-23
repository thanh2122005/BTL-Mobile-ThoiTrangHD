import { VoucherModal } from '@/components/ui/VoucherModal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, Dimensions, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCart, parsePrice } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { API_URL } from '@/constants/config';

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
    updateCartItemVariant,
    selectedItemIds,
    toggleSelectItem,
    selectAllItems,
    deselectAllItems,
    selectedItems,
    shippingFee,
    isFreeShipping,
    amountNeededForFreeShipping,
    freeShippingThreshold,
  } = useCart();

  const showToast = (text: string, isError = false) => {
    setVoucherMsg({ text, isError });
    setTimeout(() => setVoucherMsg(null), 3000);
  };

  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [tempSize, setTempSize] = useState<string>('M');
  const [tempColor, setTempColor] = useState<string>('#000000');
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);

  const handleOpenVariantModal = (item: any) => {
    setEditingItem(item);
    setTempSize(item.size || 'M');
    setTempColor(item.color || '#000000');
  };
  const [inputCode, setInputCode] = useState('');
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
  const [voucherMsg, setVoucherMsg] = useState<{ text: string; isError: boolean } | null>(null);

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
          <View>
            {/* Free Shipping Progress Bar */}
            <View style={styles.freeshipCard}>
              <View style={styles.freeshipHeader}>
                <View style={[styles.freeshipIconCircle, isFreeShipping && { backgroundColor: '#dcfce7' }]}>
                  <IconSymbol name="car" size={18} color={isFreeShipping ? "#16a34a" : "#0284c7"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.freeshipTitle}>
                    {isFreeShipping
                      ? "🎉 Chúc mừng! Đơn hàng được MIỄN PHÍ VẬN CHUYỂN toàn quốc"
                      : "Mua thêm " + formatVND(amountNeededForFreeShipping) + " để được MIỄN PHÍ VẬN CHUYỂN!"}
                  </Text>
                  <Text style={styles.freeshipSub}>
                    {isFreeShipping ? "Áp dụng tự động cho đơn từ " + formatVND(freeShippingThreshold) : "Tiết kiệm ngay 30.000đ phí giao hàng"}
                  </Text>
                </View>
              </View>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.round((subtotalPrice / freeShippingThreshold) * 100))}%` as any,
                      backgroundColor: isFreeShipping ? '#16a34a' : '#0284c7',
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.contentLayout, isLargeScreen && { flexDirection: 'row', gap: 32 }]}>
            
            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {/* Select All Bar */}
              <View style={styles.selectAllCard}>
                <TouchableOpacity
                  style={styles.selectAllRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (selectedItemIds.length === cart.length && cart.length > 0) {
                      deselectAllItems();
                    } else {
                      selectAllItems();
                    }
                  }}
                >
                  <IconSymbol
                    name={selectedItemIds.length === cart.length && cart.length > 0 ? "checkmark.circle.fill" : "circle"}
                    size={22}
                    color={selectedItemIds.length === cart.length && cart.length > 0 ? "#16a34a" : "#9ca3af"}
                  />
                  <Text style={styles.selectAllText}>
                    Chọn tất cả ({cart.length} sản phẩm)
                  </Text>
                </TouchableOpacity>
                <Text style={styles.selectedCountBadge}>
                  Đã chọn {selectedItems.length}/{cart.length}
                </Text>
              </View>
              {cart.map((item, index) => {
                const imageSource = getImageSource(item.image);
                const itemPriceNum = parsePrice(item.price);
                const formattedPrice = formatVND(itemPriceNum * item.quantity);
                const itemKey = item.cartItemId || `${item.id}-${index}`;
                
                return (
                  <View key={itemKey}>
                    <View style={styles.cartItem}>
                      <TouchableOpacity
                        style={styles.itemCheckbox}
                        activeOpacity={0.7}
                        onPress={() => toggleSelectItem(item.cartItemId || item.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol
                          name={selectedItemIds.includes(item.cartItemId || item.id) ? "checkmark.circle.fill" : "circle"}
                          size={22}
                          color={selectedItemIds.includes(item.cartItemId || item.id) ? "#16a34a" : "#cbd5e1"}
                        />
                      </TouchableOpacity>

                      <View style={styles.itemImageContainer}>
                        <Image source={imageSource} style={styles.itemImage} contentFit="cover" />
                      </View>
                      
                      <View style={styles.itemDetails}>
                        <View style={styles.itemHeader}>
                          <View style={styles.itemTitleContainer}>
                            <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                            <TouchableOpacity
                              style={styles.variantSelectorChip}
                              onPress={() => handleOpenVariantModal(item)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.variantColorDot, { backgroundColor: item.color || "#000" }]} />
                              <Text style={styles.variantSelectorText}>
                                {getColorLabel(item.color)} / Size {item.size || "M"}
                              </Text>
                              <IconSymbol name="chevron.right" size={12} color="#747878" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => setItemToDelete(item)} style={styles.removeBtn}>
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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, zIndex: 10 }}>
                    <Text style={styles.voucherLabel}>MÃ KHUYẾN MÃI</Text>
                    <TouchableOpacity 
                      style={styles.selectVoucherBtn} 
                      onPress={() => setShowVoucherModal(true)}
                    >
                      <IconSymbol name="ticket.fill" size={14} color="#b78103" />
                      <Text style={styles.selectVoucherBtnText}>Chọn Voucher</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Best Deal Suggestion Banner */}
                  {bestVoucher && (!appliedVoucher || bestSavings > discountAmount) && (
                    <TouchableOpacity 
                      style={styles.suggestionBanner}
                      onPress={async () => {
                        const res = await applyVoucher(bestVoucher.code, user?.id);
                        setVoucherMsg({ text: res.message, isError: !res.success });
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <IconSymbol name="sparkles" size={16} color="#b78103" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionTitle}>
                            Ưu đãi tốt nhất: Mã <Text style={{ fontWeight: '800' }}>{bestVoucher.code}</Text>
                          </Text>
                          <Text style={styles.suggestionSub}>
                            {(bestVoucher.discount_type === 'percent' || bestVoucher.discountType === 'percent') ? `Giảm ${bestVoucher.value}%` : `Giảm ${formatVND(bestVoucher.value)}`} (Tiết kiệm {formatVND(bestSavings)})
                          </Text>
                        </View>
                      </View>
                      <View style={styles.suggestionApplyBtn}>
                        <Text style={styles.suggestionApplyText}>Áp dụng</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  
                  {appliedVoucher ? (
                    <View style={styles.appliedVoucherBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <IconSymbol name="tag.fill" size={18} color="#b78103" />
                        <View>
                          <Text style={styles.appliedVoucherText}>Mã: {appliedVoucher.code}</Text>
                          <Text style={{ fontSize: 11, color: '#2e7d32', fontWeight: '600' }}>
                            {(appliedVoucher.discount_type === 'percent' || appliedVoucher.discountType === 'percent') 
                              ? `Giảm ${appliedVoucher.value}%` 
                              : `Giảm ${formatVND(appliedVoucher.value)}`} (Tiết kiệm {formatVND(discountAmount)})
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity onPress={() => setShowVoucherModal(true)}>
                          <Text style={{ color: '#b78103', fontSize: 12, fontWeight: '700' }}>Đổi mã</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={removeVoucher}>
                          <Text style={styles.removeVoucherText}>Gỡ bỏ</Text>
                        </TouchableOpacity>
                      </View>
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
                  <Text style={styles.summaryRowLabel}>Tạm tính ({selectedItems.reduce((s, i) => s + i.quantity, 0)} món chọn)</Text>
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
                  {isFreeShipping ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 13, textDecorationLine: 'line-through', color: '#9ca3af' }}>30.000₫</Text>
                      <Text style={styles.shippingFreeText}>MIỄN PHÍ</Text>
                    </View>
                  ) : subtotalPrice === 0 ? (
                    <Text style={styles.summaryRowValue}>0₫</Text>
                  ) : (
                    <Text style={styles.summaryRowValue}>{formatVND(shippingFee)}</Text>
                  )}
                </View>

                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>TỔNG CỘNG</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.totalValue}>{formatVND(totalPrice)}</Text>
                    <Text style={styles.vatText}>Đã bao gồm VAT</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.checkoutBtn, selectedItems.length === 0 && { opacity: 0.5 }]}
                  onPress={() => {
                    if (selectedItems.length === 0) {
                      showToast('Vui lòng chọn ít nhất 1 sản phẩm để mua hàng!', true);
                      return;
                    }
                    router.push('/checkout');
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.checkoutBtnText}>MUA HÀNG ({selectedItems.length})</Text>
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
          </View>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>
    
      
      {/* Edit Product Variant Modal */}
      <Modal
        visible={!!editingItem}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setEditingItem(null)}
      >
        <View style={styles.variantModalOverlay}>
          <View style={styles.variantModalCard}>
            <View style={styles.variantModalHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.variantModalTitle} numberOfLines={1}>{editingItem?.name}</Text>
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

            <View style={styles.variantModalFooter}>
              <TouchableOpacity 
                style={styles.saveVariantBtn}
                onPress={() => {
                  if (editingItem) {
                    updateCartItemVariant(editingItem.cartItemId || editingItem.id, tempSize, tempColor);
                    setEditingItem(null);
                  }
                }}
              >
                <Text style={styles.saveVariantBtnText}>Xác nhận thay đổi</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* VOUCHER MODAL */}
      <VoucherModal
        visible={showVoucherModal}
        onClose={() => setShowVoucherModal(false)}
        subtotalPrice={subtotalPrice}
        appliedVoucher={appliedVoucher}
        onApplyVoucher={async (code) => {
          const res = await applyVoucher(code, user?.id);
          setVoucherMsg({ text: res.message, isError: !res.success });
          return res;
        }}
        onRemoveVoucher={() => {
          removeVoucher();
          setVoucherMsg(null);
        }}
      />

      {/* Confirm Delete Cart Item Modal */}
      <ConfirmModal
        visible={!!itemToDelete}
        title="Xóa sản phẩm"
        message={'Bạn có chắc chắn muốn xóa "' + (itemToDelete?.name || 'sản phẩm này') + '" khỏi giỏ hàng?'}
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
  qtyBtnDisabled: {
    opacity: 0.35,
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
    marginBottom: 8,
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
  variantModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  variantModalCard: {
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
  variantModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  variantModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  variantModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  saveVariantBtn: {
    backgroundColor: '#1a1c1c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveVariantBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  /* Free Shipping Bar */
  freeshipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  freeshipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  freeshipIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeshipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  freeshipSub: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  /* Select All Bar */
  selectAllCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  selectedCountBadge: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemCheckbox: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});