import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/contexts/AuthContext';
import { getImageSource } from '@/constants/images';

const formatVND = (num: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

type AdminTab = 'overview' | 'orders' | 'returns' | 'products' | 'inventory' | 'users' | 'vouchers';
type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';

export default function AdminScreen() {
  const router = useRouter();
  const { isLargeScreen, isDesktop, isMobile, width } = useResponsive();
  const { user, isAdmin, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState<any>({
    totalRevenue: 0,
    todayRevenue: 0,
    todayOrders: 0,
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
    recentOrders: [],
    dailyRevenue: [],
    topProducts: [],
    categoryStats: [],
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<any[]>([]);
  // Returns & Claims Ticket states
  const [returnTickets, setReturnTickets] = useState<any[]>([]);
  const [returnStats, setReturnStats] = useState({ total: 0, requested: 0, approved: 0, rejected: 0 });
  const [returnStatusFilter, setReturnStatusFilter] = useState<string>('ALL');
  const [returnSearch, setReturnSearch] = useState('');
  const [isUpdatingReturn, setIsUpdatingReturn] = useState<number | null>(null);
  const [stockImports, setStockImports] = useState<any[]>([]);
  const [stockSearch, setStockSearch] = useState('');
  const [selectedStockImport, setSelectedStockImport] = useState<any | null>(null);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState<any | null>(null);
  const [importProductSearch, setImportProductSearch] = useState('');

  // Filter & Search states
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(true);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    price: '',
    original_price: '',
    discount: '0',
    category: 'Áo',
    image: '',
    description: '',
  });

  // Inbound Stock Import Modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importProduct, setImportProduct] = useState<any | null>(null);
  const [importForm, setImportForm] = useState({
    supplier_name: 'Công ty Cổ phần Dệt May HD',
    batch_code: 'LO-2026-XUAN-01',
    quantity: '50',
    cost_price: '180000',
    qc_passed: true,
    note: 'Hàng may công nghiệp đạt chuẩn QC',
    size: 'M',
    color: 'Đen',
  });
  const [isSubmittingImport, setIsSubmittingImport] = useState(false);

  const generateBatchCode = () => {
    const seasons = ['XUAN', 'HE', 'THU', 'DONG', 'PRO'];
    const s = seasons[Math.floor(Math.random() * seasons.length)];
    const num = Math.floor(100 + Math.random() * 900);
    return `LO-2026-${s}-${num}`;
  };

  const handleOpenImportModal = (prod: any) => {
    setImportProduct(prod);
    setImportForm({
      supplier_name: 'Công ty Cổ phần Dệt May HD',
      batch_code: generateBatchCode(),
      quantity: '50',
      cost_price: '180000',
      qc_passed: true,
      note: 'Hàng xuất xưởng công nghiệp đạt chuẩn QC',
      size: 'M',
      color: 'Đen',
    });
    setShowImportModal(true);
  };

  const handleSubmitImport = async () => {
    if (!importProduct) return;
    const qty = parseInt(importForm.quantity, 10);
    if (!qty || qty <= 0) {
      showToast('Vui lòng nhập số lượng hợp lệ (> 0)');
      return;
    }
    setIsSubmittingImport(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/products/${importProduct.id}/import-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_name: importForm.supplier_name.trim(),
          batch_code: importForm.batch_code.trim(),
          quantity: qty,
          cost_price: parseInt(importForm.cost_price, 10) || 0,
          qc_passed: importForm.qc_passed,
          note: importForm.note.trim(),
          size: importForm.size,
          color: importForm.color,
        }),
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(data.message || `Đã nhập thêm ${qty} cái vào kho thành công!`);
        setShowImportModal(false);
        fetchData();
      } else {
        showToast(data?.message || 'Lỗi nhập hàng vào kho');
      }
    } catch (err) {
      showToast('Lỗi kết nối khi gửi phiếu nhập kho');
    } finally {
      setIsSubmittingImport(false);
    }
  };

  // Voucher Form
  const [showVoucherModal, setShowVoucherModal] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    discount_type: 'percent',
    value: '10',
    usage_limit: '',
    min_vip_level: 0,
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes, usersRes, prodRes, voucherRes, stockRes, returnsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/admin/orders`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/admin/users`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/products`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/admin/vouchers`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/admin/stock-imports`).then((r) => r.json()).catch(() => null),
        fetch(`${API_URL}/api/admin/returns`).then((r) => r.json()).catch(() => null),
      ]);

      if (statsRes && statsRes.success) setStats(statsRes.data);
      if (ordersRes && ordersRes.success) setOrders(ordersRes.data || []);
      if (usersRes && usersRes.success) setUsers(usersRes.data || []);
      if (prodRes && prodRes.success) setProducts(prodRes.data || []);
      if (voucherRes && voucherRes.success) setVouchers(voucherRes.data || []);
      if (stockRes && stockRes.success) setStockImports(stockRes.data || []);
      if (returnsRes && returnsRes.success) {
        setReturnTickets(returnsRes.data || []);
        if (returnsRes.stats) setReturnStats(returnsRes.stats);
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu quản trị:', err);
      showToast('Lỗi kết nối máy chủ quản trị');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/admin/auto-progression`)
      .then((r) => r.json())
      .then((d) => { if (d && d.success) setAutoProgressionEnabled(d.enabled); })
      .catch(() => null);
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Auto Progression & Bulk Handlers
  const handleToggleAutoProgression = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/auto-progression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !autoProgressionEnabled }),
      });
      const d = await res.json();
      if (d && d.success) {
        setAutoProgressionEnabled(d.enabled);
        showToast(d.message || (d.enabled ? 'Đã bật tự động duyệt đơn' : 'Đã tắt tự động duyệt đơn'));
      }
    } catch (e) {
      showToast('Lỗi khi đổi chế độ tự động');
    }
  };

  const handleBulkConfirmOrders = async () => {
    setIsBulkConfirming(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/bulk-confirm`, { method: 'POST' });
      const d = await res.json();
      if (d && d.success) {
        showToast(d.message || 'Đã duyệt toàn bộ đơn chờ!');
        fetchData();
      }
    } catch (e) {
      showToast('Lỗi khi duyệt hàng loạt');
    } finally {
      setIsBulkConfirming(false);
    }
  };

  const handleFastCompleteOrder = async (orderId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/fast-complete`, { method: 'PUT' });
      const d = await res.json();
      if (d && d.success) {
        showToast(`Đã hoàn tất đơn #${orderId}!`);
        fetchData();
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: 'Completed' }));
        }
      }
    } catch (e) {
      showToast('Lỗi khi hoàn tất đơn');
    }
  };

  // Return Status Update
  const handleUpdateReturnStatus = async (orderId: number, returnStatus: 'Approved' | 'Rejected') => {
    setIsUpdatingReturn(orderId);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/return-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ return_status: returnStatus }),
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(returnStatus === 'Approved' ? 'Đã phê duyệt yêu cầu đổi trả thành công!' : 'Đã từ chối yêu cầu đổi trả!');
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, return_status: returnStatus } : o))
        );
        setReturnTickets((prev) =>
          prev.map((t) => (t.id === orderId ? { ...t, return_status: returnStatus } : t))
        );
        fetch(`${API_URL}/api/admin/returns`)
          .then((r) => r.json())
          .then((d) => {
            if (d && d.success) {
              setReturnTickets(d.data || []);
              if (d.stats) setReturnStats(d.stats);
            }
          })
          .catch(() => {});
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, return_status: returnStatus }));
        }
      } else {
        showToast(data?.message || 'Lỗi khi cập nhật đổi trả');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi cập nhật đổi trả');
    } finally {
      setIsUpdatingReturn(null);
    }
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data && data.success) {
        const vnStatus =
          newStatus === 'Pending'
            ? 'Chờ xác nhận'
            : newStatus === 'Processing'
            ? 'Đang giao hàng'
            : newStatus === 'Completed'
            ? 'Hoàn thành'
            : 'Đã hủy đơn';
        showToast(`Đã chuyển trạng thái đơn #${orderId} sang "${vnStatus}"`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
        }
        // Refresh stats
        fetch(`${API_URL}/api/admin/stats`)
          .then((r) => r.json())
          .then((d) => d && d.success && setStats(d.data))
          .catch(() => {});
      } else {
        showToast(data?.message || 'Không thể cập nhật trạng thái');
      }
    } catch (err) {
      showToast('Lỗi mạng khi cập nhật trạng thái');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Product CRUD
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      price: '',
      original_price: '',
      discount: '0',
      category: 'Áo',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop',
      description: 'Chất liệu vải cao cấp, co giãn thoáng mát, form dáng chuẩn thời trang.',
    });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    setProdForm({
      name: prod.name || '',
      price: String(prod.price || ''),
      original_price: String(prod.original_price || prod.price || ''),
      discount: String(prod.discount || '0'),
      category: prod.category || 'Áo',
      image: prod.image || '',
      description: prod.description || '',
    });
    setShowProductModal(true);
  };

  const handlePickImage = async () => {
    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formData = new FormData();
        
        let filename = asset.fileName;
        if (!filename) {
          const ext = asset.uri.split('.').pop() || 'jpg';
          filename = `upload_${Date.now()}.${ext}`;
        }

        formData.append('image', {
          uri: Platform.OS === 'web' ? asset.uri : asset.uri.replace('file://', ''),
          name: filename,
          type: asset.mimeType || 'image/jpeg',
        } as any);

        showToast('Đang tải ảnh lên...');
        const res = await fetch(`${API_URL}/api/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
          },
        });
        const data = await res.json();
        if (data.success) {
          setProdForm({ ...prodForm, image: data.url });
          showToast('Tải ảnh thành công!');
        } else {
          showToast(data.message || 'Lỗi tải ảnh');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi tải ảnh');
    }
  };

  const handleSaveProduct = async () => {
    if (!prodForm.name.trim() || !prodForm.price.trim()) {
      showToast('Vui lòng nhập tên và giá sản phẩm');
      return;
    }
    const priceNum = parseInt(prodForm.price.replace(/\D/g, ''), 10);
    const origPriceNum = prodForm.original_price
      ? parseInt(prodForm.original_price.replace(/\D/g, ''), 10)
      : priceNum;
    const discountNum = parseInt(prodForm.discount || '0', 10);

    try {
      if (editingProduct) {
        // Update
        const res = await fetch(`${API_URL}/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prodForm.name.trim(),
            price: priceNum,
            original_price: origPriceNum,
            discount: discountNum,
            category: prodForm.category,
            image: prodForm.image,
            description: prodForm.description,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Đã cập nhật sản phẩm thành công');
          setShowProductModal(false);
          fetchData();
        } else {
          showToast(data.message || 'Lỗi cập nhật sản phẩm');
        }
      } else {
        // Create
        const res = await fetch(`${API_URL}/api/admin/products`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: prodForm.name.trim(),
            price: priceNum,
            original_price: origPriceNum,
            discount: discountNum,
            category: prodForm.category,
            image: prodForm.image,
            description: prodForm.description,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Đã thêm mới sản phẩm vào kho');
          setShowProductModal(false);
          fetchData();
        } else {
          showToast(data.message || 'Lỗi thêm sản phẩm');
        }
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ');
    }
  };

  const handleDeleteProduct = async (prodId: string, prodName: string) => {
    const doDelete = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/products/${prodId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Đã xóa sản phẩm "${prodName}"`);
          fetchData();
        } else {
          showToast(data.message || 'Không thể xóa sản phẩm này');
        }
      } catch (err) {
        showToast('Lỗi mạng khi xóa sản phẩm');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${prodName}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa "${prodName}"?`, [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  // Voucher Actions
  const handleCreateVoucher = async () => {
    if (!voucherForm.code.trim() || !voucherForm.value.trim()) {
      showToast('Vui lòng nhập mã và giá trị giảm');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/vouchers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: voucherForm.code.trim().toUpperCase(),
          discount_type: voucherForm.discount_type,
          value: parseInt(voucherForm.value.replace(/\D/g, ''), 10),
          usage_limit: voucherForm.usage_limit ? parseInt(voucherForm.usage_limit.replace(/\D/g, ''), 10) : null,
          min_vip_level: voucherForm.min_vip_level,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Đã tạo mã giảm giá thành công');
        setShowVoucherModal(false);
        setVoucherForm({ code: '', discount_type: 'percent', value: '10', usage_limit: '', min_vip_level: 0 });
        fetchData();
      } else {
        showToast(data.message || 'Lỗi tạo voucher');
      }
    } catch (e) {
      showToast('Lỗi mạng khi tạo voucher');
    }
  };

  const handleDeleteVoucher = async (code: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/vouchers/${code}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã xóa voucher ${code}`);
        fetchData();
      }
    } catch (e) {
      showToast('Lỗi xóa voucher');
    }
  };

  // Toggle user role between admin and user
  const handleToggleUserRole = async (userId: number, newRole: 'admin' | 'user', userName: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (data && data.success) {
        showToast(`Đã chuyển vai trò của "${userName}" thành ${newRole === 'admin' ? 'QUẢN TRỊ VIÊN' : 'KHÁCH HÀNG'}`);
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
      } else {
        showToast(data?.message || 'Không thể đổi quyền tài khoản');
      }
    } catch (err) {
      showToast('Lỗi mạng khi đổi quyền');
    }
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        orderStatusFilter === 'ALL' ||
        order.status?.toLowerCase() === orderStatusFilter.toLowerCase();
      const q = orderSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (order.order_code && order.order_code.toLowerCase().includes(q)) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(q)) ||
        (order.customer_phone && order.customer_phone.includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.toLowerCase().trim();
      return (
        !q ||
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q))
      );
    });
  }, [users, userSearch]);

  // Filtered Products
  const selectableProducts = useMemo(() => {
    if (!importProductSearch.trim()) return products;
    const q = importProductSearch.toLowerCase().trim();
    return products.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        String(p.id).includes(q) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }, [products, importProductSearch]);

  const filteredStockImports = useMemo(() => {
    if (!stockSearch.trim()) return stockImports;
    const q = stockSearch.toLowerCase().trim();
    return stockImports.filter(
      (item) =>
        (item.batch_code && item.batch_code.toLowerCase().includes(q)) ||
        (item.product_name && item.product_name.toLowerCase().includes(q)) ||
        (item.supplier_name && item.supplier_name.toLowerCase().includes(q))
    );
  }, [stockImports, stockSearch]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat =
        productCategoryFilter === 'ALL' ||
        (p.category && p.category.toLowerCase() === productCategoryFilter.toLowerCase());
      const q = productSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.id && String(p.id).toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, productCategoryFilter, productSearch]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Helper status badge styling
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return { label: 'Chờ xác nhận', bg: '#fef3c7', text: '#b45309', border: '#fde68a' };
      case 'Processing':
        return { label: 'Đang giao hàng', bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' };
      case 'Completed':
        return { label: 'Hoàn thành', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };
      case 'Cancelled':
        return { label: 'Đã hủy đơn', bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' };
      default:
        return { label: status, bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' };
    }
  };

  // Max revenue in daily chart for scaling
  const maxDailyRevenue = useMemo(() => {
    if (!stats.dailyRevenue || stats.dailyRevenue.length === 0) return 1000000;
    const max = Math.max(...stats.dailyRevenue.map((d: any) => Number(d.revenue) || 0));
    return max > 0 ? max : 1000000;
  }, [stats.dailyRevenue]);

  // Filtered return tickets memo
  const filteredReturnTickets = useMemo(() => {
    return returnTickets.filter((ticket) => {
      if (returnStatusFilter !== 'ALL' && ticket.return_status !== returnStatusFilter) {
        return false;
      }
      if (returnSearch.trim()) {
        const q = returnSearch.toLowerCase();
        const matchCode = ticket.order_code?.toLowerCase().includes(q);
        const matchName = (ticket.customer_name || ticket.user_name || '')?.toLowerCase().includes(q);
        const matchPhone = ticket.customer_phone?.toLowerCase().includes(q);
        const matchReason = ticket.return_reason?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchPhone && !matchReason) return false;
      }
      return true;
    });
  }, [returnTickets, returnStatusFilter, returnSearch]);

  const tabsList = [
    { key: 'overview', label: 'Tổng quan', icon: 'square.grid.2x2' },
    {
      key: 'orders',
      label: 'Đơn hàng',
      icon: 'cube.box',
      badge: stats.pendingOrders > 0 ? `${stats.pendingOrders}` : `${orders.length}`,
      badgeAlert: stats.pendingOrders > 0,
    },
    {
      key: 'returns',
      label: 'Đổi trả',
      icon: 'arrow.2.squarepath',
      badge: returnStats.requested > 0 ? `${returnStats.requested}` : (returnStats.total > 0 ? `${returnStats.total}` : undefined),
      badgeAlert: returnStats.requested > 0,
    },
    {
      key: 'products',
      label: 'Sản phẩm',
      icon: 'bag',
      badge: `${products.length}`,
    },
    {
      key: 'inventory',
      label: 'Nhập kho',
      icon: 'cube.box',
      badge: stockImports.length > 0 ? `${stockImports.length}` : undefined,
    },
    {
      key: 'users',
      label: 'Khách hàng',
      icon: 'person.fill',
      badge: `${users.length}`,
    },
    {
      key: 'vouchers',
      label: 'Mã giảm giá',
      icon: 'banknote',
      badge: `${vouchers.length}`,
    },
  ];

  // Access Control: Block non-admin users
  if (!authLoading && !isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.accessDeniedContainer}>
          <View style={styles.lockIconCircle}>
            <IconSymbol name="lock" size={44} color="#0f172a" />
          </View>
          <Text style={styles.accessDeniedTitle}>Truy Cập Bị Giới Hạn</Text>
          <Text style={styles.accessDeniedSubtitle}>
            Trang này chỉ dành riêng cho tài khoản có quyền Quản Trị Viên (Admin). Khách hàng thông thường không được phép truy cập.
          </Text>

          <View style={styles.accountInfoCard}>
            <Text style={styles.accountInfoLabel}>Tài khoản hiện tại của bạn:</Text>
            <Text style={styles.accountInfoName}>
              {user ? `${user.name} (${user.email})` : 'Chưa đăng nhập'}
            </Text>
            <View style={styles.currentRoleBadge}>
              <Text style={styles.currentRoleText}>
                Vai trò: {user?.role === 'admin' ? 'Quản trị viên' : 'Khách hàng (User)'}
              </Text>
            </View>
          </View>

          <View style={styles.accessDeniedBtnGroup}>
            <TouchableOpacity
              style={styles.adminLoginBtn}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.adminLoginBtnText}>Đăng nhập tài khoản Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <Text style={styles.backHomeBtnText}>Quay về Cửa Hàng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Toast notification */}
      {toastMessage && (
        <View style={styles.toastContainer}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Modern Luxury Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {/* Left: Back + Brand */}
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => router.push('/(tabs)/user')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={18} color="#0f172a" />
            </TouchableOpacity>
            <View>
              <View style={styles.brandBadgeRow}>
                <Text style={styles.headerBrand}>THỜI TRANG HD</Text>
                <View style={styles.adminBadge}>
                  <Text style={styles.adminBadgeText}>ADMIN PORTAL</Text>
                </View>
              </View>
              <Text style={styles.headerSub} numberOfLines={1}>
                {isMobile ? 'Quản trị hệ thống' : 'Bảng điều khiển quản trị doanh nghiệp thời gian thực'}
              </Text>
            </View>
          </View>

          {/* Right: Actions */}
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.storefrontBtn}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <IconSymbol name="bag" size={15} color="#0f172a" />
              <Text style={styles.storefrontBtnText}>
                {isMobile ? 'Cửa Hàng' : 'Xem Cửa Hàng'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={handleRefresh}
              activeOpacity={0.8}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <View style={styles.onlineDot} />
                  <Text style={styles.refreshBtnText}>Đồng bộ</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs Bar - Premium Segmented Ribbon */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              {tabsList.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabItemPill,
                      isActive && styles.tabItemPillActive,
                    ]}
                    onPress={() => setActiveTab(tab.key as AdminTab)}
                    activeOpacity={0.75}
                  >
                    <IconSymbol
                      name={tab.icon as any}
                      size={15}
                      color={isActive ? '#ffffff' : '#64748b'}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabItemText,
                        isActive && styles.tabItemTextActive,
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.badge ? (
                      <View
                        style={[
                          styles.tabBadgePill,
                          isActive && styles.tabBadgePillActive,
                          tab.badgeAlert && (isActive ? styles.tabBadgeAlertPillActive : styles.tabBadgeAlertPill),
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            isActive && styles.tabBadgeTextActive,
                            tab.badgeAlert && (isActive ? styles.tabBadgeAlertTextActive : styles.tabBadgeAlertText),
                          ]}
                        >
                          {tab.badge}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </View>

      {/* Main Body Content */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0f172a" />
          <Text style={styles.loadingText}>Đang tải dữ liệu thời gian thực từ hệ thống...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && { maxWidth: 1120, alignSelf: 'center', width: '100%' },
          ]}
        >
          {/* TAB 1: OVERVIEW & ANALYTICS */}
          {activeTab === 'overview' && (
            <View style={styles.tabContent}>
              {/* 4 Clean Metric Cards */}
              <View style={styles.metricsGrid}>
                {/* Metric 1: Doanh Thu */}
                <View style={[styles.metricCard, { borderTopColor: '#10b981' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricCardTitle}>TỔNG DOANH THU</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#ecfdf5' }]}>
                      <IconSymbol name="banknote" size={17} color="#059669" />
                    </View>
                  </View>
                  <Text style={styles.metricCardValue}>{formatVND(stats.totalRevenue)}</Text>
                  <View style={styles.metricCardFooter}>
                    <View style={styles.growthBadge}>
                      <Text style={styles.growthText}>Hôm nay:</Text>
                    </View>
                    <Text style={styles.metricSubText}>
                      +{formatVND(stats.todayRevenue)} ({stats.todayOrders || 0} đơn)
                    </Text>
                  </View>
                </View>

                {/* Metric 2: Đơn Hàng */}
                <View style={[styles.metricCard, { borderTopColor: '#3b82f6' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricCardTitle}>TỔNG ĐƠN HÀNG</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#eff6ff' }]}>
                      <IconSymbol name="cube.box" size={17} color="#2563eb" />
                    </View>
                  </View>
                  <Text style={styles.metricCardValue}>{stats.totalOrders} đơn</Text>
                  <View style={styles.metricCardFooter}>
                    <View style={[styles.growthBadge, { backgroundColor: '#fef3c7' }]}>
                      <Text style={[styles.growthText, { color: '#b45309' }]}>
                        {stats.pendingOrders} chờ duyệt
                      </Text>
                    </View>
                    <Text style={styles.metricSubText}>
                      {stats.processingOrders} đang giao &bull; {stats.completedOrders} xong
                    </Text>
                  </View>
                </View>

                {/* Metric 3: Khách Hàng */}
                <View style={[styles.metricCard, { borderTopColor: '#8b5cf6' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricCardTitle}>KHÁCH HÀNG CRM</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#f5f3ff' }]}>
                      <IconSymbol name="person.fill" size={17} color="#7c3aed" />
                    </View>
                  </View>
                  <Text style={styles.metricCardValue}>{stats.totalUsers} thành viên</Text>
                  <View style={styles.metricCardFooter}>
                    <Text style={styles.metricSubText}>Người dùng đăng ký hệ thống</Text>
                  </View>
                </View>

                {/* Metric 4: Sản Phẩm */}
                <View style={[styles.metricCard, { borderTopColor: '#f59e0b' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={styles.metricCardTitle}>KHO HÀNG SẢN PHẨM</Text>
                    <View style={[styles.metricIconWrap, { backgroundColor: '#fffbeb' }]}>
                      <IconSymbol name="bag" size={17} color="#d97706" />
                    </View>
                  </View>
                  <Text style={styles.metricCardValue}>{stats.totalProducts} mặt hàng</Text>
                  <View style={styles.metricCardFooter}>
                    <Text style={styles.metricSubText}>
                      {stats.categoryStats?.length || 6} phân loại danh mục
                    </Text>
                  </View>
                </View>
              </View>

              {/* 7-DAY REVENUE BAR CHART & PIPELINE SECTION */}
              <View style={[styles.analyticsRow, isDesktop && styles.analyticsRowDesktop]}>
                {/* 7-Day Interactive Bar Chart */}
                <View style={[styles.cardContainer, isDesktop ? { flex: 1.6 } : { width: '100%' }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Biểu Đồ Doanh Thu 7 Ngày Gần Nhất</Text>
                      <Text style={styles.cardSubtitle}>Doanh số phát sinh thực tế (VNĐ)</Text>
                    </View>
                    <View style={styles.chartLegend}>
                      <View style={styles.legendDot} />
                      <Text style={styles.legendText}>Doanh thu / ngày</Text>
                    </View>
                  </View>

                  <View style={styles.chartWrapper}>
                    <View style={styles.barsContainer}>
                      {stats.dailyRevenue && stats.dailyRevenue.length > 0 ? (
                        stats.dailyRevenue.map((item: any, idx: number) => {
                          const rev = Number(item.revenue) || 0;
                          const heightPercent = Math.max(12, Math.round((rev / maxDailyRevenue) * 100));
                          const isToday = idx === stats.dailyRevenue.length - 1;
                          return (
                            <View key={item.date || idx} style={styles.barCol}>
                              <Text style={styles.barValText}>
                                {rev > 0 ? `${Math.round(rev / 1000)}k` : '0'}
                              </Text>
                              <View style={styles.barTrack}>
                                <View
                                  style={[
                                    styles.barFill,
                                    {
                                      height: `${heightPercent}%`,
                                      backgroundColor: isToday ? '#0f172a' : '#cbd5e1',
                                    },
                                  ]}
                                />
                              </View>
                              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                                {item.label}
                              </Text>
                              {isToday && <View style={styles.todayIndicatorDot} />}
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.emptyText}>Chưa có dữ liệu giao dịch 7 ngày qua</Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* Pipeline Trạng Thái Đơn Hàng */}
                <View style={[styles.cardContainer, isDesktop ? { flex: 1 } : { width: '100%' }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Phân Bổ Trạng Thái Đơn</Text>
                      <Text style={styles.cardSubtitle}>Quy trình xử lý đơn hàng</Text>
                    </View>
                  </View>

                  {/* Multi-segment Progress Bar - Percentage width based, never overflows */}
                  <View style={styles.pipelineBar}>
                    {stats.totalOrders > 0 ? (
                      (() => {
                        const total = stats.totalOrders;
                        const pendingPct = (stats.pendingOrders / total) * 100;
                        const processingPct = (stats.processingOrders / total) * 100;
                        const completedPct = (stats.completedOrders / total) * 100;
                        const cancelledPct = (stats.cancelledOrders / total) * 100;
                        return (
                          <>
                            {pendingPct > 0 && (
                              <View
                                style={{
                                  width: `${pendingPct}%`,
                                  backgroundColor: '#f59e0b',
                                  height: '100%',
                                }}
                              />
                            )}
                            {processingPct > 0 && (
                              <View
                                style={{
                                  width: `${processingPct}%`,
                                  backgroundColor: '#3b82f6',
                                  height: '100%',
                                }}
                              />
                            )}
                            {completedPct > 0 && (
                              <View
                                style={{
                                  width: `${completedPct}%`,
                                  backgroundColor: '#10b981',
                                  height: '100%',
                                }}
                              />
                            )}
                            {cancelledPct > 0 && (
                              <View
                                style={{
                                  width: `${cancelledPct}%`,
                                  backgroundColor: '#ef4444',
                                  height: '100%',
                                }}
                              />
                            )}
                          </>
                        );
                      })()
                    ) : (
                      <View style={{ width: '100%', backgroundColor: '#f1f5f9', height: '100%' }} />
                    )}
                  </View>

                  {/* Status Breakdown Legend - Robust flex layout, badges never cut off */}
                  <View style={styles.statusLegendList}>
                    {[
                      { label: 'Chờ xác nhận', count: stats.pendingOrders, color: '#f59e0b', bg: '#fef3c7' },
                      { label: 'Đang giao hàng', count: stats.processingOrders, color: '#3b82f6', bg: '#eff6ff' },
                      { label: 'Hoàn thành', count: stats.completedOrders, color: '#10b981', bg: '#ecfdf5' },
                      { label: 'Đã hủy đơn', count: stats.cancelledOrders, color: '#ef4444', bg: '#fef2f2' },
                    ].map((st) => (
                      <View key={st.label} style={styles.statusLegendItem}>
                        <View style={styles.statusLegendLabelCol}>
                          <View style={[styles.statusColorSquare, { backgroundColor: st.color }]} />
                          <Text style={styles.statusLegendLabel} numberOfLines={1}>
                            {st.label}
                          </Text>
                        </View>
                        <View style={[styles.statusCountBadge, { backgroundColor: st.bg }]}>
                          <Text style={[styles.statusCountText, { color: st.color }]}>
                            {st.count || 0} đơn
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* TOP BEST SELLERS & RECENT ORDERS */}
              <View style={[styles.analyticsRow, isDesktop && styles.analyticsRowDesktop]}>
                {/* Top Best Sellers */}
                <View style={[styles.cardContainer, isDesktop ? { flex: 1 } : { width: '100%' }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Top Sản Phẩm Bán Chạy Nhất</Text>
                      <Text style={styles.cardSubtitle}>Dựa trên số lượng sản phẩm xuất kho</Text>
                    </View>
                  </View>

                  {stats.topProducts && stats.topProducts.length > 0 ? (
                    <View style={styles.topProdList}>
                      {stats.topProducts.map((tp: any, index: number) => (
                        <View key={tp.product_id || index} style={styles.topProdItem}>
                          <View
                            style={[
                              styles.rankBadge,
                              index === 0 && styles.rankGold,
                              index === 1 && styles.rankSilver,
                              index === 2 && styles.rankBronze,
                            ]}
                          >
                            <Text
                              style={[
                                styles.rankText,
                                index === 0 && { color: '#b45309' },
                              ]}
                            >
                              #{index + 1}
                            </Text>
                          </View>
                          <Image
                            source={getImageSource(tp.image)}
                            style={styles.topProdThumb}
                            contentFit="cover"
                          />
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.topProdName} numberOfLines={1}>
                              {tp.product_name}
                            </Text>
                            <Text style={styles.topProdCategory}>{tp.category || 'Thời trang'}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.topProdSold}>{tp.sold_count} đã bán</Text>
                            <Text style={styles.topProdRevenue}>{formatVND(Number(tp.revenue))}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>Chưa có giao dịch sản phẩm nào</Text>
                  )}
                </View>

                {/* Recent Orders Action Queue */}
                <View style={[styles.cardContainer, isDesktop ? { flex: 1 } : { width: '100%' }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.cardTitle}>Đơn Hàng Mới Cần Xử Lý</Text>
                      <Text style={styles.cardSubtitle}>5 đơn phát sinh gần đây nhất</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setActiveTab('orders')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.viewAllLink}>Xem tất cả &rarr;</Text>
                    </TouchableOpacity>
                  </View>

                  {stats.recentOrders && stats.recentOrders.length > 0 ? (
                    <View style={styles.recentOrdersList}>
                      {stats.recentOrders.map((ord: any) => {
                        const b = getStatusBadge(ord.status);
                        return (
                          <TouchableOpacity
                            key={ord.id}
                            style={styles.recentOrderItem}
                            onPress={() => {
                              const found = orders.find((o) => o.id === ord.id) || ord;
                              setSelectedOrder(found);
                            }}
                            activeOpacity={0.7}
                          >
                            <View>
                              <Text style={styles.recentOrderCode}>#{ord.order_code}</Text>
                              <Text style={styles.recentOrderCustomer}>
                                {ord.customer_name} &bull; {ord.customer_phone}
                              </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.recentOrderPrice}>
                                {formatVND(ord.total_price)}
                              </Text>
                              <View style={[styles.badgePill, { backgroundColor: b.bg, borderColor: b.border }]}>
                                <Text style={[styles.badgePillText, { color: b.text }]}>
                                  {b.label}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>Chưa có đơn hàng nào</Text>
                  )}
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: ORDER MANAGEMENT */}
          {activeTab === 'orders' && (
            <View style={styles.tabContent}>
              {/* Order Filter Bar */}
              <View style={styles.controlsCard}>
                <View style={styles.searchBar}>
                  <IconSymbol name="magnifyingglass" size={17} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm theo mã đơn (#HD...), tên khách hàng, số điện thoại..."
                    value={orderSearch}
                    onChangeText={setOrderSearch}
                    placeholderTextColor="#94a3b8"
                  />
                  {orderSearch ? (
                    <TouchableOpacity onPress={() => setOrderSearch('')}>
                      <IconSymbol name="trash" size={15} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Automation & Quick Action Bar */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#f8fafc',
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 10,
                  padding: 10,
                  marginTop: 10,
                  marginBottom: 10,
                  gap: 10,
                  flexWrap: 'wrap'
                }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: autoProgressionEnabled ? '#ecfdf5' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: autoProgressionEnabled ? '#a7f3d0' : '#cbd5e1',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 20
                    }}
                    onPress={handleToggleAutoProgression}
                    activeOpacity={0.8}
                  >
                    <IconSymbol 
                      name="bolt.fill" 
                      size={14} 
                      color={autoProgressionEnabled ? '#15803d' : '#64748b'} 
                    />
                    <Text style={{ 
                      fontSize: 12, 
                      fontWeight: '700', 
                      color: autoProgressionEnabled ? '#15803d' : '#64748b' 
                    }}>
                      Tự động hóa tiến trình: {autoProgressionEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                    </Text>
                  </TouchableOpacity>

                  {stats.pendingOrders > 0 && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        backgroundColor: '#1e293b',
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 20,
                        opacity: isBulkConfirming ? 0.7 : 1
                      }}
                      onPress={handleBulkConfirmOrders}
                      disabled={isBulkConfirming}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="checkmark.circle.fill" size={14} color="#ffffff" />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
                        Duyệt tất cả {stats.pendingOrders} đơn chờ
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Filter Status Chips */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsRow}
                >
                  {[
                    { key: 'ALL', label: 'Tất cả đơn', count: orders.length },
                    { key: 'Pending', label: 'Chờ xác nhận', count: stats.pendingOrders },
                    { key: 'Processing', label: 'Đang giao', count: stats.processingOrders },
                    { key: 'Completed', label: 'Hoàn thành', count: stats.completedOrders },
                    { key: 'Cancelled', label: 'Đã hủy', count: stats.cancelledOrders },
                  ].map((chip) => {
                    const isSelected = orderStatusFilter === chip.key;
                    return (
                      <TouchableOpacity
                        key={chip.key}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setOrderStatusFilter(chip.key)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {chip.label}
                        </Text>
                        <View
                          style={[
                            styles.chipCountBadge,
                            isSelected && styles.chipCountBadgeActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipCountText,
                              isSelected && styles.chipCountTextActive,
                            ]}
                          >
                            {chip.count || 0}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <IconSymbol name="cube.box" size={40} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>Không tìm thấy đơn hàng nào</Text>
                  <Text style={styles.emptySub}>
                    Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                  </Text>
                </View>
              ) : (
                filteredOrders.map((order) => {
                  const b = getStatusBadge(order.status);
                  const isUpdating = updatingOrderId === order.id;

                  return (
                    <View key={order.id} style={styles.orderCard}>
                      {/* Card Header */}
                      <View style={styles.orderCardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={styles.orderCardCode}>#{order.order_code}</Text>
                          {order.return_status === 'Requested' && (
                            <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#b78103' }}>🔄 ĐỔI TRẢ</Text>
                            </View>
                          )}
                          <View
                            style={[
                              styles.badgePill,
                              { backgroundColor: b.bg, borderColor: b.border },
                            ]}
                          >
                            <Text style={[styles.badgePillText, { color: b.text }]}>
                              {b.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.orderCardDate}>
                          {order.created_at
                            ? new Date(order.created_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : ''}
                        </Text>
                      </View>

                      {/* Customer Info */}
                      <View style={styles.orderCustomerSection}>
                        <View style={styles.customerDetailRow}>
                          <IconSymbol name="person.fill" size={15} color="#64748b" />
                          <Text style={styles.customerNameBold}>{order.customer_name}</Text>
                          <Text style={styles.customerPhone}>• {order.customer_phone}</Text>
                        </View>
                        <View style={styles.customerDetailRow}>
                          <IconSymbol name="location" size={15} color="#64748b" />
                          <Text style={styles.customerAddress} numberOfLines={2}>
                            {order.customer_address}
                          </Text>
                        </View>
                      </View>

                      {/* Items Preview */}
                      {order.items && order.items.length > 0 && (
                        <View style={styles.orderItemsSection}>
                          {order.items.map((item: any, idx: number) => (
                            <View key={item.id || idx} style={styles.orderItemRow}>
                              <Image
                                source={getImageSource(item.image)}
                                style={styles.orderItemThumb}
                                contentFit="cover"
                              />
                              <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.orderItemName} numberOfLines={1}>
                                  {item.product_name}
                                </Text>
                                <Text style={styles.orderItemMeta}>
                                  {item.size ? `Size ${item.size}` : ''}
                                  {item.color ? ` • Màu ${item.color === '#000000' ? 'Đen' : item.color}` : ''}
                                  {` • SL: ${item.quantity}`}
                                </Text>
                              </View>
                              <Text style={styles.orderItemPrice}>
                                {formatVND(item.price * item.quantity)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Total and Payment */}
                      <View style={styles.orderTotalRow}>
                        <View style={styles.paymentMethodPill}>
                          <IconSymbol name="creditcard" size={14} color="#475569" />
                          <Text style={styles.paymentMethodText}>
                            {order.payment_method === 'bank'
                              ? 'Chuyển khoản QR'
                              : 'Thanh toán khi nhận (COD)'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.totalLabel}>Tổng tiền thu:</Text>
                          <Text style={styles.totalAmountValue}>
                            {formatVND(order.total_price)}
                          </Text>
                        </View>
                      </View>

                      {/* Card Actions */}
                      <View style={styles.orderActionsRow}>
                        <TouchableOpacity
                          style={styles.detailBtn}
                          onPress={() => setSelectedOrder(order)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="doc.plaintext" size={14} color="#0f172a" />
                          <Text style={styles.detailBtnText}>Chi tiết & Timeline</Text>
                        </TouchableOpacity>

                        <View style={styles.actionButtonGroup}>
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="#0f172a" />
                          ) : (
                            <>
                              {order.status === 'Pending' && (
                                <TouchableOpacity
                                  style={[styles.statusActionBtn, styles.approveBtn]}
                                  onPress={() => handleUpdateOrderStatus(order.id, 'Processing')}
                                >
                                  <Text style={styles.approveBtnText}>Duyệt giao</Text>
                                </TouchableOpacity>
                              )}

                              {order.status === 'Processing' && (
                                <TouchableOpacity
                                  style={[styles.statusActionBtn, styles.completeBtn]}
                                  onPress={() => handleUpdateOrderStatus(order.id, 'Completed')}
                                >
                                  <Text style={styles.completeBtnText}>Hoàn tất</Text>
                                </TouchableOpacity>
                              )}

                              {order.status !== 'Cancelled' && order.status !== 'Completed' && (
                                <TouchableOpacity
                                  style={[styles.statusActionBtn, styles.cancelBtn]}
                                  onPress={() => handleUpdateOrderStatus(order.id, 'Cancelled')}
                                >
                                  <Text style={styles.cancelBtnText}>Hủy đơn</Text>
                                </TouchableOpacity>
                              )}

                              {order.status === 'Cancelled' && (
                                <TouchableOpacity
                                  style={[styles.statusActionBtn, styles.reopenBtn]}
                                  onPress={() => handleUpdateOrderStatus(order.id, 'Pending')}
                                >
                                  <Text style={styles.reopenBtnText}>Mở lại đơn</Text>
                                </TouchableOpacity>
                              )}
                            </>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB: RETURNS & CLAIMS MANAGEMENT (TICKETS ĐỔI TRẢ & BẢO HÀNH) */}
          {activeTab === 'returns' && (
            <View style={styles.tabContent}>
              {/* 4 Metric Cards */}
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <View style={styles.metricIconWrap}>
                    <IconSymbol name="arrow.2.squarepath" size={20} color="#0f172a" />
                  </View>
                  <Text style={styles.metricValue}>{returnStats.total}</Text>
                  <Text style={styles.metricLabel}>Tổng Yêu Cầu</Text>
                  <Text style={styles.metricSub}>Toàn bộ tickets phát sinh</Text>
                </View>

                <View style={[styles.metricCard, { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#fffbeb' }]}>
                    <IconSymbol name="bell" size={20} color="#d97706" />
                  </View>
                  <Text style={[styles.metricValue, { color: '#d97706' }]}>{returnStats.requested}</Text>
                  <Text style={styles.metricLabel}>Chờ Xử Lý</Text>
                  <Text style={[styles.metricSub, { color: returnStats.requested > 0 ? '#b45309' : '#64748b', fontWeight: '600' }]}>
                    {returnStats.requested > 0 ? 'Cần duyệt ngay' : 'Đã xử lý xong'}
                  </Text>
                </View>

                <View style={[styles.metricCard, { borderLeftWidth: 3, borderLeftColor: '#10b981' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#ecfdf5' }]}>
                    <IconSymbol name="checkmark.seal" size={20} color="#059669" />
                  </View>
                  <Text style={[styles.metricValue, { color: '#059669' }]}>{returnStats.approved}</Text>
                  <Text style={styles.metricLabel}>Đã Chấp Thuận</Text>
                  <Text style={styles.metricSub}>Thu hồi & cấp đổi mới</Text>
                </View>

                <View style={[styles.metricCard, { borderLeftWidth: 3, borderLeftColor: '#f43f5e' }]}>
                  <View style={[styles.metricIconWrap, { backgroundColor: '#fff1f2' }]}>
                    <IconSymbol name="minus" size={20} color="#e11d48" />
                  </View>
                  <Text style={[styles.metricValue, { color: '#e11d48' }]}>{returnStats.rejected}</Text>
                  <Text style={styles.metricLabel}>Đã Từ Chối</Text>
                  <Text style={styles.metricSub}>Không đủ điều kiện</Text>
                </View>
              </View>

              {/* Controls Card: Search & Filter */}
              <View style={styles.controlsCard}>
                <View style={styles.searchBar}>
                  <IconSymbol name="magnifyingglass" size={17} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm theo mã đơn (#HD...), tên khách, SĐT, lý do..."
                    value={returnSearch}
                    onChangeText={setReturnSearch}
                    placeholderTextColor="#94a3b8"
                  />
                  {returnSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setReturnSearch('')}>
                      <IconSymbol name="xmark" size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  {[
                    { key: 'ALL', label: `Tất Cả (${returnStats.total})` },
                    { key: 'Requested', label: `Chờ Duyệt (${returnStats.requested})` },
                    { key: 'Approved', label: `Đã Chấp Thuận (${returnStats.approved})` },
                    { key: 'Rejected', label: `Đã Từ Chối (${returnStats.rejected})` },
                  ].map((chip) => {
                    const isSelected = returnStatusFilter === chip.key;
                    return (
                      <TouchableOpacity
                        key={chip.key}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setReturnStatusFilter(chip.key)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                          {chip.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Ticket Cards List */}
              {filteredReturnTickets.length === 0 ? (
                <View style={styles.emptyCard}>
                  <IconSymbol name="arrow.2.squarepath" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyTitle}>Không có yêu cầu đổi trả nào</Text>
                  <Text style={styles.emptySub}>
                    {returnSearch ? 'Không tìm thấy ticket nào khớp với từ khóa tìm kiếm' : 'Hiện tại chưa phát sinh yêu cầu đổi trả nào từ khách hàng'}
                  </Text>
                </View>
              ) : (
                filteredReturnTickets.map((ticket) => {
                  const isPending = ticket.return_status === 'Requested';
                  const isApproved = ticket.return_status === 'Approved';
                  const isRejected = ticket.return_status === 'Rejected';
                  const isUpdatingThis = isUpdatingReturn === ticket.id;

                  return (
                    <View key={ticket.id} style={styles.returnTicketCard}>
                      {/* Ticket Header */}
                      <View style={styles.returnTicketHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={styles.ticketBadgeWrap}>
                            <Text style={styles.ticketCode}>#{ticket.order_code}</Text>
                          </View>
                          <Text style={styles.ticketDate}>
                            {new Date(ticket.created_at).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.ticketStatusBadge,
                            isPending && styles.ticketStatusPending,
                            isApproved && styles.ticketStatusApproved,
                            isRejected && styles.ticketStatusRejected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.ticketStatusText,
                              isPending && { color: '#b45309' },
                              isApproved && { color: '#047857' },
                              isRejected && { color: '#b91c1c' },
                            ]}
                          >
                            {isPending ? '⏳ CHỜ ADMIN DUYỆT' : isApproved ? '✓ ĐÃ CHẤP THUẬN' : '✕ ĐÃ TỪ CHỐI'}
                          </Text>
                        </View>
                      </View>

                      {/* Customer Row */}
                      <View style={styles.returnCustomerRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.returnCustomerName}>
                            Khách hàng: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{ticket.customer_name || ticket.user_name || 'Khách vãng lai'}</Text>
                          </Text>
                          <Text style={styles.returnCustomerPhone}>
                            SĐT: {ticket.customer_phone || 'Chưa cập nhật'} • Đ/c: {ticket.customer_address || 'Địa chỉ tiêu chuẩn'}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.returnTotalAmount}>{formatVND(Number(ticket.total_price))}</Text>
                          <Text style={styles.returnPaymentMethod}>PTTT: {ticket.payment_method?.toUpperCase() || 'COD'}</Text>
                        </View>
                      </View>

                      {/* Return Detail Highlight */}
                      <View style={styles.returnDetailBanner}>
                        <View style={styles.returnDetailRow}>
                          <Text style={styles.returnDetailLabel}>📌 Lý do đổi trả:</Text>
                          <Text style={styles.returnDetailValue}>{ticket.return_reason || 'Yêu cầu đổi size/mẫu'}</Text>
                        </View>

                        {ticket.return_target_size && (
                          <View style={[styles.returnDetailRow, { marginTop: 6 }]}>
                            <Text style={styles.returnDetailLabel}>🔄 Size muốn đổi sang:</Text>
                            <View style={styles.targetSizeChip}>
                              <Text style={styles.targetSizeText}>Size {ticket.return_target_size}</Text>
                            </View>
                          </View>
                        )}

                        {ticket.return_target_color && (
                          <View style={[styles.returnDetailRow, { marginTop: 6 }]}>
                            <Text style={styles.returnDetailLabel}>🎨 Màu muốn đổi sang:</Text>
                            <View style={[styles.targetSizeChip, { backgroundColor: '#fdf4ff' }]}>
                              <Text style={[styles.targetSizeText, { color: '#9333ea' }]}>{ticket.return_target_color}</Text>
                            </View>
                          </View>
                        )}

                        {ticket.return_images && (
                          <View style={{ marginTop: 8 }}>
                            <Text style={[styles.returnDetailLabel, { marginBottom: 6 }]}>📸 Ảnh minh chứng:</Text>
                            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                              {(() => {
                                try {
                                  const imgs = typeof ticket.return_images === 'string' ? JSON.parse(ticket.return_images) : ticket.return_images;
                                  if (Array.isArray(imgs)) {
                                    return imgs.map((imgUrl: string, imgIdx: number) => (
                                      <Image
                                        key={imgIdx}
                                        source={getImageSource(imgUrl)}
                                        style={{ width: 44, height: 44, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' }}
                                        contentFit="cover"
                                      />
                                    ));
                                  }
                                } catch (e) {}
                                return null;
                              })()}
                            </View>
                          </View>
                        )}

                        {ticket.return_note && (
                          <View style={[styles.returnDetailRow, { marginTop: 6 }]}>
                            <Text style={styles.returnDetailLabel}>📝 Ghi chú từ khách:</Text>
                            <Text style={[styles.returnDetailValue, { fontStyle: 'italic', color: '#475569' }]}>
                              "{ticket.return_note}"
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Items Section */}
                      <View style={styles.returnItemsSection}>
                        <Text style={styles.returnItemsTitle}>Sản phẩm trong đơn hàng:</Text>
                        {(ticket.items || []).map((item: any, idx: number) => (
                          <View key={item.id || idx} style={styles.returnItemRow}>
                            <Image
                              source={getImageSource(item.image)}
                              style={styles.returnItemThumb}
                              contentFit="cover"
                            />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={styles.returnItemName} numberOfLines={1}>
                                {item.product_name}
                              </Text>
                              <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                                {item.size && (
                                  <View style={styles.itemVariantPill}>
                                    <Text style={styles.itemVariantPillText}>Size: {item.size}</Text>
                                  </View>
                                )}
                                {item.color && (
                                  <View style={styles.itemVariantPill}>
                                    <Text style={styles.itemVariantPillText}>Màu: {item.color}</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={styles.returnItemQty}>x{item.quantity}</Text>
                              <Text style={styles.returnItemPrice}>{formatVND(Number(item.price))}</Text>
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* Admin Actions */}
                      <View style={styles.returnActionBar}>
                        {isPending ? (
                          <>
                            <TouchableOpacity
                              style={[styles.btnActionReturn, styles.btnRejectReturn]}
                              onPress={() => handleUpdateReturnStatus(ticket.id, 'Rejected')}
                              disabled={isUpdatingThis}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="minus" size={15} color="#e11d48" />
                              <Text style={styles.btnRejectReturnText}>Từ Chối Yêu Cầu</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btnActionReturn, styles.btnApproveReturn]}
                              onPress={() => handleUpdateReturnStatus(ticket.id, 'Approved')}
                              disabled={isUpdatingThis}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="checkmark.seal" size={15} color="#ffffff" />
                              <Text style={styles.btnApproveReturnText}>Chấp Thuận Đổi Trả</Text>
                            </TouchableOpacity>
                          </>
                        ) : isApproved ? (
                          <View style={styles.statusConfirmedBanner}>
                            <IconSymbol name="checkmark.seal" size={16} color="#059669" />
                            <Text style={styles.statusConfirmedText}>
                              Yêu cầu đã được Admin chấp thuận. Tiến trình đổi hàng / hoàn tiền đang được thực thi.
                            </Text>
                            <TouchableOpacity
                              style={styles.revertBtn}
                              onPress={() => handleUpdateReturnStatus(ticket.id, 'Rejected')}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.revertBtnText}>Đổi sang từ chối</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <View style={[styles.statusConfirmedBanner, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}>
                            <IconSymbol name="minus" size={16} color="#e11d48" />
                            <Text style={[styles.statusConfirmedText, { color: '#9f1239' }]}>
                              Yêu cầu đã bị từ chối tiếp nhận bởi Admin do không đáp ứng chính sách.
                            </Text>
                            <TouchableOpacity
                              style={[styles.revertBtn, { borderColor: '#fecdd3' }]}
                              onPress={() => handleUpdateReturnStatus(ticket.id, 'Approved')}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.revertBtnText, { color: '#059669' }]}>Xét duyệt lại</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* TAB 3: PRODUCT & INVENTORY MANAGEMENT */}
          {activeTab === 'products' && (
            <View style={styles.tabContent}>
              {/* Product Header & Action */}
              <View style={styles.controlsCard}>
                <View style={styles.productTopControls}>
                  <View style={[styles.searchBar, { flex: 1 }]}>
                    <IconSymbol name="magnifyingglass" size={17} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm sản phẩm theo tên, mã SKU..."
                      value={productSearch}
                      onChangeText={setProductSearch}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.addProductBtn, { backgroundColor: '#15803d', marginRight: 10 }]}
                    onPress={() => {
                      if (products.length > 0) {
                        handleOpenImportModal(products[0]);
                      } else {
                        showToast('Chưa có sản phẩm nào để lập phiếu nhập kho');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="cube.box" size={15} color="#ffffff" />
                    <Text style={styles.addProductBtnText}>📦 Lập Phiếu Nhập Kho</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.addProductBtn}
                    onPress={handleOpenAddProduct}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="plus" size={15} color="#ffffff" />
                    <Text style={styles.addProductBtnText}>+ Thêm Sản Phẩm</Text>
                  </TouchableOpacity>
                </View>

                {/* Category Pills */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterChipsRow}
                >
                  {categories.map((cat) => {
                    const isSelected = productCategoryFilter === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.filterChip, isSelected && styles.filterChipActive]}
                        onPress={() => setProductCategoryFilter(cat)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            isSelected && styles.filterChipTextActive,
                          ]}
                        >
                          {cat === 'ALL' ? 'Tất cả danh mục' : cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Product Grid */}
              <View style={styles.productGrid}>
                {filteredProducts.map((prod) => (
                  <View key={prod.id} style={styles.productCard}>
                    <View style={styles.productCardThumbWrap}>
                      <Image
                        source={getImageSource(prod.image)}
                        style={styles.productCardThumb}
                        contentFit="cover"
                      />
                      <View style={styles.productCategoryBadge}>
                        <Text style={styles.productCategoryBadgeText}>
                          {prod.category || 'Thời trang'}
                        </Text>
                      </View>
                      {prod.discount > 0 && (
                        <View style={styles.discountBadge}>
                          <Text style={styles.discountBadgeText}>-{prod.discount}%</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.productCardBody}>
                      <Text style={styles.productCardId}>Mã SKU: #{prod.id}</Text>
                      <Text style={styles.productCardName} numberOfLines={2}>
                        {prod.name}
                      </Text>

                      <View style={styles.productPriceRow}>
                        <Text style={styles.productCardPrice}>{formatVND(prod.price)}</Text>
                        {prod.original_price > prod.price && (
                          <Text style={styles.productCardOrigPrice}>
                            {formatVND(prod.original_price)}
                          </Text>
                        )}
                      </View>

                      <View style={styles.productStockRow}>
                        <View style={[styles.stockPill, (prod.stock || 0) <= 10 && styles.stockPillLow]}>
                          <IconSymbol name="cube.box" size={12} color={(prod.stock || 0) <= 10 ? "#dc2626" : "#16a34a"} />
                          <Text style={[styles.stockPillText, (prod.stock || 0) <= 10 && styles.stockPillTextLow]}>
                            Kho: {prod.stock !== undefined ? prod.stock : 50} cái
                          </Text>
                        </View>
                        <Text style={styles.soldCountText}>Đã bán: {prod.sold_count || 0}</Text>
                      </View>

                      <View style={styles.productActionsRow}>
                        <TouchableOpacity
                          style={styles.variantProdBtn}
                          onPress={() => setSelectedVariantProduct(prod)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="slider.horizontal.3" size={12} color="#4338ca" />
                          <Text style={styles.variantProdBtnText}>Size/Màu</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.importProdBtn}
                          onPress={() => handleOpenImportModal(prod)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="plus" size={12} color="#15803d" />
                          <Text style={styles.importProdBtnText}>Nhập kho</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.editProdBtn}
                          onPress={() => handleOpenEditProduct(prod)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="slider.horizontal.3" size={13} color="#0284c7" />
                          <Text style={styles.editProdBtnText}>Sửa</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteProdBtn}
                          onPress={() => handleDeleteProduct(prod.id, prod.name)}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="trash" size={13} color="#dc2626" />
                          <Text style={styles.deleteProdBtnText}>Xóa</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB: INBOUND INVENTORY & QC MANAGEMENT */}
          {activeTab === 'inventory' && (
            <View style={styles.tabContent}>
              {/* Header card */}
              <View style={styles.inventoryHeaderCard}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={styles.inventoryIconWrap}>
                      <IconSymbol name="cube.box" size={18} color="#15803d" />
                    </View>
                    <Text style={styles.cardTitle}>QUẢN LÝ NHẬP KHO & LÔ HÀNG (INBOUND QC)</Text>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    Tiêu chuẩn may mặc công nghiệp "100 cái như 100" • Giám sát phiếu nhập theo Lô SX (Batch No) & Kiểm định xuất xưởng
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addProductBtn, { backgroundColor: '#15803d' }]}
                  onPress={() => {
                    if (products.length > 0) {
                      handleOpenImportModal(products[0]);
                    } else {
                      showToast('Chưa có sản phẩm nào để lập phiếu nhập kho');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="plus" size={15} color="#ffffff" />
                  <Text style={styles.addProductBtnText}>📦 Lập Phiếu Nhập Kho Mới</Text>
                </TouchableOpacity>
              </View>

              {/* 4 Inbound Metric Cards */}
              <View style={styles.metricsGrid}>
                <View style={[styles.metricCard, { borderTopColor: '#15803d' }]}>
                  <Text style={styles.metricLabel}>TỔNG SỐ LÔ NHẬP</Text>
                  <Text style={styles.metricValue}>{stockImports.length} lô</Text>
                  <Text style={styles.metricHint}>Đã ghi nhận vào kho hệ thống</Text>
                </View>
                <View style={[styles.metricCard, { borderTopColor: '#0284c7' }]}>
                  <Text style={styles.metricLabel}>TỔNG SẢN PHẨM NHẬP</Text>
                  <Text style={styles.metricValue}>
                    {stockImports.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0)} cái
                  </Text>
                  <Text style={styles.metricHint}>Cộng dồn vào tồn kho bán lẻ</Text>
                </View>
                <View style={[styles.metricCard, { borderTopColor: '#8b5cf6' }]}>
                  <Text style={styles.metricLabel}>TỔNG GIÁ VỐN NHẬP</Text>
                  <Text style={styles.metricValue}>
                    {formatVND(stockImports.reduce((acc, c) => acc + (Number(c.quantity) * Number(c.cost_price) || 0), 0))}
                  </Text>
                  <Text style={styles.metricHint}>Chi phí vốn lô hàng SX</Text>
                </View>
                <View style={[styles.metricCard, { borderTopColor: '#f59e0b' }]}>
                  <Text style={styles.metricLabel}>ĐẠT CHUẨN KIỂM ĐỊNH QC</Text>
                  <Text style={[styles.metricValue, { color: '#15803d' }]}>100%</Text>
                  <Text style={styles.metricHint}>Đường may, cúc bấm, phom dáng</Text>
                </View>
              </View>

              {/* Controls Filter */}
              <View style={styles.controlsCard}>
                <View style={styles.searchBar}>
                  <IconSymbol name="magnifyingglass" size={17} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm kiếm theo mã Lô (Batch No), tên sản phẩm, xưởng may đối tác..."
                    value={stockSearch}
                    onChangeText={setStockSearch}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* Inbound Receipts List */}
              <View style={{ gap: 14 }}>
                {filteredStockImports.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <IconSymbol name="cube.box" size={44} color="#94a3b8" />
                    <Text style={styles.emptyText}>Chưa có phiếu nhập kho nào phù hợp</Text>
                    <TouchableOpacity
                      style={[styles.addProductBtn, { backgroundColor: '#15803d', marginTop: 12 }]}
                      onPress={() => {
                        if (products.length > 0) handleOpenImportModal(products[0]);
                      }}
                    >
                      <Text style={styles.addProductBtnText}>+ Tạo phiếu nhập hàng đầu tiên</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  filteredStockImports.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.stockImportCard}
                      onPress={() => setSelectedStockImport(item)}
                      activeOpacity={0.92}
                    >
                      <View style={styles.stockImportHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <View style={styles.batchBadge}>
                            <Text style={styles.batchBadgeText}>🏷️ Lô SX: {item.batch_code}</Text>
                          </View>
                          <Text style={styles.importTimeText}>
                            🕒 {new Date(item.imported_at).toLocaleString('vi-VN')}
                          </Text>
                        </View>
                        <View style={styles.qcVerifiedBadge}>
                          <IconSymbol name="checkmark.circle.fill" size={13} color="#15803d" />
                          <Text style={styles.qcVerifiedBadgeText}>ĐẠT CHUẨN QC 100/100</Text>
                        </View>
                      </View>

                      <View style={styles.stockImportBody}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.importProdTitle}>{item.product_name}</Text>
                          <Text style={styles.importSupName}>
                            🏢 Xưởng / Nhà cung cấp: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{item.supplier_name}</Text>
                          </Text>
                          {item.note ? (
                            <Text style={styles.importNoteText}>📝 Biên bản nghiệm thu: {item.note}</Text>
                          ) : null}
                        </View>

                        <View style={styles.importQtyBox}>
                          <Text style={styles.importQtyLabel}>Số lượng nhập:</Text>
                          <Text style={styles.importQtyValue}>+{item.quantity} cái</Text>
                          <Text style={styles.importCostText}>
                            Giá vốn: {formatVND(item.cost_price)}/cái
                          </Text>
                          <Text style={styles.importTotalCostText}>
                            Tổng vốn: {formatVND((item.cost_price || 0) * item.quantity)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.stockImportFooter}>
                        <Text style={styles.standardQcFootnote}>
                          🛡️ Nghiệm thu may mặc công nghiệp: Kiểm định xác suất đường may 5 kim, khuy bấm, vải dệt định lượng chuẩn không bai dão sau giặt.
                        </Text>
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
                          <TouchableOpacity
                            style={styles.viewDetailReceiptBtn}
                            onPress={() => setSelectedStockImport(item)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="magnifyingglass" size={13} color="#0284c7" />
                            <Text style={styles.viewDetailReceiptBtnText}>🔍 Xem Chi Tiết Phiếu & Biên Bản QC</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>
          )}

          {/* TAB 4: CUSTOMER CRM */}
          {activeTab === 'users' && (
            <View style={styles.tabContent}>
              <View style={styles.controlsCard}>
                <View style={styles.searchBar}>
                  <IconSymbol name="magnifyingglass" size={17} color="#94a3b8" />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Tìm khách hàng theo tên, email, số điện thoại..."
                    value={userSearch}
                    onChangeText={setUserSearch}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              <View style={styles.userListContainer}>
                {filteredUsers.map((u) => {
                  const spent = Number(u.total_spent) || 0;
                  const ordersCount = Number(u.order_count) || 0;
                  const isVIP = spent >= 2000000;
                  const isGold = spent >= 500000 && !isVIP;

                  return (
                    <View key={u.id} style={styles.userCard}>
                      <View style={styles.userCardLeft}>
                        <View style={styles.userAvatar}>
                          <Text style={styles.userAvatarText}>
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.userNameText}>{u.name}</Text>
                            {u.role === 'admin' ? (
                              <View style={styles.roleAdminBadge}>
                                <Text style={styles.roleAdminBadgeText}>ADMIN</Text>
                              </View>
                            ) : (
                              <View style={styles.roleCustomerBadge}>
                                <Text style={styles.roleCustomerBadgeText}>KHÁCH HÀNG</Text>
                              </View>
                            )}
                            {isVIP && (
                              <View style={styles.vipDiamondBadge}>
                                <Text style={styles.vipDiamondText}>VIP KIM CƯƠNG</Text>
                              </View>
                            )}
                            {isGold && (
                              <View style={styles.vipGoldBadge}>
                                <Text style={styles.vipGoldText}>VIP VÀNG</Text>
                              </View>
                            )}
                          </View>

                          <View style={styles.userInfoRow}>
                            <IconSymbol name="envelope" size={13} color="#64748b" />
                            <Text style={styles.userInfoText}>{u.email}</Text>
                          </View>
                          {u.phone && (
                            <View style={styles.userInfoRow}>
                              <IconSymbol name="car" size={13} color="#64748b" />
                              <Text style={styles.userInfoText}>{u.phone}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.userCardStats}>
                        <View style={styles.userStatBox}>
                          <Text style={styles.userStatNumber}>{ordersCount}</Text>
                          <Text style={styles.userStatLabel}>Đơn mua</Text>
                        </View>
                        <View style={styles.userStatBox}>
                          <Text style={[styles.userStatNumber, { color: '#059669' }]}>
                            {formatVND(spent)}
                          </Text>
                          <Text style={styles.userStatLabel}>Tổng chi tiêu</Text>
                        </View>

                        {/* Nút cấp / hạ quyền tài khoản */}
                        <TouchableOpacity
                          style={[
                            styles.roleActionBtn,
                            u.role === 'admin' ? styles.demoteBtn : styles.promoteBtn,
                          ]}
                          onPress={() =>
                            handleToggleUserRole(
                              u.id,
                              u.role === 'admin' ? 'user' : 'admin',
                              u.name
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.roleActionBtnText,
                              u.role === 'admin' ? styles.demoteBtnText : styles.promoteBtnText,
                            ]}
                          >
                            {u.role === 'admin' ? 'Hạ quyền' : 'Cấp Admin'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 5: VOUCHERS MANAGEMENT */}
          {activeTab === 'vouchers' && (
            <View style={styles.tabContent}>
              <View style={styles.voucherTopCard}>
                <View>
                  <Text style={styles.cardTitle}>Mã Khuyến Mãi & Giảm Giá</Text>
                  <Text style={styles.cardSubtitle}>
                    Quản lý các chương trình ưu đãi tri ân khách hàng
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.addProductBtn}
                  onPress={() => setShowVoucherModal(true)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="plus" size={15} color="#ffffff" />
                  <Text style={styles.addProductBtnText}>+ Tạo Mã Voucher</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.voucherGrid}>
                {vouchers.map((v) => (
                  <View key={v.code} style={styles.voucherCard}>
                    <View style={styles.voucherHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.voucherCodeBadge}>
                          <Text style={styles.voucherCodeText}>{v.code}</Text>
                        </View>
                        {v.min_vip_level === 1 && (
                          <View style={styles.vipGoldBadge}>
                            <Text style={styles.vipGoldText}>VIP VÀNG</Text>
                          </View>
                        )}
                        {v.min_vip_level === 2 && (
                          <View style={styles.vipDiamondBadge}>
                            <Text style={styles.vipDiamondText}>VIP KIM CƯƠNG</Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDeleteVoucher(v.code)}
                        style={styles.deleteVoucherBtn}
                      >
                        <IconSymbol name="trash" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.voucherValueText}>
                      Giảm: {v.discount_type === 'percent' ? `${v.value}%` : formatVND(v.value)}
                    </Text>
                    <Text style={styles.voucherTypeDesc}>
                      Loại: {v.discount_type === 'percent' ? 'Giảm theo phần trăm (%)' : 'Giảm tiền mặt cố định'}
                    </Text>
                    <Text style={[styles.voucherTypeDesc, { marginTop: 4, color: '#64748b', fontWeight: '500' }]}>
                      Đã dùng: {v.times_used || 0} / {v.usage_limit ? v.usage_limit : 'Không giới hạn'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      {/* MODAL 1: ORDER DETAIL & TIMELINE */}
      <Modal visible={!!selectedOrder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 650 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Chi Tiết Đơn Hàng #{selectedOrder?.order_code}</Text>

                {selectedOrder?.return_status === 'Requested' ? (
                  <View style={{ backgroundColor: '#fffdf5', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#b78103' }}>
                      🔄 Yêu cầu đổi trả: {selectedOrder.return_reason || 'Đổi size/mẫu'}
                    </Text>
                    {selectedOrder.return_note ? (
                      <Text style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                        Ghi chú khách: "{selectedOrder.return_note}"
                      </Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#16a34a', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
                        onPress={() => handleUpdateReturnStatus(selectedOrder.id, 'Approved')}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>✓ Chấp thuận</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, backgroundColor: '#dc2626', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
                        onPress={() => handleUpdateReturnStatus(selectedOrder.id, 'Rejected')}
                      >
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>✕ Từ chối</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : selectedOrder?.return_status === 'Approved' ? (
                  <View style={{ backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', borderRadius: 8, padding: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                      ✓ Đổi trả: Đã chấp thuận ({selectedOrder.return_reason || 'Đổi size/mẫu'})
                    </Text>
                  </View>
                ) : selectedOrder?.return_status === 'Rejected' ? (
                  <View style={{ backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', borderRadius: 8, padding: 8, marginTop: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>
                      ✕ Đổi trả: Đã từ chối ({selectedOrder.return_reason || 'Đổi size/mẫu'})
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.modalSub}>
                  Đặt lúc:{' '}
                  {selectedOrder?.created_at
                    ? new Date(selectedOrder.created_at).toLocaleString('vi-VN')
                    : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedOrder(null)} style={styles.modalCloseBtn}>
                <IconSymbol name="trash" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }}>
              {/* Order Timeline Progression */}
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>Lịch Trình Vận Chuyển</Text>
                <View style={styles.timelineSteps}>
                  {[
                    { title: 'Đặt hàng thành công', done: true },
                    {
                      title: 'Đã xác nhận & Đóng gói',
                      done: selectedOrder?.status === 'Processing' || selectedOrder?.status === 'Completed',
                    },
                    {
                      title: 'Đang vận chuyển giao hàng',
                      done: selectedOrder?.status === 'Processing' || selectedOrder?.status === 'Completed',
                    },
                    {
                      title: 'Giao hàng thành công',
                      done: selectedOrder?.status === 'Completed',
                    },
                  ].map((step, idx) => (
                    <View key={step.title} style={styles.timelineStepRow}>
                      <View style={styles.timelineIndicatorCol}>
                        <View
                          style={[
                            styles.timelineDot,
                            step.done && styles.timelineDotDone,
                            selectedOrder?.status === 'Cancelled' && { backgroundColor: '#ef4444' },
                          ]}
                        >
                          <IconSymbol
                            name={step.done ? 'checkmark' : 'circle' as any}
                            size={10}
                            color="#ffffff"
                          />
                        </View>
                        {idx < 3 && <View style={styles.timelineLine} />}
                      </View>
                      <Text style={[styles.timelineStepText, step.done && styles.timelineStepTextDone]}>
                        {step.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Customer & Delivery */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Thông tin người nhận</Text>
                <Text style={styles.modalTextRow}>
                  Họ và tên: <Text style={{ fontWeight: '700' }}>{selectedOrder?.customer_name}</Text>
                </Text>
                <Text style={styles.modalTextRow}>
                  Số điện thoại:{' '}
                  <Text style={{ fontWeight: '700' }}>{selectedOrder?.customer_phone}</Text>
                </Text>
                <Text style={styles.modalTextRow}>
                  Địa chỉ: <Text style={{ fontWeight: '600' }}>{selectedOrder?.customer_address}</Text>
                </Text>
                <Text style={styles.modalTextRow}>
                  Phương thức:{' '}
                  <Text style={{ fontWeight: '600' }}>
                    {selectedOrder?.payment_method === 'bank' ? 'Chuyển khoản QR' : 'Thanh toán COD'}
                  </Text>
                </Text>
              </View>

              {/* Items Table */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Danh sách mặt hàng</Text>
                {selectedOrder?.items?.map((it: any, idx: number) => (
                  <View key={idx} style={styles.modalItemRow}>
                    <Text style={{ flex: 1, fontSize: 13, color: '#1e293b' }}>
                      {it.product_name} ({it.size || 'M'}) x{it.quantity}
                    </Text>
                    <Text style={{ fontWeight: '700', fontSize: 13 }}>
                      {formatVND(it.price * it.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={styles.modalTotalRow}>
                  <Text style={{ fontSize: 15, fontWeight: '700' }}>Tổng giá trị thanh toán:</Text>
                  <Text style={{ fontSize: 17, fontWeight: '800', color: '#0f172a' }}>
                    {formatVND(selectedOrder?.total_price)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedOrder && selectedOrder.status !== 'Completed' && selectedOrder.status !== 'Cancelled' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    marginRight: 'auto'
                  }}
                  onPress={() => handleFastCompleteOrder(selectedOrder.id)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="bolt.fill" size={14} color="#eab308" />
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>
                    ⚡ Hoàn tất đơn ngay
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setSelectedOrder(null)}
              >
                <Text style={styles.modalCancelBtnText}>Đóng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ADD / EDIT PRODUCT */}
      <Modal visible={showProductModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới Vào Kho'}
              </Text>
              <TouchableOpacity onPress={() => setShowProductModal(false)}>
                <IconSymbol name="trash" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tên sản phẩm *</Text>
                <TextInput
                  style={styles.formInput}
                  value={prodForm.name}
                  onChangeText={(v) => setProdForm({ ...prodForm, name: v })}
                  placeholder="Ví dụ: Áo Sơ Mi Lụa Hàn Quốc..."
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Giá bán (VNĐ) *</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={prodForm.price}
                    onChangeText={(v) => setProdForm({ ...prodForm, price: v })}
                    placeholder="450000"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Giá gốc (VNĐ)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={prodForm.original_price}
                    onChangeText={(v) => setProdForm({ ...prodForm, original_price: v })}
                    placeholder="550000"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Danh mục</Text>
                  <TextInput
                    style={styles.formInput}
                    value={prodForm.category}
                    onChangeText={(v) => setProdForm({ ...prodForm, category: v })}
                    placeholder="Áo / Quần / Váy / Giày / Phụ kiện"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Giảm giá (%)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={prodForm.discount}
                    onChangeText={(v) => setProdForm({ ...prodForm, discount: v })}
                    placeholder="10"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Hình ảnh sản phẩm</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      borderStyle: 'dashed',
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      flex: 1,
                    }}
                    onPress={handlePickImage}
                  >
                    <IconSymbol name="camera.fill" size={20} color="#64748b" />
                    <Text style={{ color: '#475569', fontWeight: '500' }}>Tải ảnh lên</Text>
                  </TouchableOpacity>

                  {prodForm.image ? (
                    <Image
                      source={getImageSource(prodForm.image)}
                      style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mô tả sản phẩm</Text>
                <TextInput
                  style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  value={prodForm.description}
                  onChangeText={(v) => setProdForm({ ...prodForm, description: v })}
                  placeholder="Mô tả chi tiết chất liệu, form dáng..."
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowProductModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveProduct}>
                <Text style={styles.modalSubmitBtnText}>Lưu Sản Phẩm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      
      
      {/* MODAL: VARIANT STOCK MATRIX (SIZE x MÀU) */}
      <Modal visible={!!selectedVariantProduct} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 700 }]}>
            {selectedVariantProduct && (() => {
              const variants = selectedVariantProduct.variants || [];
              const sizes = Array.from(new Set(variants.map((v: any) => v.size)));
              const colors = Array.from(new Set(variants.map((v: any) => v.color)));

              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.importIconBadge, { width: 34, height: 34, backgroundColor: '#ede9fe' }]}>
                        <IconSymbol name="slider.horizontal.3" size={18} color="#4338ca" />
                      </View>
                      <View>
                        <Text style={styles.modalTitle}>Bảng Tồn Kho Chi Tiết Theo Size & Màu Sắc</Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          SKU #{selectedVariantProduct.id} • {selectedVariantProduct.name}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedVariantProduct(null)}>
                      <IconSymbol name="xmark" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 520, paddingHorizontal: 20, paddingVertical: 14 }}>
                    {/* Header info card */}
                    <View style={styles.matrixInfoBanner}>
                      <Image source={getImageSource(selectedVariantProduct.image)} style={{ width: 50, height: 50, borderRadius: 8 }} contentFit="cover" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{selectedVariantProduct.name}</Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          Giá bán: {formatVND(selectedVariantProduct.price)} • Tổng tồn kho: <Text style={{ fontWeight: '800', color: '#15803d' }}>{selectedVariantProduct.stock} cái</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addProductBtn, { backgroundColor: '#15803d', paddingVertical: 8, paddingHorizontal: 12 }]}
                        onPress={() => {
                          const p = selectedVariantProduct;
                          setSelectedVariantProduct(null);
                          handleOpenImportModal(p);
                        }}
                      >
                        <IconSymbol name="plus" size={13} color="#ffffff" />
                        <Text style={[styles.addProductBtnText, { fontSize: 12 }]}>📦 Nhập hàng lô này</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Stock Status Legend */}
                    <View style={styles.legendRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                        <Text style={styles.legendText}>Còn hàng (trên 5)</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.legendText}>Sắp hết (1 - 5)</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendText}>Hết hàng (0)</Text>
                      </View>
                    </View>

                    {/* Matrix Grid Table */}
                    <View style={styles.matrixTable}>
                      {/* Table Header Row */}
                      <View style={styles.matrixHeaderRow}>
                        <Text style={[styles.matrixCell, styles.matrixHeaderCell, { flex: 1.2 }]}>MÀU SẮC</Text>
                        {sizes.map((sz: any) => (
                          <Text key={sz} style={[styles.matrixCell, styles.matrixHeaderCell]}>
                            SIZE {sz}
                          </Text>
                        ))}
                        <Text style={[styles.matrixCell, styles.matrixHeaderCell, { flex: 1.1 }]}>TỔNG MÀU</Text>
                      </View>

                      {/* Data Rows */}
                      {colors.map((col: any) => {
                        let totalColorStock = 0;
                        const matchingColorVariant = variants.find((v: any) => v.color === col);
                        const colorCode = matchingColorVariant?.color_code || '#000000';

                        return (
                          <View key={col} style={styles.matrixDataRow}>
                            <View style={[styles.matrixCell, { flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                              <View style={[styles.colorSampleDot, { backgroundColor: colorCode }]} />
                              <Text style={styles.matrixColorName}>{col}</Text>
                            </View>

                            {sizes.map((sz: any) => {
                              const v = variants.find((item: any) => item.size === sz && item.color === col);
                              const vStock = v ? v.stock : 0;
                              totalColorStock += vStock;

                              return (
                                <View key={sz} style={styles.matrixCell}>
                                  <View
                                    style={[
                                      styles.matrixStockBadge,
                                      vStock > 5 && styles.stockBadgeGreen,
                                      vStock > 0 && vStock <= 5 && styles.stockBadgeYellow,
                                      vStock === 0 && styles.stockBadgeRed,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.matrixStockText,
                                        vStock > 5 && styles.stockTextGreen,
                                        vStock > 0 && vStock <= 5 && styles.stockTextYellow,
                                        vStock === 0 && styles.stockTextRed,
                                      ]}
                                    >
                                      {vStock}
                                    </Text>
                                  </View>
                                </View>
                              );
                            })}

                            <View style={[styles.matrixCell, { flex: 1.1 }]}>
                              <Text style={styles.matrixTotalColorStock}>{totalColorStock} cái</Text>
                            </View>
                          </View>
                        );
                      })}

                      {/* Table Footer: Total per Size */}
                      <View style={[styles.matrixDataRow, { backgroundColor: '#f8fafc', borderBottomWidth: 0 }]}>
                        <Text style={[styles.matrixCell, { flex: 1.2, fontWeight: '800', color: '#0f172a' }]}>
                          TỔNG SIZE:
                        </Text>
                        {sizes.map((sz: any) => {
                          const sizeTotal = variants
                            .filter((v: any) => v.size === sz)
                            .reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
                          return (
                            <View key={sz} style={styles.matrixCell}>
                              <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 13 }}>
                                {sizeTotal}
                              </Text>
                            </View>
                          );
                        })}
                        <View style={[styles.matrixCell, { flex: 1.1 }]}>
                          <Text style={{ fontWeight: '900', color: '#15803d', fontSize: 14 }}>
                            {selectedVariantProduct.stock} cái
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 12, lineHeight: 16 }}>
                      💡 Khi khách hàng chọn Size và Màu trên ứng dụng, hệ thống tự động đối soát ma trận tồn kho này trong thời gian thực. Các size/màu hết hàng (0) sẽ tự động khóa nút đặt hàng.
                    </Text>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setSelectedVariantProduct(null)}
                    >
                      <Text style={styles.modalCancelBtnText}>Đóng</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* MODAL: CHI TIẾT PHIẾU NHẬP KHO & BIÊN BẢN QC */}
      <Modal visible={!!selectedStockImport} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 680 }]}>
            {selectedStockImport && (() => {
              const matchedProd = products.find((p) => String(p.id) === String(selectedStockImport.product_id));
              const qty = Number(selectedStockImport.quantity) || 0;
              const cost = Number(selectedStockImport.cost_price) || 0;
              const retailPrice = matchedProd?.price || (cost * 1.6);
              const totalCost = qty * cost;
              const expectedRev = qty * retailPrice;
              const grossProfit = expectedRev - totalCost;

              return (
                <>
                  <View style={styles.modalHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.importIconBadge, { width: 34, height: 34, borderRadius: 8 }]}>
                        <IconSymbol name="cube.box" size={18} color="#15803d" />
                      </View>
                      <View>
                        <Text style={styles.modalTitle}>Biên Bản Nhập Kho & Kiểm Định QC</Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>
                          Phiếu #{selectedStockImport.id} • Lô SX: {selectedStockImport.batch_code}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedStockImport(null)}>
                      <IconSymbol name="xmark" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 540, paddingHorizontal: 20, paddingVertical: 14 }}>
                    {/* Section 1: Thông tin sản phẩm */}
                    <Text style={styles.detailSectionTitle}>1. SẢN PHẨM NHẬP KHO THỜI TRANG</Text>
                    <View style={styles.detailProdCard}>
                      <Image
                        source={getImageSource(matchedProd?.image || 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=400&auto=format&fit=crop')}
                        style={styles.detailProdThumb}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailProdName}>{selectedStockImport.product_name}</Text>
                        <Text style={styles.detailProdMeta}>
                          Mã SKU: #{selectedStockImport.product_id} • Danh mục: {matchedProd?.category || 'Thời trang'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                          <View style={styles.detailPriceBadge}>
                            <Text style={styles.detailPriceBadgeText}>
                              Giá bán niêm yết: {formatVND(retailPrice)}
                            </Text>
                          </View>
                          <View style={styles.detailStockBadge}>
                            <Text style={styles.detailStockBadgeText}>
                              Tồn kho hiện tại: {matchedProd?.stock !== undefined ? matchedProd.stock : 50} cái
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Section 2: Thông tin lô hàng & đối tác */}
                    <Text style={[styles.detailSectionTitle, { marginTop: 16 }]}>2. THÔNG TIN LÔ HÀNG & ĐỐI TÁC SẢN XUẤT</Text>
                    <View style={styles.detailInfoGrid}>
                      <View style={styles.detailInfoItem}>
                        <Text style={styles.detailInfoLabel}>MÃ LÔ SẢN XUẤT (BATCH NO)</Text>
                        <Text style={styles.detailInfoValue}>🏷️ {selectedStockImport.batch_code}</Text>
                      </View>
                      <View style={styles.detailInfoItem}>
                        <Text style={styles.detailInfoLabel}>THỜI GIAN NHẬP KHO</Text>
                        <Text style={styles.detailInfoValue}>🕒 {new Date(selectedStockImport.imported_at).toLocaleString('vi-VN')}</Text>
                      </View>
                      <View style={styles.detailInfoItem}>
                        <Text style={styles.detailInfoLabel}>XƯỞNG MAY / NHÀ CUNG CẤP</Text>
                        <Text style={[styles.detailInfoValue, { color: '#0f172a', fontWeight: '700' }]}>
                          🏢 {selectedStockImport.supplier_name}
                        </Text>
                      </View>
                      <View style={styles.detailInfoItem}>
                        <Text style={styles.detailInfoLabel}>NGƯỜI LẬP PHIẾU / THỦ KHO</Text>
                        <Text style={styles.detailInfoValue}>👑 Ban Quản Trị HD (Admin)</Text>
                      </View>
                    </View>

                    {/* Section 3: Hạch toán định lượng & chi phí vốn */}
                    <Text style={[styles.detailSectionTitle, { marginTop: 16 }]}>3. HẠCH TOÁN ĐỊNH LƯỢNG & TÀI CHÍNH LÔ HÀNG</Text>
                    <View style={styles.detailFinanceCard}>
                      <View style={styles.detailFinanceRow}>
                        <Text style={styles.detailFinanceLabel}>Số lượng nhập kho:</Text>
                        <Text style={styles.detailFinanceQty}>+{qty} sản phẩm</Text>
                      </View>
                      <View style={styles.detailFinanceRow}>
                        <Text style={styles.detailFinanceLabel}>Đơn giá vốn xuất xưởng:</Text>
                        <Text style={styles.detailFinanceVal}>{formatVND(cost)} / cái</Text>
                      </View>
                      <View style={[styles.detailFinanceRow, { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 4 }]}>
                        <Text style={[styles.detailFinanceLabel, { fontWeight: '700', color: '#0f172a' }]}>TỔNG VỐN NHẬP KHO:</Text>
                        <Text style={[styles.detailFinanceVal, { fontSize: 16, fontWeight: '800', color: '#dc2626' }]}>
                          {formatVND(totalCost)}
                        </Text>
                      </View>
                      <View style={styles.detailFinanceRow}>
                        <Text style={styles.detailFinanceLabel}>Doanh thu dự kiến khi bán hết:</Text>
                        <Text style={[styles.detailFinanceVal, { color: '#15803d', fontWeight: '700' }]}>
                          {formatVND(expectedRev)}
                        </Text>
                      </View>
                      <View style={styles.detailFinanceRow}>
                        <Text style={styles.detailFinanceLabel}>Lợi nhuận gộp ước tính (Markup):</Text>
                        <Text style={[styles.detailFinanceVal, { color: '#2563eb', fontWeight: '700' }]}>
                          +{formatVND(grossProfit)} ({expectedRev > 0 ? Math.round((grossProfit / expectedRev) * 100) : 0}%)
                        </Text>
                      </View>
                    </View>

                    {/* Section 4: Biên bản nghiệm thu kiểm định chất lượng (QC) */}
                    <Text style={[styles.detailSectionTitle, { marginTop: 16 }]}>4. BIÊN BẢN NGHIỆM THU KIỂM ĐỊNH KCS / QC</Text>
                    <View style={styles.detailQcCard}>
                      <View style={styles.detailQcBanner}>
                        <IconSymbol name="checkmark.circle.fill" size={18} color="#15803d" />
                        <Text style={styles.detailQcBannerText}>
                          ĐÃ NGHIỆM THU: ĐẠT CHUẨN XUẤT XƯỞNG CÔNG NGHIỆP ("100 CÁI NHƯ 100")
                        </Text>
                      </View>
                      <View style={{ gap: 8, marginTop: 10 }}>
                        <View style={styles.qcDetailRow}>
                          <Text style={styles.qcCheckDot}>✓</Text>
                          <Text style={styles.qcCheckItemText}>
                            <Text style={{ fontWeight: '700', color: '#0f172a' }}>Đường may & Mũi chỉ:</Text> May 5 kim công nghiệp, mật độ 4-5 mũi/cm, đường vắt sổ đều đẹp, không đứt chỉ, không nhăn nhúm.
                          </Text>
                        </View>
                        <View style={styles.qcDetailRow}>
                          <Text style={styles.qcCheckDot}>✓</Text>
                          <Text style={styles.qcCheckItemText}>
                            <Text style={{ fontWeight: '700', color: '#0f172a' }}>Phụ liệu may mặc:</Text> Khóa kéo kim loại kéo êm trơn tru, khuy bấm dập máy chắc chắn, không sắc nhọn gây trầy xước.
                          </Text>
                        </View>
                        <View style={styles.qcDetailRow}>
                          <Text style={styles.qcCheckDot}>✓</Text>
                          <Text style={styles.qcCheckItemText}>
                            <Text style={{ fontWeight: '700', color: '#0f172a' }}>Định lượng vải & Phom dáng:</Text> Vải dệt chuẩn định lượng, co giãn đàn hồi tốt, không bai dão, không xù lông và không phai màu sau giặt sấy.
                          </Text>
                        </View>
                        <View style={styles.qcDetailRow}>
                          <Text style={styles.qcCheckDot}>✓</Text>
                          <Text style={styles.qcCheckItemText}>
                            <Text style={{ fontWeight: '700', color: '#0f172a' }}>Nhãn mác & Quy chuẩn đóng gói:</Text> Đầy đủ tag thương hiệu Thời Trang HD, mã vạch SKU, tem hướng dẫn giặt ủi và bọc túi nilon bảo vệ chống ẩm.
                          </Text>
                        </View>
                      </View>
                      {selectedStockImport.note ? (
                        <View style={styles.detailQcNoteBox}>
                          <Text style={styles.detailQcNoteLabel}>Ghi chú biên bản nghiệm thu:</Text>
                          <Text style={styles.detailQcNoteVal}>{selectedStockImport.note}</Text>
                        </View>
                      ) : null}
                    </View>
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setSelectedStockImport(null)}
                    >
                      <Text style={styles.modalCancelBtnText}>Đóng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalSubmitBtn, { backgroundColor: '#15803d' }]}
                      onPress={() => {
                        const prod = matchedProd || products[0];
                        setSelectedStockImport(null);
                        handleOpenImportModal(prod);
                      }}
                    >
                      <Text style={styles.modalSubmitBtnText}>📦 NHẬP THÊM LÔ TIẾP THEO</Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* MODAL 3: INBOUND STOCK IMPORT & QC */}
      <Modal visible={showImportModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 620 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.importIconBadge}>
                  <IconSymbol name="cube.box" size={16} color="#15803d" />
                </View>
                <Text style={styles.modalTitle}>Phiếu Nhập Hàng Vào Kho (Inbound QC)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <IconSymbol name="xmark" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520, paddingHorizontal: 20, paddingVertical: 14 }}>
              {/* Product Selector - All 26 products searchable */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.formLabel}>
                    Chọn sản phẩm nhập kho ({products.length} sản phẩm có sẵn) *
                  </Text>
                  {importProduct && (
                    <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700' }}>
                      Đang chọn: #{importProduct.id} {importProduct.name?.substring(0, 18)}...
                    </Text>
                  )}
                </View>

                {/* Mini Search Bar for Products */}
                <View style={[styles.searchBar, { height: 36, marginBottom: 8, backgroundColor: '#f8fafc' }]}>
                  <IconSymbol name="magnifyingglass" size={14} color="#94a3b8" />
                  <TextInput
                    style={[styles.searchInput, { fontSize: 12 }]}
                    placeholder="Tìm theo tên sản phẩm hoặc mã SKU trong kho..."
                    value={importProductSearch}
                    onChangeText={setImportProductSearch}
                    placeholderTextColor="#94a3b8"
                  />
                  {importProductSearch ? (
                    <TouchableOpacity onPress={() => setImportProductSearch('')}>
                      <IconSymbol name="xmark" size={14} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Horizontal scroll of product selection cards */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={true}
                  contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
                >
                  {selectableProducts.map((p) => {
                    const isSelected = importProduct?.id === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.productSelectCard, isSelected && styles.productSelectCardActive]}
                        onPress={() => setImportProduct(p)}
                        activeOpacity={0.8}
                      >
                        <Image source={getImageSource(p.image)} style={styles.productSelectThumb} contentFit="cover" />
                        <View style={{ padding: 6 }}>
                          <Text style={styles.productSelectSku}>SKU #{p.id}</Text>
                          <Text style={styles.productSelectName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.productSelectPrice}>{formatVND(p.price)}</Text>
                          <Text style={styles.productSelectStock}>Kho: {p.stock !== undefined ? p.stock : 50} cái</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.productSelectCheckmark}>
                            <IconSymbol name="checkmark" size={12} color="#ffffff" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Product Brief */}
              {importProduct && (
                <View style={styles.importProdBrief}>
                  <Image source={getImageSource(importProduct.image)} style={styles.importProdThumb} contentFit="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.importProdName} numberOfLines={1}>{importProduct.name}</Text>
                    <Text style={styles.importProdMeta}>
                      Mã SKU: #{importProduct.id} • Giá bán: {formatVND(importProduct.price)}
                    </Text>
                    <View style={styles.currentStockBadge}>
                      <Text style={styles.currentStockText}>
                        Tồn kho hiện tại: <Text style={{ fontWeight: '800', color: '#0f172a' }}>{importProduct.stock !== undefined ? importProduct.stock : 50} cái</Text>
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Supplier Selection */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nhà cung cấp / Xưởng may đối tác *</Text>
                <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  Chọn nhanh xưởng đối tác quen thuộc hoặc tự gõ tên nhà cung cấp mới bên dưới:
                </Text>
                <View style={styles.supplierChipsRow}>
                  {['Công ty Cổ phần Dệt May HD', 'Xưởng may Việt Hưng', 'Xưởng may Minh Châu', 'Tập đoàn May Nhà Bè', 'Xưởng May Gia Công 247'].map((sup) => (
                    <TouchableOpacity
                      key={sup}
                      style={[styles.supplierChip, importForm.supplier_name === sup && styles.supplierChipActive]}
                      onPress={() => setImportForm({ ...importForm, supplier_name: sup })}
                    >
                      <Text style={[styles.supplierChipText, importForm.supplier_name === sup && styles.supplierChipTextActive]}>
                        {sup}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.formInput}
                  value={importForm.supplier_name}
                  onChangeText={(v) => setImportForm({ ...importForm, supplier_name: v })}
                  placeholder="Tự nhập tên xưởng may / nhà cung cấp mới tùy ý..."
                />
              </View>

              {/* Batch Code */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.formLabel}>Mã lô sản xuất (Batch No) *</Text>
                  <TouchableOpacity
                    style={styles.generateBatchBtn}
                    onPress={() => {
                      const newCode = generateBatchCode();
                      setImportForm({ ...importForm, batch_code: newCode });
                      showToast(`Đã sinh mã lô mới: ${newCode}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="sparkles" size={13} color="#2563eb" />
                    <Text style={styles.generateBatchBtnText}>⚡ Sinh mã tự động</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.formInput}
                  value={importForm.batch_code}
                  onChangeText={(v) => setImportForm({ ...importForm, batch_code: v })}
                  placeholder="VD: LO-2026-XUAN-01"
                />
              </View>

              {/* Variant Selection: Size & Color */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Phân loại Size cần nhập *</Text>
                  <View style={styles.supplierChipsRow}>
                    {['Tất cả size', 'S', 'M', 'L', 'XL'].map((sz) => (
                      <TouchableOpacity
                        key={sz}
                        style={[styles.supplierChip, importForm.size === sz && styles.supplierChipActive]}
                        onPress={() => setImportForm({ ...importForm, size: sz })}
                      >
                        <Text style={[styles.supplierChipText, importForm.size === sz && styles.supplierChipTextActive]}>
                          {sz}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Phân loại Màu sắc cần nhập *</Text>
                  <View style={styles.supplierChipsRow}>
                    {['Tất cả màu', 'Đen', 'Be', 'Xanh Navy'].map((col) => (
                      <TouchableOpacity
                        key={col}
                        style={[styles.supplierChip, importForm.color === col && styles.supplierChipActive]}
                        onPress={() => setImportForm({ ...importForm, color: col })}
                      >
                        <Text style={[styles.supplierChipText, importForm.color === col && styles.supplierChipTextActive]}>
                          {col}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Quantity & Cost Price */}
              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Số lượng nhập thêm *</Text>
                  <TextInput
                    style={[styles.formInput, { fontWeight: '700', fontSize: 16, color: '#15803d' }]}
                    keyboardType="numeric"
                    value={importForm.quantity}
                    onChangeText={(v) => setImportForm({ ...importForm, quantity: v })}
                    placeholder="VD: 50"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Giá vốn nhập kho (VNĐ)</Text>
                  <TextInput
                    style={styles.formInput}
                    keyboardType="numeric"
                    value={importForm.cost_price}
                    onChangeText={(v) => setImportForm({ ...importForm, cost_price: v })}
                    placeholder="VD: 180000"
                  />
                </View>
              </View>

              {/* QC Quality Verification Checklist */}
              <View style={styles.qcBox}>
                <Text style={styles.qcBoxTitle}>TIÊU CHUẨN KIỂM ĐỊNH CHẤT LƯỢNG (QC INBOUND):</Text>
                <TouchableOpacity
                  style={styles.qcCheckItem}
                  onPress={() => setImportForm({ ...importForm, qc_passed: !importForm.qc_passed })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.qcCheckbox, importForm.qc_passed && styles.qcCheckboxActive]}>
                    {importForm.qc_passed && <IconSymbol name="checkmark" size={12} color="#ffffff" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.qcCheckTitle}>Đạt chuẩn dây chuyền công nghiệp ("100 cái như 100")</Text>
                    <Text style={styles.qcCheckDesc}>
                      Kiểm định 5-10% số lượng: Đường may kỹ càng, khóa kéo trơn tru, khuy bấm chắc chắn, vải chuẩn định lượng không bai xù.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Note */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Ghi chú đợt nhập hàng</Text>
                <TextInput
                  style={[styles.formInput, { minHeight: 48 }]}
                  value={importForm.note}
                  onChangeText={(v) => setImportForm({ ...importForm, note: v })}
                  placeholder="Ghi chú thêm về lô hàng nhập..."
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowImportModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: '#15803d' }]}
                onPress={handleSubmitImport}
                disabled={isSubmittingImport}
              >
                {isSubmittingImport ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>XÁC NHẬN NHẬP KHO</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* MODAL 3: CREATE VOUCHER */}
      <Modal visible={showVoucherModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 500 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo Mã Voucher Khuyến Mãi Mới</Text>
              <TouchableOpacity onPress={() => setShowVoucherModal(false)}>
                <IconSymbol name="trash" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Mã Voucher (In hoa) *</Text>
              <TextInput
                style={styles.formInput}
                autoCapitalize="characters"
                value={voucherForm.code}
                onChangeText={(v) => setVoucherForm({ ...voucherForm, code: v })}
                placeholder="VD: FREESHIP, HD2026, VIP50"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Loại giảm giá</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    voucherForm.discount_type === 'percent' && styles.radioBtnActive,
                  ]}
                  onPress={() => setVoucherForm({ ...voucherForm, discount_type: 'percent' })}
                >
                  <Text
                    style={[
                      styles.radioBtnText,
                      voucherForm.discount_type === 'percent' && styles.radioBtnTextActive,
                    ]}
                  >
                    Theo phần trăm (%)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.radioBtn,
                    voucherForm.discount_type === 'fixed' && styles.radioBtnActive,
                  ]}
                  onPress={() => setVoucherForm({ ...voucherForm, discount_type: 'fixed' })}
                >
                  <Text
                    style={[
                      styles.radioBtnText,
                      voucherForm.discount_type === 'fixed' && styles.radioBtnTextActive,
                    ]}
                  >
                    Tiền cố định (VNĐ)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Giá trị giảm ({voucherForm.discount_type === 'percent' ? '%' : 'VNĐ'}) *
              </Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={voucherForm.value}
                onChangeText={(v) => setVoucherForm({ ...voucherForm, value: v })}
                placeholder={voucherForm.discount_type === 'percent' ? '15' : '50000'}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Giới hạn số lượt dùng (Tùy chọn)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={voucherForm.usage_limit}
                onChangeText={(v) => setVoucherForm({ ...voucherForm, usage_limit: v })}
                placeholder="VD: 100 (để trống nếu không giới hạn)"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Áp dụng cho hạng thành viên</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={[styles.radioBtn, voucherForm.min_vip_level === 0 && styles.radioBtnActive]}
                  onPress={() => setVoucherForm({ ...voucherForm, min_vip_level: 0 })}
                >
                  <Text style={[styles.radioBtnText, voucherForm.min_vip_level === 0 && styles.radioBtnTextActive]}>Tất cả</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, voucherForm.min_vip_level === 1 && styles.radioBtnActive]}
                  onPress={() => setVoucherForm({ ...voucherForm, min_vip_level: 1 })}
                >
                  <Text style={[styles.radioBtnText, voucherForm.min_vip_level === 1 && styles.radioBtnTextActive]}>Từ VIP Vàng</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.radioBtn, voucherForm.min_vip_level === 2 && styles.radioBtnActive]}
                  onPress={() => setVoucherForm({ ...voucherForm, min_vip_level: 2 })}
                >
                  <Text style={[styles.radioBtnText, voucherForm.min_vip_level === 2 && styles.radioBtnTextActive]}>Chỉ VIP Kim Cương</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowVoucherModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleCreateVoucher}>
                <Text style={styles.modalSubmitBtnText}>Tạo Voucher</Text>
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
    backgroundColor: '#f8fafc',
  },
  toastContainer: {
    position: 'absolute',
    top: 20,
    alignSelf: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 50,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    maxWidth: 1120,
    alignSelf: 'center',
    width: '100%',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  adminBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 5,
  },
  adminBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  storefrontBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  storefrontBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },

  /* TABS CONTAINER - Premium Segmented Ribbon */
  tabsContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  tabsWrapper: {
    maxWidth: 1140,
    alignSelf: 'center',
    width: '100%',
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tabItemPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tabItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabItemTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  tabBadgePill: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6.5,
    paddingVertical: 1.5,
    borderRadius: 12,
  },
  tabBadgePillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  tabBadgeAlertPill: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  tabBadgeAlertPillActive: {
    backgroundColor: '#ef4444',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tabBadgeTextActive: {
    color: '#ffffff',
  },
  tabBadgeAlertText: {
    color: '#dc2626',
    fontWeight: '800',
  },
  tabBadgeAlertTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },

  /* BODY */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#475569',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 12,
    width: '100%',
  },
  tabContent: {
    gap: 20,
  },

  /* METRICS */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  metricCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  metricCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  metricCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  growthBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  growthText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '700',
  },
  metricSubText: {
    fontSize: 11,
    color: '#64748b',
  },

  /* ANALYTICS */
  analyticsRow: {
    flexDirection: 'column',
    gap: 16,
    width: '100%',
  },
  analyticsRowDesktop: {
    flexDirection: 'row',
  },
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0f172a',
  },
  legendText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  chartWrapper: {
    height: 180,
    justifyContent: 'flex-end',
    paddingTop: 10,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValText: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  barTrack: {
    width: '40%',
    height: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  barLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 6,
  },
  barLabelToday: {
    color: '#0f172a',
    fontWeight: '800',
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0f172a',
    marginTop: 2,
  },
  pipelineBar: {
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 18,
    marginTop: 8,
    width: '100%',
    backgroundColor: '#f1f5f9',
  },
  statusLegendList: {
    gap: 12,
    width: '100%',
  },
  statusLegendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: 28,
  },
  statusLegendLabelCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  statusColorSquare: {
    width: 10,
    height: 10,
    borderRadius: 2,
    flexShrink: 0,
  },
  statusLegendLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
    flexShrink: 1,
  },
  statusCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    flexShrink: 0,
  },
  statusCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  topProdList: {
    gap: 12,
  },
  topProdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGold: { backgroundColor: '#fef3c7' },
  rankSilver: { backgroundColor: '#f1f5f9' },
  rankBronze: { backgroundColor: '#ffedd5' },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  topProdThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    marginLeft: 10,
  },
  topProdName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  topProdCategory: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  topProdSold: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  topProdRevenue: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  viewAllLink: {
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },
  recentOrdersList: {
    gap: 10,
  },
  recentOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentOrderCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  recentOrderCustomer: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recentOrderPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },

  /* CONTROLS */
  controlsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 14,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  chipCountBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipCountBadgeActive: {
    backgroundColor: '#334155',
  },
  chipCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  chipCountTextActive: {
    color: '#ffffff',
  },

  /* ORDER CARDS */
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderCardCode: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderCardDate: {
    fontSize: 11,
    color: '#64748b',
  },
  orderCustomerSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 6,
  },
  customerDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerNameBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  customerPhone: {
    fontSize: 12,
    color: '#64748b',
  },
  customerAddress: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  orderItemsSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderItemThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  orderItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  orderItemMeta: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  orderItemPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  paymentMethodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  paymentMethodText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  totalAmountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  orderActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusActionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 7,
  },
  approveBtn: {
    backgroundColor: '#0f172a',
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  completeBtn: {
    backgroundColor: '#15803d',
  },
  completeBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#fee2e2',
  },
  cancelBtnText: {
    color: '#dc2626',
    fontSize: 12,
    fontWeight: '700',
  },
  reopenBtn: {
    backgroundColor: '#e0e7ff',
  },
  reopenBtnText: {
    color: '#4338ca',
    fontSize: 12,
    fontWeight: '700',
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgePillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  /* PRODUCTS */
  productTopControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addProductBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  productCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  productCardThumbWrap: {
    width: '100%',
    height: 140,
    backgroundColor: '#f1f5f9',
    position: 'relative',
  },
  productCardThumb: {
    width: '100%',
    height: '100%',
  },
  productCategoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  productCategoryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  discountBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  discountBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  productCardBody: {
    padding: 14,
  },
  productCardId: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  productCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    height: 38,
  },
  productPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 8,
    marginBottom: 12,
  },
  productCardPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  productCardOrigPrice: {
    fontSize: 12,
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  productActionsRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  editProdBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#e0f2fe',
  },
  editProdBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  deleteProdBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  deleteProdBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },

  productStockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockPillLow: {
    backgroundColor: '#fee2e2',
  },
  stockPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  stockPillTextLow: {
    color: '#b91c1c',
  },
  soldCountText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  importProdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  importProdBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  importIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inventoryHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  inventoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockImportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  stockImportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  batchBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  batchBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  importTimeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  qcVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  qcVerifiedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803d',
  },
  stockImportBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 16,
    flexWrap: 'wrap',
  },
  importProdTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  importSupName: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  importNoteText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  importQtyBox: {
    alignItems: 'flex-end',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    minWidth: 160,
  },
  importQtyLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  importQtyValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#15803d',
    marginVertical: 2,
  },
  importCostText: {
    fontSize: 12,
    color: '#475569',
  },
  importTotalCostText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  stockImportFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  standardQcFootnote: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  productSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxWidth: 220,
  },
  productSelectChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  productSelectChipText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  productSelectChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  productSelectCard: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  productSelectCardActive: {
    borderColor: '#15803d',
    backgroundColor: '#f0fdf4',
  },
  productSelectThumb: {
    width: '100%',
    height: 75,
    backgroundColor: '#f1f5f9',
  },
  productSelectSku: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  productSelectName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  productSelectPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
    marginTop: 2,
  },
  productSelectStock: {
    fontSize: 10,
    color: '#64748b',
  },
  productSelectCheckmark: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#15803d',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBatchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  generateBatchBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  viewDetailReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  viewDetailReceiptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailProdCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  detailProdThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  detailProdName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  detailProdMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  detailPriceBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  detailPriceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  detailStockBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  detailStockBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803d',
  },
  detailInfoGrid: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 10,
  },
  detailInfoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  detailInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  detailInfoValue: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  detailFinanceCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 6,
  },
  detailFinanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  detailFinanceLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  detailFinanceQty: {
    fontSize: 14,
    fontWeight: '800',
    color: '#15803d',
  },
  detailFinanceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  detailQcCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: 14,
  },
  detailQcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f0fdf4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  detailQcBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803d',
    flex: 1,
  },
  qcDetailRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  qcCheckDot: {
    fontSize: 13,
    fontWeight: '900',
    color: '#15803d',
    marginTop: 1,
  },
  qcCheckItemText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    flex: 1,
  },
  detailQcNoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailQcNoteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  detailQcNoteVal: {
    fontSize: 12,
    color: '#0f172a',
    fontStyle: 'italic',
  },
  variantProdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  variantProdBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },
  matrixInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
  },
  matrixTable: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  matrixHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 10,
  },
  matrixDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingVertical: 8,
    alignItems: 'center',
  },
  matrixCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  matrixHeaderCell: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  colorSampleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  matrixColorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  matrixStockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 32,
    alignItems: 'center',
  },
  stockBadgeGreen: {
    backgroundColor: '#dcfce7',
  },
  stockTextGreen: {
    color: '#15803d',
    fontWeight: '800',
    fontSize: 12,
  },
  stockBadgeYellow: {
    backgroundColor: '#fef3c7',
  },
  stockTextYellow: {
    color: '#b45309',
    fontWeight: '800',
    fontSize: 12,
  },
  stockBadgeRed: {
    backgroundColor: '#fee2e2',
  },
  stockTextRed: {
    color: '#dc2626',
    fontWeight: '800',
    fontSize: 12,
  },
  matrixStockText: {
    fontSize: 12,
  },
  matrixTotalColorStock: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  metricHint: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  importProdBrief: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  importProdThumb: {
    width: 52,
    height: 52,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
  },
  importProdName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  importProdMeta: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  currentStockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  currentStockText: {
    fontSize: 11,
    color: '#475569',
  },
  supplierChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  supplierChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supplierChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  supplierChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  supplierChipTextActive: {
    color: '#ffffff',
  },
  qcBox: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    marginBottom: 14,
  },
  qcBoxTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    marginBottom: 8,
  },
  qcCheckItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  qcCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#16a34a',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  qcCheckboxActive: {
    backgroundColor: '#16a34a',
  },
  qcCheckTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#14532d',
    marginBottom: 2,
  },
  qcCheckDesc: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
  },


  /* USERS */
  userListContainer: {
    gap: 12,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  userCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 260,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  userNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  vipDiamondBadge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  vipDiamondText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369a1',
  },
  vipGoldBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  vipGoldText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#b45309',
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  userInfoText: {
    fontSize: 12,
    color: '#64748b',
  },
  userCardStats: {
    flexDirection: 'row',
    gap: 10,
  },
  userStatBox: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userStatNumber: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  userStatLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  /* VOUCHERS */
  voucherTopCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  voucherGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  voucherCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  voucherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  voucherCodeBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  voucherCodeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },

  deleteVoucherBtn: {
    padding: 4,
  },
  voucherValueText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#059669',
    marginBottom: 4,
  },
  voucherTypeDesc: {
    fontSize: 12,
    color: '#64748b',
  },

  /* EMPTY */
  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    width: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  timelineCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  timelineSteps: {
    gap: 8,
  },
  timelineStepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: 16,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotDone: {
    backgroundColor: '#10b981',
  },
  timelineLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e2e8f0',
    marginVertical: 2,
  },
  timelineStepText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  timelineStepTextDone: {
    color: '#0f172a',
    fontWeight: '600',
  },
  modalSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  modalTextRow: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 4,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 7,
    backgroundColor: '#f1f5f9',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 7,
    backgroundColor: '#0f172a',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  radioBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  radioBtnActive: {
    borderColor: '#0f172a',
    backgroundColor: '#0f172a',
  },
  radioBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  radioBtnTextActive: {
    color: '#ffffff',
  },

  /* ACCESS DENIED */
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    maxWidth: 520,
    alignSelf: 'center',
    width: '100%',
  },
  lockIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accessDeniedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  accessDeniedSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  accountInfoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  accountInfoLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  accountInfoName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  currentRoleBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  currentRoleText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  accessDeniedBtnGroup: {
    width: '100%',
    gap: 12,
  },
  adminLoginBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  adminLoginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  backHomeBtn: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  backHomeBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },

  /* ROLE BADGES */
  roleAdminBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleAdminBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roleCustomerBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  roleCustomerBadgeText: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
  },
  roleActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  promoteBtn: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  promoteBtnText: {
    color: '#15803d',
    fontSize: 11,
    fontWeight: '700',
  },
  demoteBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  demoteBtnText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '700',
  },

  // Return Tickets Module Styles
  returnTicketCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  returnTicketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ticketBadgeWrap: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ticketCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  ticketDate: {
    fontSize: 12,
    color: '#64748b',
  },
  ticketStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  ticketStatusPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  ticketStatusApproved: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  ticketStatusRejected: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  ticketStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  returnCustomerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  returnCustomerName: {
    fontSize: 13,
    color: '#475569',
  },
  returnCustomerPhone: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
  },
  returnTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  returnPaymentMethod: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  returnDetailBanner: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  returnDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  returnDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  returnDetailValue: {
    fontSize: 13,
    color: '#0f172a',
    flex: 1,
  },
  targetSizeChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  targetSizeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  returnItemsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  returnItemsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  returnItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  returnItemThumb: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  returnItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  returnItemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  returnItemPrice: {
    fontSize: 11,
    color: '#64748b',
  },
  returnActionBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnActionReturn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  btnApproveReturn: {
    backgroundColor: '#10b981',
  },
  btnApproveReturnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  btnRejectReturn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  btnRejectReturnText: {
    color: '#e11d48',
    fontSize: 13,
    fontWeight: '700',
  },
  statusConfirmedBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  statusConfirmedText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  revertBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  revertBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  metricSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  itemVariantPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  itemVariantPillText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
});
