import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

export type Product = {
  id: string;
  name: string;
  price: string | number;
  category?: string;
  image: any;
  size?: string;
  color?: string;
  quantity?: number;
  stock?: number;
};

export type CartItem = Product & {
  cartItemId: string;
  quantity: number;
  stock: number;
};

export type Voucher = {
  code: string;
  discountType: 'percent' | 'fixed';
  value: number;
};

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  clearCart: () => void;
  subtotalPrice: number;
  discountAmount: number;
  totalPrice: number;
  itemCount: number;
  appliedVoucher: Voucher | null;
  applyVoucher: (code: string, userId?: string | number | null) => Promise<{ success: boolean; message: string }>;
  removeVoucher: () => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

// Vouchers are now validated via backend API
import { API_URL } from '@/constants/config';

export function parsePrice(priceVal: string | number | undefined | null): number {
  if (priceVal === undefined || priceVal === null) return 0;
  if (typeof priceVal === 'number') return priceVal;
  if (typeof priceVal === 'string') {
    const cleaned = priceVal.replace(/[^0-9]/g, '');
    return parseInt(cleaned, 10) || 0;
  }
  return 0;
}

export function getCartItemId(product: { id: string; size?: string; color?: string }): string {
  return `${product.id}_${product.size || 'M'}_${product.color || 'default'}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('THOITRANGHD_CART');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) setItems(parsed);
        }
      } catch (e) {
        console.error('Error loading cart:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem('THOITRANGHD_CART', JSON.stringify(items));
      } catch (e) {
        console.error('Error saving cart:', e);
      }
    }
  }, [items]);

  const addToCart = (product: Product) => {
    const cartItemId = getCartItemId(product);
    const addQty = product.quantity && product.quantity > 0 ? product.quantity : 1;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.cartItemId === cartItemId || (item.id === product.id && item.size === product.size && item.color === product.color)
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + addQty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          ...product,
          cartItemId,
          quantity: addQty,
          size: product.size || 'M',
          color: product.color || '#000000',
          stock: product.stock !== undefined ? product.stock : 999,
        },
      ];
    });
  };

  const removeFromCart = (cartItemIdOrId: string) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemIdOrId && item.id !== cartItemIdOrId));
  };

  const increaseQuantity = (cartItemIdOrId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId) {
          if (item.quantity < item.stock) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item; // Max stock reached
        }
        return item;
      })
    );
  };

  const decreaseQuantity = (cartItemIdOrId: string) => {
    setItems((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId) {
            if (item.quantity > 1) {
              return { ...item, quantity: item.quantity - 1 };
            }
            return null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const clearCart = () => {
    setItems([]);
    setAppliedVoucher(null);
  };

  const subtotalPrice = items.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0
  );

  let discountAmount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discountType === 'percent') {
      discountAmount = Math.round((subtotalPrice * appliedVoucher.value) / 100);
    } else {
      discountAmount = Math.min(appliedVoucher.value, subtotalPrice);
    }
  }

  const totalPrice = Math.max(0, subtotalPrice - discountAmount);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const applyVoucher = useCallback(async (code: string, userId?: string | number | null): Promise<{ success: boolean; message: string }> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Vui lòng nhập mã khuyến mãi' };
    }
    try {
      let url = `${API_URL}/api/vouchers/${cleanCode}?orderTotal=${subtotalPrice}`;
      if (userId) {
        url += `&userId=${userId}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.data) {
        const v = data.data;
        const voucher: Voucher = {
          code: v.code,
          discountType: v.discount_type as 'percent' | 'fixed',
          value: v.value,
        };
        setAppliedVoucher(voucher);
        return { success: true, message: `Đã áp dụng mã ${cleanCode}` };
      }
      return { success: false, message: data.message || 'Mã không hợp lệ! Thử: HD10, HD20, HD50K' };
    } catch (err) {
      console.error('Lỗi kiểm tra voucher:', err);
      return { success: false, message: 'Lỗi kết nối. Vui lòng thử lại.' };
    }
  }, []);

  const removeVoucher = () => {
    setAppliedVoucher(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        increaseQuantity,
        decreaseQuantity,
        clearCart,
        subtotalPrice,
        discountAmount,
        totalPrice,
        itemCount,
        appliedVoucher,
        applyVoucher,
        removeVoucher,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

