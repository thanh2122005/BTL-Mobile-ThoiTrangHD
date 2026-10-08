import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dimensions, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useCart } from '@/contexts/CartContext';
import { useFavorites } from '@/contexts/FavoriteContext';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';

import { getImageSource } from '@/constants/images';

const formatVND = (price: any) => {
  if (typeof price === 'number') {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
  return price || '0đ';
};

export default function HomeScreen() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isMobile, isTablet, isDesktop, isLargeScreen } = useResponsive();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tất cả');

  const gridItemWidth = isDesktop ? '23.5%' : isTablet ? '31%' : '48%';
  const gridColumnGap = isDesktop ? '2%' : isTablet ? '3.5%' : '4%';

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success) {
          setProducts(data.data || []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Lỗi lấy danh sách sản phẩm:', err);
        setLoading(false);
      });
  }, []);

  const scrollViewRef = useRef<ScrollView>(null);
  const categories = ['Tất cả', 'Áo', 'Quần', 'Váy', 'Bộ', 'Phụ kiện', 'Giày'];

  // Thống kê số lượng sản phẩm theo từng danh mục
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'Tất cả': products.length };
    products.forEach((p) => {
      if (p.category) {
        counts[p.category] = (counts[p.category] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredProducts = activeCategory === 'Tất cả'
    ? products
    : products.filter((p) => p.category === activeCategory);

  // Trang chủ chỉ tuyển chọn 6-8 sản phẩm đẹp nhất để giao diện bắt mắt, gọn gàng và không làm rối mắt
  const maxHomeItems = isDesktop ? 8 : 6;
  const displayProducts = filteredProducts.slice(0, maxHomeItems);

  // Nổi bật: Ưu tiên bán chạy nhất (sold_count) và giảm giá sâu nhất (discount)
  const featuredProducts = [...products]
    .sort((a, b) => {
      if ((b.sold_count || 0) !== (a.sold_count || 0)) {
        return (b.sold_count || 0) - (a.sold_count || 0);
      }
      return (b.discount || 0) - (a.discount || 0);
    })
    .slice(0, 6);

  // Hàng mới về: Sắp xếp theo ngày tạo mới nhất (created_at)
  const newArrivals = (activeCategory === 'Tất cả'
    ? products
    : products.filter((p) => p.category === activeCategory)
  )
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, isDesktop ? 16 : 10);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={[styles.headerContent, isMobile && { paddingHorizontal: 16, paddingVertical: 10 }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.brandText, isMobile && { fontSize: 22 }]}>ThoiTrangHD</Text>
            {isLargeScreen && <Text style={styles.greetingText}>Chào mừng bạn đến với ThoiTrangHD!</Text>}
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/products')}>
              <IconSymbol name="magnifyingglass" size={isMobile ? 22 : 24} color="#1a1c1c" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart')}>
              <IconSymbol name="bag" size={isMobile ? 22 : 24} color="#1a1c1c" />
              {itemCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{itemCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, isMobile && { paddingHorizontal: 14, paddingTop: 12 }]}>

                {/* Banner */}
        <View style={[styles.bannerContainer, { height: isDesktop ? 460 : isTablet ? 320 : 190, marginBottom: isMobile ? 18 : 32 }]}>
          <Image
            source={require('@/assets/images/banner_fashion_hd.jpg')}
            style={styles.bannerImage}
            contentFit="cover"
            contentPosition={isMobile ? { top: '0%', right: '15%' } : { top: '10%', left: '50%' }}
          />
          <View style={[styles.bannerOverlay, isMobile && { backgroundColor: 'rgba(0,0,0,0.12)' }]} />
          
          <View style={[styles.bannerContent, { maxWidth: isMobile ? '56%' : 380, padding: isMobile ? 12 : 24 }]}>
            <View style={[styles.bannerTag, isMobile && { paddingHorizontal: 7, paddingVertical: 2, marginBottom: 4 }]}>
              <Text style={[styles.bannerTagText, isMobile && { fontSize: 8 }]}>NEW 2026</Text>
            </View>
            <Text style={[styles.bannerTitle, isMobile && { fontSize: 16, lineHeight: 21, marginBottom: 6 }]}>
              {isMobile ? 'Thời Trang HD\nMới Nhất' : 'Bộ Sưu Tập\nThời Trang HD'}
            </Text>
            {!isMobile && (
              <Text style={styles.bannerSubtitle}>Khám phá những thiết kế mới nhất, sang trọng và thanh lịch từ ThoiTrangHD.</Text>
            )}
            <TouchableOpacity style={[styles.bannerButton, isMobile && { paddingVertical: 6, paddingHorizontal: 12 }]} onPress={() => router.push('/products')}>
              <Text style={[styles.bannerButtonText, isMobile && { fontSize: 10 }]}>MUA SẮM</Text>
              <IconSymbol name="chevron.right" size={isMobile ? 12 : 16} color="#121212" />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* KHỐI 1: SẢN PHẨM NỔI BẬT (LUÔN LUÔN HIỂN THỊ TRÊN TRANG CHỦ) */}
            <View style={[styles.sectionHeader, isMobile && { paddingHorizontal: 14, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="sparkles" size={17} color="#A68B5B" />
                <Text style={[styles.sectionTitle, isMobile && { fontSize: 18 }]}>Sản Phẩm Nổi Bật</Text>
                <View style={styles.hotBadge}>
                  <Text style={styles.hotBadgeText}>BÁN CHẠY</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/products')}>
                <Text style={styles.viewAllText}>Xem tất cả ({products.length})</Text>
                <IconSymbol name="arrow.right" size={14} color="#717171" />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.featuredContent, isMobile && { paddingHorizontal: 14, gap: 12, marginBottom: 24 }]}>
              {featuredProducts.map((prod) => (
                <TouchableOpacity key={prod.id} style={[styles.featuredCard, isMobile && { width: 190 }]} onPress={() => router.push(`/products/${prod.id}`)}>
                  <View style={styles.featuredImageContainer}>
                    <Image source={getImageSource(prod.image)} style={styles.featuredImage} contentFit="cover" />
                    <View style={styles.imageOverlay} />
                    {prod.discount > 0 && (
                      <View style={styles.discountBadgeCorner}>
                        <Text style={styles.discountBadgeCornerText}>-{prod.discount}%</Text>
                      </View>
                    )}
                    <TouchableOpacity 
                      style={styles.favoriteButton}
                      onPress={() => toggleFavorite(prod)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <IconSymbol 
                        name={isFavorite(prod.id) ? "heart.fill" : "heart"} 
                        size={18} 
                        color={isFavorite(prod.id) ? "#e11d48" : "#121212"} 
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
                  <View style={styles.productPriceRow}>
                    {(() => {
                      const origPrice = prod.originalPrice || prod.original_price || (prod.discount > 0 ? Math.round((prod.price / (1 - prod.discount / 100)) / 1000) * 1000 : null);
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                          <Text style={[styles.productPrice, prod.discount > 0 && styles.priceDiscounted]}>
                            {formatVND(prod.price)}
                          </Text>
                          {origPrice && origPrice > prod.price && (
                            <Text style={styles.priceOriginalCrossed}>
                              {formatVND(origPrice)}
                            </Text>
                          )}
                        </View>
                      );
                    })()}
                    <View style={styles.ratingRow}>
                      <IconSymbol name="star.fill" size={12} color="#A68B5B" />
                      <Text style={styles.ratingText}>4.9</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* KHỐI 2: BANNER CHIẾN DỊCH THỜI TRANG & CAM KẾT THƯƠNG HIỆU */}
            <TouchableOpacity 
              activeOpacity={0.92}
              onPress={() => router.push('/products')}
              style={[styles.midBannerCard, isMobile && { marginHorizontal: 14, marginBottom: 16 }]}
            >
              <Image 
                source={require('@/assets/images/mid_campaign_banner.jpg')} 
                style={[styles.midBannerImage, isMobile && { height: 160 }]} 
                contentFit="cover" 
              />
              <View style={styles.midBannerOverlay} />
              <View style={[styles.midBannerContent, isMobile && { padding: 16, maxWidth: '80%' }]}>
                <View style={styles.midBannerBadge}>
                  <Text style={styles.midBannerBadgeText}>BỘ SƯU TẬP 2026</Text>
                </View>
                <Text style={[styles.midBannerTitle, isMobile && { fontSize: 18, lineHeight: 22, marginVertical: 4 }]}>
                  The New Minimalism
                </Text>
                <Text style={[styles.midBannerSubtitle, isMobile && { fontSize: 11, marginBottom: 8 }]} numberOfLines={2}>
                  Phong cách tối giản, tôn vinh khí chất thanh lịch & sang trọng
                </Text>
                <View style={styles.midBannerCta}>
                  <Text style={styles.midBannerCtaText}>Khám phá bộ sưu tập</Text>
                  <IconSymbol name="arrow.right" size={12} color="#ffffff" />
                </View>
              </View>
            </TouchableOpacity>

            {/* 3 THẺ CAM KẾT CHUẨN THƯƠNG HIỆU CÓ ICON TRÒN NỔI BẬT & NỀN PASTEL SANG TRỌNG */}
            <View style={[styles.trustCardsRow, isMobile && { marginHorizontal: 14, marginBottom: 28, gap: 8 }]}>
              <View style={[styles.trustCard, isMobile && { padding: 10 }]}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#eff6ff' }]}>
                  <IconSymbol name="shippingbox" size={18} color="#1d4ed8" />
                </View>
                <Text style={[styles.trustCardTitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>Freeship đơn 499k</Text>
                <Text style={[styles.trustCardSubtitle, isMobile && { fontSize: 9 }]} numberOfLines={1}>Giao nhanh toàn quốc</Text>
              </View>

              <View style={[styles.trustCard, isMobile && { padding: 10 }]}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#ecfdf5' }]}>
                  <IconSymbol name="arrow.2.squarepath" size={18} color="#059669" />
                </View>
                <Text style={[styles.trustCardTitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>Đổi hàng 7 ngày</Text>
                <Text style={[styles.trustCardSubtitle, isMobile && { fontSize: 9 }]} numberOfLines={1}>Đổi size tại nhà</Text>
              </View>

              <View style={[styles.trustCard, isMobile && { padding: 10 }]}>
                <View style={[styles.trustIconCircle, { backgroundColor: '#fef3c7' }]}>
                  <IconSymbol name="checkmark.seal" size={18} color="#d97706" />
                </View>
                <Text style={[styles.trustCardTitle, isMobile && { fontSize: 11 }]} numberOfLines={1}>100% Chính hãng</Text>
                <Text style={[styles.trustCardSubtitle, isMobile && { fontSize: 9 }]} numberOfLines={1}>Cam kết chất lượng</Text>
              </View>
            </View>

            {/* KHỐI 3: GỢI Ý THỊNH HÀNH - CHỈ TUYỂN CHỌN 6-8 SẢN PHẨM ĐỂ TRANG CHỦ BẮT MẮT & TINH GỌN */}
            <View style={[styles.sectionHeader, isMobile && { paddingHorizontal: 14, marginBottom: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <IconSymbol name="sparkles" size={17} color="#0f172a" />
                <Text style={[styles.sectionTitle, isMobile && { fontSize: 18 }]}>
                  {activeCategory === 'Tất cả' ? 'Gợi Ý Thịnh Hành' : `Xu Hướng ${activeCategory}`}
                </Text>
                <View style={styles.trendBadge}>
                  <Text style={styles.trendBadgeText}>TUYỂN CHỌN</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.viewAllBtn} 
                onPress={() => router.push(activeCategory === 'Tất cả' ? '/products' : { pathname: '/products', params: { category: activeCategory } })}
                activeOpacity={0.7}
              >
                <Text style={styles.viewAllText}>Xem tất cả ({filteredProducts.length})</Text>
                <IconSymbol name="arrow.right" size={14} color="#717171" />
              </TouchableOpacity>
            </View>

            {/* THANH TAB DANH MỤC THANH LỊCH (PHONG CÁCH THỜI TRANG CAO CẤP) */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={[styles.categoriesContainer, isMobile && { marginBottom: 16 }]} 
              contentContainerStyle={[styles.categoriesContent, isMobile && { paddingHorizontal: 14, gap: 8 }]}
            >
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill, 
                      isMobile && { paddingHorizontal: 16, paddingVertical: 8 }, 
                      isActive && styles.categoryPillActive
                    ]}
                    onPress={() => setActiveCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.categoryPillText, isMobile && { fontSize: 13 }, isActive && styles.categoryPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* LƯỚI SẢN PHẨM TUYỂN CHỌN (TỐI ĐA 6-8 SẢN PHẨM) */}
            {displayProducts.length === 0 ? (
              <View style={styles.emptyCategoryBox}>
                <IconSymbol name="bag" size={44} color="#cbd5e1" />
                <Text style={styles.emptyCategoryTitle}>Chưa có sản phẩm nào trong danh mục "{activeCategory}"</Text>
                <Text style={styles.emptyCategorySubtitle}>Cửa hàng sẽ sớm bổ sung các mẫu mới cho danh mục này.</Text>
                <TouchableOpacity style={styles.returnAllBtn} onPress={() => setActiveCategory('Tất cả')}>
                  <Text style={styles.returnAllBtnText}>Quay lại xem gợi ý thịnh hành</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={[styles.gridContainer, { columnGap: gridColumnGap as any, rowGap: isMobile ? 16 : 24 }]}>
                  {displayProducts.map((prod) => (
                    <TouchableOpacity key={prod.id} style={[styles.gridItem, { width: gridItemWidth as any }]} onPress={() => router.push(`/products/${prod.id}`)}>
                      <View style={styles.gridImageContainer}>
                        <Image source={getImageSource(prod.image)} style={styles.gridImage} contentFit="cover" />
                        <View style={styles.imageOverlay} />
                        <View style={styles.categoryTagCorner}>
                          <Text style={styles.categoryTagCornerText}>{prod.category}</Text>
                        </View>
                        {prod.discount > 0 && (
                          <View style={styles.discountBadgeCorner}>
                            <Text style={styles.discountBadgeCornerText}>-{prod.discount}%</Text>
                          </View>
                        )}
                        <TouchableOpacity 
                          style={styles.favoriteButtonSmall}
                          onPress={() => toggleFavorite(prod)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <IconSymbol 
                            name={isFavorite(prod.id) ? "heart.fill" : "heart"} 
                            size={16} 
                            color={isFavorite(prod.id) ? "#e11d48" : "#121212"} 
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.gridName} numberOfLines={1}>{prod.name}</Text>
                      {(() => {
                        const origPrice = prod.originalPrice || prod.original_price || (prod.discount > 0 ? Math.round((prod.price / (1 - prod.discount / 100)) / 1000) * 1000 : null);
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                            <Text style={[styles.gridPrice, prod.discount > 0 && styles.priceDiscounted]}>
                              {formatVND(prod.price)}
                            </Text>
                            {origPrice && origPrice > prod.price && (
                              <Text style={styles.priceOriginalCrossed}>
                                {formatVND(origPrice)}
                              </Text>
                            )}
                          </View>
                        );
                      })()}
                    </TouchableOpacity>
                  ))}
                </View>

                {/* NÚT / BANNER ĐIỀU HƯỚNG SANG TRANG DANH MỤC ĐỂ XEM TOÀN BỘ SẢN PHẨM */}
                <View style={[styles.catalogRedirectBox, isMobile && { marginHorizontal: 14, marginTop: 12 }]}>
                  <TouchableOpacity
                    style={[styles.catalogRedirectBtn, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 12, padding: 14 }]}
                    onPress={() => router.push(activeCategory === 'Tất cả' ? '/products' : { pathname: '/products', params: { category: activeCategory } })}
                    activeOpacity={0.88}
                  >
                    <View style={styles.catalogRedirectLeft}>
                      <View style={styles.catalogRedirectIconWrap}>
                        <IconSymbol name="square.grid.2x2" size={20} color="#0f172a" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.catalogRedirectTitle, isMobile && { fontSize: 13 }]}>
                          {activeCategory === 'Tất cả' 
                            ? `Khám phá toàn bộ ${products.length}+ sản phẩm tại Danh Mục` 
                            : `Xem toàn bộ ${filteredProducts.length} mẫu ${activeCategory} tại Danh Mục`}
                        </Text>
                        <Text style={[styles.catalogRedirectSub, isMobile && { fontSize: 11 }]}>
                          Trang Danh mục có đầy đủ bộ lọc tìm kiếm theo giá, size, màu sắc & phân loại chi tiết
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.catalogRedirectAction, isMobile && { alignSelf: 'stretch', justifyContent: 'center' }]}>
                      <Text style={styles.catalogRedirectActionText}>
                        {activeCategory === 'Tất cả' ? 'XEM TOÀN BỘ SẢN PHẨM' : `XEM TẤT CẢ ${activeCategory.toUpperCase()}`}
                      </Text>
                      <IconSymbol name="arrow.right" size={13} color="#ffffff" />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
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
  header: {
    backgroundColor: 'rgba(249, 249, 249, 0.9)',
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
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brandText: {
    fontSize: 36,
    fontWeight: '600',
    color: '#121212',
    letterSpacing: -0.5,
  },
  greetingText: {
    fontSize: 14,
    color: '#717171',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#A68B5B', // Champagne Gold
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  bannerContainer: {
    width: '100%',
    height: 420,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 48,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 24,
    zIndex: 20,
    width: '100%',
  },
  bannerTag: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 12,
    borderRadius: 4,
  },
  bannerTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#121212',
    letterSpacing: 1.5,
  },
  bannerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 40,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 20,
    maxWidth: 360,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bannerButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#121212',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  categoriesContainer: {
    marginBottom: 64,
  },
  categoriesContent: {
    gap: 12,
    paddingHorizontal: 20, // Add padding inside scrollview for better visual
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  categoryPillActive: {
    backgroundColor: '#121212',
    borderColor: '#121212',
  },
  categoryPillText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#121212',
  },
  categoryPillTextActive: {
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#121212',
    letterSpacing: -0.5,
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EAEAEA',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#717171',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featuredContent: {
    gap: 24,
    paddingBottom: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  featuredCard: {
    width: 320, // Wider for WOW effect
  },
  featuredImageContainer: {
    width: '100%',
    aspectRatio: 4 / 5, // Taller image!
    backgroundColor: '#f3f3f3',
    borderRadius: 0, // Sharp edges for editorial look
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.03)', // Extremely subtle overlay to make images pop
  },
  favoriteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  productName: {
    fontSize: 16,
    color: '#717171',
    fontWeight: '400',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  productPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '500',
    color: '#121212',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '500',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    marginBottom: 24,
  },
  gridImageContainer: {
    width: '100%',
    aspectRatio: 4 / 5, // Taller image
    backgroundColor: '#f3f3f3',
    borderRadius: 0, // Sharp edges
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  favoriteButtonSmall: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  gridName: {
    fontSize: 14,
    color: '#717171',
    fontWeight: '400',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  gridPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#121212',
  },
  discountBadgeCorner: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    zIndex: 10,
  },
  discountBadgeCornerText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  priceDiscounted: {
    color: '#ba1a1a',
    fontWeight: '700',
  },
  priceOriginalCrossed: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  pillCountText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  pillCountTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  categoryActiveBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryActiveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  clearCategoryFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearCategoryFilterText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  categoryTagCorner: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryTagCornerText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyCategoryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 56,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: 14,
  },
  emptyCategoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyCategorySubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  returnAllBtn: {
    marginTop: 16,
    backgroundColor: '#0f172a',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  returnAllBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  hotBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  hotBadgeText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  serviceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 28,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  serviceDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  serviceTextCol: {
    flexDirection: 'column',
  },
  serviceTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  serviceSubtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  midBannerCard: {
    position: 'relative',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: '#18181b',
  },
  midBannerImage: {
    width: '100%',
    height: 220,
  },
  midBannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  midBannerContent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    padding: 24,
    maxWidth: 420,
  },
  midBannerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 6,
    backdropFilter: 'blur(8px)',
  },
  midBannerBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  midBannerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginVertical: 6,
  },
  midBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    marginBottom: 14,
    lineHeight: 18,
  },
  midBannerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  midBannerCtaText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  trustCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  trustCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  trustIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trustCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  trustCardSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  trendBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  trendBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catalogRedirectBox: {
    marginTop: 20,
    marginBottom: 16,
  },
  catalogRedirectBtn: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  catalogRedirectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  catalogRedirectIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catalogRedirectTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  catalogRedirectSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  catalogRedirectAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  catalogRedirectActionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
