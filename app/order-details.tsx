import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';

import { getImageSource } from '@/constants/images';


const formatVND = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

interface OrderDetail {
  id: number;
  user_id?: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  total_price: number;
  status: string;
  created_at: string;
  order_note?: string;
  cancel_reason?: string;
  shipping_fee?: number;
  items: OrderItem[];
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { isMobile, isLargeScreen } = useResponsive();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Review states
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<OrderItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleOpenReviewModal = (item: OrderItem) => {
    setReviewingItem(item);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitItemReview = async () => {
    if (!reviewingItem) return;
    if (!reviewComment.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const colorName = reviewingItem.color === '#000000' ? 'Đen' : reviewingItem.color || 'Tiêu chuẩn';
      const res = await fetch(`${API_URL}/api/products/${reviewingItem.product_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: order?.user_id || null,
          userName: order?.customer_name || 'Khách hàng',
          rating: reviewRating,
          comment: reviewComment.trim(),
          orderId: order?.id,
          size: reviewingItem.size || 'M',
          color: colorName,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        setReviewedProductIds(prev => [...prev, String(reviewingItem.product_id)]);
        setShowReviewModal(false);
        showToast('Cảm ơn bạn đã đánh giá sản phẩm!');
      } else {
        showToast(data?.message || 'Không thể gửi đánh giá');
      }
    } catch (e) {
      console.error('Lỗi gửi đánh giá đơn hàng:', e);
      showToast('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/cancel`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (data && data.success) {
        setOrder({ ...order, status: 'Cancelled' });
        setShowCancelModal(false);
      }
    } catch (e) {
      console.error('Lỗi hủy đơn:', e);
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Không có mã đơn hàng hợp lệ');
      return;
    }

    setLoading(true);
    setError('');

    fetch(`${API_URL}/api/orders/${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Mã lỗi HTTP: ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.success && data.data) {
          setOrder(data.data);
          // Check reviewed items for this order
          fetch(`${API_URL}/api/orders/${data.data.id}/reviewed-items`)
            .then(r => r.json())
            .then(revData => {
              if (revData && revData.success && Array.isArray(revData.data)) {
                setReviewedProductIds(revData.data);
              }
            })
            .catch(() => {});
        } else {
          setError(data?.message || 'Không tìm thấy đơn hàng');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi tải chi tiết đơn hàng:', err);
        setError('Không thể tải thông tin đơn hàng từ máy chủ');
        setLoading(false);
      });
  }, [id]);

  const items = order?.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
  const totalPrice = order ? Number(order.total_price) : 0;
  const discountAmount = Math.max(0, subtotal - totalPrice);

  const status = (order?.status || 'Pending').toLowerCase();
  const isStep1Active = true;
  const isStep2Active = ['processing', 'shipping', 'completed'].includes(status);
  const isStep3Active = ['shipping', 'completed'].includes(status);
  const isStep4Active = status === 'completed';

  const getStatusText = (st?: string) => {
    switch ((st || '').toLowerCase()) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'processing':
        return 'Đang giao hàng';
      case 'shipping':
        return 'Đang giao hàng';
      case 'completed':
        return 'Giao thành công';
      case 'cancelled':
        return 'Đã hủy đơn';
      default:
        return st || 'Đang xử lý';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header Web */}
      {isLargeScreen && (
        <View style={styles.headerWeb}>
          <View style={styles.headerContentWeb}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <TouchableOpacity style={styles.iconButtonWeb} onPress={() => router.back()}>
                <IconSymbol name="arrow.left" size={24} color="#444748" />
              </TouchableOpacity>
              <Text style={styles.headerTitleWeb}>Chi tiết đơn hàng</Text>
            </View>
            <Text style={styles.headerSubtitleWeb}>Mã đơn: #{order?.order_code || id || '---'}</Text>
          </View>
        </View>
      )}

      {/* Header Mobile */}
      {!isLargeScreen && (
        <View style={styles.headerMobile}>
          <TouchableOpacity style={styles.iconButtonMobile} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={24} color="#444748" />
          </TouchableOpacity>
          <Text style={styles.headerTitleMobile}>Chi tiết đơn hàng</Text>
          <View style={{ width: 40 }} />
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={{ marginTop: 16, color: '#444748', fontSize: 14 }}>Đang tải thông tin đơn hàng...</Text>
        </View>
      ) : error || !order ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <IconSymbol name="cube.box" size={56} color="#747878" />
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#000', marginTop: 16, marginBottom: 8 }}>
            {error || 'Không tìm thấy thông tin đơn hàng'}
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 }}>
            Đơn hàng #{id} có thể không tồn tại hoặc đã bị xóa.
          </Text>
          <TouchableOpacity 
            style={{ backgroundColor: '#000', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24 }}
            onPress={() => router.push('/orders')}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Xem tất cả đơn hàng</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          <View style={[styles.mainLayout, isLargeScreen && { flexDirection: 'row' }]}>
            
            <View style={styles.leftCol}>
              
              {/* Status Tracker */}
              <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
                  <View style={{ backgroundColor: '#e8e8e8', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#000000' }}>
                      {getStatusText(order.status).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.tracker}>
                  <View style={styles.trackerLineBg} />
                  <View 
                    style={[
                      styles.trackerLineActive, 
                      { width: isStep4Active ? '100%' : isStep3Active ? '66%' : isStep2Active ? '33%' : '0%' }
                    ]} 
                  />
                  
                  <View style={styles.trackerStep}>
                    <View style={isStep1Active ? styles.stepCircleActive : styles.stepCircleInactive}>
                      <IconSymbol name="checkmark" size={16} color="#ffffff" />
                    </View>
                    <Text style={isStep1Active ? styles.stepTextActive : styles.stepTextInactive}>Đã đặt</Text>
                  </View>
                  
                  <View style={styles.trackerStep}>
                    <View style={isStep2Active ? styles.stepCircleActive : styles.stepCircleInactive}>
                      <IconSymbol name="cube.box" size={16} color={isStep2Active ? '#ffffff' : '#444748'} />
                    </View>
                    <Text style={isStep2Active ? styles.stepTextActive : styles.stepTextInactive}>Xác nhận</Text>
                  </View>
                  
                  <View style={styles.trackerStep}>
                    <View style={isStep3Active ? styles.stepCircleActive : styles.stepCircleInactive}>
                      <IconSymbol name="car" size={16} color={isStep3Active ? '#ffffff' : '#444748'} />
                    </View>
                    <Text style={isStep3Active ? styles.stepTextActive : styles.stepTextInactive}>Đang giao</Text>
                  </View>
                  
                  <View style={styles.trackerStep}>
                    <View style={isStep4Active ? styles.stepCircleActive : styles.stepCircleInactive}>
                      <IconSymbol name="checkmark.circle.fill" size={16} color={isStep4Active ? '#ffffff' : '#444748'} />
                    </View>
                    <Text style={isStep4Active ? styles.stepTextActive : styles.stepTextInactive}>Thành công</Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13, color: '#747878', marginTop: 16 }}>
                  Thời gian đặt: {new Date(order.created_at).toLocaleString('vi-VN')}
                </Text>
              </View>

              {/* Delivery Info */}
              <View style={[styles.section, styles.deliverySection, isLargeScreen && { flexDirection: 'row' }]}>
                <View style={styles.deliveryCol}>
                  <View style={styles.deliveryHeader}>
                    <IconSymbol name="mappin.and.ellipse" size={20} color="#747878" />
                    <Text style={styles.deliveryTitle}>Địa chỉ nhận hàng</Text>
                  </View>
                  <Text style={styles.deliveryTextBold}>{order.customer_name || 'Khách hàng'}</Text>
                  <Text style={styles.deliveryText}>{order.customer_phone || 'Chưa cung cấp số điện thoại'}</Text>
                  <Text style={styles.deliveryText}>{order.customer_address || 'Địa chỉ nhận hàng'}</Text>
                </View>
                
                {isLargeScreen && <View style={styles.deliveryDivider} />}
                
                <View style={styles.deliveryCol}>
                  <View style={styles.deliveryHeader}>
                    <IconSymbol name="car" size={20} color="#747878" />
                    <Text style={styles.deliveryTitle}>Thông tin vận chuyển</Text>
                  </View>
                  <Text style={styles.deliveryTextBold}>Giao hàng tiêu chuẩn</Text>
                  <Text style={styles.deliveryText}>Đơn vị: ThoiTrangHD Express</Text>
                  <Text style={styles.deliveryText}>Mã vận đơn: SPX-{order.order_code || order.id}</Text>
                </View>
              </View>

              {order.order_note ? (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fffdf5', borderRadius: 8, borderWidth: 1, borderColor: '#fde68a' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#92400e', marginBottom: 4 }}>📝 Lời dặn Shipper & Ghi chú đơn hàng:</Text>
                  <Text style={{ fontSize: 13, color: '#1a1c1c' }}>{order.order_note}</Text>
                </View>
              ) : null}

              {order.cancel_reason ? (
                <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8, borderWidth: 1, borderColor: '#fecaca' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c', marginBottom: 4 }}>❌ Lý do hủy đơn hàng:</Text>
                  <Text style={{ fontSize: 13, color: '#1a1c1c' }}>{order.cancel_reason}</Text>
                </View>
              ) : null}

              {/* Items */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sản phẩm ({items.length})</Text>
                <View style={styles.itemsList}>
                  {items.map((item, index) => (
                    <React.Fragment key={item.id || index}>
                      <View style={styles.orderItem}>
                        <Image source={getImageSource(item.image)} style={styles.itemImage} contentFit="cover" />
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={2}>{item.product_name}</Text>
                          <Text style={styles.itemVariant}>
                            Size: {item.size || 'M'} | Màu: {item.color === '#000000' ? 'Đen' : item.color || 'Tiêu chuẩn'}
                          </Text>
                          <View style={styles.itemFooter}>
                            <Text style={styles.itemPrice}>{formatVND(item.price)}</Text>
                            <Text style={styles.itemQty}>x{item.quantity}</Text>
                          </View>
                          {order.status !== 'Cancelled' && (
                            <View style={styles.itemActionRow}>
                              {reviewedProductIds.includes(String(item.product_id)) ? (
                                <View style={styles.itemReviewedBadge}>
                                  <IconSymbol name="checkmark" size={11} color="#16a34a" />
                                  <Text style={styles.itemReviewedText}>Đã đánh giá</Text>
                                </View>
                              ) : (
                                <TouchableOpacity
                                  style={styles.itemReviewBtn}
                                  onPress={() => handleOpenReviewModal(item)}
                                >
                                  <IconSymbol name="star.fill" size={12} color="#ffffff" />
                                  <Text style={styles.itemReviewBtnText}>Đánh giá sản phẩm</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                      </View>
                      {index < items.length - 1 && <View style={styles.itemDivider} />}
                    </React.Fragment>
                  ))}
                </View>
              </View>

            </View>

            {/* Right Column */}
            <View style={styles.rightCol}>
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Thanh toán</Text>
                
                <View style={styles.paymentMethodBox}>
                  <IconSymbol 
                    name={order.payment_method === 'banking' ? 'qrcode' : 'banknote'} 
                    size={24} 
                    color="#000000" 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentMethodText}>
                      {order.payment_method === 'banking' ? 'Chuyển khoản VietQR' : 'Thanh toán khi nhận hàng (COD)'}
                    </Text>
                    <Text style={styles.paymentMethodSub}>
                      {order.payment_method === 'banking' ? 'Đã liên kết tài khoản' : 'Thanh toán tiền mặt cho shipper'}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryList}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tạm tính</Text>
                    <Text style={styles.summaryValue}>{formatVND(subtotal)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
                    <Text style={styles.summaryValue}>
                      {order.shipping_fee && Number(order.shipping_fee) > 0 ? formatVND(Number(order.shipping_fee)) : 'Miễn phí'}
                    </Text>
                  </View>
                  {discountAmount > 0 && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabelDiscount}>Giảm giá voucher</Text>
                      <Text style={styles.summaryValueDiscount}>-{formatVND(discountAmount)}</Text>
                    </View>
                  )}
                  
                  <View style={styles.summaryDivider} />
                  
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tổng thanh toán</Text>
                    <Text style={styles.totalValue}>{formatVND(totalPrice)}</Text>
                  </View>
                </View>

                {order.status?.toLowerCase() === 'pending' && (
                  <TouchableOpacity 
                    style={styles.cancelOrderBtn}
                    onPress={() => setShowCancelModal(true)}
                  >
                    <Text style={styles.cancelOrderBtnText}>HỦY ĐƠN HÀNG NÀY</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={styles.reviewBtn}
                  onPress={() => router.push('/products')}
                >
                  <Text style={styles.reviewBtnText}>TIẾP TỤC MUA SẮM</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.reorderBtn}
                  onPress={() => router.push('/orders')}
                >
                  <Text style={styles.reorderBtnText}>QUAY LẠI ĐƠN HÀNG</Text>
                </TouchableOpacity>
                
              </View>
            </View>

          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Cancel Order Confirm Modal */}
      <ConfirmModal
        visible={showCancelModal}
        title="Hủy đơn hàng"
        message={`Bạn có chắc chắn muốn hủy đơn hàng #${order?.order_code || order?.id}? Thao tác này không thể hoàn tác.`}
        confirmText="Hủy đơn"
        cancelText="Giữ lại"
        confirmType="danger"
        loading={isCancelling}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
      />

      {/* Review Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReviewModal}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setShowReviewModal(false)} 
          />
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Đánh giá sản phẩm đã mua</Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.reviewModalClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="xmark" size={20} color="#1a1c1c" />
              </TouchableOpacity>
            </View>

            {reviewingItem && (
              <View style={styles.reviewItemBrief}>
                <Image source={getImageSource(reviewingItem.image)} style={styles.reviewItemThumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewItemName} numberOfLines={1}>{reviewingItem.product_name}</Text>
                  <Text style={styles.reviewItemMeta}>
                    Phân loại: Size {reviewingItem.size || 'M'} | Màu {reviewingItem.color === '#000000' ? 'Đen' : reviewingItem.color || 'Tiêu chuẩn'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.starPickerBox}>
              <Text style={styles.starPickerLabel}>Chất lượng sản phẩm:</Text>
              <View style={styles.interactiveStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setReviewRating(star)}
                    style={styles.starTouchArea}
                  >
                    <IconSymbol
                      name="star.fill"
                      size={32}
                      color={star <= reviewRating ? "#e1c28e" : "#e5e7eb"}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.starRatingDesc}>
                {reviewRating === 5 ? 'Tuyệt vời (5 sao)' :
                 reviewRating === 4 ? 'Hài lòng (4 sao)' :
                 reviewRating === 3 ? 'Bình thường (3 sao)' :
                 reviewRating === 2 ? 'Không hài lòng (2 sao)' : 'Rất tệ (1 sao)'}
              </Text>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Nhận xét của bạn về sản phẩm:</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Chia sẻ nhận xét của bạn về chất lượng vải, form dáng, độ vừa vặn..."
                placeholderTextColor="#9ca3af"
                multiline={true}
                numberOfLines={4}
                value={reviewComment}
                onChangeText={setReviewComment}
              />
            </View>

            <View style={styles.reviewModalFooter}>
              <TouchableOpacity
                style={styles.cancelReviewBtn}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelReviewText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReviewBtn, isSubmittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitItemReview}
                disabled={isSubmittingReview}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitReviewText}>Gửi đánh giá</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <IconSymbol name="checkmark.circle.fill" size={20} color="#2e7d32" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  headerWeb: {
    backgroundColor: '#f9f9f9',
    zIndex: 50,
  },
  headerContentWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  iconButtonWeb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f3f3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWeb: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1c1c',
    letterSpacing: -0.5,
  },
  headerSubtitleWeb: {
    fontSize: 13,
    color: '#444748',
  },
  headerMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
    zIndex: 50,
  },
  iconButtonMobile: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitleMobile: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingHorizontal: 16,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  mainLayout: {
    flexDirection: 'column',
    gap: 20,
  },
  leftCol: {
    flex: 2,
    gap: 32,
  },
  rightCol: {
    flex: 1,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    padding: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 24,
  },
  tracker: {
    position: 'relative',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  trackerLineBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 16,
    height: 2,
    backgroundColor: '#e2e2e2',
    zIndex: 1,
  },
  trackerLineActive: {
    position: 'absolute',
    left: 0,
    width: '75%',
    top: 16,
    height: 2,
    backgroundColor: '#000000',
    zIndex: 2,
  },
  trackerStep: {
    alignItems: 'center',
    gap: 8,
    zIndex: 3,
  },
  stepCircleActive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTextActive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    textTransform: 'uppercase',
  },
  stepCircleInactive: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e2e2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTextInactive: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444748',
    textTransform: 'uppercase',
  },
  deliverySection: {
    flexDirection: 'column',
    gap: 20,
  },
  deliveryCol: {
    flex: 1,
  },
  deliveryDivider: {
    width: 1,
    backgroundColor: '#e2e2e2',
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  deliveryTitle: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  deliveryTextBold: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  deliveryText: {
    fontSize: 14,
    color: '#444748',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemsList: {
    gap: 24,
  },
  orderItem: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  itemImage: {
    width: 96,
    height: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e2e2',
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 4,
  },
  itemVariant: {
    fontSize: 14,
    color: '#444748',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  itemQty: {
    fontSize: 14,
    color: '#444748',
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#e2e2e2',
  },
  summarySection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e2e2',
    padding: 24,
  },
  paymentMethodBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f3f3f3',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  paymentMethodSub: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444748',
    letterSpacing: 1,
  },
  summaryList: {
    gap: 12,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#444748',
  },
  summaryValue: {
    fontSize: 14,
    color: '#444748',
  },
  summaryLabelDiscount: {
    fontSize: 14,
    color: '#725b2f',
  },
  summaryValueDiscount: {
    fontSize: 14,
    color: '#725b2f',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e2e2',
    marginVertical: 8,
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
    fontWeight: '500',
    color: '#000000',
  },
  cancelOrderBtn: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelOrderBtnText: {
    color: '#ba1a1a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reviewBtn: {
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  reorderBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#747878',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  reorderBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  /* Item Review Button & Badge */
  itemActionRow: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  itemReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121212',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  itemReviewBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  itemReviewedText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600',
  },
  /* Review Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  reviewModalCard: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 520,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  reviewModalClose: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  reviewItemBrief: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  reviewItemThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  reviewItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewItemMeta: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  starPickerBox: {
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginVertical: 12,
  },
  starPickerLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  interactiveStarsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  starTouchArea: {
    padding: 4,
  },
  starRatingDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#ffffff',
  },
  textArea: {
    height: 90,
    textAlignVertical: 'top',
  },
  reviewModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelReviewBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  cancelReviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
  },
  submitReviewBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitReviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 70 : 50,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    maxWidth: 400,
    alignSelf: 'center',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1c1c',
  },
});
