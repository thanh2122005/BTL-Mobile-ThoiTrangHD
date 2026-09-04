import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoriteContext';
import { useAuth } from '@/contexts/AuthContext';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';

import { getImageSource } from '@/constants/images';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { addToCart, itemCount } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isMobile, isLargeScreen, width } = useResponsive();
  
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState('M');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
  }>({
    averageRating: 5.0,
    totalReviews: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [selectedStarFilter, setSelectedStarFilter] = useState<number | 'all'>('all');

  // Review Modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const fetchReviews = () => {
    if (!id) return;
    fetch(`${API_URL}/api/products/${id}/reviews`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setReviews(data.data || []);
          if (data.stats) {
            setReviewStats(data.stats);
          }
        }
        setReviewsLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách đánh giá:", err);
        setReviewsLoading(false);
      });
  };

  useEffect(() => {
    fetchReviews();
  }, [id]);

  const handleSubmitReview = async () => {
    if (!newComment.trim()) {
      showToast('Vui lòng nhập nội dung đánh giá');
      return;
    }

    setSubmittingReview(true);
    try {
      const reviewerName = user?.name || newUserName.trim() || 'Khách hàng';
      const reviewerAvatar = user?.avatar || undefined;

      const colorName = selectedColor === '#000000' ? 'Đen' : selectedColor === '#E5D3B3' ? 'Be' : 'Xanh';

      const res = await fetch(`${API_URL}/api/products/${id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || null,
          userName: reviewerName,
          userAvatar: reviewerAvatar,
          rating: newRating,
          comment: newComment.trim(),
          size: selectedSize,
          color: colorName,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        showToast('Đánh giá sản phẩm thành công!');
        setShowReviewModal(false);
        setNewComment('');
        fetchReviews();
      } else {
        showToast(data?.message || 'Không thể gửi đánh giá');
      }
    } catch (err) {
      console.error('Lỗi gửi đánh giá:', err);
      showToast('Lỗi kết nối khi gửi đánh giá');
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredReviews = useMemo(() => {
    if (selectedStarFilter === 'all') return reviews;
    return reviews.filter(r => Math.round(Number(r.rating)) === selectedStarFilter);
  }, [reviews, selectedStarFilter]);

  useEffect(() => {
    fetch(`${API_URL}/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setProduct(data.data);
          // Set initial size based on category if current size is invalid
          const isShoe = data.data.category?.toLowerCase() === 'giày';
          const isAccessory = data.data.category?.toLowerCase() === 'phụ kiện';
          const available = isShoe 
            ? ['35', '36', '37', '38', '39', '40', '41', '42', '43'] 
            : isAccessory 
              ? ['Freesize'] 
              : ['S', 'M', 'L', 'XL'];
          if (!available.includes(selectedSize)) {
            setSelectedSize(available[0]);
          }
        } else {
          setProduct(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy chi tiết sản phẩm:", err);
        setProduct(null);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!product) return;
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.data)) {
          const others = data.data.filter((p: any) => p.id !== product.id);
          const sameCat = others.filter((p: any) => p.category === product.category);
          setRelatedProducts(sameCat.length > 0 ? sameCat.slice(0, 4) : others.slice(0, 4));
        }
      })
      .catch(err => console.error("Lỗi tải sản phẩm liên quan:", err));
  }, [product]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#000000" />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>Không tìm thấy sản phẩm</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 }} 
          onPress={() => router.back()}
        >
          <Text style={{ color: '#fff', fontWeight: '500' }}>Quay lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const imageSource = getImageSource(product.image);
  const formattedPrice = typeof product.price === 'number' 
    ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price) 
    : product.price;

  const handleAddToCart = () => {
    if (product.stock !== undefined && product.stock <= 0) {
      showToast('Sản phẩm hiện đang tạm hết hàng');
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
      size: selectedSize,
      color: selectedColor,
      stock: product.stock
    });
    showToast('Đã thêm sản phẩm vào giỏ hàng');
  };

  const handleBuyNow = () => {
    if (product.stock !== undefined && product.stock <= 0) {
      showToast('Sản phẩm hiện đang tạm hết hàng');
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
      size: selectedSize,
      color: selectedColor,
      stock: product.stock
    });
    router.push('/checkout');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <IconSymbol name="checkmark.circle.fill" size={20} color="#2e7d32" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Responsive Header */}
      <View style={[styles.header, isLargeScreen && styles.headerLarge]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={22} color="#1a1c1c" />
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {isMobile ? 'Chi tiết sản phẩm' : 'ThoiTrangHD'}
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => {
                toggleFavorite(product);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol 
                name={isFavorite(product.id) ? "heart.fill" : "heart"} 
                size={22} 
                color={isFavorite(product.id) ? "#e53935" : "#1a1c1c"} 
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart')}>
              <IconSymbol name="bag" size={22} color="#1a1c1c" />
              {itemCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.mainLayout, isLargeScreen && styles.mainLayoutLarge]}>
          
          {/* Gallery Section */}
          <View style={[styles.gallerySection, isLargeScreen && styles.gallerySectionLarge]}>
            <Image 
              source={imageSource} 
              style={[styles.mainImage, isMobile && { height: Math.min(width, 420) }]} 
              contentFit="cover" 
            />
            <View style={styles.paginationDots}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
          </View>

          {/* Product Info Section */}
          <View style={[styles.infoSection, isLargeScreen && styles.infoSectionLarge]}>
            
            {/* Category tag */}
            {product.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{product.category.toUpperCase()}</Text>
              </View>
            )}

            {/* Name */}
            <Text style={[styles.productName, isLargeScreen && styles.productNameLarge]}>
              {product.name}
            </Text>

            {/* Rating & Sold & Stock Row */}
            <View style={styles.ratingRow}>
              <View style={styles.ratingBox}>
                <IconSymbol name="star.fill" size={15} color="#e1c28e" />
                <Text style={styles.ratingValue}>
                  {reviewStats.totalReviews > 0 ? reviewStats.averageRating.toFixed(1) : '5.0'}
                </Text>
                <Text style={styles.reviewCount}>({reviewStats.totalReviews} đánh giá)</Text>
              </View>
              <View style={styles.dotSeparator} />
              <Text style={styles.soldText}>Đã bán {product.sold_count !== undefined ? product.sold_count : 0}</Text>
              <View style={styles.dotSeparator} />
              <View style={styles.stockBadge}>
                <IconSymbol 
                  name={product.stock !== undefined && product.stock > 0 ? "checkmark.circle.fill" : "exclamationmark.circle.fill"} 
                  size={13} 
                  color={product.stock !== undefined && product.stock > 0 ? "#16a34a" : "#dc2626"} 
                />
                <Text style={[styles.stockBadgeText, (product.stock !== undefined && product.stock <= 0) && styles.stockBadgeTextOut]}>
                  {product.stock !== undefined && product.stock > 0 ? `Kho: ${product.stock}` : 'Hết hàng'}
                </Text>
              </View>
            </View>

            {/* Price */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>{formattedPrice}</Text>
              {product.original_price && (
                <>
                  <Text style={styles.originalPriceText}>
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.original_price)}
                  </Text>
                  {product.discount > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{product.discount}%</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Color options */}
            <View style={styles.optionSection}>
              <Text style={styles.optionTitle}>MÀU SẮC</Text>
              <View style={styles.colorOptions}>
                {['#000000', '#E5D3B3', '#1A237E'].map((color) => (
                  <TouchableOpacity 
                    key={color} 
                    style={[
                      styles.colorCircle, 
                      { backgroundColor: color },
                      selectedColor === color && styles.colorCircleSelected
                    ]}
                    onPress={() => setSelectedColor(color)}
                  />
                ))}
              </View>
            </View>

            {/* Size options */}
            <View style={styles.optionSection}>
              <View style={styles.sizeHeader}>
                <Text style={styles.optionTitle}>KÍCH THƯỚC</Text>
                <TouchableOpacity>
                  <Text style={styles.sizeGuideText}>Hướng dẫn chọn size</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sizeOptions}>
                {(() => {
                  const isShoe = product?.category?.toLowerCase() === 'giày';
                  const isAccessory = product?.category?.toLowerCase() === 'phụ kiện';
                  const availableSizes = isShoe 
                    ? ['35', '36', '37', '38', '39', '40', '41', '42', '43'] 
                    : isAccessory 
                      ? ['Freesize'] 
                      : ['S', 'M', 'L', 'XL'];
                  
                  return availableSizes.map((size) => (
                    <TouchableOpacity 
                      key={size} 
                      style={[
                        styles.sizeBox,
                        selectedSize === size && styles.sizeBoxSelected
                      ]}
                      onPress={() => setSelectedSize(size)}
                    >
                      <Text style={[
                        styles.sizeText,
                        selectedSize === size && styles.sizeTextSelected
                      ]}>{size}</Text>
                    </TouchableOpacity>
                  ));
                })()}
              </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionSection}>
              <Text style={styles.optionTitle}>MÔ TẢ SẢN PHẨM</Text>
              <Text style={styles.descriptionText}>
                {product.description || 'Chất liệu vải cao cấp, form dáng hiện đại phù hợp cho mọi hoàn cảnh. Thiết kế tinh tế với các đường may sắc sảo từ ThoiTrangHD, tôn lên vẻ đẹp thanh lịch và sang trọng.'}
              </Text>
            </View>

          </View>
        </View>

        {/* Customer Reviews Section */}
        <View style={[styles.reviewsSection, isLargeScreen && styles.reviewsSectionLarge]}>
          <View style={styles.reviewsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.reviewsTitle}>ĐÁNH GIÁ TỪ NGƯỜI MUA</Text>
              <Text style={styles.reviewsSubtitle}>Nhận xét thực tế từ khách hàng đã mua sản phẩm này</Text>
            </View>
            <TouchableOpacity
              style={styles.writeReviewBtn}
              onPress={() => {
                if (user?.name) {
                  setNewUserName(user.name);
                }
                setShowReviewModal(true);
              }}
            >
              <IconSymbol name="star.fill" size={14} color="#ffffff" />
              <Text style={styles.writeReviewBtnText}>Viết đánh giá</Text>
            </TouchableOpacity>
          </View>

          {/* Rating Summary Card */}
          <View style={styles.ratingCard}>
            <View style={styles.ratingScoreCol}>
              <Text style={styles.ratingBigNumber}>
                {reviewStats.totalReviews > 0 ? reviewStats.averageRating.toFixed(1) : '5.0'}
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <IconSymbol
                    key={star}
                    name="star.fill"
                    size={16}
                    color={star <= Math.round(reviewStats.averageRating) ? "#e1c28e" : "#d1d5db"}
                  />
                ))}
              </View>
              <Text style={styles.totalReviewsLabel}>{reviewStats.totalReviews} đánh giá</Text>
            </View>

            {/* Rating Bars */}
            <View style={styles.ratingBarsCol}>
              {[5, 4, 3, 2, 1].map(starNum => {
                const count = reviewStats.ratingDistribution[starNum] || 0;
                const percent = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                return (
                  <View key={starNum} style={styles.barRow}>
                    <Text style={styles.barLabel}>{starNum} sao</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${percent}%` }]} />
                    </View>
                    <Text style={styles.barCount}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Star Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.starFiltersScroll}>
            <TouchableOpacity
              style={[styles.starFilterChip, selectedStarFilter === 'all' && styles.starFilterChipActive]}
              onPress={() => setSelectedStarFilter('all')}
            >
              <Text style={[styles.starFilterText, selectedStarFilter === 'all' && styles.starFilterTextActive]}>
                Tất cả ({reviewStats.totalReviews})
              </Text>
            </TouchableOpacity>
            {[5, 4, 3, 2, 1].map(star => {
              const count = reviewStats.ratingDistribution[star] || 0;
              if (count === 0 && selectedStarFilter !== star) return null;
              return (
                <TouchableOpacity
                  key={star}
                  style={[styles.starFilterChip, selectedStarFilter === star && styles.starFilterChipActive]}
                  onPress={() => setSelectedStarFilter(star)}
                >
                  <Text style={[styles.starFilterText, selectedStarFilter === star && styles.starFilterTextActive]}>
                    {star} sao ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Reviews List */}
          {reviewsLoading ? (
            <ActivityIndicator size="small" color="#000000" style={{ marginVertical: 20 }} />
          ) : filteredReviews.length === 0 ? (
            <View style={styles.emptyReviews}>
              <IconSymbol name="star.fill" size={32} color="#c4c7c7" />
              <Text style={styles.emptyReviewsText}>Chưa có đánh giá nào cho mục lọc này.</Text>
            </View>
          ) : (
            <View style={styles.reviewsList}>
              {filteredReviews.map((rev) => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewUserRow}>
                    <Image
                      source={rev.user_avatar ? { uri: rev.user_avatar } : { uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=200&auto=format&fit=crop' }}
                      style={styles.reviewAvatar}
                    />
                    <View style={styles.reviewUserMeta}>
                      <View style={styles.reviewNameRow}>
                        <Text style={styles.reviewUserName}>{rev.user_name}</Text>
                        {rev.is_verified_purchase ? (
                          <View style={styles.verifiedBadge}>
                            <IconSymbol name="checkmark" size={10} color="#16a34a" />
                            <Text style={styles.verifiedText}>Đã mua hàng</Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.reviewStarsRow}>
                        <View style={{ flexDirection: 'row', gap: 2 }}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <IconSymbol
                              key={s}
                              name="star.fill"
                              size={12}
                              color={s <= rev.rating ? "#e1c28e" : "#d1d5db"}
                            />
                          ))}
                        </View>
                        <Text style={styles.reviewDate}>
                          {new Date(rev.created_at).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {(rev.size || rev.color) && (
                    <Text style={styles.reviewVariant}>
                      Phân loại: {rev.size ? `Size ${rev.size}` : ''}{rev.color ? ` | Màu ${rev.color}` : ''}
                    </Text>
                  )}

                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={[styles.relatedSection, isLargeScreen && styles.relatedSectionLarge]}>
            <View style={styles.relatedHeader}>
              <Text style={styles.relatedTitle}>Sản phẩm tương tự</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.relatedScroll}>
              {relatedProducts.map((item) => {
                const itemImg = getImageSource(item.image);
                const itemFormattedPrice = typeof item.price === 'number'
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)
                  : item.price;
                return (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.relatedCard}
                    onPress={() => router.push(`/products/${item.id}`)}
                  >
                    <View style={styles.relatedImageContainer}>
                      <Image source={itemImg} style={styles.relatedImage} contentFit="cover" />
                    </View>
                    <Text style={styles.relatedName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.relatedPrice}>{itemFormattedPrice}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Action Bar (Pinned Bottom) */}
      <View style={[styles.bottomBar, isLargeScreen && styles.bottomBarLarge]}>
        <View style={styles.bottomBarInner}>
          <TouchableOpacity style={styles.addToCartBtn} onPress={handleAddToCart}>
            <IconSymbol name="bag.badge.plus" size={18} color="#000000" />
            <Text style={styles.addToCartText}>Thêm vào giỏ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyNowBtn} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>Mua ngay</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Review Submission Modal */}
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
            {/* Modal Header */}
            <View style={styles.reviewModalHeader}>
              <Text style={styles.reviewModalTitle}>Đánh giá sản phẩm</Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                style={styles.reviewModalClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <IconSymbol name="xmark" size={20} color="#1a1c1c" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Product Brief */}
              <View style={styles.reviewProductRow}>
                <Image source={imageSource} style={styles.reviewProductThumb} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.reviewProductName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.reviewProductMeta}>
                    Phân loại: Size {selectedSize} | Màu {selectedColor === '#000000' ? 'Đen' : selectedColor === '#E5D3B3' ? 'Be' : 'Xanh'}
                  </Text>
                </View>
              </View>

              {/* Interactive Star Picker */}
              <View style={styles.starPickerBox}>
                <Text style={styles.starPickerLabel}>Chất lượng sản phẩm:</Text>
                <View style={styles.interactiveStarsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setNewRating(star)}
                      style={styles.starTouchArea}
                    >
                      <IconSymbol
                        name="star.fill"
                        size={30}
                        color={star <= newRating ? "#e1c28e" : "#e5e7eb"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.starRatingDesc}>
                  {newRating === 5 ? 'Tuyệt vời (5 sao)' :
                   newRating === 4 ? 'Hài lòng (4 sao)' :
                   newRating === 3 ? 'Bình thường (3 sao)' :
                   newRating === 2 ? 'Không hài lòng (2 sao)' : 'Rất tệ (1 sao)'}
                </Text>
              </View>

              {/* Reviewer Name if Guest */}
              {!user && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={styles.inputLabel}>Tên của bạn (hiển thị trên nhận xét):</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="VD: Hoàng Nam"
                    placeholderTextColor="#9ca3af"
                    value={newUserName}
                    onChangeText={setNewUserName}
                  />
                </View>
              )}

              {/* Comment Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={styles.inputLabel}>Nội dung nhận xét chi tiết:</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Chia sẻ cảm nhận thực tế về chất vải, độ co giãn, form dáng sản phẩm..."
                  placeholderTextColor="#9ca3af"
                  multiline={true}
                  numberOfLines={4}
                  value={newComment}
                  onChangeText={setNewComment}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.reviewModalFooter}>
              <TouchableOpacity
                style={styles.cancelReviewBtn}
                onPress={() => setShowReviewModal(false)}
              >
                <Text style={styles.cancelReviewText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitReviewBtn, submittingReview && { opacity: 0.7 }]}
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitReviewText}>Gửi đánh giá</Text>
                )}
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
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    zIndex: 50,
  },
  headerLarge: {
    paddingVertical: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    flex: 1,
    marginHorizontal: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ba1a1a',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  mainLayout: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  mainLayoutLarge: {
    flexDirection: 'row',
    paddingHorizontal: 32,
    paddingTop: 32,
    gap: 48,
  },
  gallerySection: {
    width: '100%',
  },
  gallerySectionLarge: {
    flex: 1,
    maxWidth: 550,
  },
  mainImage: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f3f4f6',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#111827',
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  infoSectionLarge: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 28,
    marginBottom: 8,
  },
  productNameLarge: {
    fontSize: 26,
    lineHeight: 34,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ratingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  reviewCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    marginHorizontal: 8,
  },
  soldText: {
    fontSize: 13,
    color: '#6b7280',
  },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  stockBadgeTextOut: {
    color: '#dc2626',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    marginBottom: 20,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ba1a1a',
  },
  originalPriceText: {
    fontSize: 16,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  optionSection: {
    marginBottom: 20,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  colorOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: '#000000',
    transform: [{ scale: 1.1 }],
  },
  sizeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sizeGuideText: {
    fontSize: 12,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  sizeOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeBox: {
    minWidth: 44,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  sizeBoxSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  sizeTextSelected: {
    color: '#ffffff',
  },
  descriptionSection: {
    marginBottom: 24,
    paddingTop: 4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4b5563',
  },
  /* Reviews Section Styles */
  reviewsSection: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 8,
    borderTopColor: '#f9f9f9',
    backgroundColor: '#ffffff',
  },
  reviewsSectionLarge: {
    paddingHorizontal: 32,
    marginTop: 20,
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  reviewsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: 0.5,
  },
  reviewsSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  writeReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#121212',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  writeReviewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  ratingCard: {
    flexDirection: 'row',
    backgroundColor: '#fafafa',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 16,
    alignItems: 'center',
  },
  ratingScoreCol: {
    alignItems: 'center',
    paddingRight: 20,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    minWidth: 110,
  },
  ratingBigNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 38,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 3,
    marginVertical: 4,
  },
  totalReviewsLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  ratingBarsCol: {
    flex: 1,
    paddingLeft: 20,
    gap: 4,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 11,
    color: '#6b7280',
    width: 36,
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#e1c28e',
    borderRadius: 3,
  },
  barCount: {
    fontSize: 11,
    color: '#9ca3af',
    width: 20,
    textAlign: 'right',
  },
  starFiltersScroll: {
    gap: 8,
    paddingBottom: 14,
  },
  starFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  starFilterChipActive: {
    backgroundColor: '#121212',
    borderColor: '#121212',
  },
  starFilterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4b5563',
  },
  starFilterTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyReviewsText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  reviewsList: {
    gap: 16,
    paddingTop: 8,
  },
  reviewItem: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  reviewUserRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
  },
  reviewUserMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  reviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 11,
    color: '#9ca3af',
  },
  reviewVariant: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 6,
  },
  reviewComment: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  /* Review Modal Styles */
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
  reviewProductRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  reviewProductThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  reviewProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  reviewProductMeta: {
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
  /* Related Products Styles */
  relatedSection: {
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  relatedSectionLarge: {
    paddingHorizontal: 32,
  },
  relatedHeader: {
    marginBottom: 16,
  },
  relatedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  relatedScroll: {
    gap: 16,
    paddingBottom: 8,
  },
  relatedCard: {
    width: 140,
  },
  relatedImageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  relatedImage: {
    width: '100%',
    height: '100%',
  },
  relatedName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  relatedPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 40,
  },
  bottomBarLarge: {
    position: 'relative',
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: 12,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  addToCartBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#000000',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
  },
  addToCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  buyNowBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyNowText: {
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
