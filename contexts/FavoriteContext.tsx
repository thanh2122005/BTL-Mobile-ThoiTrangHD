import React, { createContext, useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/config';
import { useAuth } from './AuthContext';

interface FavoriteContextType {
  favorites: string[];
  favoriteItems: any[];
  isFavorite: (productId: string | number) => boolean;
  toggleFavorite: (product: any) => Promise<void>;
  refreshFavorites: () => Promise<void>;
}

const FavoriteContext = createContext<FavoriteContextType | undefined>(undefined);
const FAVORITES_STORAGE_KEY = 'THOITRANGHD_FAVORITES';

export function FavoriteProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  // Load from local storage initially
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          setFavorites(parsed.ids || []);
          setFavoriteItems(parsed.items || []);
        }
      } catch (err) {
        console.error('Lỗi đọc danh sách yêu thích local:', err);
      }
    })();
  }, []);

  // Fetch from API
  const refreshFavorites = async () => {
    try {
      const url = user?.id ? `${API_URL}/api/favorites?userId=${user.id}` : `${API_URL}/api/favorites`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success && Array.isArray(data.data)) {
        const ids = data.data.map((item: any) => String(item.product_id));
        setFavorites(ids);
        setFavoriteItems(data.data);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ ids, items: data.data }));
      }
    } catch (err) {
      console.error('Lỗi đồng bộ danh sách yêu thích từ API:', err);
    }
  };

  useEffect(() => {
    refreshFavorites();
  }, [user]);

  const isFavorite = (productId: string | number) => {
    return favorites.includes(String(productId));
  };

  const toggleFavorite = async (product: any) => {
    const idStr = String(product.id || product.product_id);
    const currentlyFav = isFavorite(idStr);

    let nextIds: string[];
    let nextItems: any[];

    if (currentlyFav) {
      nextIds = favorites.filter(id => id !== idStr);
      nextItems = favoriteItems.filter(item => String(item.product_id || item.id) !== idStr);
      showToast('Đã xóa khỏi danh sách yêu thích');
    } else {
      nextIds = [...favorites, idStr];
      showToast('Đã thêm vào danh sách yêu thích');
      const newItem = {
        product_id: idStr,
        name: product.name,
        price: product.price,
        image: product.image,
        category: product.category,
        discount: product.discount || 0,
        original_price: product.original_price || product.originalPrice || null
      };
      nextItems = [newItem, ...favoriteItems];
    }

    setFavorites(nextIds);
    setFavoriteItems(nextItems);
    await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify({ ids: nextIds, items: nextItems }));

    // Send to backend
    try {
      if (currentlyFav) {
        const deleteUrl = user?.id 
          ? `${API_URL}/api/favorites/${idStr}?userId=${user.id}`
          : `${API_URL}/api/favorites/${idStr}`;
        await fetch(deleteUrl, { method: 'DELETE' });
      } else {
        await fetch(`${API_URL}/api/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id || null, productId: idStr })
        });
      }
    } catch (err) {
      console.error('Lỗi cập nhật yêu thích lên máy chủ:', err);
    }
  };

  return (
    <FavoriteContext.Provider value={{ favorites, favoriteItems, isFavorite, toggleFavorite, refreshFavorites }}>
      {children}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <IconSymbol name="checkmark.circle.fill" size={20} color="#2e7d32" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}
    </FavoriteContext.Provider>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  toastText: {
    fontSize: 14,
    color: '#1a1c1c',
    fontWeight: '500',
    flex: 1,
  },
});

export function useFavorites() {
  const context = useContext(FavoriteContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoriteProvider');
  }
  return context;
}
