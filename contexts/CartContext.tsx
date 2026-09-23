import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Platform } from 'react-native';
import { API_URL } from '@/constants/config';

export type CartItem = {
  id: string;
  cartItemId?: string;
  name: string;
  price: string | number;
  image: any;
  quantity: number;
  size?: string;
  color?: string;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  price: string | number;
  image: any;
  quantity?: number;
  size?: string;
  color?: string;
  stock?: number;
};

export type Voucher = {
  code: string;
  discountType: 'percent' | 'fixed';
  discount_type?: 'percent' | 'fixed';
  value: number;
};

export const FREE_SHIPPING_THRESHOLD = 300000;

type CartContextType = {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (cartItemId: string) => void;
  increaseQuantity: (cartItemId: string) => void;
  decreaseQuantity: (cartItemId: string) => void;
  clearCart: () => void;
  clearSelectedItems: () => void;
  updateCartItemVariant: (cartItemId: string, newSize: string, newColor: string) => void;
  subtotalPrice: number;
  discountAmount: number;
  totalPrice: number;
  itemCount: number;
  appliedVoucher: Voucher | null;
  applyVoucher: (code: string, userId?: string | number | null) => Promise<{ success: boolean; message: string }>;
  removeVoucher: () => void;
  // Selective checkout
  selectedItemIds: string[];
  toggleSelectItem: (cartItemId: string) => void;
  selectAllItems: () => void;
  deselectAllItems: () => void;
  selectedItems: CartItem[];
  selectedSubtotal: number;
  selectedDiscount: number;
  selectedTotal: number;
  shippingFee: number;
  isFreeShipping: boolean;
  amountNeededForFreeShipping: number;
  freeShippingThreshold: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = window.localStorage.getItem('THOITRANGHD_CART');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setItems(parsed);
            setSelectedItemIds(parsed.map((it: CartItem) => it.cartItemId || it.id));
          }
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
    const maxStock = product.stock !== undefined ? product.stock : 999;

    setSelectedItemIds((prev) => (prev.includes(cartItemId) ? prev : [...prev, cartItemId]));

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.cartItemId === cartItemId || (item.id === product.id && item.size === product.size && item.color === product.color)
      );
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const itemStock = updated[existingIndex].stock !== undefined ? updated[existingIndex].stock : maxStock;
        const newQty = Math.min(itemStock, currentQty + addQty);
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      }
      return [
        ...prev,
        {
          ...product,
          cartItemId,
          quantity: Math.min(maxStock, addQty),
          size: product.size || 'M',
          color: product.color || '#000000',
          stock: maxStock,
        },
      ];
    });
  };

  const removeFromCart = (cartItemIdOrId: string) => {
    setItems((prev) => prev.filter((item) => item.cartItemId !== cartItemIdOrId && item.id !== cartItemIdOrId));
    setSelectedItemIds((prev) => prev.filter((id) => id !== cartItemIdOrId));
  };

  const increaseQuantity = (cartItemIdOrId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId) {
          if (item.quantity < item.stock) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        }
        return item;
      })
    );
  };

  const decreaseQuantity = (cartItemIdOrId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemIdOrId || item.id === cartItemIdOrId) {
          return { ...item, quantity: Math.max(1, item.quantity - 1) };
        }
        return item;
      })
    );
  };

  const updateCartItemVariant = (cartItemId: string, newSize: string, newColor: string) => {
    setItems((prev) => {
      const itemIndex = prev.findIndex((item) => item.cartItemId === cartItemId || item.id === cartItemId);
      if (itemIndex === -1) return prev;

      const currentItem = prev[itemIndex];
      const newCartItemId = getCartItemId({ id: currentItem.id, size: newSize, color: newColor });

      if (newCartItemId === currentItem.cartItemId) return prev;

      const existingMatchIndex = prev.findIndex((item, idx) => idx !== itemIndex && item.cartItemId === newCartItemId);

      if (existingMatchIndex > -1) {
        const updated = [...prev];
        const combinedQty = Math.min(
          prev[existingMatchIndex].stock || 999,
          updated[existingMatchIndex].quantity + currentItem.quantity
        );
        updated[existingMatchIndex] = {
          ...updated[existingMatchIndex],
          quantity: combinedQty,
        };
        updated.splice(itemIndex, 1);
        setSelectedItemIds((oldIds) => oldIds.filter((id) => id !== cartItemId));
        return updated;
      } else {
        const updated = [...prev];
        updated[itemIndex] = {
          ...currentItem,
          cartItemId: newCartItemId,
          size: newSize,
          color: newColor,
        };
        setSelectedItemIds((oldIds) => oldIds.map((id) => (id === cartItemId ? newCartItemId : id)));
        return updated;
      }
    });
  };

  const toggleSelectItem = (cartItemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(cartItemId) ? prev.filter((id) => id !== cartItemId) : [...prev, cartItemId]
    );
  };

  const selectAllItems = () => {
    setSelectedItemIds(items.map((i) => i.cartItemId || i.id));
  };

  const deselectAllItems = () => {
    setSelectedItemIds([]);
  };

  const clearCart = () => {
    setItems([]);
    setSelectedItemIds([]);
    setAppliedVoucher(null);
  };

  const clearSelectedItems = () => {
    setItems((prev) => prev.filter((item) => !selectedItemIds.includes(item.cartItemId || item.id)));
    setSelectedItemIds([]);
    setAppliedVoucher(null);
  };

  // Selected items calculation
  const selectedItems = items.filter((item) => selectedItemIds.includes(item.cartItemId || item.id));

  const selectedSubtotal = selectedItems.reduce(
    (sum, item) => sum + parsePrice(item.price) * item.quantity,
    0
  );

  let selectedDiscount = 0;
  if (appliedVoucher && selectedSubtotal > 0) {
    if (appliedVoucher.discountType === 'percent') {
      selectedDiscount = Math.round((selectedSubtotal * appliedVoucher.value) / 100);
    } else {
      selectedDiscount = Math.min(appliedVoucher.value, selectedSubtotal);
    }
  }

  const isFreeShipping = selectedSubtotal >= FREE_SHIPPING_THRESHOLD;
  const shippingFee = selectedSubtotal > 0 && !isFreeShipping ? 30000 : 0;
  const amountNeededForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - selectedSubtotal);

  const selectedTotal = Math.max(0, selectedSubtotal - selectedDiscount) + shippingFee;

  const subtotalPrice = selectedSubtotal;
  const discountAmount = selectedDiscount;
  const totalPrice = selectedTotal;
  const itemCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);

  const applyVoucher = useCallback(async (code: string, userId?: string | number | null): Promise<{ success: boolean; message: string }> => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Vui lòng nhập mã khuyến mãi' };
    }
    try {
      let url = `${API_URL}/api/vouchers/${cleanCode}?orderTotal=${selectedSubtotal}`;
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
          discount_type: v.discount_type as 'percent' | 'fixed',
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
  }, [selectedSubtotal]);

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
        clearSelectedItems,
        updateCartItemVariant,
        subtotalPrice,
        discountAmount,
        totalPrice,
        itemCount,
        appliedVoucher,
        applyVoucher,
        removeVoucher,
        // Selective checkout
        selectedItemIds,
        toggleSelectItem,
        selectAllItems,
        deselectAllItems,
        selectedItems,
        selectedSubtotal,
        selectedDiscount,
        selectedTotal,
        shippingFee,
        isFreeShipping,
        amountNeededForFreeShipping,
        freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
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
