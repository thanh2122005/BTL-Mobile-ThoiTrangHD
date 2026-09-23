import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_URL } from '@/constants/config';
import { useFavorites } from '@/contexts/FavoriteContext';
import { useResponsive } from '@/hooks/useResponsive';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getImageSource } from '@/constants/images';

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'discount';
type PriceRange = 'all' | 'under_500' | '500_1000' | 'over_1000';

export default function ProductsScreen() {
  const router = useRouter();
  const { isMobile, isTablet, isDesktop, isLargeScreen } = useResponsive();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc & Sắp xếp states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [tempSortBy, setTempSortBy] = useState<SortOption>('default');
  const [tempPriceRange, setTempPriceRange] = useState<PriceRange>('all');

  useEffect(() => {
    fetch(`${API_URL}/api/products`)
      .then(res => res.json())
      .then(data => {
        if (data && data.success) {
          setProducts(data.data || []);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Lỗi lấy danh sách sản phẩm:", err);
        setLoading(false);
      });
  }, []);

  const filters = ['Tất cả', 'Áo', 'Quần', 'Váy', 'Bộ', 'Phụ kiện', 'Giày'];
  const itemWidth = isDesktop ? '23.5%' : isTablet ? '31%' : '48%';
  const columnGap = isDesktop ? '2%' : isTablet ? '3.5%' : '4%';

  const sortOptions: { label: string; value: SortOption }[] = [
    { label: 'Phổ biến nhất', value: 'default' },
    { label: 'Giá: Thấp đến Cao', value: 'price_asc' },
    { label: 'Giá: Cao đến Thấp', value: 'price_desc' },
    { label: 'Giảm giá nhiều nhất', value: 'discount' },
  ];

  const priceRangeOptions: { label: string; value: PriceRange }[] = [
    { label: 'Tất cả mức giá', value: 'all' },
    { label: 'Dưới 500.000đ', value: 'under_500' },
    { label: '500.000đ - 1.000.000đ', value: '500_1000' },
    { label: 'Trên 1.000.000đ', value: 'over_1000' },
  ];

  const isFilteredOrSorted = sortBy !== 'default' || priceRange !== 'all';

  const handleOpenFilter = () => {
    setTempSortBy(sortBy);
    setTempPriceRange(priceRange);
    setShowFilterModal(true);
  };

  const handleApplyFilter = () => {
    setSortBy(tempSortBy);
    setPriceRange(tempPriceRange);
    setShowFilterModal(false);
  };

  const handleResetFilter = () => {
    setTempSortBy('default');
    setTempPriceRange('all');
    setSortBy('default');
    setPriceRange('all');
    setShowFilterModal(false);
  };

  const processedProducts = useMemo(() => {
    let list = products.filter(p => {
      // 1. Phân loại danh mục
      const matchesCategory = activeFilter === 'Tất cả' || p.category === activeFilter;
      // 2. Tìm kiếm tên
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
      // 3. Lọc theo khoảng giá
      const priceNum = Number(p.price) || 0;
      let matchesPrice = true;
      if (priceRange === 'under_500') {
        matchesPrice = priceNum < 500000;
      } else if (priceRange === '500_1000') {
        matchesPrice = priceNum >= 500000 && priceNum <= 1000000;
      } else if (priceRange === 'over_1000') {
        matchesPrice = priceNum > 1000000;
      }

      return matchesCategory && matchesSearch && matchesPrice;
    });

    // 4. Sắp xếp
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
    } else if (sortBy === 'discount') {
      list.sort((a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0));
    }

    return list;
  }, [products, activeFilter, searchQuery, priceRange, sortBy]);

  return (
    <SafeAreaView style={styles.safeArea}>

      {/* Header (Responsive) */}
      {isLargeScreen ? (
        <View style={styles.headerWeb}>
          <View style={styles.headerWebContent}>
            <TouchableOpacity style={styles.iconButton}>
              <IconSymbol name="line.3.horizontal" size={24} color="#1a1c1c" />
            </TouchableOpacity>
            <Text style={styles.brandTextWeb}>ThoiTrangHD</Text>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart')}>
              <IconSymbol name="bag" size={24} color="#1a1c1c" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.headerMobile}>
          <Text style={styles.brandTextMobile}>ThoiTrangHD</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/cart')}>
            <IconSymbol name="bag" size={24} color="#1a1c1c" />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.mainContainer}>
        {/* Search & Filter Area */}
        <View style={styles.searchFilterArea}>
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color="#747878" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm sản phẩm..."
              placeholderTextColor="#747878"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <IconSymbol name="xmark" size={18} color="#747878" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsContent}>
              {filters.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, activeFilter === f ? styles.chipActive : styles.chipInactive]}
                  onPress={() => setActiveFilter(f)}
                >
                  <Text style={[styles.chipText, activeFilter === f ? styles.chipTextActive : styles.chipTextInactive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.sortButtonContainer}>
              <TouchableOpacity
                style={[styles.sortButton, isFilteredOrSorted && styles.sortButtonActive]}
                onPress={handleOpenFilter}
              >
                <Text style={[styles.sortButtonText, isFilteredOrSorted && styles.sortButtonTextActive]}>
                  Lọc & Sắp xếp
                </Text>
                <IconSymbol
                  name="slider.horizontal.3"
                  size={18}
                  color={isFilteredOrSorted ? '#ffffff' : '#444748'}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bar thông tin số lượng kết quả */}
          <View style={styles.resultBar}>
            <Text style={styles.resultCountText}>
              Hiển thị {processedProducts.length} sản phẩm
              {isFilteredOrSorted && ' (đang lọc)'}
            </Text>
            {isFilteredOrSorted && (
              <TouchableOpacity onPress={handleResetFilter}>
                <Text style={styles.quickResetText}>Đặt lại bộ lọc</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Product Grid */}
        <ScrollView showsVerticalScrollIndicator={false} style={styles.gridScroll} contentContainerStyle={styles.gridContent}>
          {loading ? (
            <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
          ) : processedProducts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <IconSymbol name="magnifyingglass" size={48} color="#c4c7c7" />
              <Text style={styles.emptyTitle}>Không tìm thấy sản phẩm phù hợp</Text>
              <Text style={styles.emptySubtitle}>
                Vui lòng thử tìm với từ khóa khác hoặc điều chỉnh lại các tiêu chí lọc.
              </Text>
              <TouchableOpacity
                style={styles.emptyResetButton}
                onPress={() => {
                  setActiveFilter('Tất cả');
                  setSearchQuery('');
                  handleResetFilter();
                }}
              >
                <Text style={styles.emptyResetButtonText}>Xóa tất cả bộ lọc</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.grid, { columnGap: columnGap as any, rowGap: 24 }]}>
              {processedProducts.map(prod => {
                const imageSource = getImageSource(prod.image);
                const formattedPrice = typeof prod.price === 'number'
                  ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(prod.price)
                  : prod.price;

                return (
                  <TouchableOpacity
                    key={prod.id}
                    style={[styles.gridItem, { width: itemWidth as any }]}
                    onPress={() => router.push(`/products/${prod.id}`)}
                  >
                    <View style={styles.imageContainer}>
                      <Image source={imageSource} style={styles.productImage} contentFit="cover" />
                      <View style={styles.imageOverlay} />
                      {prod.stock !== undefined && prod.stock <= 0 ? (
                        <View style={styles.outOfStockBadge}>
                          <Text style={styles.outOfStockBadgeText}>HẾT HÀNG</Text>
                        </View>
                      ) : prod.discount ? (
                        <View style={styles.badgeContainer}>
                          <Text style={styles.badgeText}>-{prod.discount}%</Text>
                        </View>
                      ) : null}
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
                    <View style={styles.infoContainer}>
                      <Text style={styles.productName} numberOfLines={1}>{prod.name}</Text>
                      {(() => {
                        const origPrice = prod.originalPrice || prod.original_price || (prod.discount > 0 ? Math.round((prod.price / (1 - prod.discount / 100)) / 1000) * 1000 : null);
                        if (origPrice && origPrice > prod.price) {
                          return (
                            <View style={styles.priceRow}>
                              <Text style={styles.productPriceError}>{formattedPrice}</Text>
                              <Text style={styles.productOriginalPrice}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(origPrice)}
                              </Text>
                            </View>
                          );
                        }
                        return <Text style={styles.productPrice}>{formattedPrice}</Text>;
                      })()}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Modal Lọc & Sắp xếp */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showFilterModal}
          onRequestClose={() => setShowFilterModal(false)}
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setShowFilterModal(false)}
            />
            <View style={styles.modalCard}>
              {/* Header modal */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Lọc & Sắp xếp</Text>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  style={styles.modalCloseButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <IconSymbol name="xmark" size={20} color="#1a1c1c" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Section Sắp xếp */}
                <Text style={styles.modalSectionTitle}>Sắp xếp theo</Text>
                <View style={styles.modalOptionsGrid}>
                  {sortOptions.map(opt => {
                    const isSelected = tempSortBy === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                        onPress={() => setTempSortBy(opt.value)}
                      >
                        <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <IconSymbol name="checkmark" size={16} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Section Mức giá */}
                <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Khoảng giá</Text>
                <View style={styles.modalOptionsGrid}>
                  {priceRangeOptions.map(opt => {
                    const isSelected = tempPriceRange === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.modalOptionItem, isSelected && styles.modalOptionItemSelected]}
                        onPress={() => setTempPriceRange(opt.value)}
                      >
                        <Text style={[styles.modalOptionText, isSelected && styles.modalOptionTextSelected]}>
                          {opt.label}
                        </Text>
                        {isSelected && (
                          <IconSymbol name="checkmark" size={16} color="#ffffff" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Footer actions */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalResetButton}
                  onPress={handleResetFilter}
                >
                  <Text style={styles.modalResetButtonText}>Thiết lập lại</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalApplyButton}
                  onPress={handleApplyFilter}
                >
                  <Text style={styles.modalApplyButtonText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9f9f9', // bg-background
  },
  headerWeb: {
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(196, 199, 199, 0.3)',
    zIndex: 40,
  },
  headerWebContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  brandTextWeb: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1c1c',
    letterSpacing: -0.5,
  },
  headerMobile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    zIndex: 40,
  },
  brandTextMobile: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1c1c',
    letterSpacing: -0.5,
  },
  iconButton: {
    padding: 8,
  },
  mainContainer: {
    flex: 1,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  searchFilterArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#f9f9f9',
    zIndex: 30,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f3f3', // bg-surface-container-low
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(196,199,199,0.5)',
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1c1c',
    height: '100%',
    outlineStyle: 'none' as any,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipsScroll: {
    flex: 1,
    marginRight: 16,
  },
  chipsContent: {
    gap: 8,
    alignItems: 'center',
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#121212',
    borderColor: '#121212',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  chipInactive: {
    backgroundColor: '#ffffff',
    borderColor: '#EAEAEA',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  chipTextActive: {
    color: '#ffffff',
  },
  chipTextInactive: {
    color: '#717171',
  },
  sortButtonContainer: {
    borderLeftWidth: 1,
    borderLeftColor: '#EAEAEA',
    paddingLeft: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EAEAEA',
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#121212',
  },
  gridScroll: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 20,
    paddingBottom: 64,
    paddingTop: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    marginBottom: 24,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 5, // Taller image!
    backgroundColor: '#f3f3f3',
    borderRadius: 0, // Sharp editorial edges
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(26, 28, 28, 0.88)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    zIndex: 2,
  },
  outOfStockBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeContainer: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#A68B5B', // Champagne Gold
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 0,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  infoContainer: {
    marginTop: 0,
    paddingHorizontal: 0,
  },
  productName: {
    fontSize: 15,
    color: '#717171',
    fontWeight: '400',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  productPrice: {
    fontSize: 17,
    fontWeight: '500',
    color: '#121212',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 2,
  },
  productPriceError: {
    fontSize: 17,
    fontWeight: '500',
    color: '#ba1a1a',
  },
  productOriginalPrice: {
    fontSize: 14,
    color: '#717171',
    textDecorationLine: 'line-through',
  },
  sortButtonActive: {
    backgroundColor: '#121212',
    borderColor: '#121212',
  },
  sortButtonTextActive: {
    color: '#ffffff',
  },
  resultBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 4,
  },
  resultCountText: {
    fontSize: 13,
    color: '#717171',
    fontWeight: '500',
  },
  quickResetText: {
    fontSize: 13,
    color: '#121212',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1c1c',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#717171',
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyResetButton: {
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyResetButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#ffffff',
    width: '100%',
    maxWidth: 540,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1c1c',
    letterSpacing: -0.3,
  },
  modalCloseButton: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f3f3f3',
  },
  modalBody: {
    paddingVertical: 16,
  },
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1c1c',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  modalOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  modalOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAEAEA',
    backgroundColor: '#fafafa',
  },
  modalOptionItemSelected: {
    backgroundColor: '#121212',
    borderColor: '#121212',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#444748',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  modalResetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  modalResetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444748',
  },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121212',
  },
  modalApplyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
