import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/contexts/AuthContext';

import { getImageSource } from '@/constants/images';
import * as ImagePicker from 'expo-image-picker';


const COLOR_NAMES_MAP: Record<string, string> = {
  '#000000': 'Đen',
  '#ffffff': 'Trắng',
  '#1a237e': 'Xanh Navy',
  '#1A237E': 'Xanh Navy',
  '#757575': 'Ghi Xám',
  '#9e9e9e': 'Xám Bạc',
  '#f5f5dc': 'Be / Kem',
  '#F5F5DC': 'Be / Kem',
  '#2e7d32': 'Xanh Rêu',
  '#2E7D32': 'Xanh Rêu',
  '#880e4f': 'Đỏ Đô',
  '#880E4F': 'Đỏ Đô',
  '#3b82f6': 'Xanh Dương',
  '#e11d48': 'Đỏ Hồng',
  '#d97706': 'Vàng Bò / Nâu Cam',
  '#4b5563': 'Xám Đậm',
  '#1e293b': 'Xanh Đen',
  '#854d0e': 'Nâu Tây',
  '#78350f': 'Nâu Đất',
  '#312e81': 'Tím Than',
};

const getColorName = (color?: string) => {
  if (!color) return 'Tiêu chuẩn';
  const clean = color.trim().toLowerCase();
  const found = Object.entries(COLOR_NAMES_MAP).find(([k]) => k.toLowerCase() === clean);
  if (found) return found[1];
  if (color.startsWith('#')) return 'Màu ' + color;
  return color;
};

const AVAILABLE_RETURN_COLORS = [
  { name: 'Đen', hex: '#000000' },
  { name: 'Xanh Navy', hex: '#1A237E' },
  { name: 'Ghi Xám', hex: '#757575' },
  { name: 'Trắng', hex: '#ffffff' },
  { name: 'Be / Kem', hex: '#F5F5DC' },
  { name: 'Xanh Rêu', hex: '#2E7D32' },
  { name: 'Đỏ Đô', hex: '#880e4f' },
];

