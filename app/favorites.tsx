import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useFavorites } from '@/contexts/FavoriteContext';
import { useResponsive } from '@/hooks/useResponsive';
import { getImageSource } from '@/constants/images';

export default function FavoritesScreen() {
  const router = useRouter();
  const { isDesktop, isTablet } = useResponsive();
  const { favoriteItems, toggleFavorite } = useFavorites();

  const numColumns = isDesktop ? 4 : isTablet ? 3 : 2;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
            <IconSymbol name="arrow.left" size={22} color="#1a1c1c" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            Sản phẩm yêu thích ({favoriteItems.length})
          </Text>
          <View style={styles.spacer} />
        </View>
      </View>

      {favoriteItems.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <IconSymbol name="heart" size={44} color="#9ca3af" />
          </View>
          <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
          <Text style={styles.emptyDesc}>
            Lưu lại những thiết kế bạn ấn tượng nhất bằng cách nhấn biểu tượng ❤️ để dễ dàng xem lại và mua sắm sau.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => router.push('/(tabs)/products')}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreBtnText}>Khám phá bộ sưu tập</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {favoriteItems.map((item) => {
              const productId = item.product_id || item.id;
              const formattedPrice = new Intl.NumberFormat('vi-VN', {
                style: 'currency',
                currency: 'VND',
              }).format(item.price);

              return (
                <View
                  key={productId}
                  style={[styles.productCard, { width: `${100 / numColumns}%` }]}
                >
                  <View style={styles.cardInner}>
                    <TouchableOpacity
                      style={styles.imageContainer}
                      onPress={() => router.push(`/products/${productId}`)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={getImageSource(item.image)}
                        style={styles.productImage}
                        contentFit="cover"
                      />

                      {/* Remove Favorite Button */}
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => toggleFavorite(item)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <IconSymbol name="trash" size={18} color="#ba1a1a" />
                      </TouchableOpacity>

                      {item.discount ? (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>-{item.discount}%</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.productInfo}
                      onPress={() => router.push(`/products/${productId}`)}
                    >
                      <Text style={styles.productName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {(() => {
                        const origPrice = item.originalPrice || item.original_price || (item.discount > 0 ? Math.round((item.price / (1 - item.discount / 100)) / 1000) * 1000 : null);
                        if (origPrice && origPrice > item.price) {
                          return (
                            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
                              <Text style={[styles.productPrice, { color: '#ba1a1a', fontWeight: '700' }]}>{formattedPrice}</Text>
                              <Text style={{ fontSize: 12, color: '#9ca3af', textDecorationLine: 'line-through' }}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(origPrice)}
                              </Text>
                            </View>
                          );
                        }
                        return <Text style={styles.productPrice}>{formattedPrice}</Text>;
                      })()}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
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
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  iconButton: {
    padding: 6,
    marginLeft: -6,
  },
  spacer: {
    width: 32,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1c1c',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 340,
    marginBottom: 28,
    lineHeight: 22,
  },
  exploreBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  productCard: {
    paddingHorizontal: 6,
    marginBottom: 20,
  },
  cardInner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f2f4',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f3f4f6',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  discountBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: '#ba1a1a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1c1c',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
  },
});
