import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import React, { useState, useEffect } from 'react';
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

  const categories = ['Tất cả', 'Áo', 'Quần', 'Váy', 'Bộ', 'Phụ kiện', 'Giày'];

  const filteredProducts = activeCategory === 'Tất cả'
    ? products
    : products.filter((p) => p.category === activeCategory);

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
        <View style={[styles.bannerContainer, { height: isDesktop ? 460 : isTablet ? 320 : 190, marginBottom: isMobile ? 20 : 40 }]}>
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

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.categoriesContainer, isMobile && { marginBottom: 20 }]} contentContainerStyle={[styles.categoriesContent, isMobile && { paddingHorizontal: 14, gap: 8 }]}>
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, isMobile && { paddingHorizontal: 16, paddingVertical: 8 }, isActive && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryPillText, isMobile && { fontSize: 13 }, isActive && styles.categoryPillTextActive]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#000000" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Featured Products */}
            <View style={[styles.sectionHeader, isMobile && { paddingHorizontal: 14, marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, isMobile && { fontSize: 18 }]}>Sản Phẩm Nổi Bật</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/products')}>
                <Text style={styles.viewAllText}>Xem tất cả</Text>
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

            {/* New Arrivals */}
            <View style={[styles.sectionHeader, isMobile && { paddingHorizontal: 14, marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, isMobile && { fontSize: 18 }]}>{activeCategory === 'Tất cả' ? 'Danh Sách Sản Phẩm' : `Sản Phẩm ${activeCategory}`}</Text>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => router.push('/products')}>
                <Text style={styles.viewAllText}>Xem tất cả ({filteredProducts.length})</Text>
                <IconSymbol name="arrow.right" size={14} color="#717171" />
              </TouchableOpacity>
            </View>

            <View style={[styles.gridContainer, { columnGap: gridColumnGap as any, rowGap: isMobile ? 16 : 24 }]}>
              {newArrivals.map((prod) => (
                <TouchableOpacity key={prod.id} style={[styles.gridItem, { width: gridItemWidth as any }]} onPress={() => router.push(`/products/${prod.id}`)}>
                  <View style={styles.gridImageContainer}>
                    <Image source={getImageSource(prod.image)} style={styles.gridImage} contentFit="cover" />
                    <View style={styles.imageOverlay} />
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
});