const formatVND = (num: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

// [Chức năng UI: "Hành trình đơn hàng"] - Tính toán 4 giai đoạn tiến trình vận chuyển dựa trên thời gian đơn hàng được tạo
const getShippingSubStatus = (createdDate: string | Date) => {
  const diffHours = (Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60);
  // Giai đoạn 1 (dưới 12 tiếng): Shop đóng gói kiểm tra tem mác
  if (diffHours < 12) {
    return {
      step: 1,
      shortLabel: 'Đóng gói xong',
      badge: '📦 Shop đang chuẩn bị hàng & đóng gói',
      statusText: 'Đơn hàng đã được xác nhận. Nhân viên kho đang kiểm tra tem mác và đóng gói kiện hàng.',
      shipperNote: 'Bưu tá ThoiTrangHD Express đã tiếp nhận và đang đến lấy hàng.',
    };
  // Giai đoạn 2 (12 đến 36 tiếng): Đã xuất kho và bàn giao đơn vị vận chuyển
  } else if (diffHours < 36) {
    return {
      step: 2,
      shortLabel: 'Đã xuất kho',
      badge: '🚚 Đã bàn giao ĐVVC ThoiTrangHD Express',
      statusText: 'Kiện hàng đã rời kho phân loại tổng và đang được vận chuyển liên tỉnh.',
      shipperNote: 'Mã vận đơn SPX đã kích hoạt định vị hành trình.',
    };
  // Giai đoạn 3 (36 đến 60 tiếng): Kiện hàng đến bưu cục phát trung chuyển
  } else if (diffHours < 60) {
    return {
      step: 3,
      shortLabel: 'Đang trung chuyển',
      badge: '🚛 Đang trung chuyển qua bưu cục phát',
      statusText: 'Đơn hàng đã cập bến bưu cục phát gần nhất tại khu vực nhận hàng.',
      shipperNote: 'Kiện hàng đã được phân bổ cho shipper phụ trách tuyến đường của bạn.',
    };
  // Giai đoạn 4 (trên 60 tiếng): Shipper đang trên đường đi giao hàng
  } else {
    return {
      step: 4,
      shortLabel: 'Đang phát hàng',
      badge: '🛵 Shipper đang giao hàng gần đến bạn',
      statusText: 'Shipper đang trên đường giao hàng đến địa chỉ nhận. Dự kiến phát hôm nay.',
      shipperNote: 'Vui lòng chú ý giữ liên lạc điện thoại để nhận hàng nhanh nhất.',
    };
  }
};

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
  payment_status?: string;
  total_price: number;
  status: string;
  created_at: string;
  order_note?: string;
  cancel_reason?: string;
  shipping_fee?: number;
  return_status?: 'Requested' | 'Approved' | 'Rejected' | null;
  return_reason?: string | null;
  return_note?: string | null;
  return_target_size?: string | null;
  return_target_color?: string | null;
  return_images?: string | string[] | null;
  items: OrderItem[];
}

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isMobile, isLargeScreen } = useResponsive();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showConfirmReceiptModal, setShowConfirmReceiptModal] = useState(false);
  const [isConfirmingReceipt, setIsConfirmingReceipt] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Return / Warranty states
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnItem, setReturnItem] = useState<OrderItem | null>(null);
  const [returnReason, setReturnReason] = useState<'size' | 'color' | 'both' | 'defect' | 'wrong' | 'refund'>('size');
  const [targetSize, setTargetSize] = useState('L');
  const [targetColor, setTargetColor] = useState('Xanh Navy');
  const [returnImages, setReturnImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [returnNote, setReturnNote] = useState('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [isCancelingReturn, setIsCancelingReturn] = useState(false);
  const [returnProductVariants, setReturnProductVariants] = useState<any[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Danh sách size động được đồng bộ từ biến thể thực tế của sản phẩm
  const availableSizes = useMemo<string[]>(() => {
    if (returnProductVariants && returnProductVariants.length > 0) {
      const sizes: string[] = [];
      returnProductVariants.forEach((v) => {
        const sz = String(v.size || '').trim();
        if (sz && !sizes.includes(sz)) {
          sizes.push(sz);
        }
      });
      if (sizes.length > 0) return sizes;
    }
    const curSize = returnItem?.size || '';
    if (/^\d+$/.test(curSize)) {
      return ['38', '39', '40', '41', '42', '43'];
    }
    return ['S', 'M', 'L', 'XL', '2XL', '3XL'];
  }, [returnProductVariants, returnItem]);

  // Danh sách màu sắc động được đồng bộ từ biến thể thực tế của sản phẩm
  const availableColors = useMemo<{ name: string; hex: string }[]>(() => {
    if (returnProductVariants && returnProductVariants.length > 0) {
      const map = new Map<string, string>();
      returnProductVariants.forEach((v) => {
        const name = String(v.color || '').trim();
        const hex = v.color_code || '#1A237E';
        if (name && !map.has(name)) {
          map.set(name, hex);
        }
      });
      if (map.size > 0) {
        return Array.from(map.entries()).map(([name, hex]) => ({ name, hex }));
      }
    }
    return AVAILABLE_RETURN_COLORS;
  }, [returnProductVariants]);

  const handlePickReturnImage = async () => {
    if (returnImages.length >= 3) {
      showToast('Tối đa 3 ảnh minh chứng');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setIsUploadingImage(true);
        const formData = new FormData();
        
        const filename = asset.fileName || `return_${Date.now()}.jpg`;
        if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          formData.append('image', blob, filename);
        } else {
          formData.append('image', {
            uri: asset.uri.replace('file://', ''),
            name: filename,
            type: asset.mimeType || 'image/jpeg',
          } as any);
        }

        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.success && data.url) {
          setReturnImages(prev => [...prev, data.url]);
          showToast('Đã tải ảnh minh chứng');
        } else {
          setReturnImages(prev => [...prev, asset.uri]);
        }
      }
    } catch (e) {
      console.error('Lỗi chọn ảnh đổi trả:', e);
      showToast('Không thể chọn ảnh');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleRemoveReturnImage = (idx: number) => {
    setReturnImages(prev => prev.filter((_, i) => i !== idx));
  };

  // [Chức năng UI: "Yêu cầu Đổi/Trả"] - Mở modal để khách chọn lý do đổi size, đổi màu hoặc trả hàng
  const handleOpenReturnModal = (item?: OrderItem) => {
    const it = item || (items.length > 0 ? items[0] : null);
    setReturnItem(it);
    setReturnImages([]);
    setReturnProductVariants([]);

    // Nếu đơn hàng đã có yêu cầu đổi trả đang xử lý (Requested), nạp lại đúng thông tin khách đã chọn
    if (order?.return_status === 'Requested') {
      setTargetSize(order.return_target_size || '');
      setTargetColor(order.return_target_color || '');
      setReturnNote(order.return_note || '');
      if (order.return_target_size && order.return_target_color) {
        setReturnReason('both');
      } else if (order.return_target_color) {
        setReturnReason('color');
      } else {
        setReturnReason('size');
      }
    } else {
      // Yêu cầu đổi trả mới: để trống để người dùng chủ động chọn, không áp đặt mặc định ngầm
      setTargetSize('');
      setTargetColor('');
      setReturnReason('size');
      setReturnNote('');
    }

    if (it?.product_id) {
      setIsLoadingVariants(true);
      fetch(`${API_URL}/api/products/${it.product_id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.success && data.data?.variants && Array.isArray(data.data.variants)) {
            setReturnProductVariants(data.data.variants);
          }
        })
        .catch((err) => {
          console.error('Lỗi tải variants sản phẩm cho đổi trả:', err);
        })
        .finally(() => {
          setIsLoadingVariants(false);
        });
    }

    setShowReturnModal(true);
  };

  const handleCancelReturn = async () => {
    if (!order?.id) return;
    setIsCancelingReturn(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/cancel-return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || order.user_id }),
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('Đã hủy yêu cầu đổi trả thành công!');
        setOrder((prev: any) => prev ? {
          ...prev,
          return_status: null,
          return_reason: null,
          return_target_size: null,
          return_target_color: null,
          return_images: null,
          return_note: null,
        } : prev);
        setShowReturnModal(false);
      } else {
        showToast(data?.message || 'Không thể hủy yêu cầu đổi trả');
      }
    } catch (e) {
      showToast('Lỗi khi hủy yêu cầu đổi trả');
    } finally {
      setIsCancelingReturn(false);
    }
  };

  const handleSubmitReturn = async () => {
    if (!order?.id) return;

    if ((returnReason === 'size' || returnReason === 'both') && !targetSize) {
      showToast('Vui lòng chọn size bạn muốn đổi sang');
      return;
    }

    if ((returnReason === 'color' || returnReason === 'both') && !targetColor) {
      showToast('Vui lòng chọn màu sắc bạn muốn đổi sang');
      return;
    }

    setIsSubmittingReturn(true);
    const reasonLabel = returnReason === 'size' 
      ? `Đổi sang size ${targetSize} (Mặc không vừa)`
      : returnReason === 'color'
      ? `Đổi sang màu ${targetColor}`
      : returnReason === 'both'
      ? `Đổi cả size ${targetSize} & màu ${targetColor}`
      : returnReason === 'defect'
      ? 'Lỗi sản xuất (Bung chỉ/hỏng khóa)'
      : returnReason === 'wrong'
      ? 'Giao sai mẫu / size so với đơn'
      : 'Trả hàng & hoàn tiền (Không đúng mô tả / không ưng ý)';

    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: reasonLabel,
          targetSize: (returnReason === 'size' || returnReason === 'both') ? targetSize : null,
          targetColor: (returnReason === 'color' || returnReason === 'both') ? targetColor : null,
          images: returnImages,
          note: returnNote.trim(),
          userId: user?.id || order.user_id,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data?.message || 'Đã gửi yêu cầu đổi trả thành công!');
        setOrder((prev: any) => prev ? { 
          ...prev, 
          return_status: 'Requested', 
          return_reason: reasonLabel,
          return_target_size: (returnReason === 'size' || returnReason === 'both') ? targetSize : null,
          return_target_color: (returnReason === 'color' || returnReason === 'both') ? targetColor : null,
          return_note: returnNote.trim() || null,
        } : prev);
      } else {
        showToast(data?.message || 'Không thể gửi yêu cầu đổi trả');
      }
    } catch (e) {
      showToast('Đã ghi nhận yêu cầu đổi trả!');
    } finally {
      setIsSubmittingReturn(false);
      setShowReturnModal(false);
    }
  };

  // Review states
  const [reviewedProductIds, setReviewedProductIds] = useState<string[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Record<string, any>>({});
  const [isEditingReview, setIsEditingReview] = useState(false);
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

  const handleOpenReviewModal = (item: OrderItem, isEdit: boolean = false) => {
    setReviewingItem(item);
    setIsEditingReview(isEdit);
    const existing = reviewsMap[String(item.product_id)];
    if (isEdit && existing) {
      setReviewRating(Number(existing.rating) || 5);
      setReviewComment(existing.comment || '');
    } else {
      setReviewRating(5);
      setReviewComment('');
    }
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
      const method = isEditingReview ? 'PUT' : 'POST';
      const payload = isEditingReview ? {
        userId: order?.user_id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      } : {
        userId: order?.user_id || null,
        userName: order?.customer_name || 'Khách hàng',
        rating: reviewRating,
        comment: reviewComment.trim(),
        orderId: order?.id,
        size: reviewingItem.size || 'M',
        color: colorName,
      };

      const res = await fetch(`${API_URL}/api/products/${reviewingItem.product_id}/reviews`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data && data.success) {
        showToast(isEditingReview ? 'Cập nhật đánh giá thành công!' : 'Cảm ơn bạn đã đánh giá sản phẩm!');
        if (!reviewedProductIds.includes(String(reviewingItem.product_id))) {
          setReviewedProductIds(prev => [...prev, String(reviewingItem.product_id)]);
        }
        setReviewsMap(prev => ({
          ...prev,
          [String(reviewingItem.product_id)]: data.data || { rating: reviewRating, comment: reviewComment.trim() }
        }));
        setShowReviewModal(false);
      } else {
        showToast(data?.message || 'Không thể gửi đánh giá');
      }
    } catch (e) {
      console.error('Lỗi gửi/sửa đánh giá đơn hàng:', e);
      showToast('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleConfirmReceipt = async () => {
    if (!order) return;
    setIsConfirmingReceipt(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/confirm-receipt`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || order.user_id })
      });
      const data = await res.json();
      if (data && data.success) {
        setOrder(prev => prev ? { ...prev, status: 'Completed' } : null);
        setShowConfirmReceiptModal(false);
        showToast('Đã hoàn tất đơn hàng! Bạn có thể đánh giá sản phẩm hoặc yêu cầu đổi trả.');
      } else {
        showToast(data?.message || 'Không thể xác nhận nhận hàng');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi xác nhận nhận hàng');
    } finally {
      setIsConfirmingReceipt(false);
    }
  };

  const handleSimulateBankPayment = async () => {
    if (!order || isSimulatingPayment) return;
    setIsSimulatingPayment(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/confirm-payment-transfer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data && data.success) {
        setOrder(prev => prev ? { ...prev, payment_status: 'paid_pending_verification' } : null);
        Alert.alert('Đã gửi xác nhận', 'Đã gửi thông báo chuyển khoản thành công tới cửa hàng! Shop sẽ kiểm tra đối soát sao kê và chuẩn bị hàng cho bạn ngay.');
      } else {
        Alert.alert('Thông báo', data.message || 'Không thể xác nhận thanh toán');
      }
    } catch (err) {
      console.error('Lỗi simulate payment:', err);
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ để xác nhận thanh toán');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // [Chức năng UI: "Hủy đơn hàng"] - Khách hàng tự hủy đơn khi đơn còn ở trạng thái Chờ xác nhận (Pending)
  const handleCancelOrder = async () => {
    if (!order) return;
    setIsCancelling(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/${order.id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cancelReason: 'Khách hàng yêu cầu hủy đơn',
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        setOrder({ ...order, status: 'Cancelled', cancel_reason: 'Khách hàng yêu cầu hủy đơn' });
        setShowCancelModal(false);
      } else {
        alert(data?.message || 'Không thể hủy đơn hàng');
      }
    } catch (e) {
      console.error('Lỗi hủy đơn:', e);
      alert('Có lỗi xảy ra khi gửi yêu cầu hủy đơn');
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
                if (revData.reviews) setReviewsMap(revData.reviews);
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

  // Shopee Mall / ThoiTrangHD 7-Day Free Return Policy
  const orderDate = order ? new Date(order.created_at) : new Date();
  const diffDays = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
  const returnDaysRemaining = Math.max(0, 7 - diffDays);
  const isReturnWindowValid = diffDays <= 7;
  const expiryDate = new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const expiryDateStr = `${expiryDate.getDate().toString().padStart(2, '0')}/${(expiryDate.getMonth() + 1).toString().padStart(2, '0')}/${expiryDate.getFullYear()}`;
  const isStep1Active = true;
  const isStep2Active = ['processing', 'shipping', 'completed'].includes(status);
  const isStep3Active = ['shipping', 'completed'].includes(status);
  const isStep4Active = status === 'completed';

  const getStatusText = (st?: string) => {
    switch ((st || '').toLowerCase()) {
      case 'pending':
        return 'Chờ xác nhận';
      case 'processing':
        return 'Đã xác nhận';
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

  const handlePrintInvoice = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Hoa_Don_${order?.order_code || order?.id || 'ThoiTrangHD'}</title>
            <style>
              @page { size: A4; margin: 15mm; }
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #1e293b; padding: 20px; max-width: 760px; margin: 0 auto; }
              .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 14px; margin-bottom: 14px; }
              .brand { font-size: 22px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 4px; }
              .subtitle { font-size: 13px; color: #64748b; margin-bottom: 4px; }
              .title { font-size: 18px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-top: 12px; }
              .meta { font-size: 13px; color: #475569; margin-top: 4px; }
              .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px; line-height: 1.6; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
              th { background: #f1f5f9; text-align: left; padding: 10px 8px; font-size: 12px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
              td { padding: 9px 8px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
              .total-table { width: 100%; margin-top: 10px; border-top: 2px dashed #94a3b8; padding-top: 8px; }
              .total-table td { padding: 4px 8px; border-bottom: none; font-size: 13px; }
              .grand-total { font-size: 16px; font-weight: 800; color: #0f172a; }
              .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 12px; line-height: 1.5; }
              .signatures { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; font-size: 13px; }
              .sig-col { width: 45%; }
              .sig-line { margin-top: 45px; font-weight: 700; color: #0f172a; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">THỜI TRANG HD - THOITRANGHD.VN</div>
              <div class="subtitle">Thương hiệu thời trang nam nữ cao cấp & hiện đại</div>
              <div class="subtitle">Địa chỉ: 123 Cầu Giấy, Hà Nội • Hotline: 0912.345.678</div>
              <div class="title">HÓA ĐƠN MUA HÀNG & PHIẾU GIAO NHẬN</div>
              <div class="meta">Mã HĐ: <b>#HD-${order?.order_code || order?.id}</b> | Mã vận đơn: <b>SPX-${order?.order_code || order?.id}</b></div>
              <div class="meta">Thời gian đặt: ${order?.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '---'}</div>
            </div>
            <div class="info-box">
              <div><b>Khách hàng:</b> ${order?.customer_name || 'Khách mua hàng'}</div>
              <div><b>Số điện thoại:</b> ${order?.customer_phone || '---'}</div>
              <div><b>Địa chỉ giao hàng:</b> ${order?.customer_address || '---'}</div>
              <div><b>Phương thức thanh toán:</b> ${['bank', 'banking', 'vietqr'].includes((order?.payment_method || '').toLowerCase()) ? 'Chuyển khoản VietQR 24/7' : 'Thanh toán tiền mặt khi nhận hàng (COD)'}</div>
              ${order?.order_note ? `<div><b>Ghi chú đơn hàng:</b> ${order.order_note}</div>` : ''}
            </div>
            <table>
              <thead>
                <tr>
                  <th style="width: 35px; text-align: center;">STT</th>
                  <th>Tên sản phẩm</th>
                  <th style="width: 100px; text-align: center;">Phân loại</th>
                  <th style="width: 45px; text-align: center;">SL</th>
                  <th style="width: 100px; text-align: right;">Đơn giá</th>
                  <th style="width: 110px; text-align: right;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, idx) => `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><b>${item.product_name}</b></td>
                    <td style="text-align: center;">Size: ${item.size || 'M'}, ${getColorName(item.color)}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${formatVND(item.price)}</td>
                    <td style="text-align: right;"><b>${formatVND(Number(item.price) * Number(item.quantity))}</b></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <table class="total-table">
              <tr>
                <td style="text-align: right;">Tạm tính:</td>
                <td style="text-align: right; width: 140px;"><b>${formatVND(subtotal)}</b></td>
              </tr>
              <tr>
                <td style="text-align: right;">Phí vận chuyển:</td>
                <td style="text-align: right;">${order?.shipping_fee && Number(order.shipping_fee) > 0 ? formatVND(Number(order.shipping_fee)) : 'Miễn phí'}</td>
              </tr>
              ${discountAmount > 0 ? `
                <tr>
                  <td style="text-align: right; color: #b45309;">Giảm giá voucher:</td>
                  <td style="text-align: right; color: #b45309;">-<b>${formatVND(discountAmount)}</b></td>
                </tr>
              ` : ''}
              <tr>
                <td style="text-align: right;" class="grand-total">TỔNG THANH TOÁN:</td>
                <td style="text-align: right;" class="grand-total">${formatVND(totalPrice)}</td>
              </tr>
            </table>
            <div class="signatures">
              <div class="sig-col">
                <div><b>Đại diện ThoiTrangHD</b></div>
                <div style="font-size: 11px; color: #64748b;">(Ký & đóng dấu số)</div>
                <div class="sig-line">ĐÃ XÁC THỰC</div>
              </div>
              <div class="sig-col">
                <div><b>Khách hàng nhận hàng</b></div>
                <div style="font-size: 11px; color: #64748b;">(Đồng kiểm khi nhận)</div>
                <div class="sig-line">${order?.customer_name || 'Khách hàng'}</div>
              </div>
            </div>
            <div class="footer">
              <p>💡 Quý khách có quyền kiểm tra hàng trước khi thanh toán. ThoiTrangHD hỗ trợ đổi size / mẫu miễn phí trong 7 ngày.</p>
              <p>Hotline CSKH: <b>0912.345.678</b> • Website: <b>thoitranghd.vn</b></p>
            </div>
            <script>
              window.onload = function() {
                window.print();
              };
            </script>
          </body>
          </html>
        `);
        printWindow.document.close();
      }
    } else {
      Alert.alert(
        'Hóa đơn điện tử ThoiTrangHD',
        `Hóa đơn #${order?.order_code || order?.id} đã sẵn sàng. Bạn có thể chụp màn hình phiếu này để lưu trữ hoặc đối chiếu khi nhận hàng.`
      );
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Text style={styles.headerSubtitleWeb}>Mã đơn: #{order?.order_code || id || '---'}</Text>
              {order && (
                <TouchableOpacity 
                  style={styles.printHeaderBtnWeb}
                  onPress={() => setShowInvoiceModal(true)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="printer" size={16} color="#0f172a" />
                  <Text style={styles.printHeaderBtnText}>In hóa đơn</Text>
                </TouchableOpacity>
              )}
            </View>
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
          {order ? (
            <TouchableOpacity 
              style={{ padding: 8, marginRight: -4 }} 
              onPress={() => setShowInvoiceModal(true)}
              activeOpacity={0.7}
            >
              <IconSymbol name="printer" size={22} color="#0f172a" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
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
          
          <View style={[styles.mainLayout, isLargeScreen && { flexDirection: 'row', gap: 24 }]}>
            
            <View style={[styles.leftCol, isLargeScreen && { flex: 2, width: undefined, gap: 32 }]}>
              
              {/* Status Tracker */}
              <View style={[styles.section, isMobile && { padding: 14 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <Text style={{ fontSize: isMobile ? 16 : 18, fontWeight: '700', color: '#000000', flexShrink: 1 }}>Trạng thái đơn hàng</Text>
                  <View style={{ backgroundColor: '#e8e8e8', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, flexShrink: 0 }}>
                    <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#000000' }}>
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

                {/* Thông báo tiếp nhận đơn hàng khi mới đặt (Pending) giúp UI đầy đặn, an tâm, không bị trống trơn */}
                {status === 'pending' && (
                  <View style={{
                    backgroundColor: '#fffbeb',
                    borderColor: '#fef3c7',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <IconSymbol name="hourglass" size={16} color="#d97706" />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309', letterSpacing: 0.3 }}>
                        ĐƠN HÀNG ĐÃ ĐƯỢC TIẾP NHẬN
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12.5, color: '#475569', lineHeight: 18 }}>
                      Hệ thống đã tiếp nhận đơn hàng của bạn. Cửa hàng ThoiTrangHD sẽ sớm liên hệ xác nhận đơn và tiến hành đóng gói giao hàng.
                    </Text>
                    <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#fef3c7', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 11.5, color: '#92400e', fontWeight: '600' }}>
                        {order.payment_method === 'cod' || !order.payment_method
                          ? '💵 Hình thức COD: Thanh toán tiền mặt khi shipper phát hàng tận nơi.'
                          : '💳 Chuyển khoản: Shop duyệt đơn ngay sau khi nhận được sao kê VietQR.'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Chi tiết tiến trình giao hàng trực quan khi đang giao */}
                {['processing', 'shipping'].includes(status) && (
                  <View style={{
                    backgroundColor: '#f8fafc',
                    borderColor: '#e2e8f0',
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 14,
                    marginTop: 14,
                  }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        <IconSymbol name="car.fill" size={16} color="#0284c7" />
                        <Text numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 12, fontWeight: '800', color: '#0f172a' }}>TIẾN TRÌNH VẬN CHUYỂN</Text>
                      </View>
                      <View style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, borderWidth: 1, borderColor: '#bae6fd', flexShrink: 0 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369a1' }}>
                          {getShippingSubStatus(order.created_at).shortLabel}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#f1f5f9' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284c7', marginBottom: 4 }}>
                        {getShippingSubStatus(order.created_at).badge}
                      </Text>
                      <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}>
                        {getShippingSubStatus(order.created_at).statusText}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: '#16a34a', fontWeight: '600', marginTop: 6 }}>
                        🛵 {getShippingSubStatus(order.created_at).shipperNote}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Delivery Info */}
              <View style={[styles.section, styles.deliverySection, isLargeScreen && { flexDirection: 'row' }, isMobile && { padding: 14 }]}>
                <View style={styles.deliveryCol}>
                  <View style={styles.deliveryHeader}>
                    <IconSymbol name="mappin.and.ellipse" size={20} color="#747878" />
                    <Text style={[styles.deliveryTitle, isMobile && { fontSize: 17 }]}>Địa chỉ nhận hàng</Text>
                  </View>
                  <Text style={styles.deliveryTextBold}>{order.customer_name || 'Khách hàng'}</Text>
                  <Text style={styles.deliveryText}>{order.customer_phone || 'Chưa cung cấp số điện thoại'}</Text>
                  <Text style={styles.deliveryText}>{order.customer_address || 'Địa chỉ nhận hàng'}</Text>
                </View>
                
                {isLargeScreen && <View style={styles.deliveryDivider} />}
                
                <View style={styles.deliveryCol}>
                  <View style={styles.deliveryHeader}>
                    <IconSymbol name="car" size={20} color="#747878" />
                    <Text style={[styles.deliveryTitle, isMobile && { fontSize: 17 }]}>Thông tin vận chuyển</Text>
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

              {/* ThoiTrangHD 7-Day Free Return Policy Banner */}
              {(status === 'completed' || order.return_status) && (
                <View style={styles.policyCard}>
                  <View style={styles.policyHeader}>
                    <View style={styles.policyIconCircle}>
                      <IconSymbol name="shield.checkmark" size={20} color="#111827" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                        <Text style={styles.policyTitle}>Chính sách Đổi trả ThoiTrangHD</Text>
                        {order.return_status ? (
                          <View style={[
                            styles.policyBadge,
                            order.return_status === 'Approved' ? styles.badgeSuccess : order.return_status === 'Rejected' ? styles.badgeDanger : styles.badgeWarning
                          ]}>
                            <Text style={[
                              styles.policyBadgeText,
                              order.return_status === 'Approved' ? styles.badgeSuccessText : order.return_status === 'Rejected' ? styles.badgeDangerText : styles.badgeWarningText
                            ]}>
                              {order.return_status === 'Requested' ? '⏳ Đang xử lý đổi trả' : order.return_status === 'Approved' ? '✅ Đã duyệt đổi trả' : '❌ Từ chối đổi trả'}
                            </Text>
                          </View>
                        ) : isReturnWindowValid ? (
                          <View style={[styles.policyBadge, styles.badgeActive]}>
                            <Text style={styles.policyBadgeActiveText}>Còn {returnDaysRemaining} ngày đổi trả miễn phí</Text>
                          </View>
                        ) : (
                          <View style={[styles.policyBadge, styles.badgeExpired]}>
                            <Text style={styles.policyBadgeExpiredText}>Hết hạn đổi trả (Quá 7 ngày)</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.policyDesc}>
                        {isReturnWindowValid 
                          ? `Miễn phí đổi trả trong 7 ngày (hạn đến ${expiryDateStr}). Bạn không bắt buộc phải bấm nhận ngay, có thể dùng thử đồ. Sau 7 ngày đơn sẽ tự động hoàn tất và đóng quyền khiếu nại đổi trả.`
                          : 'Đơn hàng đã qua thời hạn 7 ngày thử đồ và đổi trả miễn phí theo chính sách thương hiệu.'
                        }
                      </Text>
                    </View>
                  </View>

                  {order.return_status && (
                    <View style={styles.returnStatusDetailBox}>
                      <Text style={styles.returnStatusDetailTitle}>📦 Thông tin yêu cầu đổi trả bảo hành:</Text>
                      <Text style={styles.returnStatusDetailText}>• Lý do: {order.return_reason || 'Đổi trả hàng'}</Text>
                      {order.return_target_size ? <Text style={styles.returnStatusDetailText}>• Đổi sang size: <Text style={{ fontWeight: '700', color: '#111827' }}>{order.return_target_size}</Text></Text> : null}
                      {order.return_target_color ? <Text style={styles.returnStatusDetailText}>• Đổi sang màu: <Text style={{ fontWeight: '700', color: '#111827' }}>{getColorName(order.return_target_color)}</Text></Text> : null}
                      {order.return_note ? <Text style={styles.returnStatusDetailText}>• Ghi chú khách gửi: {order.return_note}</Text> : null}
                      <Text style={styles.returnStatusDetailNotice}>
                        {order.return_status === 'Requested' 
                          ? '⏳ CSKH ThoiTrangHD đang liên hệ điều phối shipper thu hồi & giao đổi tận nhà cho bạn trong 24h.' 
                          : order.return_status === 'Approved' 
                          ? '✅ Yêu cầu đổi trả đã được chấp thuận! Shipper đang trên đường đến giao đổi sản phẩm.' 
                          : '❌ Yêu cầu không được phê duyệt. Vui lòng liên hệ hotline 0912.345.678 để được giải đáp.'}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Items */}
              <View style={[styles.section, isMobile && { padding: 14 }]}>
                <Text style={[styles.sectionTitle, isMobile && { fontSize: 17, marginBottom: 12 }]}>Sản phẩm ({items.length})</Text>
                <View style={[styles.itemsList, isMobile && { gap: 12 }]}>
                  {items.map((item, index) => (
                    <View key={item.id || index} style={[
                      styles.orderItemCard,
                      isMobile && { padding: 12 },
                      status !== 'completed' && { paddingBottom: 12 }
                    ]}>
                      <View style={styles.orderItemMain}>
                        <Image 
                          source={getImageSource(item.image)} 
                          style={[styles.itemImage, isMobile && { width: 76, height: 76, borderRadius: 8 }]} 
                          contentFit="cover" 
                        />
                        <View style={styles.itemDetails}>
                          <Text style={[styles.itemName, isMobile && { fontSize: 14, lineHeight: 19 }]} numberOfLines={2}>{item.product_name}</Text>
                          <Text style={[styles.itemVariant, isMobile && { fontSize: 12.5, marginBottom: 4 }]}>
                            Size: {item.size || 'M'} | Màu: {getColorName(item.color)}
                          </Text>
                          <View style={styles.itemFooter}>
                            <Text style={[styles.itemPrice, isMobile && { fontSize: 16, fontWeight: '700' }]}>{formatVND(item.price)}</Text>
                            <Text style={styles.itemQty}>x{item.quantity}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Prominent Action Buttons for this Product Item */}
                      {status === 'completed' && (
                        <View style={[styles.itemBottomActions, isMobile && { marginTop: 10, paddingTop: 10, gap: 8 }]}>
                          {reviewedProductIds.includes(String(item.product_id)) ? (
                            <TouchableOpacity
                              style={[styles.itemEditReviewBtn, isMobile && { paddingHorizontal: 12, paddingVertical: 8 }]}
                              onPress={() => handleOpenReviewModal(item, true)}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="pencil" size={14} color="#b45309" />
                              <Text style={[styles.itemEditReviewText, isMobile && { fontSize: 12 }]}>Sửa đánh giá</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.itemReviewBtn, isMobile && { paddingHorizontal: 14, paddingVertical: 8 }]}
                              onPress={() => handleOpenReviewModal(item)}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="star.fill" size={14} color="#f59e0b" />
                              <Text style={[styles.itemReviewBtnText, isMobile && { fontSize: 12 }]}>Đánh giá sản phẩm</Text>
                            </TouchableOpacity>
                          )}

                          {isReturnWindowValid && (!order.return_status || order.return_status === 'Rejected') && (
                            <TouchableOpacity
                              style={[styles.itemReturnBtn, isMobile && { paddingHorizontal: 14, paddingVertical: 8 }]}
                              onPress={() => handleOpenReturnModal(item)}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="arrow.2.squarepath" size={14} color="#111827" />
                              <Text style={[styles.itemReturnBtnText, isMobile && { fontSize: 12 }]}>Yêu cầu Đổi size / Đổi trả</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              </View>

            </View>

            {/* Right Column */}
            <View style={[styles.rightCol, isLargeScreen && { flex: 1, width: undefined }]}>
              <View style={[styles.summarySection, isMobile && { padding: 14 }]}>
                <Text style={[styles.sectionTitle, isMobile && { fontSize: 17, marginBottom: 14 }]}>Thanh toán</Text>
                
                <View style={styles.paymentMethodBox}>
                  <IconSymbol 
                    name={['bank', 'banking', 'vietqr'].includes((order.payment_method || '').toLowerCase()) ? 'qrcode' : 'banknote'} 
                    size={24} 
                    color="#000000" 
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentMethodText}>
                      {['bank', 'banking', 'vietqr'].includes((order.payment_method || '').toLowerCase()) ? 'Chuyển khoản VietQR 24/7' : 'Thanh toán khi nhận hàng (COD)'}
                    </Text>
                    <Text style={styles.paymentMethodSub}>
                      {['bank', 'banking', 'vietqr'].includes((order.payment_method || '').toLowerCase()) 
                        ? (order.status === 'Pending' ? 'Chờ thanh toán (Quét mã để chuyển)' : 'Đã thanh toán chuyển khoản') 
                        : 'Thanh toán tiền mặt cho shipper'}
                    </Text>
                  </View>
                </View>

                {/* Show QR code if Pending Bank Transfer */}
                {['bank', 'banking', 'vietqr'].includes((order.payment_method || '').toLowerCase()) && order.status === 'Pending' && (
                  <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#b45309', marginBottom: 6 }}>
                      📲 Quét mã VietQR để thanh toán:
                    </Text>
                    <View style={{ alignItems: 'center', backgroundColor: '#ffffff', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8 }}>
                      <Image 
                        source={{ uri: `https://img.vietqr.io/image/MB-0988776655-compact2.png?amount=${totalPrice}&addInfo=${encodeURIComponent(order.order_code)}&accountName=THOI%20TRANG%20HD` }} 
                        style={{ width: isMobile ? 150 : 180, height: isMobile ? 150 : 180 }} 
                        contentFit="contain"
                      />
                    </View>
                    <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
                      • Ngân hàng: <Text style={{ fontWeight: '700' }}>MB Bank (Quân Đội)</Text>{'\n'}
                      • Số tài khoản: <Text style={{ fontWeight: '700' }}>0988776655</Text>{'\n'}
                      • Chủ TK: <Text style={{ fontWeight: '700' }}>CÔNG TY THỜI TRANG HD</Text>{'\n'}
                      • Nội dung: <Text style={{ fontWeight: '700', color: '#b45309' }}>{order.order_code}</Text>
                    </Text>

                    {/* Customer Bank Transfer Confirmation Section */}
                    {order.payment_status === 'paid_pending_verification' ? (
                      <View style={{
                        backgroundColor: '#f5f3ff',
                        borderColor: '#ddd6fe',
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 14,
                        marginTop: 12,
                        alignItems: 'center',
                      }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <IconSymbol name="clock.arrow.circlepath" size={18} color="#7c3aed" />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#6d28d9' }}>
                            Đã gửi xác nhận chuyển khoản
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: '#5b21b6', textAlign: 'center', lineHeight: 17 }}>
                          Hệ thống đã ghi nhận thông báo của bạn. Cửa hàng đang đối soát số dư ngân hàng và sẽ duyệt đơn hàng ngay khi nhận được tiền!
                        </Text>
                      </View>
                    ) : (
                      <>
                        {order.payment_status === 'unpaid' && (
                          <View style={{
                            backgroundColor: '#fff1f2',
                            borderColor: '#fecdd3',
                            borderWidth: 1,
                            borderRadius: 10,
                            padding: 12,
                            marginTop: 10,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <IconSymbol name="exclamationmark.triangle.fill" size={18} color="#e11d48" />
                            <Text style={{ fontSize: 12, color: '#be123c', flex: 1, lineHeight: 17 }}>
                              Cửa hàng kiểm tra chưa nhận được thanh toán trong tài khoản. Bạn vui lòng kiểm tra lại giao dịch ngân hàng và bấm xác nhận lại khi đã hoàn tất chuyển tiền nhé!
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          style={{
                            backgroundColor: '#16a34a',
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            borderRadius: 10,
                            marginTop: 12,
                            shadowColor: '#16a34a',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.2,
                            shadowRadius: 4,
                            elevation: 2,
                          }}
                          onPress={handleSimulateBankPayment}
                          disabled={isSimulatingPayment}
                          activeOpacity={0.8}
                        >
                          {isSimulatingPayment ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <IconSymbol name="checkmark.circle.fill" size={17} color="#ffffff" />
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>
                                Tôi đã chuyển khoản thành công
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <Text style={{ fontSize: 11, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                          💡 Sau khi hoàn tất chuyển tiền qua ứng dụng ngân hàng, bạn bấm nút trên để thông báo cho Shop duyệt đơn.
                        </Text>
                      </>
                    )}
                  </View>
                )}

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

                <View style={styles.actionButtonsStack}>
                  {/* 1. NÚT ĐÃ NHẬN ĐƯỢC HÀNG (Chỉ hiển thị khi đơn hàng ĐANG GIAO) */}
                  {status === 'shipping' && (!order.return_status || order.return_status === 'Rejected') && (
                    <TouchableOpacity 
                      style={styles.confirmReceiptBtn}
                      onPress={() => setShowConfirmReceiptModal(true)}
                      activeOpacity={0.85}
                    >
                      <IconSymbol name="checkmark.seal" size={18} color="#ffffff" />
                      <Text style={styles.confirmReceiptBtnText}>ĐÃ NHẬN ĐƯỢC HÀNG</Text>
                    </TouchableOpacity>
                  )}

                  {/* 2. NÚT YÊU CẦU ĐỔI TRẢ HÀNG (Chỉ hiển thị khi đơn hàng ĐÃ GIAO THÀNH CÔNG trong 7 ngày) */}
                  {status === 'completed' && (
                    order.return_status ? (
                      <TouchableOpacity 
                        style={[
                          styles.returnStatusBtn,
                          order.return_status === 'Approved' ? styles.returnStatusBtnApproved : order.return_status === 'Rejected' ? styles.returnStatusBtnRejected : styles.returnStatusBtnRequested
                        ]}
                        onPress={() => handleOpenReturnModal(items[0])}
                        activeOpacity={0.85}
                      >
                        <IconSymbol 
                          name="arrow.2.squarepath" 
                          size={16} 
                          color={order.return_status === 'Approved' ? '#15803d' : order.return_status === 'Rejected' ? '#b91c1c' : '#b45309'} 
                        />
                        <Text style={[
                          styles.returnStatusBtnText,
                          { color: order.return_status === 'Approved' ? '#15803d' : order.return_status === 'Rejected' ? '#b91c1c' : '#b45309' }
                        ]}>
                          {order.return_status === 'Requested' ? 'ĐANG XỬ LÝ ĐỔI TRẢ (Xem lại)' : order.return_status === 'Approved' ? 'ĐÃ DUYỆT ĐỔI TRẢ' : 'TỪ CHỐI ĐỔI TRẢ'}
                        </Text>
                      </TouchableOpacity>
                    ) : isReturnWindowValid ? (
                      <TouchableOpacity 
                        style={styles.requestReturnBtn}
                        onPress={() => handleOpenReturnModal(items[0])}
                        activeOpacity={0.85}
                      >
                        <IconSymbol name="arrow.2.squarepath" size={16} color="#111827" />
                        <Text style={styles.requestReturnBtnText}>YÊU CẦU ĐỔI TRẢ HÀNG</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.expiredReturnBadge}>
                        <Text style={styles.expiredReturnText}>⏱️ Hết hạn đổi trả (Quá 7 ngày)</Text>
                      </View>
                    )
                  )}

                  {/* 3. NÚT HỦY ĐƠN HÀNG (khi Pending) */}
                  {status === 'pending' && (
                    <TouchableOpacity 
                      style={styles.cancelOrderBtn}
                      onPress={() => setShowCancelModal(true)}
                    >
                      <Text style={styles.cancelOrderBtnText}>HỦY ĐƠN HÀNG NÀY</Text>
                    </TouchableOpacity>
                  )}

                  {/* NÚT IN HÓA ĐƠN BÁN HÀNG */}
                  <TouchableOpacity 
                    style={styles.printInvoiceActionBtn}
                    onPress={() => setShowInvoiceModal(true)}
                    activeOpacity={0.85}
                  >
                    <IconSymbol name="printer" size={17} color="#0f172a" />
                    <Text style={styles.printInvoiceActionBtnText}>IN HÓA ĐƠN</Text>
                  </TouchableOpacity>

                  {/* 4. NÚT TIẾP TỤC MUA SẮM */}
                  <TouchableOpacity 
                    style={styles.reviewBtn}
                    onPress={() => router.push('/products')}
                    activeOpacity={0.85}
                  >
                    <IconSymbol name="bag" size={16} color="#ffffff" />
                    <Text style={styles.reviewBtnText}>TIẾP TỤC MUA SẮM</Text>
                  </TouchableOpacity>
                  
                  {/* 5. NÚT QUAY LẠI ĐƠN HÀNG */}
                  <TouchableOpacity 
                    style={styles.reorderBtn}
                    onPress={() => router.push('/orders')}
                    activeOpacity={0.85}
                  >
                    <IconSymbol name="arrow.left" size={16} color="#111827" />
                    <Text style={styles.reorderBtnText}>QUAY LẠI ĐƠN HÀNG</Text>
                  </TouchableOpacity>
                </View>
                
              </View>
            </View>

          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* Confirm Receipt Modal */}
      <ConfirmModal
        visible={showConfirmReceiptModal}
        title="Xác nhận nhận hàng"
        message="Bạn xác nhận đã nhận được gói hàng đầy đủ và muốn hoàn tất đơn hàng? Lưu ý: Bạn vẫn được bảo vệ quyền Đổi trả / Hoàn tiền miễn phí trong 7 ngày theo chính sách ThoiTrangHD Mall."
        confirmText="ĐÃ NHẬN ĐỦ HÀNG"
        cancelText="CHƯA NHẬN"
        onConfirm={handleConfirmReceipt}
        onCancel={() => setShowConfirmReceiptModal(false)}
      />

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

      
      {/* Return & Warranty Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showReturnModal}
        onRequestClose={() => setShowReturnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setShowReturnModal(false)} 
          />
          <View style={styles.reviewModalCard}>
            <View style={styles.reviewModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={[styles.returnPolicyIconBadge, { backgroundColor: '#fffbeb' }]}>
                  <IconSymbol name="tag" size={14} color="#b78103" />
                </View>
                <Text style={styles.reviewModalTitle}>
                  {order?.return_status === 'Requested' ? 'Cập nhật yêu cầu Đổi trả & Bảo hành' : 'Yêu cầu Đổi trả & Bảo hành'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReturnModal(false)}
                style={styles.reviewModalClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="xmark" size={20} color="#1a1c1c" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.reviewModalBody} 
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
            >
              {returnItem && (
                <View style={styles.reviewItemBrief}>
                  <Image source={getImageSource(returnItem.image)} style={styles.reviewItemThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewItemName} numberOfLines={1}>{returnItem.product_name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={styles.reviewItemMeta}>
                        Đang mua: Size <Text style={{ fontWeight: '700', color: '#111827' }}>{returnItem.size || 'M'}</Text> | Màu: <Text style={{ fontWeight: '700', color: '#111827' }}>{getColorName(returnItem.color)}</Text>
                      </Text>
                      <View style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: returnItem.color?.startsWith('#') ? returnItem.color : '#000000',
                        borderWidth: 1,
                        borderColor: '#d1d5db'
                      }} />
                    </View>
                  </View>
                </View>
              )}

              {/* Reasons */}
              <Text style={styles.formGroupLabel}>LÝ DO ĐỔI TRẢ / BẢO HÀNH:</Text>
              <View style={{ gap: 8, marginBottom: 14 }}>
                {[
                  { key: 'size', label: 'Mặc không vừa (Chỉ đổi sang size khác)', icon: '📏' },
                  { key: 'color', label: 'Muốn đổi sang màu sắc khác (Giữ nguyên size)', icon: '🎨' },
                  { key: 'both', label: 'Đổi cả kích thước (size) & màu sắc mới', icon: '🔄' },
                  { key: 'defect', label: 'Lỗi sản xuất (Bung chỉ, hỏng khóa kéo, lỗi vải)', icon: '🧵' },
                  { key: 'wrong', label: 'Shop giao sai mẫu / sai size so với đơn', icon: '📦' },
                  { key: 'refund', label: 'Trả hàng & hoàn tiền (Không đúng mô tả / không ưng ý)', icon: '💰' },
                ].map((r) => {
                  const isActive = returnReason === r.key;
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[styles.returnReasonChip, isActive && styles.returnReasonChipActive]}
                      onPress={() => setReturnReason(r.key as any)}
                    >
                      <Text style={{ fontSize: 14 }}>{r.icon}</Text>
                      <Text style={[styles.returnReasonChipText, isActive && styles.returnReasonChipTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Banner hướng dẫn khi đổi cả size và màu */}
              {returnReason === 'both' && (
                <View style={{ backgroundColor: '#fefce8', borderWidth: 1, borderColor: '#fef08a', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                  <Text style={{ fontSize: 12.5, color: '#854d0e', fontWeight: '700' }}>
                    🔄 Bạn đang chọn đổi cả Kích thước (Size) và Màu sắc mới:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 12, color: '#a16207' }}>
                      • Size muốn đổi: <Text style={{ fontWeight: '700', color: targetSize ? '#0f172a' : '#dc2626' }}>{targetSize || '(Chưa chọn size)'}</Text>
                    </Text>
                    <Text style={{ fontSize: 12, color: '#a16207' }}>
                      • Màu muốn đổi: <Text style={{ fontWeight: '700', color: targetColor ? '#0f172a' : '#dc2626' }}>{targetColor || '(Chưa chọn màu)'}</Text>
                    </Text>
                  </View>
                </View>
              )}

              {/* Target Size selector synchronized with specific product variants */}
              {(returnReason === 'size' || returnReason === 'both') && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.formGroupLabel}>CHỌN SIZE BẠN MUỐN ĐỔI SANG:</Text>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                      Size hiện có của sản phẩm
                    </Text>
                  </View>
                  
                  {isLoadingVariants ? (
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#111827" />
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Đang tải danh sách size...</Text>
                    </View>
                  ) : (
                    <View style={styles.sizeRowContainer}>
                      {availableSizes.map((sz) => {
                        const isSel = targetSize === sz;
                        const isCurrent = returnItem?.size === sz;
                        return (
                          <TouchableOpacity
                            key={sz}
                            style={[
                              styles.sizeOptionChip,
                              isSel && styles.sizeOptionChipActive,
                            ]}
                            onPress={() => setTargetSize(sz)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.sizeOptionChipText, isSel && styles.sizeOptionChipTextActive]}>
                              {sz}
                            </Text>
                            {isCurrent && (
                              <Text style={styles.currentBadgeText}>(Đang mua)</Text>
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Target Color selector synchronized with specific product variants */}
              {(returnReason === 'color' || returnReason === 'both') && (
                <View style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={styles.formGroupLabel}>CHỌN MÀU SẮC BẠN MUỐN ĐỔI SANG:</Text>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                      Bảng màu của sản phẩm
                    </Text>
                  </View>
                  
                  {isLoadingVariants ? (
                    <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color="#111827" />
                      <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Đang tải bảng màu...</Text>
                    </View>
                  ) : (
                    <View style={styles.colorGridContainer}>
                      {availableColors.map((c) => {
                        const isSel = targetColor === c.name;
                        const isCurrent = returnItem?.color === c.name || returnItem?.color === c.hex;
                        return (
                          <TouchableOpacity
                            key={c.name}
                            style={[styles.colorOptionChip, isSel && styles.colorOptionChipActive]}
                            onPress={() => setTargetColor(c.name)}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.colorSwatchDot, { backgroundColor: c.hex }]} />
                            <Text style={[styles.colorOptionChipText, isSel && styles.colorOptionChipTextActive]}>
                              {c.name}
                            </Text>
                            {isCurrent && (
                              <Text style={styles.currentBadgeText}>(Đang mua)</Text>
                            )}
                            {isSel && !isCurrent && (
                              <IconSymbol name="checkmark" size={14} color="#b45309" />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Image Evidence Upload (Optional) */}
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.formGroupLabel}>ẢNH MINH CHỨNG (TÙY CHỌN):</Text>
                  <Text style={{ fontSize: 11, color: '#6b7280' }}>Tối đa 3 ảnh</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 8, lineHeight: 16 }}>
                  Chụp tem mác hoặc chi tiết cần đổi (Bạn có thể gửi kèm hoặc không, phiếu đổi trả vẫn được tiếp nhận).
                </Text>

                <View style={styles.imagePickerRow}>
                  {returnImages.map((uri, idx) => (
                    <View key={idx} style={styles.returnImageThumbBox}>
                      <Image source={getImageSource(uri)} style={styles.returnImageThumb} contentFit="cover" />
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => handleRemoveReturnImage(idx)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <IconSymbol name="xmark" size={12} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {returnImages.length < 3 && (
                    <TouchableOpacity
                      style={styles.addReturnImageBtn}
                      onPress={handlePickReturnImage}
                      disabled={isUploadingImage}
                      activeOpacity={0.8}
                    >
                      {isUploadingImage ? (
                        <ActivityIndicator size="small" color="#111827" />
                      ) : (
                        <>
                          <IconSymbol name="camera.fill" size={20} color="#4b5563" />
                          <Text style={styles.addReturnImageText}>+ Tải ảnh</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Detail note */}
              <Text style={styles.formGroupLabel}>MÔ TẢ CHI TIẾT / GHI CHÚ CHO SHOP:</Text>
              <TextInput
                style={styles.returnNoteInput}
                placeholder="VD: Áo hơi chật ngực muốn đổi lên size L, hoặc đường may dưới nách bị bung..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                value={returnNote}
                onChangeText={setReturnNote}
              />

              {/* Transparency Notice */}
              <View style={styles.modalNoticeBox}>
                <Text style={styles.modalNoticeTitle}>📋 QUY ĐỊNH & CƯỚC VẬN CHUYỂN:</Text>
                <Text style={styles.modalNoticeText}>
                  • Lỗi sản xuất hoặc giao sai: Shop chịu 100% phí ship 2 chiều. Shipper đến tận nhà thu hồi và giao hàng mới.
                </Text>
                <Text style={styles.modalNoticeText}>
                  • Đổi size theo ý khách: Sản phẩm còn nguyên tem mác, khách hỗ trợ cước vận chuyển phát sinh.
                </Text>
                <Text style={styles.modalNoticeText}>
                  • Hotline / Zalo tiếp nhận Video mở hộp (Unboxing): 0912.345.678.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.reviewModalFooter}>
              {order?.return_status === 'Requested' ? (
                <TouchableOpacity
                  style={[styles.cancelReviewBtn, { borderColor: '#ef4444', backgroundColor: '#fef2f2' }]}
                  onPress={handleCancelReturn}
                  disabled={isSubmittingReturn || isCancelingReturn}
                >
                  {isCancelingReturn ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Text style={[styles.cancelReviewText, { color: '#ef4444', fontWeight: '700' }]}>HỦY YÊU CẦU</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.cancelReviewBtn}
                  onPress={() => setShowReturnModal(false)}
                  disabled={isSubmittingReturn}
                >
                  <Text style={styles.cancelReviewText}>Đóng</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.submitReviewBtn, { backgroundColor: '#b78103' }, (isSubmittingReturn || isCancelingReturn) && { opacity: 0.7 }]}
                onPress={handleSubmitReturn}
                disabled={isSubmittingReturn || isCancelingReturn}
              >
                {isSubmittingReturn ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitReviewText}>
                    {order?.return_status === 'Requested' ? 'LƯU THAY ĐỔI' : 'XÁC NHẬN GỬI YÊU CẦU'}
                  </Text>
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
              <Text style={styles.reviewModalTitle}>{isEditingReview ? 'Chỉnh sửa đánh giá của bạn' : 'Đánh giá sản phẩm đã mua'}</Text>
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
                  <Text style={styles.submitReviewText}>{isEditingReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sales Invoice Modal (Hóa đơn bán hàng kiêm phiếu xuất kho) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showInvoiceModal}
        onRequestClose={() => setShowInvoiceModal(false)}
      >
        <View style={styles.invoiceModalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFillObject} 
            activeOpacity={1} 
            onPress={() => setShowInvoiceModal(false)} 
          />
          <View style={styles.invoiceCard}>
            {/* Modal Top Action Bar */}
            <View style={styles.invoiceTopBar}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <IconSymbol name="printer" size={20} color="#0f172a" />
                <Text style={styles.invoiceTopBarTitle}>Hóa đơn mua hàng</Text>
              </View>
              <TouchableOpacity 
                style={styles.invoiceCloseBtn}
                onPress={() => setShowInvoiceModal(false)}
              >
                <IconSymbol name="xmark" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Receipt Body */}
            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.invoiceScrollBody}
            >
              {/* Receipt Paper Header */}
              <View style={styles.receiptHeader}>
                <View style={styles.receiptBrandRow}>
                  <Text style={styles.receiptBrandName}>THỜI TRANG HD</Text>
                  <View style={styles.receiptOfficialBadge}>
                    <Text style={styles.receiptOfficialBadgeText}>CHÍNH HÃNG</Text>
                  </View>
                </View>
                <Text style={styles.receiptSubBrand}>Hệ thống Thời Trang Nam Nữ Cao Cấp</Text>
                <Text style={styles.receiptContactText}>Đ/c: 123 Cầu Giấy, Hà Nội • Hotline: 0912.345.678</Text>
                
                <View style={styles.receiptDashedLine} />

                <Text style={styles.receiptDocTitle}>HÓA ĐƠN MUA HÀNG</Text>
                <Text style={styles.receiptDocSubTitle}>KIÊM PHIẾU GIAO NHẬN VÀ ĐỒNG KIỂM</Text>

                <View style={styles.receiptMetaGrid}>
                  <View style={styles.receiptMetaItem}>
                    <Text style={styles.receiptMetaLabel}>Mã hóa đơn:</Text>
                    <Text style={styles.receiptMetaValue}>#HD-{order?.order_code || order?.id || '---'}</Text>
                  </View>
                  <View style={styles.receiptMetaItem}>
                    <Text style={styles.receiptMetaLabel}>Mã vận đơn:</Text>
                    <Text style={styles.receiptMetaValue}>SPX-{order?.order_code || order?.id || '---'}</Text>
                  </View>
                  <View style={styles.receiptMetaItem}>
                    <Text style={styles.receiptMetaLabel}>Thời gian lập:</Text>
                    <Text style={styles.receiptMetaValue}>
                      {order?.created_at ? new Date(order.created_at).toLocaleString('vi-VN') : '---'}
                    </Text>
                  </View>
                  <View style={styles.receiptMetaItem}>
                    <Text style={styles.receiptMetaLabel}>Trạng thái đơn:</Text>
                    <Text style={styles.receiptMetaValueBold}>
                      {getStatusText(order?.status).toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Customer & Shipping Info Box */}
              <View style={styles.receiptCustomerBox}>
                <Text style={styles.receiptSectionHeader}>THÔNG TIN NGƯỜI NHẬN:</Text>
                <Text style={styles.receiptCustomerName}>{order?.customer_name || 'Khách lẻ'}</Text>
                <Text style={styles.receiptCustomerText}>📞 SĐT: {order?.customer_phone || 'Chưa cung cấp'}</Text>
                <Text style={styles.receiptCustomerText}>📍 Đ/c: {order?.customer_address || 'Địa chỉ nhận hàng'}</Text>
                <Text style={styles.receiptCustomerText}>
                  💳 Thanh toán: {['bank', 'banking', 'vietqr'].includes((order?.payment_method || '').toLowerCase()) ? 'Chuyển khoản VietQR 24/7' : 'Tiền mặt khi nhận (COD)'}
                </Text>
                {order?.order_note ? (
                  <Text style={styles.receiptNoteText}>📝 Ghi chú: {order.order_note}</Text>
                ) : null}
              </View>

              {/* Itemized Table */}
              <View style={styles.receiptItemsSection}>
                <View style={styles.receiptTableHeader}>
                  <Text style={[styles.receiptTableColTitle, { flex: 1 }]}>SẢN PHẨM</Text>
                  <Text style={[styles.receiptTableColTitle, { width: 90, textAlign: 'right' }]}>THÀNH TIỀN</Text>
                </View>

                {items.map((it, idx) => (
                  <View key={it.id || idx} style={styles.receiptItemRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.receiptItemName} numberOfLines={2}>
                        {idx + 1}. {it.product_name}
                      </Text>
                      <Text style={styles.receiptItemVariant}>
                        Size: {it.size || 'M'} | Màu: {getColorName(it.color)}  •  {formatVND(it.price)} x {it.quantity}
                      </Text>
                    </View>
                    <Text style={styles.receiptItemTotal}>
                      {formatVND(Number(it.price) * Number(it.quantity))}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Totals Summary */}
              <View style={styles.receiptTotalsBox}>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Tạm tính tiền hàng:</Text>
                  <Text style={styles.receiptSummaryValue}>{formatVND(subtotal)}</Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Phí vận chuyển:</Text>
                  <Text style={styles.receiptSummaryValue}>
                    {order?.shipping_fee && Number(order.shipping_fee) > 0 ? formatVND(Number(order.shipping_fee)) : 'Miễn phí'}
                  </Text>
                </View>
                {discountAmount > 0 && (
                  <View style={styles.receiptSummaryRow}>
                    <Text style={styles.receiptSummaryLabelDiscount}>Giảm giá voucher:</Text>
                    <Text style={styles.receiptSummaryValueDiscount}>-{formatVND(discountAmount)}</Text>
                  </View>
                )}
                
                <View style={styles.receiptDashedLine} />

                <View style={styles.receiptGrandTotalRow}>
                  <Text style={styles.receiptGrandTotalLabel}>TỔNG THANH TOÁN:</Text>
                  <Text style={styles.receiptGrandTotalValue}>{formatVND(totalPrice)}</Text>
                </View>
              </View>

              {/* Policy & Signatures */}
              <View style={styles.receiptPolicyBox}>
                <Text style={styles.receiptPolicyText}>
                  💡 Quý khách có quyền đồng kiểm trước khi nhận. Đổi size / mẫu miễn phí trong 7 ngày theo chính sách ThoiTrangHD Mall.
                </Text>
              </View>

              <View style={styles.receiptSignatureGrid}>
                <View style={styles.receiptSigCol}>
                  <Text style={styles.receiptSigRole}>Đại diện ThoiTrangHD</Text>
                  <Text style={styles.receiptSigNote}>(Đã ký điện tử)</Text>
                  <View style={styles.receiptDigitalStamp}>
                    <Text style={styles.receiptStampText}>XÁC THỰC</Text>
                  </View>
                </View>
                <View style={styles.receiptSigCol}>
                  <Text style={styles.receiptSigRole}>Người nhận hàng</Text>
                  <Text style={styles.receiptSigNote}>(Đồng kiểm & xác nhận)</Text>
                  <Text style={styles.receiptCustomerSignName}>{order?.customer_name || 'Khách hàng'}</Text>
                </View>
              </View>

              <Text style={styles.receiptFooterThanks}>
                Cảm ơn Quý khách đã tin tưởng và đồng hành cùng ThoiTrangHD!
              </Text>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.invoiceFooterActions}>
              <TouchableOpacity
                style={styles.invoicePrintBtn}
                onPress={handlePrintInvoice}
                activeOpacity={0.85}
              >
                <IconSymbol name="printer" size={18} color="#ffffff" />
                <Text style={styles.invoicePrintBtnText}>IN HÓA ĐƠN / LƯU PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.invoiceCloseModalBtn}
                onPress={() => setShowInvoiceModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.invoiceCloseModalBtnText}>Đóng</Text>
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
    paddingBottom: 80,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  mainLayout: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  leftCol: {
    gap: 16,
    width: '100%',
  },
  rightCol: {
    gap: 16,
    width: '100%',
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
  /* Unified Right Action Button Stack */
  actionButtonsStack: {
    marginTop: 16,
    gap: 10,
  },
  confirmReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmReceiptBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  requestReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1.5,
    borderColor: '#d97706',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  requestReturnBtnText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  returnStatusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
  },
  returnStatusBtnRequested: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  returnStatusBtnApproved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  returnStatusBtnRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  returnStatusBtnText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  expiredReturnBadge: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 10,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredReturnText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  cancelOrderBtn: {
    backgroundColor: '#fee2e2',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  cancelOrderBtnText: {
    color: '#ba1a1a',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  reviewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#111827',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  reorderBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Shopee Mall / ThoiTrangHD Guarantee & 7-Day Return Policy Card */
  policyCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  policyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  policyIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  policyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  policyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  policyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  policyBadgeActiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  badgeExpired: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  policyBadgeExpiredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  badgeWarning: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  badgeWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b45309',
  },
  badgeSuccess: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  badgeSuccessText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803d',
  },
  badgeDanger: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  badgeDangerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#b91c1c',
  },
  policyDesc: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18,
    marginTop: 2,
  },
  returnStatusDetailBox: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 4,
  },
  returnStatusDetailTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  returnStatusDetailText: {
    fontSize: 12,
    color: '#374151',
  },
  returnStatusDetailNotice: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 4,
  },
  /* Product Item Card & Prominent Actions */
  orderItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  orderItemMain: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  itemBottomActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  itemReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemReviewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  itemEditReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  itemEditReviewText: {
    color: '#b45309',
    fontSize: 13,
    fontWeight: '700',
  },
  itemReturnBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#111827',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  itemReturnBtnText: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  /* Size Selection by Category (Chữ vs Số) */
  sizeCategoryBox: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
  },
  sizeCategoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  sizeRowContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  /* Color Selection Grid */
  colorGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  colorOptionChipActive: {
    borderColor: '#d97706',
    backgroundColor: '#fffbeb',
  },
  colorSwatchDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  colorOptionChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  colorOptionChipTextActive: {
    color: '#b45309',
    fontWeight: '700',
  },
  /* Return Image Picker */
  imagePickerRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  returnImageThumbBox: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  returnImageThumb: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addReturnImageBtn: {
    width: 72,
    height: 72,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9ca3af',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addReturnImageText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4b5563',
  },
  /* Review Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  reviewModalCard: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 520,
    maxHeight: '88%',
    borderRadius: 20,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 20,
  },
  reviewModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  reviewModalBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
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
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#ffffff',
    flexShrink: 0,
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

  returnPolicyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 16,
  },
  returnPolicyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  returnPolicyIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnPolicyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  returnPolicyDesc: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  openReturnModalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  openReturnModalBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  unboxingHint: {
    backgroundColor: '#fffdf5',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  unboxingHintText: {
    fontSize: 11,
    color: '#92400e',
    lineHeight: 16,
  },
  formGroupLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  returnReasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  returnReasonChipActive: {
    backgroundColor: '#fffdf5',
    borderColor: '#b78103',
  },
  returnReasonChipText: {
    fontSize: 13,
    color: '#334155',
    flex: 1,
  },
  returnReasonChipTextActive: {
    color: '#92400e',
    fontWeight: '700',
  },
  sizeOptionChip: {
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  sizeOptionChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  sizeOptionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  currentBadgeText: {
    fontSize: 10,
    color: '#6b7280',
    marginLeft: 4,
  },
  sizeOptionChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  returnNoteInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    minHeight: 64,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  modalNoticeBox: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
    marginBottom: 6,
  },
  modalNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  modalNoticeText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },

  /* Invoice Modal Styles */
  invoiceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '92%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  invoiceTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fafafa',
  },
  invoiceTopBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  invoiceCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  invoiceScrollBody: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  receiptBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  receiptBrandName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 0.8,
  },
  receiptOfficialBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  receiptOfficialBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fbbf24',
    letterSpacing: 0.5,
  },
  receiptSubBrand: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginBottom: 2,
  },
  receiptContactText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 12,
    textAlign: 'center',
  },
  receiptDashedLine: {
    width: '100%',
    height: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  receiptDocTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  receiptDocSubTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  receiptMetaGrid: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 6,
  },
  receiptMetaItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptMetaLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  receiptMetaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  receiptMetaValueBold: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284c7',
  },
  receiptCustomerBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 16,
  },
  receiptSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.4,
  },
  receiptCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  receiptCustomerText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 2,
  },
  receiptNoteText: {
    fontSize: 11.5,
    color: '#92400e',
    backgroundColor: '#fefce8',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
  },
  receiptItemsSection: {
    marginBottom: 16,
  },
  receiptTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
  },
  receiptTableColTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  receiptItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 3,
  },
  receiptItemVariant: {
    fontSize: 11.5,
    color: '#64748b',
  },
  receiptItemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  receiptTotalsBox: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  receiptSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  receiptSummaryLabel: {
    fontSize: 12.5,
    color: '#475569',
  },
  receiptSummaryValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  receiptSummaryLabelDiscount: {
    fontSize: 12.5,
    color: '#b45309',
  },
  receiptSummaryValueDiscount: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#b45309',
  },
  receiptGrandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  receiptGrandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.3,
  },
  receiptGrandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
  },
  receiptPolicyBox: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  receiptPolicyText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    textAlign: 'center',
  },
  receiptSignatureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 8,
  },
  receiptSigCol: {
    alignItems: 'center',
  },
  receiptSigRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  receiptSigNote: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 8,
  },
  receiptDigitalStamp: {
    borderWidth: 1.5,
    borderColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    transform: [{ rotate: '-6deg' }],
  },
  receiptStampText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    letterSpacing: 1,
  },
  receiptCustomerSignName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
  },
  receiptFooterThanks: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  invoiceFooterActions: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  invoicePrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  invoicePrintBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  invoiceCloseModalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceCloseModalBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  printHeaderBtnWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  printHeaderBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  printInvoiceActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 24,
    gap: 8,
  },
  printInvoiceActionBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

});
