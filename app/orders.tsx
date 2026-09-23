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
  TextInput 
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { API_URL } from '@/constants/config';

import { getImageSource } from '@/constants/images';

const formatVND = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

export default function OrdersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const { isLargeScreen } = useResponsive();
  const [activeTab, setActiveTab] = useState('TẤT CẢ');
  const [orders, setOrders] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cancelReason, setCancelReason] = useState('Đổi ý không muốn mua nữa');
  const [customCancelReason, setCustomCancelReason] = useState('');
  const [loading, setLoading] = useState(true);

  // Reviews state
  const [reviewedOrderMap, setReviewedOrderMap] = useState<Record<string, string[]>>({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
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

  const tabs = ['TẤT CẢ', 'Pending', 'Processing', 'Completed', 'Cancelled'];

  useEffect(() => {
    if (!user?.id) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_URL}/api/orders?userId=${user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setOrders(data.data || []);
        } else {
          setOrders([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách đơn hàng:', err);
        setOrders([]);
        setLoading(false);
      });
  }, [user]);

  // Fetch reviewed product IDs for completed orders
  useEffect(() => {
    const completedOrders = orders.filter(o => (o.status || '').toLowerCase() === 'completed');
    if (completedOrders.length > 0) {
      Promise.all(
        completedOrders.map(o =>
          fetch(`${API_URL}/api/orders/${o.id}/reviewed-items`)
            .then(r => r.json())
            .then(res => ({ orderId: o.id, reviewed: res.data || [] }))
            .catch(() => ({ orderId: o.id, reviewed: [] }))
        )
      ).then(results => {
        const map: Record<string, string[]> = {};
        results.forEach(item => {
          map[String(item.orderId)] = item.reviewed.map(String);
        });
        setReviewedOrderMap(map);
      });
    }
  }, [orders]);

  const handleOpenReview = (order: any, targetItem?: any) => {
    setSelectedOrder(order);
    const orderItems = order.items || [];
    const reviewedForThisOrder = reviewedOrderMap[String(order.id)] || [];
    
    // Pick targetItem or first unreviewed item or first item
    let chosen = targetItem;
    if (!chosen && orderItems.length > 0) {
      chosen = orderItems.find((it: any) => !reviewedForThisOrder.includes(String(it.product_id || it.id))) || orderItems[0];
    }
    
    setSelectedItem(chosen || null);
    setReviewRating(5);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedOrder || !selectedItem) return;
    if (!reviewComment.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const prodId = selectedItem.product_id || selectedItem.id;
      const colorName = selectedItem.color === '#000000' ? 'Đen' : selectedItem.color || 'Tiêu chuẩn';
      
      const res = await fetch(`${API_URL}/api/products/${prodId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || selectedOrder.user_id || null,
          userName: user?.name || selectedOrder.customer_name || 'Khách hàng',
          rating: reviewRating,
          comment: reviewComment.trim(),
          orderId: selectedOrder.id,
          size: selectedItem.size || 'M',
          color: colorName,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        // Update local reviewed map
        setReviewedOrderMap(prev => {
          const currentList = prev[String(selectedOrder.id)] || [];
          return {
            ...prev,
            [String(selectedOrder.id)]: [...currentList, String(prodId)]
          };
        });

        // Check if there are other unreviewed items in this order
        const orderItems = selectedOrder.items || [];
        const nextUnreviewed = orderItems.find((it: any) => {
          const itId = String(it.product_id || it.id);
          return itId !== String(prodId) && !(reviewedOrderMap[String(selectedOrder.id)] || []).includes(itId);
        });

        if (nextUnreviewed) {
          showToast('Đã lưu đánh giá! Bạn có thể đánh giá tiếp sản phẩm còn lại.');
          setSelectedItem(nextUnreviewed);
          setReviewRating(5);
          setReviewComment('');
        } else {
          setShowReviewModal(false);
          showToast('Cảm ơn bạn đã đánh giá đơn hàng!');
        }
      } else {
        showToast(data?.message || 'Không thể gửi đánh giá');
      }
    } catch (e) {
      console.error('Lỗi gửi đánh giá:', e);
      showToast('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setIsSubmittingReview(false);
    }
  };


  const handleReorder = (order: any) => {
    const items = order.items || [];
    if (items.length === 0) return;
    items.forEach((item: any) => {
      addToCart({
        id: String(item.product_id || item.id),
        name: item.product_name || item.name,
        price: item.price,
        image: item.image,
        quantity: item.quantity || 1,
        size: item.size || 'M',
        color: item.color || '#000000',
      });
    });
    showToast('Đã thêm các sản phẩm vào giỏ hàng');
    router.push('/cart');
  };

  const handleConfirmCancel = async () => {
    if (!orderToCancel) return;
    const finalReason = cancelReason === 'Lý do khác' ? (customCancelReason.trim() || 'Lý do khác') : cancelReason;
    setIsCancellingOrder(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderToCancel.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelReason: finalReason })
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('Đã hủy đơn hàng thành công');
        setOrders(prev => prev.map(o => o.id === orderToCancel.id ? { ...o, status: 'Cancelled', cancel_reason: finalReason } : o));
        setOrderToCancel(null);
        setCustomCancelReason('');
      } else {
        showToast(data?.message || 'Không thể hủy đơn hàng');
      }
    } catch (err) {
      showToast('Lỗi kết nối khi hủy đơn');
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = activeTab === 'TẤT CẢ' || (o.status || 'Pending').toLowerCase() === activeTab.toLowerCase();
    if (!matchStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const codeMatch = (o.order_code || String(o.id)).toLowerCase().includes(q);
    const itemMatch = (o.items || []).some((it: any) => (it.product_name || it.name || '').toLowerCase().includes(q));
    return codeMatch || itemMatch;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="arrow.left" size={22} color="#1a1c1c" />
            {isLargeScreen && <Text style={styles.backButtonText}>Quay lại</Text>}
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đơn hàng của tôi</Text>
          <TouchableOpacity
            style={styles.rightActionBtn}
            onPress={() => router.push('/products')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol name="bag" size={20} color="#1a1c1c" />
            {isLargeScreen && <Text style={styles.rightActionText}>Mua sắm</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.orderSearchBar}>
          <IconSymbol name="magnifyingglass" size={18} color="#747878" />
          <TextInput
            style={styles.orderSearchInput}
            placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <IconSymbol name="xmark" size={16} color="#747878" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          {isLargeScreen ? (
            <View style={styles.tabsRowDesktop}>
              {tabs.map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.tabDesktop, activeTab === tab && styles.tabDesktopActive]} 
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === 'Pending' ? 'CHỜ XÁC NHẬN' : tab === 'Processing' ? 'ĐANG GIAO' : tab === 'Completed' ? 'ĐÃ GIAO' : tab === 'Cancelled' ? 'ĐÃ HỦY' : tab}
                  </Text>
                  {activeTab === tab && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScrollMobile}>
              {tabs.map(tab => (
                <TouchableOpacity 
                  key={tab} 
                  style={styles.tabMobile} 
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                    {tab === 'Pending' ? 'CHỜ XÁC NHẬN' : tab === 'Processing' ? 'ĐANG GIAO' : tab === 'Completed' ? 'ĐÃ GIAO' : tab === 'Cancelled' ? 'ĐÃ HỦY' : tab}
                  </Text>
                  {activeTab === tab && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
        ) : !user ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="person" size={48} color="#747878" />
            </View>
            <Text style={styles.emptyTitle}>Vui lòng đăng nhập</Text>
            <Text style={styles.emptyDesc}>Đăng nhập để theo dõi trạng thái đơn hàng và lịch sử mua sắm của bạn.</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/login')}>
              <Text style={styles.shopNowText}>ĐĂNG NHẬP NGAY</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <IconSymbol name="cube.box" size={48} color="#747878" />
            </View>
            <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptyDesc}>Bạn chưa có đơn hàng nào. Hãy đặt mua những món đồ mới nhất từ ThoiTrangHD.</Text>
            <TouchableOpacity style={styles.shopNowBtn} onPress={() => router.push('/products')}>
              <Text style={styles.shopNowText}>MUA SẮM NGAY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map((order) => {
              const formattedTotal = formatVND(order.total_price || 0);
              const items = order.items || [];
              const isCompleted = (order.status || '').toLowerCase() === 'completed';
              const reviewedForThisOrder = reviewedOrderMap[String(order.id)] || [];
              const isAllReviewed = items.length > 0 && items.every((it: any) => 
                reviewedForThisOrder.includes(String(it.product_id || it.id))
              );

              return (
                <View key={order.id || order.order_code} style={styles.orderCard}>
                  
                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderId}>MÃ ĐƠN: #{order.order_code || order.id}</Text>
                      <Text style={styles.orderDate}>Ngày đặt: {new Date(order.created_at || Date.now()).toLocaleDateString('vi-VN')}</Text>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      (order.status || '').toLowerCase() === 'pending' && styles.statusBadgePending,
                      (order.status || '').toLowerCase() === 'processing' && styles.statusBadgeProcessing,
                      (order.status || '').toLowerCase() === 'completed' && styles.statusBadgeCompleted,
                      (order.status || '').toLowerCase() === 'cancelled' && styles.statusBadgeCancelled,
                    ]}>
                      <Text style={[
                        styles.statusText,
                        (order.status || '').toLowerCase() === 'pending' && styles.statusTextPending,
                        (order.status || '').toLowerCase() === 'processing' && styles.statusTextProcessing,
                        (order.status || '').toLowerCase() === 'completed' && styles.statusTextCompleted,
                        (order.status || '').toLowerCase() === 'cancelled' && styles.statusTextCancelled,
                      ]}>
                        {(order.status || '').toLowerCase() === 'pending'
                          ? 'CHỜ XÁC NHẬN'
                          : (order.status || '').toLowerCase() === 'processing'
                          ? 'ĐANG GIAO'
                          : (order.status || '').toLowerCase() === 'completed'
                          ? 'ĐÃ GIAO'
                          : (order.status || '').toLowerCase() === 'cancelled'
                          ? 'ĐÃ HỦY'
                          : (order.status || 'ĐANG XỬ LÝ').toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {items.map((item: any, index: number) => {
                    const itemIdStr = String(item.product_id || item.id);
                    const isThisItemReviewed = reviewedForThisOrder.includes(itemIdStr);

                    return (
                      <View key={`${item.id || index}`} style={styles.orderItem}>
                        <View style={styles.itemImageContainer}>
                          <Image source={getImageSource(item.image)} style={styles.itemImage} contentFit="cover" />
                        </View>
                        <View style={styles.itemDetails}>
                          <Text style={styles.itemName} numberOfLines={1}>{item.product_name || item.name}</Text>
                          <Text style={styles.itemVariant}>Size: {item.size || 'M'} | Màu: {item.color === '#000000' ? 'Đen' : item.color}</Text>
                          <Text style={styles.itemQty}>x{item.quantity}</Text>
                          
                          {isCompleted && (
                            <View style={{ marginTop: 6 }}>
                              {isThisItemReviewed ? (
                                <View style={styles.itemReviewedBadge}>
                                  <IconSymbol name="checkmark.circle.fill" size={12} color="#16a34a" />
                                  <Text style={styles.itemReviewedText}>Đã đánh giá</Text>
                                </View>
                              ) : (
                                <TouchableOpacity 
                                  style={styles.itemReviewAction} 
                                  onPress={() => handleOpenReview(order, item)}
                                >
                                  <IconSymbol name="star.fill" size={11} color="#e1c28e" />
                                  <Text style={styles.itemReviewActionText}>Đánh giá sản phẩm này</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}
                        </View>
                        <View style={styles.itemPriceContainer}>
                          <Text style={styles.itemPrice}>{formatVND(item.price || 0)}</Text>
                        </View>
                      </View>
                    );
                  })}

                  {order.order_note ? (
                    <View style={styles.orderNoteBadgeRow}>
                      <IconSymbol name="pencil" size={13} color="#b78103" />
                      <Text style={styles.orderNoteBadgeText} numberOfLines={1}>
                        Lời dặn: {order.order_note}
                      </Text>
                    </View>
                  ) : null}

                  {order.cancel_reason ? (
                    <View style={styles.orderCancelReasonRow}>
                      <IconSymbol name="xmark.circle" size={13} color="#ba1a1a" />
                      <Text style={styles.orderCancelReasonText}>
                        Lý do hủy: {order.cancel_reason}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.orderFooter}>
                    <View style={styles.totalRow}>
                      <Text style={styles.totalLabel}>Tổng tiền:</Text>
                      <Text style={styles.totalValue}>{formattedTotal}</Text>
                    </View>
                    <View style={styles.orderActions}>
                      {(order.status || '').toLowerCase() === 'pending' && (
                        <TouchableOpacity 
                          style={styles.cancelActionBtn} 
                          onPress={() => setOrderToCancel(order)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="xmark" size={12} color="#ba1a1a" />
                          <Text style={styles.cancelActionBtnText}>HỦY ĐƠN</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity 
                        style={styles.reorderActionBtn} 
                        onPress={() => handleReorder(order)}
                        activeOpacity={0.8}
                      >
                        <IconSymbol name="arrow.clockwise" size={12} color="#1a1c1c" />
                        <Text style={styles.reorderActionBtnText}>MUA LẠI</Text>
                      </TouchableOpacity>

                      {isCompleted && (
                        <TouchableOpacity 
                          style={[styles.reviewBtn, isAllReviewed && styles.reviewedBtn]} 
                          onPress={() => handleOpenReview(order)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol 
                            name={isAllReviewed ? "checkmark.circle.fill" : "star.fill"} 
                            size={13} 
                            color={isAllReviewed ? "#16a34a" : "#ffffff"} 
                          />
                          <Text style={[styles.reviewBtnText, isAllReviewed && styles.reviewedBtnText]}>
                            {isAllReviewed ? 'ĐÃ ĐÁNH GIÁ' : 'ĐÁNH GIÁ'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity 
                        style={styles.detailBtn} 
                        onPress={() => router.push(`/order-details?id=${order.id}`)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.detailBtnText}>CHI TIẾT</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>


      {/* Cancel Reason Modal */}
      <Modal
        visible={!!orderToCancel}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setOrderToCancel(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setOrderToCancel(null)} 
          />
          <View style={[styles.reviewModalCard, { maxWidth: 500 }]}>
            <View style={styles.reviewModalHeader}>
              <View>
                <Text style={styles.reviewModalTitle}>Lý do hủy đơn hàng</Text>
                <Text style={styles.reviewModalSubtitle}>
                  Đơn hàng #{orderToCancel?.order_code || orderToCancel?.id}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOrderToCancel(null)} style={styles.reviewModalClose}>
                <IconSymbol name="xmark" size={20} color="#747878" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
                Vui lòng chia sẻ lý do để ThoiTrangHD có thể cải thiện chất lượng phục vụ tốt hơn:
              </Text>

              {[
                'Đổi ý không muốn mua nữa',
                'Muốn thay đổi kích cỡ hoặc màu sắc',
                'Muốn thay đổi địa chỉ nhận hàng',
                'Tìm thấy sản phẩm khác giá tốt hơn',
                'Thời gian giao hàng dự kiến quá lâu',
                'Lý do khác'
              ].map((reason) => {
                const isSelected = cancelReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonOptionRow, isSelected && styles.reasonOptionRowActive]}
                    onPress={() => setCancelReason(reason)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.reasonRadioCircle, isSelected && styles.reasonRadioCircleActive]}>
                      {isSelected && <View style={styles.reasonRadioDot} />}
                    </View>
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextActive]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {cancelReason === 'Lý do khác' && (
                <TextInput
                  style={styles.customReasonInput}
                  placeholder="Nhập lý do của bạn tại đây..."
                  placeholderTextColor="#9ca3af"
                  value={customCancelReason}
                  onChangeText={setCustomCancelReason}
                  multiline
                  numberOfLines={2}
                />
              )}
            </ScrollView>

            <View style={styles.reviewModalFooter}>
              <TouchableOpacity 
                style={styles.cancelKeepBtn} 
                onPress={() => setOrderToCancel(null)}
                disabled={isCancellingOrder}
              >
                <Text style={styles.cancelKeepText}>GIỮ LẠI ĐƠN</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.cancelConfirmBtn} 
                onPress={handleConfirmCancel}
                disabled={isCancellingOrder}
              >
                {isCancellingOrder ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.cancelConfirmText}>XÁC NHẬN HỦY</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              <View>
                <Text style={styles.reviewModalTitle}>Đánh giá sản phẩm đã mua</Text>
                {selectedOrder && (
                  <Text style={styles.reviewModalSubtitle}>Đơn hàng #{selectedOrder.order_code || selectedOrder.id}</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.reviewModalClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="xmark" size={18} color="#1a1c1c" />
              </TouchableOpacity>
            </View>

            {/* Multi-item selector tabs if order has more than 1 item */}
            {selectedOrder && (selectedOrder.items || []).length > 1 && (
              <View style={styles.itemSelectorContainer}>
                <Text style={styles.itemSelectorLabel}>Chọn sản phẩm cần đánh giá:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.itemSelectorScroll}>
                  {(selectedOrder.items || []).map((it: any) => {
                    const itIdStr = String(it.product_id || it.id);
                    const isSelected = selectedItem && String(selectedItem.product_id || selectedItem.id) === itIdStr;
                    const isRev = (reviewedOrderMap[String(selectedOrder.id)] || []).includes(itIdStr);
                    return (
                      <TouchableOpacity
                        key={itIdStr}
                        style={[
                          styles.itemTabBtn,
                          isSelected && styles.itemTabBtnSelected,
                          isRev && styles.itemTabBtnReviewed,
                        ]}
                        onPress={() => {
                          setSelectedItem(it);
                          setReviewRating(5);
                          setReviewComment('');
                        }}
                      >
                        <Image source={getImageSource(it.image)} style={styles.itemTabThumb} contentFit="cover" />
                        <View style={{ maxWidth: 120 }}>
                          <Text style={[styles.itemTabText, isSelected && styles.itemTabTextSelected]} numberOfLines={1}>
                            {it.product_name || it.name}
                          </Text>
                          <Text style={styles.itemTabStatus}>
                            {isRev ? '✓ Đã đánh giá' : 'Chưa đánh giá'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Selected Item Brief */}
            {selectedItem && (
              <View style={styles.reviewItemBrief}>
                <Image source={getImageSource(selectedItem.image)} style={styles.reviewItemThumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewItemName} numberOfLines={2}>{selectedItem.product_name || selectedItem.name}</Text>
                  <Text style={styles.reviewItemMeta}>
                    Size: {selectedItem.size || 'M'} | Màu: {selectedItem.color === '#000000' ? 'Đen' : selectedItem.color || 'Tiêu chuẩn'}
                  </Text>
                </View>
              </View>
            )}

            {/* Star Rating Picker */}
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
                      size={30}
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

            {/* Comment Input */}
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.inputLabel}>Nhận xét của bạn về sản phẩm:</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Hãy chia sẻ nhận xét của bạn về chất lượng vải, form dáng, độ vừa vặn..."
                placeholderTextColor="#9ca3af"
                multiline={true}
                numberOfLines={4}
                value={reviewComment}
                onChangeText={setReviewComment}
              />
            </View>

            {/* Footer Buttons */}
            <View style={styles.reviewModalFooter}>
              <TouchableOpacity
                style={styles.cancelReviewBtn}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelReviewText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReviewBtn, isSubmittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
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
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 199, 199, 0.3)',
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1c1c',
    letterSpacing: -0.3,
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    marginLeft: -6,
  },
  backButtonText: {
    fontSize: 14,
    color: '#1a1c1c',
    fontWeight: '500',
  },
  rightActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    marginRight: -6,
  },
  rightActionText: {
    fontSize: 14,
    color: '#1a1c1c',
    fontWeight: '500',
  },
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 199, 199, 0.3)',
    zIndex: 40,
  },
  tabsWrapper: {
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  tabsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  tabDesktop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabDesktopActive: {},
  tabsScrollMobile: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 2,
    gap: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabMobile: {
    position: 'relative',
    paddingBottom: 10,
    paddingHorizontal: 4,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#747878',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#121212',
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: '#121212',
    borderRadius: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 860,
    alignSelf: 'center',
    width: '100%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#e8e8e8',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    maxWidth: 320,
    marginBottom: 32,
    lineHeight: 24,
  },
  shopNowBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 4,
  },
  shopNowText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  ordersList: {
    gap: 24,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(196, 199, 199, 0.3)',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 199, 199, 0.2)',
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#444748',
    letterSpacing: 1,
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#444748',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#e8e8e8',
    borderRadius: 16,
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeProcessing: {
    backgroundColor: '#eff6ff',
  },
  statusBadgeCancelled: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeCompleted: {
    backgroundColor: '#dcfce7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
  },
  statusTextPending: {
    color: '#b45309',
  },
  statusTextProcessing: {
    color: '#1d4ed8',
  },
  statusTextCancelled: {
    color: '#ba1a1a',
  },
  statusTextCompleted: {
    color: '#166534',
  },
  orderItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  itemImageContainer: {
    width: 80,
    height: 96,
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
  itemQty: {
    fontSize: 14,
    color: '#444748',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 16,
    color: '#000000',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#444748',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '500',
    color: '#000000',
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailBtn: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 24,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    letterSpacing: 1,
  },
  cancelActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffcdd2',
    backgroundColor: '#ffebee',
  },
  cancelActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  reorderActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#ffffff',
  },
  reorderActionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: '#000000',
    borderRadius: 24,
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  reviewedBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  reviewedBtnText: {
    color: '#16a34a',
  },
  /* Item Review Badges & Actions inside cards */
  itemReviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  itemReviewedText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: '600',
  },
  itemReviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#faf5ee',
    borderWidth: 1,
    borderColor: '#e1c28e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  itemReviewActionText: {
    color: '#926a27',
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
    alignItems: 'flex-start',
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
  reviewModalSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  reviewModalClose: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  itemSelectorContainer: {
    marginTop: 12,
    marginBottom: 4,
  },
  itemSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 8,
  },
  itemSelectorScroll: {
    gap: 8,
    flexDirection: 'row',
    paddingBottom: 4,
  },
  itemTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 6,
    paddingRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  itemTabBtnSelected: {
    borderColor: '#000000',
    backgroundColor: '#f9f9f9',
  },
  itemTabBtnReviewed: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  itemTabThumb: {
    width: 32,
    height: 32,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  itemTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  itemTabTextSelected: {
    fontWeight: '700',
    color: '#000000',
  },
  itemTabStatus: {
    fontSize: 10,
    color: '#9ca3af',
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
    width: 48,
    height: 48,
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
    height: 80,
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
    color: '#374151',
  },
  submitReviewBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  submitReviewText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  toastContainer: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 9999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  /* Search Bar */
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#ffffff',
  },
  orderSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  orderSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1a1c1c',
  },
  /* Order Note & Cancel Badges */
  orderNoteBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fffdf5',
    borderTopWidth: 1,
    borderTopColor: '#fef3c7',
  },
  orderNoteBadgeText: {
    fontSize: 12,
    color: '#92400e',
    flex: 1,
  },
  orderCancelReasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fef2f2',
    borderTopWidth: 1,
    borderTopColor: '#fee2e2',
  },
  orderCancelReasonText: {
    fontSize: 12,
    color: '#b91c1c',
    flex: 1,
  },
  /* Cancel Reason Modal */
  reasonOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    gap: 10,
  },
  reasonOptionRowActive: {
    borderColor: '#b78103',
    backgroundColor: '#fffdf5',
  },
  reasonRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonRadioCircleActive: {
    borderColor: '#b78103',
  },
  reasonRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#b78103',
  },
  reasonOptionText: {
    fontSize: 13,
    color: '#374151',
  },
  reasonOptionTextActive: {
    color: '#1a1c1c',
    fontWeight: '600',
  },
  customReasonInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#1a1c1c',
    marginTop: 8,
  },
  cancelKeepBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelKeepText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
  },
  cancelConfirmBtn: {
    backgroundColor: '#ba1a1a',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  cancelConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
