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
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { API_URL } from '@/constants/config';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuth } from '@/contexts/AuthContext';
import { getImageSource } from '@/constants/images';

const formatVND = (num: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);

const getShippingSubStatus = (createdDate: string | Date) => {
  const diffHours = (Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60);
  if (diffHours < 12) {
    return {
      step: 1,
      badge: '📦 Shop đang đóng gói',
      statusText: 'Đơn đã xác nhận. Kho đang đóng gói & dán mã vận đơn.',
    };
  } else if (diffHours < 36) {
    return {
      step: 2,
      badge: '🚚 Đã xuất kho ThoiTrangHD Express',
      statusText: 'Bưu tá đã lấy hàng từ kho và đang trung chuyển.',
    };
  } else if (diffHours < 60) {
    return {
      step: 3,
      badge: '🚛 Đang trung chuyển bưu cục',
      statusText: 'Kiện hàng đã đến bưu cục phát gần nhất với địa chỉ nhận.',
    };
  } else {
    return {
      step: 4,
      badge: '🛵 Shipper đang giao gần bạn',
      statusText: 'Shipper đang trên đường giao hàng đến bạn (Dự kiến hôm nay).',
    };
  }
};

const ADMIN_AVAILABLE_COLORS = [
  { name: 'Đen', code: '#000000' },
  { name: 'Trắng', code: '#FFFFFF' },
  { name: 'Be', code: '#E5D3B3' },
  { name: 'Xám', code: '#9E9E9E' },
  { name: 'Xanh Navy', code: '#1A237E' },
  { name: 'Nâu', code: '#795548' },
  { name: 'Rêu', code: '#2E7D32' },
  { name: 'Vàng bò', code: '#F59E0B' },
  { name: 'Hồng pastel', code: '#F472B6' },
];

const getCategorySizes = (cat?: string) => {
  const isShoe = cat && cat.toLowerCase().includes('giày');
  const isAccessory = cat && cat.toLowerCase().includes('phụ kiện');
  if (isShoe) return ['38', '39', '40', '41', '42', '43'];
  if (isAccessory) return ['Freesize', 'Tiêu chuẩn'];
  return ['S', 'M', 'L', 'XL', '2XL', '3XL'];
};

type AdminTab = 'overview' | 'reports' | 'orders' | 'returns' | 'products' | 'inventory' | 'users' | 'vouchers';
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

  // Reports & Financial Analytics States (Báo cáo & Thống kê tài chính)
  const [reportPeriod, setReportPeriod] = useState<'year' | 'month' | '30days' | '7days' | 'custom'>('year');
  const [reportYear, setReportYear] = useState<number>(2026);
  const [reportMonth, setReportMonth] = useState<number>(10);
  const [customMode, setCustomMode] = useState<'single' | 'range'>('single');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-01');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-01');
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedChartMonth, setSelectedChartMonth] = useState<any | null>(null);

  // 5 Phân Hệ Báo Cáo Thống Kê Chuyên Biệt Độc Lập
  type ReportSection = 'revenue' | 'products' | 'categories' | 'customers' | 'operations';
  const [reportSection, setReportSection] = useState<ReportSection>('revenue');
  const [reportProductSearch, setReportProductSearch] = useState('');
  const [reportCustomerSearch, setReportCustomerSearch] = useState('');

  // Tùy chọn In & Xuất Báo Cáo Chọn Lọc (Selective Print & Export)
  interface ReportSelectiveOptions {
    kpiRevenue: boolean;
    kpiCompletedOrders: boolean;
    kpiAov: boolean;
    kpiCancelRate: boolean;
    kpiTotalOrders: boolean;
    tableChartData: boolean;
    tableCategory: boolean;
    tableTopProducts: boolean;
  }

  const [showSelectiveModal, setShowSelectiveModal] = useState(false);
  const [selectiveOptions, setSelectiveOptions] = useState<ReportSelectiveOptions>({
    kpiRevenue: true,
    kpiCompletedOrders: true,
    kpiAov: true,
    kpiCancelRate: true,
    kpiTotalOrders: true,
    tableChartData: true,
    tableCategory: true,
    tableTopProducts: true,
  });

  // Interactive Calendar Datepicker Modal states & helpers
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [calendarTargetField, setCalendarTargetField] = useState<'single' | 'start' | 'end'>('single');
  const [calViewYear, setCalViewYear] = useState<number>(2026);
  const [calViewMonth, setCalViewMonth] = useState<number>(10);

  const openCalendarModal = (target: 'single' | 'start' | 'end') => {
    setCalendarTargetField(target);
    const dateToParse = target === 'end' ? customEndDate : customStartDate;
    if (dateToParse && /^\d{4}-\d{2}-\d{2}$/.test(dateToParse)) {
      const parts = dateToParse.split('-');
      setCalViewYear(parseInt(parts[0], 10) || 2026);
      setCalViewMonth(parseInt(parts[1], 10) || 10);
    } else {
      setCalViewYear(2026);
      setCalViewMonth(10);
    }
    setCalendarModalVisible(true);
  };

  const handleSelectCalendarDate = (dateStr: string) => {
    if (calendarTargetField === 'single') {
      setCustomStartDate(dateStr);
      setCustomEndDate(dateStr);
    } else if (calendarTargetField === 'start') {
      setCustomStartDate(dateStr);
    } else if (calendarTargetField === 'end') {
      setCustomEndDate(dateStr);
    }
    setSelectedChartMonth(null);
    setCalendarModalVisible(false);
  };

  const handlePrevCalMonth = () => {
    if (calViewMonth === 1) {
      setCalViewMonth(12);
      setCalViewYear((prev) => prev - 1);
    } else {
      setCalViewMonth((prev) => prev - 1);
    }
  };

  const handleNextCalMonth = () => {
    if (calViewMonth === 12) {
      setCalViewMonth(1);
      setCalViewYear((prev) => prev + 1);
    } else {
      setCalViewMonth((prev) => prev + 1);
    }
  };

  const getMonthDays = (year: number, month: number) => {
    const firstDay = new Date(year, month - 1, 1);
    const totalDays = new Date(year, month, 0).getDate();
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: { day: number | null; dateStr: string }[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, dateStr: '' });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dStr = String(d).padStart(2, '0');
      const mStr = String(month).padStart(2, '0');
      days.push({ day: d, dateStr: `${year}-${mStr}-${dStr}` });
    }
    return days;
  };

  // Filter & Search states
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSearch, setOrderSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('ALL');
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [autoProgressionEnabled, setAutoProgressionEnabled] = useState(false);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [adminInvoiceModalOrder, setAdminInvoiceModalOrder] = useState<any | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [prodForm, setProdForm] = useState<{
    name: string;
    price: string;
    original_price: string;
    discount: string;
    category: string;
    image: string;
    description: string;
    stock: string;
    selectedSizes: string[];
    selectedColors: string[];
    allocationMode: 'auto' | 'manual';
    variantStocks: Record<string, string>;
  }>({
    name: '',
    price: '',
    original_price: '',
    discount: '0',
    category: 'Áo',
    image: '',
    description: '',
    stock: '60',
    selectedSizes: ['S', 'M', 'L', 'XL'],
    selectedColors: ['Đen', 'Trắng', 'Be'],
    allocationMode: 'auto',
    variantStocks: {},
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

  // Operations Alert & Action Center calculations
  const pendingBankOrders = orders.filter(
    (o) => o.payment_method === 'bank' && o.payment_status === 'paid_pending_verification'
  );
  const lowStockProducts = products.filter((p) => (Number(p.stock) || 0) <= 10);
  const outOfStockProducts = products.filter((p) => (Number(p.stock) || 0) <= 0);
  const totalPendingTasks = (returnStats.requested || 0) + pendingBankOrders.length + lowStockProducts.length;

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

  // In-app Confirmation Modal (thay thế hoàn toàn window.confirm & alert xấu của trình duyệt)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmType?: 'danger' | 'primary';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    cancelText: 'Hủy',
    confirmType: 'primary',
    onConfirm: () => {},
  });

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

  const fetchReportData = async () => {
    try {
      setReportLoading(true);
      let url = `${API_URL}/api/admin/reports?period=${reportPeriod}&year=${reportYear}`;
      if (reportPeriod === 'month') {
        url += `&month=${reportMonth}`;
      } else if (reportPeriod === 'custom') {
        let s = customStartDate || '2026-10-01';
        let e = customEndDate || s;
        if (s > e) [s, e] = [e, s];
        url += `&startDate=${s}&endDate=${e}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.success && data.data) {
        setReportData(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải báo cáo thống kê:', err);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReportData();
    }
  }, [activeTab, reportPeriod, reportYear, reportMonth, customStartDate, customEndDate]);

  const getReportPeriodString = () => {
    if (reportPeriod === 'year') return `Năm ${reportYear}`;
    if (reportPeriod === 'month') return `Tháng ${reportMonth}/${reportYear}`;
    if (reportPeriod === '30days') return '30 ngày gần nhất';
    if (reportPeriod === '7days') return '7 ngày gần nhất';
    if (reportPeriod === 'custom') {
      return customStartDate === customEndDate ? `Ngày ${customStartDate}` : `Từ ${customStartDate} đến ${customEndDate}`;
    }
    return '';
  };

  const handleExportReportCSV = (
    targetSection: ReportSection = reportSection,
    customOpts?: ReportSelectiveOptions,
    overrideData?: any,
    overridePeriodStr?: string
  ) => {
    const activeData = overrideData || reportData;
    if (!activeData) return;
    const { chartData, kpis, categoryStats, topProducts, topCustomers, statusBreakdown, paymentBreakdown, returnsSummary } = activeData;
    const periodStr = overridePeriodStr || getReportPeriodString();
    let csvContent = '\uFEFF';

    if (customOpts) {
      csvContent += `BÁO CÁO THỐNG KÊ TÙY CHỌN CHỈ SỐ - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n`;
      csvContent += `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;

      const kpiRows: string[] = [];
      if (customOpts.kpiRevenue) {
        kpiRows.push(`Tổng doanh thu thuần (VNĐ):,${kpis?.totalRevenue || 0}`);
      }
      if (customOpts.kpiAov) {
        kpiRows.push(`Giá trị đơn trung bình - AOV (VNĐ):,${kpis?.aov || 0}`);
      }
      if (customOpts.kpiCompletedOrders) {
        kpiRows.push(`Số đơn hoàn tất thành công:,${kpis?.completedOrders || 0} (${kpis?.completionRate || 0}%)`);
      }
      if (customOpts.kpiCancelRate) {
        kpiRows.push(`Tỷ lệ hủy đơn (%):,${kpis?.cancelRate || 0}% (${kpis?.cancelledOrders || 0} đơn hủy)`);
      }
      if (customOpts.kpiTotalOrders) {
        kpiRows.push(`Tổng số đơn hàng phát sinh:,${kpis?.totalOrders || 0}`);
      }

      if (kpiRows.length > 0) {
        csvContent += `CHỈ TIÊU TÀI CHÍNH ĐÃ CHỌN:\n`;
        csvContent += kpiRows.join('\n') + '\n\n';
      }

      if (customOpts.tableChartData && chartData && chartData.length > 0) {
        csvContent += `BẢNG KÊ CHI TIẾT DOANH THU THEO KỲ / KHUNG GIỜ:\n`;
        csvContent += `Kỳ / Khung giờ,Số đơn hàng,Đơn hoàn tất,Doanh thu (VNĐ),AOV TB/Đơn (VNĐ)\n`;
        chartData.forEach((row: any) => {
          const rev = Number(row.revenue || 0);
          const ord = Number(row.orders || 0);
          const aov = ord > 0 ? Math.round(rev / ord) : 0;
          csvContent += `"${row.label}",${ord},${row.completed ?? 0},${rev},${aov}\n`;
        });
        csvContent += '\n';
      }

      if (customOpts.tableCategory && categoryStats && categoryStats.length > 0) {
        csvContent += `CƠ CẤU DOANH THU THEO DANH MỤC:\n`;
        csvContent += `Danh mục,Doanh thu (VNĐ),Số sản phẩm bán,Tỷ trọng (%)\n`;
        categoryStats.forEach((cat: any) => {
          csvContent += `"${cat.category}",${cat.revenue},${cat.itemsSold},${cat.percentage}%\n`;
        });
        csvContent += '\n';
      }

      if (customOpts.tableTopProducts && topProducts && topProducts.length > 0) {
        csvContent += `TOP SẢN PHẨM BÁN CHẠY:\n`;
        csvContent += `Xếp hạng,Tên sản phẩm,Danh mục,Đã bán (cái),Doanh thu (VNĐ)\n`;
        topProducts.slice(0, 10).forEach((p: any, idx: number) => {
          csvContent += `"${idx + 1}","${(p.product_name || '').replace(/"/g, '""')}","${p.category || ''}",${p.sold_count || 0},${p.revenue || 0}\n`;
        });
      }
    } else if (targetSection === 'products') {
      csvContent += `BÁO CÁO THỐNG KÊ SẢN PHẨM BÁN CHẠY - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n`;
      csvContent += `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
      csvContent += `Xếp hạng,Tên sản phẩm,Danh mục,Số lượng bán (cái),Doanh thu tạo ra (VNĐ)\n`;
      (topProducts || []).forEach((p: any, idx: number) => {
        csvContent += `"${idx + 1}","${(p.product_name || '').replace(/"/g, '""')}","${p.category || ''}",${p.sold_count || 0},${p.revenue || 0}\n`;
      });
    } else if (targetSection === 'categories') {
      csvContent += `BÁO CÁO CƠ CẤU DOANH THU THEO DANH MỤC - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n\n`;
      csvContent += `Danh mục ngành hàng,Doanh thu (VNĐ),Số sản phẩm bán ra,Số đơn hàng,Tỷ trọng (%)\n`;
      (categoryStats || []).forEach((c: any) => {
        csvContent += `"${c.category}",${c.revenue},${c.itemsSold},${c.orderCount || 0},${c.percentage}%\n`;
      });
    } else if (targetSection === 'customers') {
      csvContent += `BÁO CÁO XẾP HẠNG HỘI VIÊN & KHÁCH HÀNG VIP - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n\n`;
      csvContent += `Xếp hạng,Họ tên khách hàng,Số điện thoại,Phân hạng VIP,Số đơn đã mua,Tổng tiền chi tiêu (VNĐ)\n`;
      (topCustomers || []).forEach((c: any, idx: number) => {
        const spent = Number(c.total_spent || 0);
        const vipTier = spent >= 10000000 ? 'Kim Cương' : spent >= 5000000 ? 'Vàng' : spent >= 2000000 ? 'Bạc' : 'Thân thiết';
        csvContent += `"${idx + 1}","${(c.customer_name || 'Khách hàng').replace(/"/g, '""')}","${c.customer_phone || ''}","${vipTier}",${c.order_count || 0},${spent}\n`;
      });
    } else if (targetSection === 'operations') {
      csvContent += `BÁO CÁO VẬN HÀNH ĐƠN HÀNG & ĐỔI TRẢ - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n\n`;
      csvContent += `CHỈ SỐ VẬN HÀNH CHÍNH:\n`;
      csvContent += `Tổng số đơn: ${kpis?.totalOrders || 0}\n`;
      csvContent += `Đơn hoàn tất thành công: ${kpis?.completedOrders || 0} (${kpis?.completionRate || 0}%)\n`;
      csvContent += `Đơn hủy: ${kpis?.cancelledOrders || 0} (${kpis?.cancelRate || 0}%)\n`;
      csvContent += `Tổng yêu cầu đổi trả: ${returnsSummary?.total_returns || 0}\n\n`;
      csvContent += `PHÂN BỔ TRẠNG THÁI ĐƠN:\n`;
      csvContent += `Trạng thái,Số lượng đơn,Tổng giá trị (VNĐ)\n`;
      (statusBreakdown || []).forEach((s: any) => {
        csvContent += `"${s.status}",${s.count},${s.revenue || 0}\n`;
      });
    } else if (targetSection === 'revenue') {
      csvContent += `BÁO CÁO THỐNG KÊ DOANH THU & DÒNG TIỀN - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n`;
      csvContent += `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
      csvContent += `CHỈ TIÊU TÀI CHÍNH TỔNG QUAN:\n`;
      csvContent += `Tổng doanh thu thuần (VNĐ):,${kpis?.totalRevenue || 0}\n`;
      csvContent += `Tổng số đơn hàng:,${kpis?.totalOrders || 0}\n`;
      csvContent += `Số đơn hoàn tất thành công:,${kpis?.completedOrders || 0}\n`;
      csvContent += `Tỷ lệ hoàn tất (%):,${kpis?.completionRate || 0}%\n`;
      csvContent += `Tỷ lệ hủy đơn (%):,${kpis?.cancelRate || 0}%\n`;
      csvContent += `Giá trị đơn trung bình - AOV (VNĐ):,${kpis?.aov || 0}\n\n`;

      csvContent += `BẢNG KÊ CHI TIẾT DOANH THU THEO KỲ / KHUNG GIỜ:\n`;
      csvContent += `Kỳ / Khung giờ,Số đơn hàng,Đơn hoàn tất,Doanh thu (VNĐ),AOV TB/Đơn (VNĐ)\n`;
      chartData?.forEach((row: any) => {
        const rev = Number(row.revenue || 0);
        const ord = Number(row.orders || 0);
        const aov = ord > 0 ? Math.round(rev / ord) : 0;
        csvContent += `"${row.label}",${ord},${row.completed ?? 0},${rev},${aov}\n`;
      });
      csvContent += `"TỔNG CỘNG",${kpis?.totalOrders || 0},${kpis?.completedOrders || 0},${kpis?.totalRevenue || 0},${kpis?.aov || 0}\n`;
    } else {
      // Báo cáo tổng hợp toàn diện (Summary)
      csvContent += `BÁO CÁO KINH DOANH & TÀI CHÍNH TỔNG HỢP - THỜI TRANG HD\n`;
      csvContent += `Kỳ báo cáo: ${periodStr}\n`;
      csvContent += `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}\n\n`;
      csvContent += `1. CHỈ TIÊU DOANH THU:\n`;
      csvContent += `Tổng doanh thu thuần (VNĐ):,${kpis?.totalRevenue || 0}\n`;
      csvContent += `Tổng số đơn hàng:,${kpis?.totalOrders || 0}\n`;
      csvContent += `Đơn hoàn tất:,${kpis?.completedOrders || 0} (${kpis?.completionRate || 0}%)\n`;
      csvContent += `Đơn hủy:,${kpis?.cancelledOrders || 0} (${kpis?.cancelRate || 0}%)\n`;
      csvContent += `Giá trị đơn trung bình (AOV):,${kpis?.aov || 0}\n\n`;

      csvContent += `2. CHI TIẾT DOANH THU THEO KỲ / KHUNG GIỜ:\n`;
      csvContent += `Kỳ / Thời gian,Số đơn hàng,Đơn hoàn tất,Doanh thu (VNĐ)\n`;
      chartData?.forEach((row: any) => {
        csvContent += `"${row.label}",${row.orders},${row.completed ?? 0},${row.revenue}\n`;
      });

      csvContent += `\n3. CƠ CẤU DOANH THU THEO DANH MỤC:\n`;
      csvContent += `Danh mục,Doanh thu (VNĐ),Số sản phẩm bán,Tỷ trọng (%)\n`;
      categoryStats?.forEach((cat: any) => {
        csvContent += `"${cat.category}",${cat.revenue},${cat.itemsSold},${cat.percentage}%\n`;
      });

      csvContent += `\n4. TOP SẢN PHẨM BÁN CHẠY:\n`;
      csvContent += `Xếp hạng,Tên sản phẩm,Danh mục,Đã bán (cái),Doanh thu (VNĐ)\n`;
      (topProducts || []).slice(0, 10).forEach((p: any, idx: number) => {
        csvContent += `"${idx + 1}","${(p.product_name || '').replace(/"/g, '""')}","${p.category || ''}",${p.sold_count || 0},${p.revenue || 0}\n`;
      });
    }

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      const prefix = customOpts ? 'TuyChonChiSo' : targetSection.toUpperCase();
      link.setAttribute('download', `BaoCao_${prefix}_ThoiTrangHD_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Đã xuất báo cáo CSV thành công!');
    } else {
      showToast('Xuất báo cáo CSV được tối ưu trên trình duyệt Web');
    }
  };

  // IN FORM BÁO CÁO CHUYÊN BIỆT CHUẨN A4 DÀNH CHO ADMIN
  const handlePrintReportForm = (
    section: ReportSection = reportSection,
    customOpts?: ReportSelectiveOptions,
    overrideData?: any,
    overridePeriodStr?: string
  ) => {
    const activeData = overrideData || reportData;
    if (!activeData) return;
    const { chartData, kpis, categoryStats, topProducts, topCustomers, statusBreakdown, paymentBreakdown, returnsSummary } = activeData;
    const periodStr = overridePeriodStr || getReportPeriodString();
    const currentDateStr = new Date().toLocaleDateString('vi-VN');

    let reportTitle = 'BÁO CÁO THỐNG KÊ DOANH THU & ĐỐI SOÁT TÀI CHÍNH';
    let reportCode = 'BC-TC-2026';
    let specificContentHtml = '';

    if (customOpts) {
      reportTitle = 'BÁO CÁO THỐNG KÊ TÙY CHỌN CHỈ SỐ';
      reportCode = 'BC-TUY-CHON-2026';

      const kpiBoxes: string[] = [];
      if (customOpts.kpiRevenue) {
        kpiBoxes.push(`<div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.totalRevenue || 0)}</div><div class="kpi-title">Doanh thu thuần</div></div>`);
      }
      if (customOpts.kpiAov) {
        kpiBoxes.push(`<div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.aov || 0)}</div><div class="kpi-title">Giá trị TB / Đơn (AOV)</div></div>`);
      }
      if (customOpts.kpiCompletedOrders) {
        kpiBoxes.push(`<div class="kpi-box"><div class="kpi-num">${kpis?.completedOrders || 0} / ${kpis?.totalOrders || 0}</div><div class="kpi-title">Đơn hoàn tất</div></div>`);
      }
      if (customOpts.kpiCancelRate) {
        kpiBoxes.push(`<div class="kpi-box"><div class="kpi-num">${kpis?.cancelRate || 0}%</div><div class="kpi-title">Tỷ lệ hủy đơn</div></div>`);
      }
      if (customOpts.kpiTotalOrders) {
        kpiBoxes.push(`<div class="kpi-box"><div class="kpi-num">${kpis?.totalOrders || 0}</div><div class="kpi-title">Tổng đơn hàng</div></div>`);
      }

      if (kpiBoxes.length > 0) {
        const gridCols = Math.min(kpiBoxes.length, 4);
        specificContentHtml += `
          <div style="margin-bottom: 20px;">
            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">
              Các Chỉ Số Tài Chính & Vận Hành Đã Chọn (${kpiBoxes.length} chỉ tiêu)
            </div>
            <div class="kpi-grid" style="grid-template-columns: repeat(${gridCols}, 1fr);">
              ${kpiBoxes.join('')}
            </div>
          </div>
        `;
      }

      if (customOpts.tableChartData && chartData && chartData.length > 0) {
        specificContentHtml += `
          <div style="margin-top: 15px;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a;">Bảng Kê Chi Tiết Doanh Thu & Số Đơn Theo Kỳ</h4>
            <table class="report-table">
              <thead>
                <tr>
                  <th>Kỳ / Khung giờ</th>
                  <th style="width: 110px; text-align: center;">Số đơn</th>
                  <th style="width: 110px; text-align: center;">Hoàn tất</th>
                  <th style="width: 170px; text-align: right;">Doanh thu (VNĐ)</th>
                  <th style="width: 140px; text-align: right;">AOV TB/Đơn</th>
                </tr>
              </thead>
              <tbody>
                ${chartData.map((r: any) => {
                  const rev = Number(r.revenue || 0);
                  const ord = Number(r.orders || 0);
                  const aov = ord > 0 ? Math.round(rev / ord) : 0;
                  return `
                    <tr>
                      <td style="font-weight: 600;">${r.label}</td>
                      <td style="text-align: center;">${ord}</td>
                      <td style="text-align: center; color: #16a34a; font-weight: 600;">${r.completed ?? '-'}</td>
                      <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(rev)}</td>
                      <td style="text-align: right;">${aov > 0 ? formatVND(aov) : '-'}</td>
                    </tr>
                  `;
                }).join('')}
                <tr style="background: #f8fafc; font-weight: bold;">
                  <td>TỔNG CỘNG</td>
                  <td style="text-align: center;">${kpis?.totalOrders || 0}</td>
                  <td style="text-align: center; color: #16a34a;">${kpis?.completedOrders || 0}</td>
                  <td style="text-align: right; color: #0284c7;">${formatVND(kpis?.totalRevenue || 0)}</td>
                  <td style="text-align: right;">${formatVND(kpis?.aov || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      }

      if (customOpts.tableCategory && categoryStats && categoryStats.length > 0) {
        specificContentHtml += `
          <div style="margin-top: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a;">Cơ Cấu Doanh Thu Theo Danh Mục Ngành Hàng</h4>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 50px;">STT</th>
                  <th>Danh mục</th>
                  <th style="width: 120px; text-align: center;">Số lượng bán</th>
                  <th style="width: 160px; text-align: right;">Doanh thu (VNĐ)</th>
                  <th style="width: 100px; text-align: right;">Tỷ trọng</th>
                </tr>
              </thead>
              <tbody>
                ${categoryStats.map((c: any, idx: number) => `
                  <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td style="font-weight: 700;">${c.category}</td>
                    <td style="text-align: center;">${c.itemsSold} cái</td>
                    <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(c.revenue)}</td>
                    <td style="text-align: right; font-weight: 700;">${c.percentage}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      if (customOpts.tableTopProducts && topProducts && topProducts.length > 0) {
        specificContentHtml += `
          <div style="margin-top: 20px;">
            <h4 style="margin: 0 0 8px 0; color: #0f172a;">Top 10 Sản Phẩm Bán Chạy</h4>
            <table class="report-table">
              <thead>
                <tr>
                  <th style="width: 50px;">Hạng</th>
                  <th>Tên sản phẩm</th>
                  <th style="width: 120px;">Danh mục</th>
                  <th style="width: 90px; text-align: center;">Đã bán</th>
                  <th style="width: 150px; text-align: right;">Doanh thu (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                ${topProducts.slice(0, 10).map((p: any, idx: number) => `
                  <tr>
                    <td style="text-align: center; font-weight: bold;">#${idx + 1}</td>
                    <td style="font-weight: 600;">${p.product_name}</td>
                    <td>${p.category || '-'}</td>
                    <td style="text-align: center; font-weight: bold;">${p.sold_count}</td>
                    <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(p.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } else if (section === 'products') {
      reportTitle = 'BÁO CÁO THỐNG KÊ SẢN PHẨM BÁN CHẠY & HIỆU QUẢ KINH DOANH';
      reportCode = 'BC-SP-2026';
      specificContentHtml = `
        <div class="kpi-grid">
          <div class="kpi-box"><div class="kpi-num">${topProducts?.length || 0}</div><div class="kpi-title">Mã SP bán chạy</div></div>
          <div class="kpi-box"><div class="kpi-num">${(topProducts || []).reduce((s: number, p: any) => s + (p.sold_count || 0), 0)}</div><div class="kpi-title">Tổng sản phẩm bán</div></div>
          <div class="kpi-box"><div class="kpi-num">${formatVND((topProducts || [])[0]?.revenue || 0)}</div><div class="kpi-title">Best-Seller #1</div></div>
          <div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.totalRevenue || 0)}</div><div class="kpi-title">Tổng doanh số Top</div></div>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">Hạng</th>
              <th>Tên sản phẩm</th>
              <th style="width: 140px;">Ngành hàng</th>
              <th style="width: 100px; text-align: center;">Đã bán</th>
              <th style="width: 160px; text-align: right;">Doanh thu (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            ${(topProducts || []).map((p: any, idx: number) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">#${idx + 1}</td>
                <td style="font-weight: 600;">${p.product_name}</td>
                <td>${p.category || '-'}</td>
                <td style="text-align: center; font-weight: bold;">${p.sold_count}</td>
                <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(p.revenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (section === 'categories') {
      reportTitle = 'BÁO CÁO CƠ CẤU DOANH THU THEO DANH MỤC HÀNG HÓA';
      reportCode = 'BC-DM-2026';
      specificContentHtml = `
        <div class="kpi-grid">
          <div class="kpi-box"><div class="kpi-num">${categoryStats?.length || 0}</div><div class="kpi-title">Số ngành hàng</div></div>
          <div class="kpi-box"><div class="kpi-num">${(categoryStats || [])[0]?.category || '-'}</div><div class="kpi-title">Ngành dẫn đầu</div></div>
          <div class="kpi-box"><div class="kpi-num">${(categoryStats || [])[0]?.percentage || '0'}%</div><div class="kpi-title">Tỷ trọng ngành #1</div></div>
          <div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.totalRevenue || 0)}</div><div class="kpi-title">Tổng doanh thu</div></div>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th>Danh mục ngành hàng</th>
              <th style="width: 120px; text-align: center;">Số lượng bán</th>
              <th style="width: 120px; text-align: center;">Số đơn hàng</th>
              <th style="width: 160px; text-align: right;">Doanh thu (VNĐ)</th>
              <th style="width: 100px; text-align: right;">Tỷ trọng</th>
            </tr>
          </thead>
          <tbody>
            ${(categoryStats || []).map((c: any, idx: number) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="font-weight: 700;">${c.category}</td>
                <td style="text-align: center;">${c.itemsSold} cái</td>
                <td style="text-align: center;">${c.orderCount || 0} đơn</td>
                <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(c.revenue)}</td>
                <td style="text-align: right; font-weight: 700;">${c.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else if (section === 'customers') {
      reportTitle = 'BÁO CÁO XẾP HẠNG HỘI VIÊN & KHÁCH HÀNG THÂN THIẾT VIP';
      reportCode = 'BC-VIP-2026';
      specificContentHtml = `
        <div class="kpi-grid">
          <div class="kpi-box"><div class="kpi-num">${topCustomers?.length || 0}</div><div class="kpi-title">Hội viên VIP</div></div>
          <div class="kpi-box"><div class="kpi-num">${(topCustomers || [])[0]?.customer_name || '-'}</div><div class="kpi-title">Top 1 Spender</div></div>
          <div class="kpi-box"><div class="kpi-num">${formatVND((topCustomers || [])[0]?.total_spent || 0)}</div><div class="kpi-title">Chi tiêu Top 1</div></div>
          <div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.aov || 0)}</div><div class="kpi-title">Chi tiêu TB/khách</div></div>
        </div>
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">Hạng</th>
              <th>Khách hàng</th>
              <th style="width: 130px;">Số điện thoại</th>
              <th style="width: 110px; text-align: center;">Phân hạng</th>
              <th style="width: 100px; text-align: center;">Số đơn</th>
              <th style="width: 160px; text-align: right;">Tổng chi tiêu</th>
            </tr>
          </thead>
          <tbody>
            ${(topCustomers || []).map((c: any, idx: number) => {
              const spent = Number(c.total_spent || 0);
              const tier = spent >= 10000000 ? '👑 Kim Cương' : spent >= 5000000 ? '🥇 Vàng' : spent >= 2000000 ? '🥈 Bạc' : '🥉 Đồng';
              return `
                <tr>
                  <td style="text-align: center; font-weight: bold;">#${idx + 1}</td>
                  <td style="font-weight: 700;">${c.customer_name || 'Khách hàng'}</td>
                  <td>${c.customer_phone ? c.customer_phone.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2') : '-'}</td>
                  <td style="text-align: center; font-weight: bold;">${tier}</td>
                  <td style="text-align: center;">${c.order_count || 1} đơn</td>
                  <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(spent)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else if (section === 'operations') {
      reportTitle = 'BÁO CÁO VẬN HÀNH ĐƠN HÀNG, THANH TOÁN & ĐỔI TRẢ';
      reportCode = 'BC-VH-2026';
      specificContentHtml = `
        <div class="kpi-grid">
          <div class="kpi-box"><div class="kpi-num">${kpis?.totalOrders || 0}</div><div class="kpi-title">Tổng đơn xử lý</div></div>
          <div class="kpi-box"><div class="kpi-num">${kpis?.completedOrders || 0} (${kpis?.completionRate || 0}%)</div><div class="kpi-title">Giao thành công</div></div>
          <div class="kpi-box"><div class="kpi-num">${kpis?.cancelledOrders || 0} (${kpis?.cancelRate || 0}%)</div><div class="kpi-title">Đơn hủy</div></div>
          <div class="kpi-box"><div class="kpi-num">${returnsSummary?.total_returns || 0}</div><div class="kpi-title">Ca khiếu nại/đổi trả</div></div>
        </div>
        <div style="margin-top: 15px;">
          <h4 style="margin: 0 0 8px 0; color: #0f172a;">1. Phân Bổ Trạng Thái Đơn Hàng</h4>
          <table class="report-table">
            <thead><tr><th>Trạng thái</th><th style="width: 120px; text-align: center;">Số lượng đơn</th><th style="width: 160px; text-align: right;">Giá trị (VNĐ)</th></tr></thead>
            <tbody>
              ${(statusBreakdown || []).map((s: any) => `
                <tr>
                  <td style="font-weight: 600;">${s.status === 'Completed' ? '✓ Hoàn tất' : s.status === 'Processing' ? '🚚 Đang giao' : s.status === 'Pending' ? '⏳ Chờ duyệt' : '✕ Đã hủy'}</td>
                  <td style="text-align: center; font-weight: 700;">${s.count}</td>
                  <td style="text-align: right; font-weight: bold;">${formatVND(s.revenue || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div style="margin-top: 15px;">
          <h4 style="margin: 0 0 8px 0; color: #0f172a;">2. Cơ Cấu Phương Thức Thanh Toán</h4>
          <table class="report-table">
            <thead><tr><th>Phương thức thanh toán</th><th style="width: 120px; text-align: center;">Số đơn</th><th style="width: 160px; text-align: right;">Tổng thu (VNĐ)</th></tr></thead>
            <tbody>
              ${(paymentBreakdown || []).map((p: any) => `
                <tr>
                  <td style="font-weight: 600;">${p.payment_method === 'bank' || p.payment_method === 'Banking' ? 'Chuyển khoản VietQR' : p.payment_method === 'VNPAY' ? 'Cổng VNPAY' : 'Thu tiền mặt COD'}</td>
                  <td style="text-align: center; font-weight: 700;">${p.order_count}</td>
                  <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(p.revenue || 0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      // Doanh thu hoặc Báo cáo Tổng hợp
      specificContentHtml = `
        <div class="kpi-grid">
          <div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.totalRevenue || 0)}</div><div class="kpi-title">Doanh thu thuần</div></div>
          <div class="kpi-box"><div class="kpi-num">${kpis?.completedOrders || 0} / ${kpis?.totalOrders || 0}</div><div class="kpi-title">Đơn hoàn tất</div></div>
          <div class="kpi-box"><div class="kpi-num">${formatVND(kpis?.aov || 0)}</div><div class="kpi-title">Giá trị TB / Đơn (AOV)</div></div>
          <div class="kpi-box"><div class="kpi-num">${kpis?.cancelRate || 0}%</div><div class="kpi-title">Tỷ lệ hủy đơn</div></div>
        </div>
        <h4 style="margin: 15px 0 8px 0; color: #0f172a;">Bảng Kê Chi Tiết Doanh Thu & Số Đơn Theo Kỳ</h4>
        <table class="report-table">
          <thead>
            <tr>
              <th>Kỳ / Khung giờ</th>
              <th style="width: 110px; text-align: center;">Số đơn</th>
              <th style="width: 110px; text-align: center;">Hoàn tất</th>
              <th style="width: 170px; text-align: right;">Doanh thu (VNĐ)</th>
              <th style="width: 140px; text-align: right;">AOV TB/Đơn</th>
            </tr>
          </thead>
          <tbody>
            ${(chartData || []).map((r: any) => {
              const rev = Number(r.revenue || 0);
              const ord = Number(r.orders || 0);
              const aov = ord > 0 ? Math.round(rev / ord) : 0;
              return `
                <tr>
                  <td style="font-weight: 600;">${r.label}</td>
                  <td style="text-align: center;">${ord}</td>
                  <td style="text-align: center; color: #16a34a; font-weight: 600;">${r.completed ?? '-'}</td>
                  <td style="text-align: right; font-weight: bold; color: #0284c7;">${formatVND(rev)}</td>
                  <td style="text-align: right;">${aov > 0 ? formatVND(aov) : '-'}</td>
                </tr>
              `;
            }).join('')}
            <tr style="background: #f8fafc; font-weight: bold;">
              <td>TỔNG CỘNG</td>
              <td style="text-align: center;">${kpis?.totalOrders || 0}</td>
              <td style="text-align: center; color: #16a34a;">${kpis?.completedOrders || 0}</td>
              <td style="text-align: right; color: #0284c7;">${formatVND(kpis?.totalRevenue || 0)}</td>
              <td style="text-align: right;">${formatVND(kpis?.aov || 0)}</td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <title>${reportTitle} - Thời Trang HD</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; margin: 0; padding: 20px; font-size: 13px; line-height: 1.4; background: #ffffff; }
          .report-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; }
          .brand-name { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
          .brand-sub { font-size: 11px; color: #475569; margin-top: 3px; }
          .report-meta { text-align: right; font-size: 11.5px; color: #334155; }
          .report-title-box { text-align: center; margin: 15px 0 20px 0; }
          .report-main-title { font-size: 17px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
          .report-period-tag { display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-top: 5px; color: #0284c7; }
          .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .kpi-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .kpi-num { font-size: 16px; font-weight: 800; color: #0f172a; }
          .kpi-title { font-size: 10.5px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 4px; }
          .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
          .report-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-weight: 700; color: #1e293b; }
          .report-table td { border: 1px solid #e2e8f0; padding: 7px 10px; color: #334155; }
          .signature-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; text-align: center; margin-top: 40px; page-break-inside: avoid; }
          .sig-title { font-weight: 700; font-size: 12px; text-transform: uppercase; color: #0f172a; }
          .sig-note { font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px; }
          .sig-space { height: 60px; }
          .sig-name { font-weight: 700; font-size: 12px; border-top: 1px dashed #cbd5e1; display: inline-block; padding-top: 4px; min-width: 140px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="brand-name">THỜI TRANG HD</div>
            <div class="brand-sub">Hệ Thống Bán Lẻ Thời Trang Toàn Quốc • Hotline: 0988.888.888</div>
            <div class="brand-sub">Địa chỉ: 20 Lạc Long Quân, Q. Cầu Giấy, TP. Hà Nội</div>
          </div>
          <div class="report-meta">
            <div>Mã văn bản: <strong>${reportCode}</strong></div>
            <div>Ngày lập: <strong>${currentDateStr}</strong></div>
            <div>Trạng thái: <strong>ĐÃ KIỂM KÊ HOÀN TẤT</strong></div>
          </div>
        </div>

        <div class="report-title-box">
          <div class="report-main-title">${reportTitle}</div>
          <div class="report-period-tag">Kỳ Báo Cáo: ${periodStr}</div>
        </div>

        ${specificContentHtml}

        <div class="signature-section">
          <div>
            <div class="sig-title">Người Lập Biểu</div>
            <div class="sig-note">(Ký & ghi rõ họ tên)</div>
            <div class="sig-space"></div>
            <div class="sig-name">Ban Quản Trị HD</div>
          </div>
          <div>
            <div class="sig-title">Kế Toán Trưởng</div>
            <div class="sig-note">(Ký & xác nhận số liệu)</div>
            <div class="sig-space"></div>
            <div class="sig-name">Phòng Tài Chính Kế Toán</div>
          </div>
          <div>
            <div class="sig-title">Giám Đốc Doanh Nghiệp</div>
            <div class="sig-note">(Ký tên & đóng dấu)</div>
            <div class="sig-space"></div>
            <div class="sig-name">Ban Giám Đốc HD</div>
          </div>
        </div>
      </body>
      </html>
    `;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 350);
      } else {
        showToast('Vui lòng cho phép mở cửa sổ popup để in báo cáo');
      }
    } else {
      showToast('Tính năng in Form báo cáo chuẩn A4 được hỗ trợ trên trình duyệt Web');
    }
  };

  const executeSelectivePrintOrExport = async (action: 'print' | 'export') => {
    setShowSelectiveModal(false);
    try {
      let s = customStartDate || '2026-10-01';
      let e = customEndDate || s;
      if (s > e) [s, e] = [e, s];

      let url = `${API_URL}/api/admin/reports?period=${reportPeriod}&year=${reportYear}`;
      if (reportPeriod === 'month') {
        url += `&month=${reportMonth}`;
      } else if (reportPeriod === 'custom') {
        url += `&startDate=${s}&endDate=${e}`;
      }

      const res = await fetch(url);
      const result = await res.json();
      const dataToUse = (result && result.success && result.data) ? result.data : reportData;
      const periodStr = getReportPeriodString();

      if (action === 'print') {
        handlePrintReportForm(reportSection, selectiveOptions, dataToUse, periodStr);
      } else {
        handleExportReportCSV(reportSection, selectiveOptions, dataToUse, periodStr);
      }
    } catch (err) {
      if (action === 'print') {
        handlePrintReportForm(reportSection, selectiveOptions);
      } else {
        handleExportReportCSV(reportSection, selectiveOptions);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
    if (activeTab === 'reports') {
      fetchReportData();
    }
  };

  const handleRejectBankPayment = async (orderId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/orders/${orderId}/reject-bank-payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data && data.success) {
        showToast('Đã báo chưa nhận được tiền chuyển khoản');
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, payment_status: 'unpaid' } : o));
      } else {
        showToast(data.message || 'Không thể cập nhật');
      }
    } catch (e) {
      showToast('Lỗi kết nối máy chủ');
    }
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
        showToast(data.message || (returnStatus === 'Approved' ? 'Đã phê duyệt yêu cầu đổi trả thành công!' : 'Đã từ chối yêu cầu đổi trả!'));
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
        fetchData();
      } else {
        showToast(data?.message || 'Lỗi khi cập nhật đổi trả');
      }
    } catch (e) {
      showToast('Lỗi kết nối khi cập nhật đổi trả');
    } finally {
      setIsUpdatingReturn(null);
    }
  };

  // IN HÓA ĐƠN BÁN HÀNG & PHIẾU XUẤT KHO DÀNH CHO ADMIN
  const handlePrintOrderInvoice = (orderToPrint: any) => {
    if (!orderToPrint) return;
    const items = orderToPrint.items || [];
    const subtotal = items.reduce((sum: number, it: any) => sum + (Number(it.price || 0) * Number(it.quantity || 1)), 0);
    const totalPrice = Number(orderToPrint.total_price || 0);
    const discountAmount = Math.max(0, subtotal - totalPrice);
    const shippingFee = Number(orderToPrint.shipping_fee || 0);

    const getStatusVi = (st: string) => {
      switch ((st || '').toLowerCase()) {
        case 'pending': return 'Chờ xác nhận';
        case 'processing': return 'Đang xử lý / Đang giao';
        case 'completed': return 'Giao thành công';
        case 'cancelled': return 'Đã hủy đơn';
        default: return st || 'Đang xử lý';
      }
    };

    const getPaymentVi = (pm: string) => {
      if (['bank', 'banking', 'vietqr'].includes((pm || '').toLowerCase())) {
        return 'Chuyển khoản VietQR 24/7';
      }
      return 'Thanh toán tiền mặt khi nhận hàng (COD)';
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <title>Hoa_Don_Ban_Hang_HD_${orderToPrint.order_code || orderToPrint.id}</title>
            <style>
              @page { size: A4; margin: 12mm; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
                color: #0f172a; 
                padding: 16px; 
                max-width: 800px; 
                margin: 0 auto; 
                line-height: 1.5;
              }
              .header { text-align: center; border-bottom: 2px dashed #94a3b8; padding-bottom: 12px; margin-bottom: 14px; }
              .brand { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin-bottom: 3px; }
              .brand-sub { font-size: 13px; color: #475569; margin-bottom: 3px; }
              .brand-contact { font-size: 12px; color: #64748b; }
              .invoice-title { font-size: 19px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-top: 12px; letter-spacing: 0.5px; }
              .invoice-meta { font-size: 13px; color: #334155; margin-top: 4px; }
              .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
              .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 13px; }
              .info-box-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 6px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
              th { background: #f1f5f9; text-align: left; padding: 10px 8px; font-size: 12px; font-weight: 800; color: #334155; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; }
              td { padding: 9px 8px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .total-table { width: 100%; margin-top: 10px; border-top: 2px dashed #94a3b8; padding-top: 8px; }
              .total-table td { padding: 5px 8px; border-bottom: none; font-size: 13.5px; }
              .grand-total { font-size: 17px; font-weight: 900; color: #0f172a; }
              .signatures { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 28px; text-align: center; font-size: 12px; }
              .sig-title { font-weight: 800; color: #1e293b; }
              .sig-sub { font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px; }
              .sig-space { height: 50px; }
              .sig-name { font-weight: 700; color: #0f172a; }
              .footer { margin-top: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px dashed #cbd5e1; padding-top: 10px; }
              .stamp-badge { display: inline-block; padding: 2px 8px; border: 1.5px solid #059669; border-radius: 4px; color: #059669; font-weight: 800; font-size: 11px; margin-top: 6px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="brand">THỜI TRANG HD - THOITRANGHD.VN</div>
              <div class="brand-sub">Hệ Thống Phân Phối Thời Trang Nam Nữ Chuẩn Thiết Kế & Công Nghiệp</div>
              <div class="brand-contact">Địa chỉ: 123 Cầu Giấy, Hà Nội • Hotline: 0912.345.678 • Email: hotro@thoitranghd.vn</div>
              <div class="invoice-title">HÓA ĐƠN BÁN HÀNG & PHIẾU XUẤT KHO</div>
              <div class="invoice-meta">Mã Đơn: <b>#HD-${orderToPrint.order_code || orderToPrint.id}</b> | Mã Vận Đơn: <b>SPX-${orderToPrint.order_code || orderToPrint.id}</b></div>
              <div class="invoice-meta">Ngày đặt hàng: ${orderToPrint.created_at ? new Date(orderToPrint.created_at).toLocaleString('vi-VN') : '---'} | Thời gian in phiếu: ${new Date().toLocaleString('vi-VN')}</div>
            </div>

            <div class="grid-info">
              <div class="info-box">
                <div class="info-box-title">👤 Thông tin khách hàng & Giao nhận</div>
                <div><b>Họ tên:</b> ${orderToPrint.customer_name || 'Khách vãng lai'}</div>
                <div><b>Điện thoại:</b> ${orderToPrint.customer_phone || '---'}</div>
                <div><b>Địa chỉ giao:</b> ${orderToPrint.customer_address || '---'}</div>
                ${orderToPrint.order_note ? `<div><b>Ghi chú đơn:</b> ${orderToPrint.order_note}</div>` : ''}
              </div>
              <div class="info-box">
                <div class="info-box-title">💳 Thông tin thanh toán & Vận hành</div>
                <div><b>Phương thức:</b> ${getPaymentVi(orderToPrint.payment_method)}</div>
                <div><b>Trạng thái đơn:</b> <b style="color: #0284c7;">${getStatusVi(orderToPrint.status)}</b></div>
                <div><b>Trạng thái thanh toán:</b> ${orderToPrint.payment_status === 'paid' ? '<span style="color: #059669; font-weight: bold;">✓ Đã thanh toán</span>' : '<span style="color: #b45309; font-weight: bold;">⏳ Thu tiền khi nhận (COD)</span>'}</div>
                <div><b>Người lập phiếu:</b> Quản Trị Viên (Admin Shop)</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="text-center" style="width: 38px;">STT</th>
                  <th>Mô tả sản phẩm</th>
                  <th class="text-center" style="width: 140px;">Phân loại (Size / Màu)</th>
                  <th class="text-center" style="width: 50px;">SL</th>
                  <th class="text-right" style="width: 120px;">Đơn giá</th>
                  <th class="text-right" style="width: 130px;">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((it: any, idx: number) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td><b>${it.product_name}</b></td>
                    <td class="text-center">Size: ${it.size || 'M'} • Màu: ${it.color === '#000000' ? 'Đen' : it.color || 'Tiêu chuẩn'}</td>
                    <td class="text-center"><b>${it.quantity}</b></td>
                    <td class="text-right">${formatVND(it.price)}</td>
                    <td class="text-right"><b>${formatVND(Number(it.price) * Number(it.quantity))}</b></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <table class="total-table">
              <tr>
                <td class="text-right">Cộng tiền hàng (Tạm tính):</td>
                <td class="text-right" style="width: 160px;"><b>${formatVND(subtotal)}</b></td>
              </tr>
              <tr>
                <td class="text-right">Phí vận chuyển:</td>
                <td class="text-right">${shippingFee > 0 ? formatVND(shippingFee) : 'Miễn phí'}</td>
              </tr>
              ${discountAmount > 0 ? `
                <tr>
                  <td class="text-right" style="color: #b45309;">Chiết khấu Voucher khuyến mại:</td>
                  <td class="text-right" style="color: #b45309;">-<b>${formatVND(discountAmount)}</b></td>
                </tr>
              ` : ''}
              <tr>
                <td class="text-right grand-total">TỔNG SỐ TIỀN THANH TOÁN:</td>
                <td class="text-right grand-total">${formatVND(totalPrice)}</td>
              </tr>
            </table>

            <div class="signatures">
              <div>
                <div class="sig-title">Người Lập Phiếu</div>
                <div class="sig-sub">(Ký & ghi rõ họ tên)</div>
                <div class="sig-space"></div>
                <div class="sig-name">Admin Hệ Thống</div>
                <div class="stamp-badge">ĐÃ XÁC THỰC</div>
              </div>
              <div>
                <div class="sig-title">KCS / Xuất Kho</div>
                <div class="sig-sub">(Đã kiểm đủ SL & QC)</div>
                <div class="sig-space"></div>
                <div class="sig-name">Kho Vận HD</div>
              </div>
              <div>
                <div class="sig-title">Bưu Tá Giao Hàng</div>
                <div class="sig-sub">(Đã nhận nguyên đai)</div>
                <div class="sig-space"></div>
                <div class="sig-name">ThoiTrangHD Express</div>
              </div>
              <div>
                <div class="sig-title">Khách Hàng Nhận</div>
                <div class="sig-sub">(Đồng kiểm hàng hóa)</div>
                <div class="sig-space"></div>
                <div class="sig-name">${orderToPrint.customer_name || 'Khách nhận hàng'}</div>
              </div>
            </div>

            <div class="footer">
              <p>💡 <b>Chính sách bảo hành & Đổi trả:</b> Quý khách vui lòng kiểm tra hàng khi nhận. ThoiTrangHD hỗ trợ đổi size, đổi màu miễn phí trong 7 ngày.</p>
              <p>Hóa đơn điện tử khởi tạo từ hệ thống quản trị <b>ThoiTrangHD.vn</b> • Mọi khiếu nại xin liên hệ Hotline: <b>0912.345.678</b></p>
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
      showToast('Tính năng In hóa đơn được kích hoạt trên phiên bản Web của hệ thống');
    }
  };

  // Cập nhật trạng thái đơn hàng (Pending -> Processing -> Completed -> Cancelled)
  const handleUpdateOrderStatus = async (orderId: number, newStatus: OrderStatus, paymentStatus?: string) => {
    setUpdatingOrderId(orderId);
    try {
      const bodyObj: any = { status: newStatus };
      if (paymentStatus) {
        bodyObj.payment_status = paymentStatus;
      }
      const res = await fetch(`${API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
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
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, ...(paymentStatus ? { payment_status: paymentStatus } : {}) } : o))
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev: any) => ({ ...prev, status: newStatus, ...(paymentStatus ? { payment_status: paymentStatus } : {}) }));
        }
        // Làm mới thống kê doanh thu và số lượng đơn
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

  // [Chức năng UI: "✓ Xác nhận thanh toán & Duyệt đơn"] - Admin duyệt đơn VietQR khi tài khoản shop đã nhận được tiền
  const handleConfirmBankPaymentAndApprove = (orderId: number) => {
    handleUpdateOrderStatus(orderId, 'Processing', 'paid');
  };

  // [Chức năng UI: "🚚 Đã giao hàng"] - Admin xác nhận shipper đã phát hàng thành công và thu đủ tiền mặt COD
  const handleConfirmDelivered = (order: any) => {
    if (!order) return;
    const isCod = order.payment_method === 'cod' || !order.payment_method;
    const isUnpaid = order.payment_status !== 'paid';
    const message = `Bạn xác nhận đơn hàng #${order.order_code || order.id} đã được shipper giao thành công đến khách hàng?${
      isCod && isUnpaid
        ? `\n\n💵 Tiền thu COD cần thu: ${formatVND(order.total_price)}`
        : '\n\n💳 Đơn hàng đã được thanh toán trước'
    }`;

    setConfirmModalConfig({
      visible: true,
      title: 'Xác nhận đã giao hàng',
      message: message,
      confirmText: 'Xác nhận giao xong',
      cancelText: 'Đóng',
      confirmType: 'primary',
      onConfirm: () => {
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        handleUpdateOrderStatus(order.id, 'Completed', isCod ? 'paid' : undefined);
      },
    });
  };

  // [Chức năng UI: "Hủy đơn hàng"] - Hộp thoại xác nhận hủy đơn hàng phía Admin và dừng tiến trình
  const handleCancelOrder = (order: any) => {
    if (!order) return;
    setConfirmModalConfig({
      visible: true,
      title: 'Xác nhận hủy đơn hàng',
      message: `Bạn có chắc chắn muốn hủy đơn hàng #${order.order_code || order.id}? Thao tác này sẽ dừng tiến trình đơn hàng.`,
      confirmText: 'Hủy đơn hàng',
      cancelText: 'Không hủy',
      confirmType: 'danger',
      onConfirm: () => {
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
        handleUpdateOrderStatus(order.id, 'Cancelled');
      },
    });
  };

  // Product CRUD
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    const initialSizes = ['S', 'M', 'L', 'XL'];
    const initialColors = ['Đen', 'Trắng', 'Be'];
    const initialStocks: Record<string, string> = {};
    initialColors.forEach((col) => {
      initialSizes.forEach((sz) => {
        initialStocks[`${sz}_${col}`] = '5';
      });
    });

    setProdForm({
      name: '',
      price: '',
      original_price: '',
      discount: '0',
      category: 'Áo',
      image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop',
      description: 'Chất liệu vải cao cấp, co giãn thoáng mát, form dáng chuẩn thời trang.',
      stock: '60',
      selectedSizes: initialSizes,
      selectedColors: initialColors,
      allocationMode: 'auto',
      variantStocks: initialStocks,
    });
    setShowProductModal(true);
  };

  const handleOpenEditProduct = (prod: any) => {
    setEditingProduct(prod);
    const existingVariants = typeof prod.variants === 'string' ? JSON.parse(prod.variants || '[]') : (prod.variants || []);
    const existingSizes = Array.from(new Set(existingVariants.map((v: any) => v.size).filter(Boolean)));
    const existingColors = Array.from(new Set(existingVariants.map((v: any) => v.color).filter(Boolean)));

    const finalSizes = (existingSizes.length > 0 ? existingSizes : getCategorySizes(prod.category)) as string[];
    const finalColors = (existingColors.length > 0 ? existingColors : ['Đen', 'Trắng']) as string[];

    const variantStocks: Record<string, string> = {};
    existingVariants.forEach((v: any) => {
      if (v.size && v.color) {
        variantStocks[`${v.size}_${v.color}`] = String(v.stock ?? 0);
      }
    });

    setProdForm({
      name: prod.name || '',
      price: String(prod.price || ''),
      original_price: String(prod.original_price || prod.price || ''),
      discount: String(prod.discount || '0'),
      category: prod.category || 'Áo',
      image: prod.image || '',
      description: prod.description || '',
      stock: String(prod.stock || '50'),
      selectedSizes: finalSizes,
      selectedColors: finalColors,
      allocationMode: existingVariants.length > 0 ? 'manual' : 'auto',
      variantStocks,
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
        showToast('Đang tải ảnh lên...');

        let filename = asset.fileName;
        if (!filename) {
          const ext = asset.mimeType ? asset.mimeType.split('/').pop() : 'jpg';
          filename = `prod_${Date.now()}.${ext || 'jpg'}`;
        }

        const formData = new FormData();
        if (Platform.OS === 'web') {
          if ((asset as any).file instanceof Blob) {
            formData.append('image', (asset as any).file, filename);
          } else {
            const blobResp = await fetch(asset.uri);
            const blobData = await blobResp.blob();
            formData.append('image', blobData, filename);
          }
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
          setProdForm((prev) => ({ ...prev, image: data.url }));
          showToast('Tải ảnh thành công!');
        } else {
          showToast(data.message || 'Lỗi tải ảnh');
        }
      }
    } catch (err) {
      console.error('Lỗi khi tải ảnh:', err);
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
    const stockNum = parseInt(prodForm.stock.replace(/\D/g, '') || '50', 10) || 50;

    const sizes = prodForm.selectedSizes.length > 0 ? prodForm.selectedSizes : ['Freesize'];
    const colors = prodForm.selectedColors.length > 0 ? prodForm.selectedColors : ['Tiêu chuẩn'];

    let finalTotalStock = stockNum;
    const generatedVariants: any[] = [];

    if (prodForm.allocationMode === 'manual') {
      let sumStock = 0;
      colors.forEach((colName) => {
        const colObj = ADMIN_AVAILABLE_COLORS.find((c) => c.name === colName);
        const colorCode = colObj?.code || '#000000';
        sizes.forEach((sz) => {
          const key = `${sz}_${colName}`;
          const customQty = parseInt(prodForm.variantStocks[key] || '0', 10) || 0;
          sumStock += customQty;
          generatedVariants.push({
            size: sz,
            color: colName,
            color_code: colorCode,
            stock: customQty,
            sku: `SKU-${Date.now().toString().slice(-4)}-${sz}-${colName.toUpperCase().replace(/\s+/g, '')}`,
          });
        });
      });
      finalTotalStock = sumStock;
    } else {
      const count = sizes.length * colors.length;
      const baseQty = Math.floor(stockNum / count);
      let remainder = stockNum - (baseQty * count);

      colors.forEach((colName) => {
        const colObj = ADMIN_AVAILABLE_COLORS.find((c) => c.name === colName);
        const colorCode = colObj?.code || '#000000';
        sizes.forEach((sz) => {
          let qty = baseQty;
          if (remainder > 0) {
            qty += 1;
            remainder -= 1;
          }
          generatedVariants.push({
            size: sz,
            color: colName,
            color_code: colorCode,
            stock: Math.max(0, qty),
            sku: `SKU-${Date.now().toString().slice(-4)}-${sz}-${colName.toUpperCase().replace(/\s+/g, '')}`,
          });
        });
      });
      finalTotalStock = stockNum;
    }

    const payload = {
      name: prodForm.name.trim(),
      price: priceNum,
      original_price: origPriceNum,
      discount: discountNum,
      category: prodForm.category,
      image: prodForm.image,
      description: prodForm.description,
      stock: finalTotalStock,
      variants: generatedVariants,
    };

    try {
      if (editingProduct) {
        // Update
        const res = await fetch(`${API_URL}/api/admin/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Đã cập nhật sản phẩm và ma trận biến thể');
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
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Đã thêm sản phẩm (${generatedVariants.length} phân loại hàng)`);
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

  const handleDeleteProduct = (prodId: string, prodName: string) => {
    setConfirmModalConfig({
      visible: true,
      title: 'Xác nhận xóa sản phẩm',
      message: `Bạn có chắc chắn muốn xóa sản phẩm "${prodName}" khỏi hệ thống? Thao tác này không thể hoàn tác.`,
      confirmText: 'Xóa sản phẩm',
      cancelText: 'Hủy',
      confirmType: 'danger',
      onConfirm: async () => {
        setConfirmModalConfig((prev) => ({ ...prev, visible: false }));
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
      },
    });
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
        (orderStatusFilter === 'BANK_PENDING'
          ? (order.payment_method === 'bank' && order.payment_status === 'paid_pending_verification')
          : order.status?.toLowerCase() === orderStatusFilter.toLowerCase());
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
    { 
      key: 'overview', 
      label: 'Tổng quan', 
      icon: 'square.grid.2x2',
      badge: totalPendingTasks > 0 ? `${totalPendingTasks}` : undefined,
      badgeAlert: totalPendingTasks > 0,
    },
    {
      key: 'reports',
      label: 'Báo cáo',
      icon: 'chart.bar.xaxis',
    },
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
        <View style={[styles.headerContent, isMobile && { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 }]}>
          {/* Left: Back + Brand */}
          <View style={[styles.headerLeft, isMobile && { gap: 8, flex: 1 }]}>
            <TouchableOpacity
              style={[styles.backBtn, isMobile && { width: 34, height: 34, borderRadius: 17 }]}
              onPress={() => router.push('/(tabs)/user')}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={isMobile ? 16 : 18} color="#0f172a" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={[styles.brandBadgeRow, isMobile && { gap: 6 }]}>
                <Text style={[styles.headerBrand, isMobile && { fontSize: 14 }]} numberOfLines={1}>THỜI TRANG HD</Text>
                <View style={[styles.adminBadge, isMobile && { paddingHorizontal: 5, paddingVertical: 1.5 }]}>
                  <Text style={[styles.adminBadgeText, isMobile && { fontSize: 8.5 }]}>ADMIN</Text>
                </View>
              </View>
              {!isMobile && (
                <Text style={styles.headerSub} numberOfLines={1}>
                  Bảng điều khiển quản trị doanh nghiệp thời gian thực
                </Text>
              )}
            </View>
          </View>

          {/* Right: Actions */}
          <View style={[styles.headerRight, isMobile && { gap: 6 }]}>
            <TouchableOpacity
              style={[styles.storefrontBtn, isMobile && { paddingHorizontal: 8, paddingVertical: 6, gap: 4 }]}
              onPress={() => router.push('/(tabs)')}
              activeOpacity={0.8}
            >
              <IconSymbol name="bag" size={isMobile ? 14 : 15} color="#0f172a" />
              <Text style={[styles.storefrontBtnText, isMobile && { fontSize: 11 }]}>
                {isMobile ? 'Shop' : 'Xem Cửa Hàng'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.refreshBtn, isMobile && { paddingHorizontal: 8, paddingVertical: 6, gap: 4 }]}
              onPress={handleRefresh}
              activeOpacity={0.8}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <View style={[styles.onlineDot, isMobile && { width: 6, height: 6 }]} />
                  <Text style={[styles.refreshBtnText, isMobile && { fontSize: 11 }]}>Đồng bộ</Text>
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
              contentContainerStyle={[styles.tabsScrollContent, isMobile && { paddingHorizontal: 10, paddingVertical: 7, gap: 6 }]}
            >
              {tabsList.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabItemPill,
                      isActive && styles.tabItemPillActive,
                      isMobile && { paddingHorizontal: 10, paddingVertical: 6, gap: 5, borderRadius: 16 },
                    ]}
                    onPress={() => setActiveTab(tab.key as AdminTab)}
                    activeOpacity={0.75}
                  >
                    <IconSymbol
                      name={tab.icon as any}
                      size={isMobile ? 13 : 15}
                      color={isActive ? '#ffffff' : '#64748b'}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.tabItemText,
                        isActive && styles.tabItemTextActive,
                        isMobile && { fontSize: 12 },
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
                          isMobile && { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 10 },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabBadgeText,
                            isActive && styles.tabBadgeTextActive,
                            tab.badgeAlert && (isActive ? styles.tabBadgeAlertTextActive : styles.tabBadgeAlertText),
                            isMobile && { fontSize: 10 },
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
              <View style={[styles.metricsGrid, isMobile && { gap: 8 }]}>
                {/* Metric 1: Doanh Thu */}
                <View style={[styles.metricCard, isMobile && { padding: 12, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#10b981' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={[styles.metricCardTitle, isMobile && { fontSize: 10 }]}>TỔNG DOANH THU</Text>
                    <View style={[styles.metricIconWrap, isMobile && { width: 28, height: 28, borderRadius: 6 }, { backgroundColor: '#ecfdf5' }]}>
                      <IconSymbol name="banknote" size={isMobile ? 15 : 17} color="#059669" />
                    </View>
                  </View>
                  <Text style={[styles.metricCardValue, isMobile && { fontSize: 17, marginBottom: 4 }]} numberOfLines={1} adjustsFontSizeToFit>{formatVND(stats.totalRevenue)}</Text>
                  <View style={[styles.metricCardFooter, isMobile && { flexWrap: 'wrap', gap: 4 }]}>
                    <View style={[styles.growthBadge, isMobile && { paddingHorizontal: 5, paddingVertical: 1.5 }]}>
                      <Text style={[styles.growthText, isMobile && { fontSize: 9 }]}>Hôm nay:</Text>
                    </View>
                    <Text style={[styles.metricSubText, isMobile && { fontSize: 10 }]}>
                      +{formatVND(stats.todayRevenue)} ({stats.todayOrders || 0} đơn)
                    </Text>
                  </View>
                </View>

                {/* Metric 2: Đơn Hàng */}
                <View style={[styles.metricCard, isMobile && { padding: 12, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#3b82f6' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={[styles.metricCardTitle, isMobile && { fontSize: 10 }]}>TỔNG ĐƠN HÀNG</Text>
                    <View style={[styles.metricIconWrap, isMobile && { width: 28, height: 28, borderRadius: 6 }, { backgroundColor: '#eff6ff' }]}>
                      <IconSymbol name="cube.box" size={isMobile ? 15 : 17} color="#2563eb" />
                    </View>
                  </View>
                  <Text style={[styles.metricCardValue, isMobile && { fontSize: 17, marginBottom: 4 }]} numberOfLines={1}>{stats.totalOrders} đơn</Text>
                  <View style={[styles.metricCardFooter, isMobile && { flexWrap: 'wrap', gap: 4 }]}>
                    <View style={[styles.growthBadge, isMobile && { paddingHorizontal: 5, paddingVertical: 1.5 }, { backgroundColor: '#fef3c7' }]}>
                      <Text style={[styles.growthText, isMobile && { fontSize: 9 }, { color: '#b45309' }]}>
                        {stats.pendingOrders} chờ duyệt
                      </Text>
                    </View>
                    <Text style={[styles.metricSubText, isMobile && { fontSize: 10 }]}>
                      {stats.processingOrders} giao &bull; {stats.completedOrders} xong
                    </Text>
                  </View>
                </View>

                {/* Metric 3: Khách Hàng */}
                <View style={[styles.metricCard, isMobile && { padding: 12, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#8b5cf6' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={[styles.metricCardTitle, isMobile && { fontSize: 10 }]}>KHÁCH HÀNG CRM</Text>
                    <View style={[styles.metricIconWrap, isMobile && { width: 28, height: 28, borderRadius: 6 }, { backgroundColor: '#f5f3ff' }]}>
                      <IconSymbol name="person.fill" size={isMobile ? 15 : 17} color="#7c3aed" />
                    </View>
                  </View>
                  <Text style={[styles.metricCardValue, isMobile && { fontSize: 17, marginBottom: 4 }]} numberOfLines={1}>{stats.totalUsers} thành viên</Text>
                  <View style={styles.metricCardFooter}>
                    <Text style={[styles.metricSubText, isMobile && { fontSize: 10 }]}>Người dùng đăng ký</Text>
                  </View>
                </View>

                {/* Metric 4: Sản Phẩm */}
                <View style={[styles.metricCard, isMobile && { padding: 12, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#f59e0b' }]}>
                  <View style={styles.metricCardTop}>
                    <Text style={[styles.metricCardTitle, isMobile && { fontSize: 10 }]}>KHO SẢN PHẨM</Text>
                    <View style={[styles.metricIconWrap, isMobile && { width: 28, height: 28, borderRadius: 6 }, { backgroundColor: '#fffbeb' }]}>
                      <IconSymbol name="bag" size={isMobile ? 15 : 17} color="#d97706" />
                    </View>
                  </View>
                  <Text style={[styles.metricCardValue, isMobile && { fontSize: 17, marginBottom: 4 }]} numberOfLines={1}>{stats.totalProducts} mặt hàng</Text>
                  <View style={styles.metricCardFooter}>
                    <Text style={[styles.metricSubText, isMobile && { fontSize: 10 }]}>
                      {stats.categoryStats?.length || 6} phân loại danh mục
                    </Text>
                  </View>
                </View>
              </View>

              {/* BẢNG CÔNG VIỆC CẦN ADMIN XỬ LÝ (CARD CONTAINER ĐỒNG BỘ 100%) */}
              <View style={[styles.cardContainer, { width: '100%', marginBottom: 16 }, isMobile && { padding: 12 }]}>
                <View style={[styles.cardHeader, isMobile && { flexWrap: 'wrap', gap: 6 }]}>
                  <View style={{ flex: 1, minWidth: 200, marginRight: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.cardTitle, isMobile && { fontSize: 14 }]}>Công Việc Cần Admin Giải Quyết</Text>
                      {totalPendingTasks > 0 ? (
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#b91c1c' }}>{totalPendingTasks} việc</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#047857' }}>✓ Đã xong</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardSubtitle, isMobile && { fontSize: 11 }]}>Các tác vụ phát sinh cần phê duyệt và kiểm tra gấp</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      if (returnStats.requested > 0) {
                        setActiveTab('returns');
                        setReturnStatusFilter('Requested');
                      } else if (pendingBankOrders.length > 0) {
                        setActiveTab('orders');
                        setOrderStatusFilter('Pending');
                      } else {
                        setActiveTab('inventory');
                      }
                    }}
                    activeOpacity={0.7}
                    style={{ flexShrink: 0 }}
                  >
                    <Text style={styles.viewAllLink}>Xử lý ngay &rarr;</Text>
                  </TouchableOpacity>
                </View>

                {/* Danh sách các công việc cần làm */}
                <View style={styles.recentOrdersList}>
                  {/* Task 1: Đổi / Trả hàng */}
                  <TouchableOpacity
                    style={[
                      styles.recentOrderItem,
                      returnStats.requested > 0 && { backgroundColor: '#fffbeb', borderColor: '#fde68a' }
                    ]}
                    onPress={() => {
                      setActiveTab('returns');
                      setReturnStatusFilter('Requested');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, minWidth: 0, marginRight: 8 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: returnStats.requested > 0 ? '#fef3c7' : '#f1f5f9',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <IconSymbol name="arrow.2.squarepath" size={17} color={returnStats.requested > 0 ? '#d97706' : '#64748b'} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.recentOrderCode, isMobile && { fontSize: 13, flexShrink: 1 }]} numberOfLines={1}>
                            Yêu cầu đổi / trả hàng
                          </Text>
                          {returnStats.requested > 0 && (
                            <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, flexShrink: 0 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#b45309' }}>CẦN DUYỆT</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.recentOrderCustomer, isMobile && { fontSize: 11 }]} numberOfLines={1}>
                          {returnStats.requested > 0
                            ? `${returnStats.requested} yêu cầu đổi size / trả hàng từ khách chờ duyệt`
                            : 'Đã hoàn tất, không có yêu cầu tồn đọng'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <View style={[
                        styles.badgePill,
                        {
                          backgroundColor: returnStats.requested > 0 ? '#b45309' : '#0f172a',
                          borderColor: returnStats.requested > 0 ? '#b45309' : '#0f172a',
                          paddingHorizontal: 10,
                          paddingVertical: 5
                        }
                      ]}>
                        <Text style={[styles.badgePillText, { color: '#ffffff', fontWeight: '700', fontSize: 11 }]}>
                          {returnStats.requested > 0 ? `Duyệt (${returnStats.requested})` : 'Xem'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Task 2: Thanh toán VietQR */}
                  <TouchableOpacity
                    style={[
                      styles.recentOrderItem,
                      pendingBankOrders.length > 0 && { backgroundColor: '#faf5ff', borderColor: '#ddd6fe' }
                    ]}
                    onPress={() => {
                      setActiveTab('orders');
                      setOrderStatusFilter('BANK_PENDING');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, minWidth: 0, marginRight: 8 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: pendingBankOrders.length > 0 ? '#ede9fe' : '#f1f5f9',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <IconSymbol name="creditcard" size={17} color={pendingBankOrders.length > 0 ? '#7c3aed' : '#64748b'} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.recentOrderCode, isMobile && { fontSize: 13, flexShrink: 1 }]} numberOfLines={1}>
                            Thanh toán VietQR chờ duyệt
                          </Text>
                          {pendingBankOrders.length > 0 && (
                            <View style={{ backgroundColor: '#ede9fe', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, flexShrink: 0 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#6d28d9' }}>CHỜ TIỀN</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.recentOrderCustomer, isMobile && { fontSize: 11 }]} numberOfLines={1}>
                          {pendingBankOrders.length > 0
                            ? `${pendingBankOrders.length} đơn khách báo đã CK, cần đối soát ngân hàng`
                            : 'Tất cả đơn chuyển khoản đều đã đối soát xong'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <View style={[
                        styles.badgePill,
                        {
                          backgroundColor: pendingBankOrders.length > 0 ? '#6d28d9' : '#0f172a',
                          borderColor: pendingBankOrders.length > 0 ? '#6d28d9' : '#0f172a',
                          paddingHorizontal: 10,
                          paddingVertical: 5
                        }
                      ]}>
                        <Text style={[styles.badgePillText, { color: '#ffffff', fontWeight: '700', fontSize: 11 }]}>
                          {pendingBankOrders.length > 0 ? `Duyệt (${pendingBankOrders.length})` : 'Xem'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Task 3: Cảnh báo tồn kho */}
                  <TouchableOpacity
                    style={[
                      styles.recentOrderItem,
                      lowStockProducts.length > 0 && { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }
                    ]}
                    onPress={() => {
                      setActiveTab('inventory');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10, minWidth: 0, marginRight: 8 }}>
                      <View style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: lowStockProducts.length > 0 ? '#fee2e2' : '#f1f5f9',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexShrink: 0
                      }}>
                        <IconSymbol name="exclamationmark.circle.fill" size={17} color={lowStockProducts.length > 0 ? '#e11d48' : '#64748b'} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={[styles.recentOrderCode, isMobile && { fontSize: 13, flexShrink: 1 }]} numberOfLines={1}>
                            Cảnh báo tồn kho an toàn
                          </Text>
                          {lowStockProducts.length > 0 && (
                            <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, flexShrink: 0 }}>
                              <Text style={{ fontSize: 9, fontWeight: '800', color: '#be123c' }}>SẮP HẾT HÀNG</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.recentOrderCustomer, isMobile && { fontSize: 11 }]} numberOfLines={1}>
                          {lowStockProducts.length > 0
                            ? `${lowStockProducts.length} sản phẩm còn ≤ 10 chiếc (${outOfStockProducts.length} SP hết hàng)`
                            : 'Tồn kho ổn định, không có sản phẩm thiếu hụt'}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                      <View style={[
                        styles.badgePill,
                        {
                          backgroundColor: lowStockProducts.length > 0 ? '#be123c' : '#0f172a',
                          borderColor: lowStockProducts.length > 0 ? '#be123c' : '#0f172a',
                          paddingHorizontal: 10,
                          paddingVertical: 5
                        }
                      ]}>
                        <Text style={[styles.badgePillText, { color: '#ffffff', fontWeight: '700', fontSize: 11 }]}>
                          {lowStockProducts.length > 0 ? 'Nhập kho' : 'Xem kho'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 7-DAY REVENUE BAR CHART & PIPELINE SECTION */}
              <View style={[styles.analyticsRow, isDesktop && styles.analyticsRowDesktop]}>
                {/* 7-Day Interactive Bar Chart */}
                <View style={[styles.cardContainer, isDesktop ? { flex: 1.6 } : { width: '100%' }, isMobile && { padding: 12 }]}>
                  <View style={[styles.cardHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                    <View>
                      <Text style={[styles.cardTitle, isMobile && { fontSize: 14 }]}>Biểu Đồ Doanh Thu 7 Ngày</Text>
                      <Text style={[styles.cardSubtitle, isMobile && { fontSize: 11 }]}>Doanh số phát sinh thực tế (VNĐ)</Text>
                    </View>
                    <View style={[styles.chartLegend, isMobile && { alignSelf: 'flex-start' }]}>
                      <View style={styles.legendDot} />
                      <Text style={[styles.legendText, isMobile && { fontSize: 10.5 }]}>Doanh thu / ngày</Text>
                    </View>
                  </View>

                  <View style={[styles.chartWrapper, isMobile && { height: 160 }]}>
                    <View style={styles.barsContainer}>
                      {stats.dailyRevenue && stats.dailyRevenue.length > 0 ? (
                        stats.dailyRevenue.map((item: any, idx: number) => {
                          const rev = Number(item.revenue) || 0;
                          const heightPercent = Math.max(12, Math.round((rev / maxDailyRevenue) * 100));
                          const isToday = idx === stats.dailyRevenue.length - 1;
                          return (
                            <View key={item.date || idx} style={styles.barCol}>
                              <Text style={[styles.barValText, isMobile && { fontSize: 8.5 }]}>
                                {rev > 0 ? `${Math.round(rev / 1000)}k` : '0'}
                              </Text>
                              <View style={[styles.barTrack, isMobile && { width: '48%', height: 100 }]}>
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
                              <Text style={[styles.barLabel, isToday && styles.barLabelToday, isMobile && { fontSize: 9.5 }]}>
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

          {/* TAB: BÁO CÁO & PHÂN HỆ THỐNG KÊ CHUYÊN SÂU (TÁCH RIÊNG TỪNG CHUYÊN MỤC) */}
          {activeTab === 'reports' && (
            <View style={styles.tabContent}>
              {/* Header điều khiển thời gian & Bộ lọc */}
              <View style={[styles.reportHeaderCard, isMobile && { padding: 13 }]}>
                <View style={[styles.reportHeaderTop, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.reportTitle, isMobile && { fontSize: 16 }]}>
                      Báo Cáo & Phân Hệ Thống Kê
                    </Text>
                    <Text style={[styles.reportSubtitle, isMobile && { fontSize: 11 }]}>
                      Quản trị kinh doanh & tài chính đa chiều: Phân định riêng từng mục báo cáo
                    </Text>
                  </View>
                  <View style={[styles.reportHeaderActionsRow, isMobile && { width: '100%', flexDirection: 'row', gap: 6 }]}>
                    <TouchableOpacity
                      style={[styles.reportHeaderActionBtn, { backgroundColor: '#4f46e5' }]}
                      onPress={() => setShowSelectiveModal(true)}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="slider.horizontal.3" size={14} color="#ffffff" />
                      <Text style={styles.reportHeaderActionBtnText}>Tùy chọn in</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reportHeaderActionBtn, { backgroundColor: '#0284c7' }]}
                      onPress={() => handlePrintReportForm(reportSection)}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="printer" size={14} color="#ffffff" />
                      <Text style={styles.reportHeaderActionBtnText}>In báo cáo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.reportHeaderActionBtn, { backgroundColor: '#0f172a' }]}
                      onPress={() => handleExportReportCSV(reportSection)}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="arrow.down.doc" size={14} color="#ffffff" />
                      <Text style={styles.reportHeaderActionBtnText}>Xuất CSV</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Phân Hệ Thống Kê Riêng Biệt - 5 Phân Hệ Độc Lập */}
                <View style={styles.reportSectionRibbonWrap}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                    Chọn mục thống kê độc lập (5 phân hệ riêng biệt):
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.reportSectionRibbonScroll}
                  >
                    {[
                      { key: 'revenue', label: 'Doanh Thu & Tài Chính', icon: 'banknote', badge: 'Tài chính' },
                      { key: 'products', label: 'Sản Phẩm Bán Chạy', icon: 'bag', badge: `${reportData?.topProducts?.length || 0} SP` },
                      { key: 'categories', label: 'Danh Mục Ngành Hàng', icon: 'square.grid.2x2', badge: `${reportData?.categoryStats?.length || 0} mục` },
                      { key: 'customers', label: 'Khách Hàng & VIP', icon: 'person.fill', badge: 'Top VIP' },
                      { key: 'operations', label: 'Đơn Hàng & Vận Hành', icon: 'cube.box', badge: 'Vận hành' },
                    ].map((sec) => {
                      const isActive = reportSection === sec.key;
                      return (
                        <TouchableOpacity
                          key={sec.key}
                          style={[styles.reportSectionTabPill, isActive && styles.reportSectionTabPillActive]}
                          onPress={() => setReportSection(sec.key as ReportSection)}
                          activeOpacity={0.75}
                        >
                          <IconSymbol
                            name={sec.icon as any}
                            size={14}
                            color={isActive ? '#ffffff' : '#64748b'}
                          />
                          <Text style={[styles.reportSectionTabText, isActive && styles.reportSectionTabTextActive]}>
                            {sec.label}
                          </Text>
                          {sec.badge && (
                            <View style={[styles.reportSectionBadge, isActive && styles.reportSectionBadgeActive]}>
                              <Text style={[styles.reportSectionBadgeText, isActive && styles.reportSectionBadgeTextActive]}>
                                {sec.badge}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Period Selector Pills in Horizontal Scroll */}
                <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', marginBottom: 6, textTransform: 'uppercase' }}>
                    Chọn Kỳ Báo Cáo Thống Kê ({getReportPeriodString()}):
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.reportPeriodScroll}
                  >
                    {[
                      { key: 'year', label: `Cả năm (${reportYear})` },
                      { key: 'month', label: 'Theo tháng' },
                      { key: '30days', label: '30 ngày qua' },
                      { key: '7days', label: '7 ngày qua' },
                      { key: 'custom', label: '📅 Chọn ngày / Khoảng ngày' },
                    ].map((p) => {
                      const isActive = reportPeriod === p.key;
                      return (
                        <TouchableOpacity
                          key={p.key}
                          style={[styles.reportPeriodPill, isActive && styles.reportPeriodPillActive]}
                          onPress={() => {
                            setReportPeriod(p.key as any);
                            setSelectedChartMonth(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.reportPeriodPillText, isActive && styles.reportPeriodPillTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Month Picker Sub-chips (khi chọn Theo tháng) */}
                {reportPeriod === 'month' && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reportMonthChipsScroll}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                      const isSel = reportMonth === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.reportMonthChip, isSel && styles.reportMonthChipActive]}
                          onPress={() => {
                            setReportMonth(m);
                            setSelectedChartMonth(null);
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.reportMonthChipText, isSel && styles.reportMonthChipTextActive]}>
                            Tháng {m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {/* Custom Date / Range Selector Control Box */}
                {reportPeriod === 'custom' && (
                  <View style={styles.customDateControlBox}>
                    <View style={styles.customModeRow}>
                      <TouchableOpacity
                        style={[styles.customModeTab, customMode === 'single' && styles.customModeTabActive]}
                        onPress={() => {
                          setCustomMode('single');
                          setCustomEndDate(customStartDate);
                          setSelectedChartMonth(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <IconSymbol name="calendar" size={14} color={customMode === 'single' ? '#0284c7' : '#64748b'} />
                        <Text style={[styles.customModeTabText, customMode === 'single' && styles.customModeTabTextActive]}>
                          Xem 1 ngày cố định
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.customModeTab, customMode === 'range' && styles.customModeTabActive]}
                        onPress={() => {
                          setCustomMode('range');
                          if (customStartDate === customEndDate) {
                            setCustomEndDate('2026-10-05');
                          }
                          setSelectedChartMonth(null);
                        }}
                        activeOpacity={0.8}
                      >
                        <IconSymbol name="calendar.badge.clock" size={14} color={customMode === 'range' ? '#0284c7' : '#64748b'} />
                        <Text style={[styles.customModeTabText, customMode === 'range' && styles.customModeTabTextActive]}>
                          Khoảng ngày (Từ - Đến)
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {customMode === 'single' ? (
                      <View style={styles.dateInputSection}>
                        <Text style={styles.dateInputLabel}>Chọn ngày cần xem báo cáo (Nhập tay hoặc Bấm nút Mở lịch):</Text>
                        <View style={styles.datePickerInputWrap}>
                          <View style={styles.dateInputPickerRow}>
                            <TextInput
                              style={styles.dateTextInputWithBtn}
                              value={customStartDate}
                              onChangeText={(val) => {
                                setCustomStartDate(val);
                                setCustomEndDate(val);
                                setSelectedChartMonth(null);
                              }}
                              placeholder="2026-10-01"
                            />
                            <TouchableOpacity
                              style={styles.openCalendarBtn}
                              onPress={() => openCalendarModal('single')}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="calendar" size={15} color="#ffffff" />
                              <Text style={styles.openCalendarBtnText}>Mở Lịch</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={{ marginTop: 6 }}>
                          <Text style={styles.quickDateTitle}>Ngày mẫu gợi ý (Bấm chọn nhanh):</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {[
                              { label: '01/10/2026', date: '2026-10-01' },
                              { label: '05/10/2026', date: '2026-10-05' },
                              { label: '09/10/2026', date: '2026-10-09' },
                              { label: '16/10/2026', date: '2026-10-16' },
                              { label: 'Hôm nay', date: new Date().toISOString().slice(0, 10) },
                            ].map((btn) => (
                              <TouchableOpacity
                                key={btn.date}
                                style={[styles.quickDateBtn, customStartDate === btn.date && styles.quickDateBtnActive]}
                                onPress={() => {
                                  setCustomStartDate(btn.date);
                                  setCustomEndDate(btn.date);
                                  setSelectedChartMonth(null);
                                }}
                              >
                                <Text style={[styles.quickDateBtnText, customStartDate === btn.date && styles.quickDateBtnTextActive]}>
                                  {btn.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.dateInputSection}>
                        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dateInputLabel}>Từ ngày (Start Date):</Text>
                            <View style={styles.dateInputPickerRow}>
                              <TextInput
                                style={styles.dateTextInputWithBtn}
                                value={customStartDate}
                                onChangeText={(val) => {
                                  setCustomStartDate(val);
                                  setSelectedChartMonth(null);
                                }}
                                placeholder="2026-10-01"
                              />
                              <TouchableOpacity
                                style={styles.openCalendarBtn}
                                onPress={() => openCalendarModal('start')}
                                activeOpacity={0.8}
                              >
                                <IconSymbol name="calendar" size={15} color="#ffffff" />
                                <Text style={styles.openCalendarBtnText}>Lịch</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.dateInputLabel}>Đến ngày (End Date):</Text>
                            <View style={styles.dateInputPickerRow}>
                              <TextInput
                                style={styles.dateTextInputWithBtn}
                                value={customEndDate}
                                onChangeText={(val) => {
                                  setCustomEndDate(val);
                                  setSelectedChartMonth(null);
                                }}
                                placeholder="2026-10-05"
                              />
                              <TouchableOpacity
                                style={styles.openCalendarBtn}
                                onPress={() => openCalendarModal('end')}
                                activeOpacity={0.8}
                              >
                                <IconSymbol name="calendar" size={15} color="#ffffff" />
                                <Text style={styles.openCalendarBtnText}>Lịch</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>

                        <View style={{ marginTop: 6 }}>
                          <Text style={styles.quickDateTitle}>Khoảng mẫu gợi ý (Bấm chọn nhanh):</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                            {[
                              { label: '01/10 - 05/10 (Thầy hỏi)', s: '2026-10-01', e: '2026-10-05' },
                              { label: '01/10 - 10/10', s: '2026-10-01', e: '2026-10-10' },
                              { label: '01/10 - 16/10', s: '2026-10-01', e: '2026-10-16' },
                              { label: 'Cả tháng 10', s: '2026-10-01', e: '2026-10-31' },
                              { label: 'Cuối tháng 9 (20-30/9)', s: '2026-09-20', e: '2026-09-30' },
                            ].map((btn) => {
                              const isMatch = customStartDate === btn.s && customEndDate === btn.e;
                              return (
                                <TouchableOpacity
                                  key={btn.label}
                                  style={[styles.quickDateBtn, isMatch && styles.quickDateBtnActive]}
                                  onPress={() => {
                                    setCustomStartDate(btn.s);
                                    setCustomEndDate(btn.e);
                                    setSelectedChartMonth(null);
                                  }}
                                >
                                  <Text style={[styles.quickDateBtnText, isMatch && styles.quickDateBtnTextActive]}>
                                    {btn.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    )}

                    <View style={styles.customDateActiveBadge}>
                      <IconSymbol
                        name={customStartDate > customEndDate ? 'exclamationmark.triangle.fill' : 'info.circle.fill'}
                        size={14}
                        color={customStartDate > customEndDate ? '#e11d48' : '#0284c7'}
                      />
                      <Text
                        style={[
                          styles.customDateActiveBadgeText,
                          customStartDate > customEndDate && { color: '#e11d48' },
                        ]}
                      >
                        {customStartDate > customEndDate
                          ? `Lưu ý: Ngày bắt đầu (${customStartDate}) lớn hơn ngày kết thúc (${customEndDate}). Hệ thống sẽ tự đảo ngày để lọc chính xác!`
                          : customMode === 'single' || customStartDate === customEndDate
                          ? `Đang thống kê ngày: ${customStartDate} (Phân tích doanh thu theo từng khung giờ trong ngày)`
                          : `Đang thống kê từ ngày: ${customStartDate} ➔ ${customEndDate} (Tổng hợp doanh thu theo từng ngày)`}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {reportLoading ? (
                <View style={[styles.loadingContainer, { paddingVertical: 40 }]}>
                  <ActivityIndicator size="large" color="#0f172a" />
                  <Text style={styles.loadingText}>Đang tổng hợp báo cáo...</Text>
                </View>
              ) : (
                <>
                  {/* MỤC 1: DOANH THU & TÀI CHÍNH */}
                  {reportSection === 'revenue' && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.reportSectionHeaderBanner}>
                        <View>
                          <Text style={styles.reportSectionBannerTitle}>💰 Phân Hệ Thống Kê Doanh Thu & Tài Chính</Text>
                          <Text style={styles.reportSectionBannerSub}>
                            Đối soát dòng tiền, chỉ tiêu AOV, tỷ lệ hoàn tất & diễn biến doanh số theo kỳ
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          <TouchableOpacity
                            style={[styles.reportSectionPrintBtn, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' }]}
                            onPress={() => setShowSelectiveModal(true)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="slider.horizontal.3" size={13} color="#0f172a" />
                            <Text style={[styles.reportSectionPrintBtnText, { color: '#0f172a' }]}>Tùy Chọn Chỉ Số</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.reportSectionPrintBtn}
                            onPress={() => handlePrintReportForm('revenue')}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="printer" size={13} color="#0284c7" />
                            <Text style={styles.reportSectionPrintBtnText}>In Form Tài Chính</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Executive Financial KPIs */}
                      <View style={styles.reportKpiGrid}>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <View style={styles.reportKpiTopRow}>
                            <View style={[styles.reportKpiIconWrap, { backgroundColor: '#ecfdf5' }]}>
                              <IconSymbol name="banknote" size={15} color="#059669" />
                            </View>
                            <View style={styles.reportKpiBadge}>
                              <Text style={styles.reportKpiBadgeText}>Thực nhận</Text>
                            </View>
                          </View>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]} numberOfLines={1}>
                            DOANH THU THUẦN
                          </Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]} numberOfLines={1}>
                            {formatVND(reportData?.kpis?.totalRevenue || 0)}
                          </Text>
                          <Text style={styles.reportKpiSub}>Tổng tiền trừ đơn hủy</Text>
                          <View style={styles.kpiCardActionRow}>
                            <TouchableOpacity
                              style={styles.kpiCardActionPrintBtn}
                              onPress={() => handlePrintReportForm('revenue', {
                                kpiRevenue: true,
                                kpiCompletedOrders: false,
                                kpiAov: false,
                                kpiCancelRate: false,
                                kpiTotalOrders: false,
                                tableChartData: true,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="printer" size={10} color="#059669" />
                              <Text style={[styles.kpiCardActionText, { color: '#059669' }]}>In riêng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.kpiCardActionCsvBtn}
                              onPress={() => handleExportReportCSV('revenue', {
                                kpiRevenue: true,
                                kpiCompletedOrders: false,
                                kpiAov: false,
                                kpiCancelRate: false,
                                kpiTotalOrders: false,
                                tableChartData: false,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="arrow.down.doc" size={10} color="#475569" />
                              <Text style={styles.kpiCardActionText}>CSV</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <View style={styles.reportKpiTopRow}>
                            <View style={[styles.reportKpiIconWrap, { backgroundColor: '#eff6ff' }]}>
                              <IconSymbol name="checkmark.circle.fill" size={15} color="#2563eb" />
                            </View>
                            <View style={[styles.reportKpiBadge, { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' }]}>
                              <Text style={[styles.reportKpiBadgeText, { color: '#0369a1' }]}>
                                {reportData?.kpis?.completionRate || 100}%
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]} numberOfLines={1}>
                            ĐƠN HOÀN TẤT
                          </Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]} numberOfLines={1}>
                            {reportData?.kpis?.completedOrders || 0} / {reportData?.kpis?.totalOrders || 0}
                          </Text>
                          <Text style={styles.reportKpiSub}>Đơn giao thành công</Text>
                          <View style={styles.kpiCardActionRow}>
                            <TouchableOpacity
                              style={styles.kpiCardActionPrintBtn}
                              onPress={() => handlePrintReportForm('revenue', {
                                kpiRevenue: false,
                                kpiCompletedOrders: true,
                                kpiAov: false,
                                kpiCancelRate: false,
                                kpiTotalOrders: true,
                                tableChartData: true,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="printer" size={10} color="#2563eb" />
                              <Text style={[styles.kpiCardActionText, { color: '#2563eb' }]}>In riêng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.kpiCardActionCsvBtn}
                              onPress={() => handleExportReportCSV('revenue', {
                                kpiRevenue: false,
                                kpiCompletedOrders: true,
                                kpiAov: false,
                                kpiCancelRate: false,
                                kpiTotalOrders: true,
                                tableChartData: false,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="arrow.down.doc" size={10} color="#475569" />
                              <Text style={styles.kpiCardActionText}>CSV</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <View style={styles.reportKpiTopRow}>
                            <View style={[styles.reportKpiIconWrap, { backgroundColor: '#fffbeb' }]}>
                              <IconSymbol name="bag" size={15} color="#d97706" />
                            </View>
                            <View style={[styles.reportKpiBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                              <Text style={[styles.reportKpiBadgeText, { color: '#b45309' }]}>Chất lượng</Text>
                            </View>
                          </View>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]} numberOfLines={1}>
                            GIÁ TRỊ TB / ĐƠN
                          </Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]} numberOfLines={1}>
                            {formatVND(reportData?.kpis?.aov || 0)}
                          </Text>
                          <Text style={styles.reportKpiSub}>Bình quân mỗi giỏ hàng</Text>
                          <View style={styles.kpiCardActionRow}>
                            <TouchableOpacity
                              style={styles.kpiCardActionPrintBtn}
                              onPress={() => handlePrintReportForm('revenue', {
                                kpiRevenue: true,
                                kpiCompletedOrders: false,
                                kpiAov: true,
                                kpiCancelRate: false,
                                kpiTotalOrders: false,
                                tableChartData: true,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="printer" size={10} color="#d97706" />
                              <Text style={[styles.kpiCardActionText, { color: '#d97706' }]}>In riêng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.kpiCardActionCsvBtn}
                              onPress={() => handleExportReportCSV('revenue', {
                                kpiRevenue: true,
                                kpiCompletedOrders: false,
                                kpiAov: true,
                                kpiCancelRate: false,
                                kpiTotalOrders: false,
                                tableChartData: false,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="arrow.down.doc" size={10} color="#475569" />
                              <Text style={styles.kpiCardActionText}>CSV</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <View style={styles.reportKpiTopRow}>
                            <View style={[styles.reportKpiIconWrap, { backgroundColor: '#fff1f2' }]}>
                              <IconSymbol name="arrow.2.squarepath" size={15} color="#e11d48" />
                            </View>
                            <View
                              style={[
                                styles.reportKpiBadge,
                                {
                                  backgroundColor: Number(reportData?.kpis?.cancelRate || 0) > 10 ? '#fee2e2' : '#f1f5f9',
                                  borderColor: Number(reportData?.kpis?.cancelRate || 0) > 10 ? '#fecdd3' : '#e2e8f0',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.reportKpiBadgeText,
                                  {
                                    color: Number(reportData?.kpis?.cancelRate || 0) > 10 ? '#b91c1c' : '#64748b',
                                  },
                                ]}
                              >
                                {reportData?.kpis?.cancelledOrders || 0} hủy
                              </Text>
                            </View>
                          </View>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]} numberOfLines={1}>
                            TỶ LỆ HỦY ĐƠN
                          </Text>
                          <Text
                            style={[
                              styles.reportKpiValue,
                              isMobile && { fontSize: 16 },
                              Number(reportData?.kpis?.cancelRate || 0) > 10 && { color: '#dc2626' },
                            ]}
                            numberOfLines={1}
                          >
                            {reportData?.kpis?.cancelRate || 0}%
                          </Text>
                          <Text style={styles.reportKpiSub}>Kiểm soát rủi ro hoàn</Text>
                          <View style={styles.kpiCardActionRow}>
                            <TouchableOpacity
                              style={styles.kpiCardActionPrintBtn}
                              onPress={() => handlePrintReportForm('revenue', {
                                kpiRevenue: false,
                                kpiCompletedOrders: false,
                                kpiAov: false,
                                kpiCancelRate: true,
                                kpiTotalOrders: true,
                                tableChartData: true,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="printer" size={10} color="#e11d48" />
                              <Text style={[styles.kpiCardActionText, { color: '#e11d48' }]}>In riêng</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.kpiCardActionCsvBtn}
                              onPress={() => handleExportReportCSV('revenue', {
                                kpiRevenue: false,
                                kpiCompletedOrders: false,
                                kpiAov: false,
                                kpiCancelRate: true,
                                kpiTotalOrders: true,
                                tableChartData: false,
                                tableCategory: false,
                                tableTopProducts: false,
                              })}
                              activeOpacity={0.7}
                            >
                              <IconSymbol name="arrow.down.doc" size={10} color="#475569" />
                              <Text style={styles.kpiCardActionText}>CSV</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>

                      {/* Bar Chart Card */}
                      <View style={styles.reportChartCard}>
                        <View style={styles.reportChartHeader}>
                          <View>
                            <Text style={styles.reportChartTitle}>
                              {reportPeriod === 'custom'
                                ? (customStartDate === customEndDate
                                    ? `Doanh Thu Theo Khung Giờ Ngày ${customStartDate}`
                                    : `Doanh Thu Từ ${customStartDate} Đến ${customEndDate}`)
                                : reportPeriod === 'year'
                                ? `Doanh Thu 12 Tháng Năm ${reportYear}`
                                : reportPeriod === 'month'
                                ? `Doanh Thu Chi Tiết Tháng ${reportMonth}/${reportYear}`
                                : reportPeriod === '30days'
                                ? 'Doanh Thu 30 Ngày Gần Nhất'
                                : 'Doanh Thu 7 Ngày Gần Nhất'}
                            </Text>
                            <Text style={styles.reportChartSub}>
                              Chạm vào cột bất kỳ để xem chi tiết doanh số & số đơn
                            </Text>
                          </View>
                        </View>

                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.reportBarTrackContainer}
                        >
                          {(() => {
                            const maxVal = Math.max(
                              ...(reportData?.chartData?.map((d: any) => Number(d.revenue) || 0) || [1]),
                              1
                            );
                            return reportData?.chartData?.map((item: any, idx: number) => {
                              const rev = Number(item.revenue) || 0;
                              const heightPct = Math.max(8, Math.round((rev / maxVal) * 100));
                              const isSel = selectedChartMonth?.label === item.label;

                              return (
                                <TouchableOpacity
                                  key={item.label || idx}
                                  style={styles.reportBarCol}
                                  onPress={() => setSelectedChartMonth(item)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.reportBarValueText}>
                                    {rev >= 1000000
                                      ? `${(rev / 1000000).toFixed(1)}tr`
                                      : rev > 0
                                      ? `${Math.round(rev / 1000)}k`
                                      : '0'}
                                  </Text>
                                  <View
                                    style={[
                                      styles.reportBarShape,
                                      { height: `${heightPct}%` },
                                      isSel && styles.reportBarShapeActive,
                                    ]}
                                  />
                                  <Text style={styles.reportBarLabelText}>{item.label}</Text>
                                  <Text style={styles.reportBarOrderText}>{item.orders} đơn</Text>
                                </TouchableOpacity>
                              );
                            });
                          })()}
                        </ScrollView>

                        {selectedChartMonth && (
                          <View style={styles.reportSelectedBarCard}>
                            <View>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                                {selectedChartMonth.label}
                              </Text>
                              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                Số đơn đặt: {selectedChartMonth.orders} đơn{' '}
                                {selectedChartMonth.completed ? `(${selectedChartMonth.completed} hoàn tất)` : ''}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 15, fontWeight: '800', color: '#0284c7' }}>
                              {formatVND(selectedChartMonth.revenue)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Financial Ledger Table */}
                      <View style={styles.reportTableCard}>
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                            Sổ Bảng Kê Chi Tiết Doanh Thu & Đối Soát
                          </Text>
                          <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                            Số liệu đối soát theo từng kỳ hoặc khung giờ kế toán
                          </Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={[styles.reportTableWrapper, { minWidth: isMobile ? 490 : '100%' }]}>
                            <View style={[styles.reportTableRow, styles.reportTableHeadRow]}>
                              <Text style={[styles.reportTableHeadText, { flex: 1.2 }]}>
                                {reportPeriod === 'custom' && customStartDate === customEndDate ? 'Khung giờ' : 'Kỳ / Ngày'}
                              </Text>
                              <Text style={[styles.reportTableHeadText, { flex: 0.9, textAlign: 'center' }]}>Số đơn</Text>
                              <Text style={[styles.reportTableHeadText, { flex: 1, textAlign: 'center' }]}>Hoàn tất</Text>
                              <Text style={[styles.reportTableHeadText, { flex: 1.6, textAlign: 'right' }]}>Doanh thu thuần</Text>
                              <Text style={[styles.reportTableHeadText, { flex: 1.4, textAlign: 'right' }]}>AOV TB/Đơn</Text>
                            </View>

                            {reportData?.chartData?.map((row: any, rIdx: number) => {
                              const rowRev = Number(row.revenue || 0);
                              const rowOrders = Number(row.orders || 0);
                              const rowAov = rowOrders > 0 ? Math.round(rowRev / rowOrders) : 0;
                              return (
                                <View
                                  key={row.label || rIdx}
                                  style={[
                                    styles.reportTableRow,
                                    rIdx % 2 === 1 && { backgroundColor: '#fcfdfd' },
                                  ]}
                                >
                                  <Text style={[styles.reportTableCellText, { flex: 1.2, fontWeight: '600', color: '#0f172a' }]}>
                                    {row.label}
                                  </Text>
                                  <Text style={[styles.reportTableCellText, { flex: 0.9, textAlign: 'center' }]}>
                                    {rowOrders}
                                  </Text>
                                  <Text style={[styles.reportTableCellText, { flex: 1, textAlign: 'center', color: '#047857' }]}>
                                    {row.completed ?? '-'}
                                  </Text>
                                  <Text style={[styles.reportTableCellText, { flex: 1.6, textAlign: 'right', fontWeight: '700', color: '#0284c7' }]}>
                                    {formatVND(rowRev)}
                                  </Text>
                                  <Text style={[styles.reportTableCellText, { flex: 1.4, textAlign: 'right', color: '#64748b' }]}>
                                    {rowAov > 0 ? formatVND(rowAov) : '-'}
                                  </Text>
                                </View>
                              );
                            })}

                            <View style={[styles.reportTableRow, styles.reportTableTotalRow]}>
                              <Text style={[styles.reportTableHeadText, { flex: 1.2, color: '#0f172a', fontWeight: '800' }]}>
                                TỔNG CỘNG
                              </Text>
                              <Text style={[styles.reportTableHeadText, { flex: 0.9, textAlign: 'center', color: '#0f172a', fontWeight: '800' }]}>
                                {reportData?.kpis?.totalOrders || 0}
                              </Text>
                              <Text style={[styles.reportTableHeadText, { flex: 1, textAlign: 'center', color: '#047857', fontWeight: '800' }]}>
                                {reportData?.kpis?.completedOrders || 0}
                              </Text>
                              <Text style={[styles.reportTableHeadText, { flex: 1.6, textAlign: 'right', color: '#0284c7', fontWeight: '800' }]}>
                                {formatVND(reportData?.kpis?.totalRevenue || 0)}
                              </Text>
                              <Text style={[styles.reportTableHeadText, { flex: 1.4, textAlign: 'right', color: '#0f172a', fontWeight: '800' }]}>
                                {formatVND(reportData?.kpis?.aov || 0)}
                              </Text>
                            </View>
                          </View>
                        </ScrollView>
                      </View>
                    </View>
                  )}

                  {/* MỤC 2: SẢN PHẨM BÁN CHẠY & DOANH SỐ */}
                  {reportSection === 'products' && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.reportSectionHeaderBanner}>
                        <View>
                          <Text style={styles.reportSectionBannerTitle}>👕 Phân Hệ Thống Kê Sản Phẩm Bán Chạy</Text>
                          <Text style={styles.reportSectionBannerSub}>
                            Xếp hạng Top 20 mặt hàng đóng góp doanh số chủ đạo & hiệu quả bán buôn
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reportSectionPrintBtn}
                          onPress={() => handlePrintReportForm('products')}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="printer" size={13} color="#0284c7" />
                          <Text style={styles.reportSectionPrintBtnText}>In Form Sản Phẩm</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Product KPIs */}
                      <View style={styles.reportKpiGrid}>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>MÃ HÀNG BÁN ĐƯỢC</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {reportData?.topProducts?.length || 0} mặt hàng
                          </Text>
                          <Text style={styles.reportKpiSub}>Phát sinh doanh thu trong kỳ</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>TỔNG SP ĐÃ BÁN</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {(reportData?.topProducts || []).reduce((s: number, p: any) => s + (Number(p.sold_count) || 0), 0)} cái
                          </Text>
                          <Text style={styles.reportKpiSub}>Số lượng xuất kho thành công</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>BEST-SELLER #1</Text>
                          <Text style={[styles.reportKpiValue, { fontSize: 14, color: '#0284c7' }]} numberOfLines={1}>
                            {(reportData?.topProducts || [])[0]?.product_name || 'Chưa có'}
                          </Text>
                          <Text style={styles.reportKpiSub}>
                            Bán được {(reportData?.topProducts || [])[0]?.sold_count || 0} cái
                          </Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>DOANH SỐ SP TOP 1</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {formatVND((reportData?.topProducts || [])[0]?.revenue || 0)}
                          </Text>
                          <Text style={styles.reportKpiSub}>Đóng góp cao nhất</Text>
                        </View>
                      </View>

                      {/* Top Products Table with Search */}
                      <View style={styles.reportTableCard}>
                        <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 10, marginBottom: 12 }}>
                          <View>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                              Bảng Xếp Hạng Sản Phẩm Bán Chạy Nhất (Top 20)
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              Danh sách xếp hạng theo tổng doanh thu mang lại cho thương hiệu
                            </Text>
                          </View>
                          <View style={styles.reportSearchInputWrap}>
                            <IconSymbol name="magnifyingglass" size={14} color="#94a3b8" />
                            <TextInput
                              style={styles.reportSearchInput}
                              placeholder="Lọc tên sản phẩm hoặc ngành..."
                              value={reportProductSearch}
                              onChangeText={setReportProductSearch}
                              placeholderTextColor="#94a3b8"
                            />
                            {reportProductSearch ? (
                              <TouchableOpacity onPress={() => setReportProductSearch('')}>
                                <IconSymbol name="trash" size={13} color="#94a3b8" />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>

                        {(() => {
                          const list = (reportData?.topProducts || []).filter((p: any) =>
                            !reportProductSearch.trim() ||
                            (p.product_name && p.product_name.toLowerCase().includes(reportProductSearch.toLowerCase().trim())) ||
                            (p.category && p.category.toLowerCase().includes(reportProductSearch.toLowerCase().trim()))
                          );
                          const totalRevAll = reportData?.kpis?.totalRevenue || 1;

                          if (list.length === 0) {
                            return <Text style={styles.emptyText}>Không tìm thấy sản phẩm nào khớp bộ lọc</Text>;
                          }

                          return (
                            <View style={{ gap: 8 }}>
                              {list.map((p: any, pIdx: number) => {
                                const pct = Math.min(100, Math.round(((Number(p.revenue) || 0) / totalRevAll) * 100));
                                return (
                                  <View key={p.product_id || pIdx} style={styles.reportProductRowCard}>
                                    <View
                                      style={[
                                        styles.reportVipRankBadge,
                                        pIdx === 0 && { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                                        pIdx === 1 && { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
                                        pIdx === 2 && { backgroundColor: '#ffedd5', borderColor: '#fed7aa' },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.reportVipRankText,
                                          pIdx === 0 && { color: '#b45309' },
                                          pIdx === 1 && { color: '#475569' },
                                          pIdx === 2 && { color: '#c2410c' },
                                        ]}
                                      >
                                        #{pIdx + 1}
                                      </Text>
                                    </View>
                                    <Image
                                      source={getImageSource(p.image)}
                                      style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f1f5f9' }}
                                      contentFit="cover"
                                    />
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
                                        {p.product_name}
                                      </Text>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                                        {p.category && (
                                          <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                            <Text style={{ fontSize: 10, color: '#475569', fontWeight: '600' }}>{p.category}</Text>
                                          </View>
                                        )}
                                        <Text style={{ fontSize: 11, color: '#64748b' }}>
                                          Đã bán: <Text style={{ fontWeight: '700', color: '#0f172a' }}>{p.sold_count}</Text> cái
                                        </Text>
                                        <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '600' }}>
                                          (Chiếm {pct}% doanh thu)
                                        </Text>
                                      </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#0284c7' }}>
                                        {formatVND(p.revenue)}
                                      </Text>
                                      <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                        Giá TB: {p.sold_count > 0 ? formatVND(Math.round(p.revenue / p.sold_count)) : '-'}
                                      </Text>
                                    </View>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  )}

                  {/* MỤC 3: CƠ CẤU DANH MỤC & NGÀNH HÀNG */}
                  {reportSection === 'categories' && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.reportSectionHeaderBanner}>
                        <View>
                          <Text style={styles.reportSectionBannerTitle}>🏷️ Phân Hệ Thống Kê Cơ Cấu Danh Mục</Text>
                          <Text style={styles.reportSectionBannerSub}>
                            Tỷ trọng đóng góp doanh thu của từng ngành hàng & hành vi chọn mua
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reportSectionPrintBtn}
                          onPress={() => handlePrintReportForm('categories')}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="printer" size={13} color="#0284c7" />
                          <Text style={styles.reportSectionPrintBtnText}>In Form Danh Mục</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Category KPIs */}
                      <View style={styles.reportKpiGrid}>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>SỐ NGÀNH HÀNG</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {reportData?.categoryStats?.length || 0} danh mục
                          </Text>
                          <Text style={styles.reportKpiSub}>Đang phát sinh giao dịch</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>NGÀNH DẪN ĐẦU</Text>
                          <Text style={[styles.reportKpiValue, { fontSize: 15, color: '#0284c7' }]} numberOfLines={1}>
                            {(reportData?.categoryStats || [])[0]?.category || 'Chưa có'}
                          </Text>
                          <Text style={styles.reportKpiSub}>
                            Chiếm {(reportData?.categoryStats || [])[0]?.percentage || 0}% doanh số
                          </Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>DOANH THU NGÀNH #1</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {formatVND((reportData?.categoryStats || [])[0]?.revenue || 0)}
                          </Text>
                          <Text style={styles.reportKpiSub}>Dòng sản phẩm cốt lõi</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>SỐ LƯỢNG BÁN NGÀNH #1</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {(reportData?.categoryStats || [])[0]?.itemsSold || 0} cái
                          </Text>
                          <Text style={styles.reportKpiSub}>Tổng số lượng xuất</Text>
                        </View>
                      </View>

                      {/* Visual Category Progress & Detail Table */}
                      <View style={styles.reportTableCard}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 }}>
                          Chi Tiết Cơ Cấu Doanh Thu & Số Lượng Theo Danh Mục
                        </Text>

                        {reportData?.categoryStats && reportData.categoryStats.length > 0 ? (
                          <View style={{ gap: 14 }}>
                            {reportData.categoryStats.map((cat: any, cIdx: number) => {
                              const catColors = ['#0284c7', '#059669', '#d97706', '#7c3aed', '#e11d48', '#475569'];
                              const barColor = catColors[cIdx % catColors.length];
                              return (
                                <View key={cat.category || cIdx} style={styles.reportCatItem}>
                                  <View style={styles.reportCatHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: barColor }} />
                                      <Text style={styles.reportCatName}>
                                        {cat.category}
                                      </Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                      <Text style={{ fontSize: 12, color: '#64748b' }}>
                                        {cat.itemsSold} SP • {cat.orderCount || 0} đơn
                                      </Text>
                                      <Text style={styles.reportCatVal}>
                                        {formatVND(cat.revenue)} ({cat.percentage}%)
                                      </Text>
                                    </View>
                                  </View>
                                  <View style={styles.reportProgressBarBg}>
                                    <View
                                      style={[
                                        styles.reportProgressBarFill,
                                        { width: `${Math.min(100, Math.max(2, parseFloat(cat.percentage)))}%`, backgroundColor: barColor },
                                      ]}
                                    />
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ) : (
                          <Text style={styles.emptyText}>Chưa có dữ liệu danh mục trong kỳ</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* MỤC 4: KHÁCH HÀNG & HỘI VIÊN VIP */}
                  {reportSection === 'customers' && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.reportSectionHeaderBanner}>
                        <View>
                          <Text style={styles.reportSectionBannerTitle}>👑 Phân Hệ Thống Kê Khách Hàng & VIP</Text>
                          <Text style={styles.reportSectionBannerSub}>
                            Phân tích khách hàng thân thiết, tổng chi tiêu tích lũy & tần suất quay lại
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reportSectionPrintBtn}
                          onPress={() => handlePrintReportForm('customers')}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="printer" size={13} color="#0284c7" />
                          <Text style={styles.reportSectionPrintBtnText}>In Form Khách VIP</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Customer KPIs */}
                      <View style={styles.reportKpiGrid}>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>TỔNG KHÁCH VIP</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {reportData?.topCustomers?.length || 0} khách hàng
                          </Text>
                          <Text style={styles.reportKpiSub}>Xếp hạng theo sức mua</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>KHÁCH VIP #1</Text>
                          <Text style={[styles.reportKpiValue, { fontSize: 14, color: '#0284c7' }]} numberOfLines={1}>
                            {(reportData?.topCustomers || [])[0]?.customer_name || 'Chưa có'}
                          </Text>
                          <Text style={styles.reportKpiSub}>
                            Chi tiêu {formatVND((reportData?.topCustomers || [])[0]?.total_spent || 0)}
                          </Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>SỐ ĐƠN TỐI ĐA / KHÁCH</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {Math.max(...(reportData?.topCustomers || []).map((c: any) => c.order_count || 0), 0)} đơn
                          </Text>
                          <Text style={styles.reportKpiSub}>Độ gắn bó thương hiệu</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>CHI TIÊU BÌNH QUÂN</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {formatVND(reportData?.kpis?.aov || 0)}
                          </Text>
                          <Text style={styles.reportKpiSub}>Mỗi lượt khách mua sắm</Text>
                        </View>
                      </View>

                      {/* VIP Customers Table with Search */}
                      <View style={styles.reportTableCard}>
                        <View style={{ flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: 10, marginBottom: 12 }}>
                          <View>
                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                              Bảng Xếp Hạng Top 20 Khách Hàng VIP
                            </Text>
                            <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              Phân loại theo hạng Kim Cương, Vàng, Bạc dựa trên tổng giá trị tích lũy
                            </Text>
                          </View>
                          <View style={styles.reportSearchInputWrap}>
                            <IconSymbol name="magnifyingglass" size={14} color="#94a3b8" />
                            <TextInput
                              style={styles.reportSearchInput}
                              placeholder="Lọc tên hoặc SĐT khách..."
                              value={reportCustomerSearch}
                              onChangeText={setReportCustomerSearch}
                              placeholderTextColor="#94a3b8"
                            />
                            {reportCustomerSearch ? (
                              <TouchableOpacity onPress={() => setReportCustomerSearch('')}>
                                <IconSymbol name="trash" size={13} color="#94a3b8" />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>

                        {(() => {
                          const custList = (reportData?.topCustomers || []).filter((c: any) =>
                            !reportCustomerSearch.trim() ||
                            (c.customer_name && c.customer_name.toLowerCase().includes(reportCustomerSearch.toLowerCase().trim())) ||
                            (c.customer_phone && c.customer_phone.includes(reportCustomerSearch.trim()))
                          );

                          if (custList.length === 0) {
                            return <Text style={styles.emptyText}>Không tìm thấy khách hàng nào khớp bộ lọc</Text>;
                          }

                          return (
                            <View style={{ gap: 8 }}>
                              {custList.map((cust: any, vIdx: number) => {
                                const spent = Number(cust.total_spent || 0);
                                const tier =
                                  spent >= 10000000
                                    ? { label: '👑 Kim Cương', bg: '#fdf4ff', text: '#9333ea', border: '#f0abfc' }
                                    : spent >= 5000000
                                    ? { label: '🥇 Vàng', bg: '#fef3c7', text: '#b45309', border: '#fde68a' }
                                    : spent >= 2000000
                                    ? { label: '🥈 Bạc', bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' }
                                    : { label: '🥉 Thân thiết', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' };

                                return (
                                  <View key={cust.customer_phone || vIdx} style={styles.reportVipItem}>
                                    <View
                                      style={[
                                        styles.reportVipRankBadge,
                                        vIdx === 0 && { backgroundColor: '#fef3c7', borderColor: '#fde68a' },
                                        vIdx === 1 && { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1' },
                                        vIdx === 2 && { backgroundColor: '#ffedd5', borderColor: '#fed7aa' },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.reportVipRankText,
                                          vIdx === 0 && { color: '#b45309' },
                                          vIdx === 1 && { color: '#475569' },
                                          vIdx === 2 && { color: '#c2410c' },
                                        ]}
                                      >
                                        #{vIdx + 1}
                                      </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.reportVipName} numberOfLines={1}>
                                          {cust.customer_name || 'Khách hàng'}
                                        </Text>
                                        <View style={[styles.badgePill, { backgroundColor: tier.bg, borderColor: tier.border }]}>
                                          <Text style={[styles.badgePillText, { color: tier.text }]}>{tier.label}</Text>
                                        </View>
                                      </View>
                                      <Text style={styles.reportVipSub}>
                                        {cust.customer_phone ? cust.customer_phone.replace(/(\d{4})\d{3}(\d{3})/, '$1***$2') : 'Chưa có SĐT'} • {cust.order_count} đơn hàng
                                      </Text>
                                    </View>
                                    <Text style={styles.reportVipSpent}>
                                      {formatVND(cust.total_spent)}
                                    </Text>
                                  </View>
                                );
                              })}
                            </View>
                          );
                        })()}
                      </View>
                    </View>
                  )}

                  {/* MỤC 5: ĐƠN HÀNG, VẬN HÀNH & ĐỔI TRẢ */}
                  {reportSection === 'operations' && (
                    <View style={{ marginBottom: 20 }}>
                      <View style={styles.reportSectionHeaderBanner}>
                        <View>
                          <Text style={styles.reportSectionBannerTitle}>📦 Phân Hệ Thống Kê Đơn Hàng & Vận Hành</Text>
                          <Text style={styles.reportSectionBannerSub}>
                            Giám sát tiến độ hoàn tất, tỷ lệ hủy đơn, cơ cấu thanh toán & khiếu nại đổi trả
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.reportSectionPrintBtn}
                          onPress={() => handlePrintReportForm('operations')}
                          activeOpacity={0.8}
                        >
                          <IconSymbol name="printer" size={13} color="#0284c7" />
                          <Text style={styles.reportSectionPrintBtnText}>In Form Vận Hành</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Operations KPIs */}
                      <View style={styles.reportKpiGrid}>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>TỔNG ĐƠN TIẾP NHẬN</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {reportData?.kpis?.totalOrders || 0} đơn
                          </Text>
                          <Text style={styles.reportKpiSub}>Khởi tạo trên hệ thống</Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>TỶ LỆ GIAO THÀNH CÔNG</Text>
                          <Text style={[styles.reportKpiValue, { fontSize: 16, color: '#15803d' }]}>
                            {reportData?.kpis?.completionRate || 100}%
                          </Text>
                          <Text style={styles.reportKpiSub}>
                            {reportData?.kpis?.completedOrders || 0} đơn đã giao
                          </Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>TỶ LỆ HỦY ĐƠN</Text>
                          <Text style={[styles.reportKpiValue, { fontSize: 16, color: Number(reportData?.kpis?.cancelRate || 0) > 10 ? '#dc2626' : '#64748b' }]}>
                            {reportData?.kpis?.cancelRate || 0}%
                          </Text>
                          <Text style={styles.reportKpiSub}>
                            {reportData?.kpis?.cancelledOrders || 0} đơn bị hủy
                          </Text>
                        </View>
                        <View style={[styles.reportKpiCard, isMobile && { padding: 12, minWidth: '47%' }]}>
                          <Text style={[styles.reportKpiLabel, isMobile && { fontSize: 10.5 }]}>KHIẾU NẠI ĐỔI TRẢ</Text>
                          <Text style={[styles.reportKpiValue, isMobile && { fontSize: 16 }]}>
                            {reportData?.returnsSummary?.total_returns || 0} yêu cầu
                          </Text>
                          <Text style={styles.reportKpiSub}>
                            Duyệt: {reportData?.returnsSummary?.approved_returns || 0} • Từ chối: {reportData?.returnsSummary?.rejected_returns || 0}
                          </Text>
                        </View>
                      </View>

                      {/* Operations Two-Column Breakdown */}
                      <View style={styles.reportTwoColLayout}>
                        {/* Status Breakdown Table */}
                        <View style={styles.reportColCard}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
                            Phân Bổ Trạng Thái Đơn Hàng
                          </Text>
                          <View style={{ gap: 8 }}>
                            {(reportData?.statusBreakdown || []).map((s: any, sIdx: number) => {
                              const b = getStatusBadge(s.status);
                              return (
                                <View key={s.status || sIdx} style={styles.reportProductRowCard}>
                                  <View style={[styles.badgePill, { backgroundColor: b.bg, borderColor: b.border }]}>
                                    <Text style={[styles.badgePillText, { color: b.text }]}>{b.label}</Text>
                                  </View>
                                  <View style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                                      {s.count} đơn
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#0284c7' }}>
                                    {formatVND(s.revenue)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        {/* Payment Methods Breakdown */}
                        <View style={styles.reportColCard}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 10 }}>
                            Cơ Cấu Phương Thức Thanh Toán
                          </Text>
                          <View style={{ gap: 8 }}>
                            {(reportData?.paymentBreakdown || []).map((p: any, pIdx: number) => {
                              const isBank = p.payment_method === 'bank' || p.payment_method === 'Banking';
                              const isVnPay = p.payment_method === 'VNPAY';
                              return (
                                <View key={p.payment_method || pIdx} style={styles.reportProductRowCard}>
                                  <View>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>
                                      {isBank ? '💳 Chuyển khoản VietQR' : isVnPay ? '⚡ Cổng VNPAY' : '💵 Tiền mặt COD'}
                                    </Text>
                                    <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                                      {p.order_count} đơn hàng
                                    </Text>
                                  </View>
                                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#059669' }}>
                                    {formatVND(p.revenue)}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      </View>
                    </View>
                  )}
                </>
              )}
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
                        style={[styles.filterChip, isSelected && styles.filterChipActive, chip.key === 'BANK_PENDING' && !isSelected && pendingBankOrders.length > 0 && { backgroundColor: '#faf5ff', borderColor: '#ddd6fe' }]}
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
                    <View key={order.id} style={[styles.orderCard, isMobile && { padding: 14 }]}>
                      {/* Card Header */}
                      <View style={[styles.orderCardHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 6, width: '100%' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, width: '100%' }}>
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
                          {order.payment_method === 'bank' && order.payment_status === 'paid_pending_verification' && (
                            <View style={{ backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#c4b5fd', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7c3aed' }} />
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#6d28d9' }}>💳 KHÁCH BÁO ĐÃ CK</Text>
                            </View>
                          )}
                          {order.payment_method === 'bank' && order.payment_status === 'unpaid' && order.status === 'Pending' && (
                            <View style={{ backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#be123c' }}>⚠️ CHƯA NHẬN TIỀN</Text>
                            </View>
                          )}
                          {order.payment_method === 'bank' && (!order.payment_status || order.payment_status === 'pending') && order.status === 'Pending' && (
                            <View style={{ backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#c2410c' }}>⏳ CHỜ CK</Text>
                            </View>
                          )}
                          {order.payment_status === 'paid' && (
                            <View style={{ backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#a7f3d0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#047857' }}>✓ ĐÃ THANH TOÁN</Text>
                            </View>
                          )}
                          {order.status === 'Processing' && (
                            <View style={{ backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: '#0369a1' }}>
                                {getShippingSubStatus(order.created_at).badge}
                              </Text>
                            </View>
                          )}
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
                      <View style={[styles.orderTotalRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
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
                      <View style={[styles.orderActionsRow, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <TouchableOpacity
                            style={styles.detailBtn}
                            onPress={() => setSelectedOrder(order)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="doc.plaintext" size={14} color="#0f172a" />
                            <Text style={styles.detailBtnText}>Chi tiết & Timeline</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.adminPrintInvoiceCardBtn}
                            onPress={() => handlePrintOrderInvoice(order)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="printer" size={14} color="#0f172a" />
                            <Text style={styles.adminPrintInvoiceCardBtnText}>In Hóa Đơn</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={[styles.actionButtonGroup, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 6 }]}>
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="#0f172a" />
                          ) : (
                            <>
                              {order.status === 'Pending' && (
                                <>
                                  {order.payment_method === 'bank' ? (
                                    order.payment_status === 'paid_pending_verification' ? (
                                      <>
                                        <TouchableOpacity
                                          style={[styles.statusActionBtn, { backgroundColor: '#15803d', borderColor: '#16a34a' }]}
                                          onPress={() => handleConfirmBankPaymentAndApprove(order.id)}
                                        >
                                          <Text style={[styles.approveBtnText, { color: '#ffffff', fontWeight: '800' }]}>
                                            ✓ Xác nhận tiền & Duyệt đơn
                                          </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                          style={[styles.statusActionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                                          onPress={() => handleRejectBankPayment(order.id)}
                                        >
                                          <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '700' }}>
                                            ✕ Chưa nhận tiền
                                          </Text>
                                        </TouchableOpacity>
                                      </>
                                    ) : order.payment_status === 'paid' ? (
                                      <TouchableOpacity
                                        style={[styles.statusActionBtn, styles.approveBtn]}
                                        onPress={() => handleUpdateOrderStatus(order.id, 'Processing')}
                                      >
                                        <Text style={styles.approveBtnText}>Duyệt giao</Text>
                                      </TouchableOpacity>
                                    ) : (
                                      <TouchableOpacity
                                        style={[styles.statusActionBtn, { backgroundColor: '#047857', borderColor: '#059669' }]}
                                        onPress={() => handleConfirmBankPaymentAndApprove(order.id)}
                                      >
                                        <Text style={[styles.approveBtnText, { color: '#ffffff', fontSize: 11, fontWeight: '700' }]}>
                                          ✓ Xác nhận thanh toán & Duyệt đơn
                                        </Text>
                                      </TouchableOpacity>
                                    )
                                  ) : (
                                    <TouchableOpacity
                                      style={[styles.statusActionBtn, styles.approveBtn]}
                                      onPress={() => handleUpdateOrderStatus(order.id, 'Processing')}
                                    >
                                      <Text style={styles.approveBtnText}>Duyệt giao</Text>
                                    </TouchableOpacity>
                                  )}
                                </>
                              )}

                              {order.status === 'Processing' && (
                                <TouchableOpacity
                                  style={[styles.statusActionBtn, { backgroundColor: '#0284c7', borderColor: '#0369a1' }]}
                                  onPress={() => handleConfirmDelivered(order)}
                                >
                                  <Text style={[styles.completeBtnText, { color: '#ffffff', fontWeight: '700' }]}>
                                    🚚 Đã giao hàng
                                  </Text>
                                </TouchableOpacity>
                              )}

                              {order.status !== 'Cancelled' && order.status !== 'Completed' && (
                                <TouchableOpacity
                                  style={[styles.statusActionBtn, styles.cancelBtn]}
                                  onPress={() => handleCancelOrder(order)}
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
                      <View style={[styles.returnTicketHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 8 }]}>
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
                      <View style={[styles.returnCustomerRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
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
                              &quot;{ticket.return_note}&quot;
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
                      <View style={[styles.returnActionBar, isMobile && { flexDirection: 'column', gap: 8 }]}>
                        {isPending ? (
                          <>
                            <TouchableOpacity
                              style={[styles.btnActionReturn, styles.btnRejectReturn, isMobile && { width: '100%', justifyContent: 'center' }]}
                              onPress={() => handleUpdateReturnStatus(ticket.id, 'Rejected')}
                              disabled={isUpdatingThis}
                              activeOpacity={0.8}
                            >
                              <IconSymbol name="minus" size={15} color="#e11d48" />
                              <Text style={styles.btnRejectReturnText}>Từ Chối Yêu Cầu</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.btnActionReturn, styles.btnApproveReturn, isMobile && { width: '100%', justifyContent: 'center' }]}
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
                <View style={[styles.productTopControls, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
                  <View style={[styles.searchBar, isMobile ? { width: '100%' } : { flex: 1, minWidth: 220 }]}>
                    <IconSymbol name="magnifyingglass" size={17} color="#94a3b8" />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Tìm sản phẩm theo tên, SKU..."
                      value={productSearch}
                      onChangeText={setProductSearch}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={[styles.productActionButtonsRow, isMobile && { width: '100%' }]}>
                    <TouchableOpacity
                      style={[styles.addProductBtn, { backgroundColor: '#15803d', flex: 1, justifyContent: 'center' }]}
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
                      <Text style={styles.addProductBtnText}>Nhập Kho</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.addProductBtn, { flex: 1, justifyContent: 'center' }]}
                      onPress={handleOpenAddProduct}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="plus" size={15} color="#ffffff" />
                      <Text style={styles.addProductBtnText}>Thêm Mới</Text>
                    </TouchableOpacity>
                  </View>
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
                          <IconSymbol name="cube.box" size={11} color={(prod.stock || 0) <= 10 ? "#dc2626" : "#16a34a"} />
                          <Text style={[styles.stockPillText, (prod.stock || 0) <= 10 && styles.stockPillTextLow]} numberOfLines={1}>
                            Kho: {prod.stock !== undefined ? prod.stock : 50}
                          </Text>
                        </View>
                        <Text style={styles.soldCountText} numberOfLines={1}>Đã bán: {prod.sold_count || 0}</Text>
                      </View>

                      <View style={styles.productActionsRow}>
                        <View style={{ flexDirection: 'row', gap: 4, flex: 1, minWidth: isMobile ? '100%' : 140 }}>
                          <TouchableOpacity
                            style={[styles.variantProdBtn, { flex: 1, justifyContent: 'center' }]}
                            onPress={() => setSelectedVariantProduct(prod)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="slider.horizontal.3" size={11} color="#4338ca" />
                            <Text style={styles.variantProdBtnText} numberOfLines={1}>Size/Màu</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.importProdBtn, { flex: 1, justifyContent: 'center' }]}
                            onPress={() => handleOpenImportModal(prod)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="plus" size={11} color="#15803d" />
                            <Text style={styles.importProdBtnText} numberOfLines={1}>Nhập kho</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 4, flex: 1, minWidth: isMobile ? '100%' : 120 }}>
                          <TouchableOpacity
                            style={[styles.editProdBtn, { flex: 1, justifyContent: 'center' }]}
                            onPress={() => handleOpenEditProduct(prod)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="slider.horizontal.3" size={11} color="#0284c7" />
                            <Text style={styles.editProdBtnText} numberOfLines={1}>Sửa</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.deleteProdBtn, { flex: 1, justifyContent: 'center' }]}
                            onPress={() => handleDeleteProduct(prod.id, prod.name)}
                            activeOpacity={0.8}
                          >
                            <IconSymbol name="trash" size={11} color="#dc2626" />
                            <Text style={styles.deleteProdBtnText} numberOfLines={1}>Xóa</Text>
                          </TouchableOpacity>
                        </View>
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
              <View style={[styles.inventoryHeaderCard, isMobile && { flexDirection: 'column', alignItems: 'stretch', padding: 14, gap: 10 }]}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={styles.inventoryIconWrap}>
                      <IconSymbol name="cube.box" size={18} color="#15803d" />
                    </View>
                    <Text style={[styles.cardTitle, isMobile && { fontSize: 14 }]}>QUẢN LÝ NHẬP KHO & LÔ HÀNG (INBOUND QC)</Text>
                  </View>
                  <Text style={[styles.cardSubtitle, isMobile && { fontSize: 11 }]}>
                    Tiêu chuẩn may mặc công nghiệp &ldquo;100 cái như 100&rdquo; • Giám sát phiếu nhập theo Lô SX (Batch No) & Kiểm định xuất xưởng
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.addProductBtn, { backgroundColor: '#15803d' }, isMobile && { width: '100%', justifyContent: 'center' }]}
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
              <View style={[styles.metricsGrid, isMobile && { gap: 8 }]}>
                <View style={[styles.metricCard, isMobile && { padding: 10, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#15803d' }]}>
                  <Text style={[styles.metricLabel, isMobile && { fontSize: 10 }]}>TỔNG SỐ LÔ NHẬP</Text>
                  <Text style={[styles.metricValue, isMobile && { fontSize: 16, marginBottom: 2 }]}>{stockImports.length} lô</Text>
                  <Text style={[styles.metricHint, isMobile && { fontSize: 10 }]}>Đã ghi nhận vào kho</Text>
                </View>
                <View style={[styles.metricCard, isMobile && { padding: 10, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#0284c7' }]}>
                  <Text style={[styles.metricLabel, isMobile && { fontSize: 10 }]}>TỔNG SẢN PHẨM NHẬP</Text>
                  <Text style={[styles.metricValue, isMobile && { fontSize: 16, marginBottom: 2 }]}>
                    {stockImports.reduce((acc, c) => acc + (Number(c.quantity) || 0), 0)} cái
                  </Text>
                  <Text style={[styles.metricHint, isMobile && { fontSize: 10 }]}>Cộng dồn tồn kho bán lẻ</Text>
                </View>
                <View style={[styles.metricCard, isMobile && { padding: 10, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#8b5cf6' }]}>
                  <Text style={[styles.metricLabel, isMobile && { fontSize: 10 }]}>TỔNG GIÁ VỐN NHẬP</Text>
                  <Text style={[styles.metricValue, isMobile && { fontSize: 16, marginBottom: 2 }]} numberOfLines={1} adjustsFontSizeToFit>
                    {formatVND(stockImports.reduce((acc, c) => acc + (Number(c.quantity) * Number(c.cost_price) || 0), 0))}
                  </Text>
                  <Text style={[styles.metricHint, isMobile && { fontSize: 10 }]}>Chi phí vốn lô SX</Text>
                </View>
                <View style={[styles.metricCard, isMobile && { padding: 10, minWidth: '47%', borderRadius: 10 }, { borderTopColor: '#f59e0b' }]}>
                  <Text style={[styles.metricLabel, isMobile && { fontSize: 10 }]}>ĐẠT CHUẨN KIỂM ĐỊNH QC</Text>
                  <Text style={[styles.metricValue, isMobile && { fontSize: 16, marginBottom: 2 }, { color: '#15803d' }]}>100%</Text>
                  <Text style={[styles.metricHint, isMobile && { fontSize: 10 }]}>Đường may, cúc bấm, phom</Text>
                </View>
              </View>

              {/* BẢNG CẢNH BÁO SẢN PHẨM CẦN NHẬP KHO (LOW STOCK ALERT LIST) */}
              <View style={[styles.cardContainer, { width: '100%', borderColor: lowStockProducts.length > 0 ? '#fecdd3' : '#e2e8f0', backgroundColor: '#ffffff', marginBottom: 14 }, isMobile && { padding: 12 }]}>
                <View style={[styles.cardHeader, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <Text style={[styles.cardTitle, isMobile && { fontSize: 14 }]}>⚠️ Cảnh Báo Tồn Kho Cần Nhập Ngay</Text>
                      {lowStockProducts.length > 0 && (
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: '#fca5a5' }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: '#b91c1c' }}>{lowStockProducts.length} sản phẩm cần nhập</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.cardSubtitle, isMobile && { fontSize: 11 }]}>
                      Sản phẩm chạm ngưỡng an toàn (≤ 10 chiếc) hoặc đã cạn kho. Bấm &quot;Nhập Hàng&quot; để lập phiếu ngay.
                    </Text>
                  </View>
                  {outOfStockProducts.length > 0 && (
                    <View style={{ backgroundColor: '#fff1f2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: isMobile ? 'flex-start' : 'auto' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#be123c' }}>🚨 {outOfStockProducts.length} SP hết hàng (0 chiếc)</Text>
                    </View>
                  )}
                </View>

                {/* Danh sách các sản phẩm tồn thấp */}
                <View style={{ gap: 8, marginTop: 4 }}>
                  {lowStockProducts.length === 0 ? (
                    <View style={{ paddingVertical: 18, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '600' }}>✓ Tất cả sản phẩm hiện đều đủ hàng trong kho an toàn</Text>
                    </View>
                  ) : (
                    lowStockProducts.map((prod) => {
                      const isOutOfStock = (Number(prod.stock) || 0) <= 0;
                      return (
                        <View
                          key={prod.id}
                          style={[
                            styles.recentOrderItem,
                            {
                              backgroundColor: isOutOfStock ? '#fff1f2' : '#fffbeb',
                              borderColor: isOutOfStock ? '#fecdd3' : '#fde68a',
                              padding: isMobile ? 10 : 12
                            }
                          ]}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                            <Image
                              source={getImageSource(prod.image)}
                              style={{ width: isMobile ? 42 : 48, height: isMobile ? 42 : 48, borderRadius: 6, backgroundColor: '#f1f5f9' }}
                              contentFit="cover"
                            />
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.recentOrderCode, isMobile && { fontSize: 12.5 }]} numberOfLines={1}>
                                {prod.name}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                                <Text style={{ fontSize: 11, color: '#64748b' }}>
                                  #{prod.id} &bull; {prod.category || 'Thời trang'}
                                </Text>
                                <View style={{
                                  backgroundColor: isOutOfStock ? '#fee2e2' : '#fef3c7',
                                  paddingHorizontal: 6,
                                  paddingVertical: 1.5,
                                  borderRadius: 4
                                }}>
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: '800',
                                    color: isOutOfStock ? '#b91c1c' : '#b45309'
                                  }}>
                                    {isOutOfStock ? 'HẾT HÀNG (0)' : `CÒN ${prod.stock} CHIẾC`}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={[
                              styles.badgePill,
                              {
                                backgroundColor: '#15803d',
                                borderColor: '#16a34a',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                marginLeft: 8
                              }
                            ]}
                            onPress={() => handleOpenImportModal(prod)}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.badgePillText, { color: '#ffffff', fontWeight: '700', fontSize: 11 }]}>
                              📦 Nhập Hàng
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
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
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.modalTitle} numberOfLines={2}>Chi Tiết Đơn Hàng #{selectedOrder?.order_code}</Text>

                {selectedOrder?.return_status === 'Requested' ? (
                  <View style={{ backgroundColor: '#fffdf5', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#b78103' }}>
                      🔄 Yêu cầu đổi trả: {selectedOrder.return_reason || 'Đổi size/mẫu'}
                    </Text>
                    {selectedOrder.return_note ? (
                      <Text style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>
                        Ghi chú khách: &quot;{selectedOrder.return_note}&quot;
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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                {isDesktop && (
                  <TouchableOpacity
                    style={styles.adminPrintInvoiceHeaderBtn}
                    onPress={() => handlePrintOrderInvoice(selectedOrder)}
                    activeOpacity={0.8}
                  >
                    <IconSymbol name="printer" size={14} color="#0f172a" />
                    <Text style={styles.adminPrintInvoiceHeaderBtnText}>In Hóa Đơn</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setSelectedOrder(null)}
                  style={styles.modalCloseBtn}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <IconSymbol name="xmark" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ maxHeight: 460 }}>
              {/* Order Timeline Progression */}
              <View style={styles.timelineCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.timelineTitle}>Lịch Trình Vận Chuyển</Text>
                  {selectedOrder?.status === 'Processing' && (
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>
                      {getShippingSubStatus(selectedOrder.created_at).badge}
                    </Text>
                  )}
                </View>
                <View style={styles.timelineSteps}>
                  {[
                    { title: 'Đặt hàng thành công', done: true },
                    {
                      title: 'Đã xác nhận & Shop đóng gói',
                      done: selectedOrder?.status === 'Processing' || selectedOrder?.status === 'Completed',
                    },
                    {
                      title: 'Đã bàn giao ThoiTrangHD Express',
                      done: selectedOrder?.status === 'Completed' || (selectedOrder?.status === 'Processing' && (Date.now() - new Date(selectedOrder.created_at).getTime()) >= 12 * 3600 * 1000),
                    },
                    {
                      title: 'Đang trung chuyển & Shipper đi phát',
                      done: selectedOrder?.status === 'Completed' || (selectedOrder?.status === 'Processing' && (Date.now() - new Date(selectedOrder.created_at).getTime()) >= 36 * 3600 * 1000),
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

                {selectedOrder?.payment_method === 'bank' && (
                  <View style={{
                    backgroundColor: selectedOrder.payment_status === 'paid_pending_verification' ? '#f5f3ff' : selectedOrder.payment_status === 'paid' ? '#ecfdf5' : '#fff7ed',
                    borderWidth: 1,
                    borderColor: selectedOrder.payment_status === 'paid_pending_verification' ? '#c4b5fd' : selectedOrder.payment_status === 'paid' ? '#a7f3d0' : '#fed7aa',
                    borderRadius: 8,
                    padding: 10,
                    marginTop: 8
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '800',
                      color: selectedOrder.payment_status === 'paid_pending_verification' ? '#6d28d9' : selectedOrder.payment_status === 'paid' ? '#047857' : '#c2410c'
                    }}>
                      {selectedOrder.payment_status === 'paid_pending_verification'
                        ? '💳 KHÁCH BÁO ĐÃ CHUYỂN KHOẢN (CẦN ĐỐI SOÁT)'
                        : selectedOrder.payment_status === 'paid'
                        ? '✓ ĐÃ XÁC NHẬN THANH TOÁN THÀNH CÔNG'
                        : '⏳ CHƯA XÁC NHẬN CHUYỂN KHOẢN'}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                      Nội dung CK: <Text style={{ fontWeight: '700' }}>#{selectedOrder.order_code}</Text> • Số tiền: <Text style={{ fontWeight: '700' }}>{formatVND(selectedOrder.total_price)}</Text>
                    </Text>
                    {selectedOrder.status === 'Pending' && selectedOrder.payment_status === 'paid_pending_verification' && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: '#15803d', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
                          onPress={() => handleConfirmBankPaymentAndApprove(selectedOrder.id)}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>✓ Xác nhận tiền & Duyệt đơn</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ flex: 1, backgroundColor: '#dc2626', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }}
                          onPress={async () => {
                            await handleRejectBankPayment(selectedOrder.id);
                            setSelectedOrder((prev: any) => prev ? { ...prev, payment_status: 'unpaid' } : null);
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>✕ Chưa nhận được tiền</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {selectedOrder.status === 'Pending' && (selectedOrder.payment_status === 'unpaid' || !selectedOrder.payment_status || selectedOrder.payment_status === 'pending') && (
                      <View style={{ marginTop: 8, backgroundColor: '#fef2f2', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                        <Text style={{ fontSize: 11, color: '#dc2626', fontWeight: '600', lineHeight: 16 }}>
                          ⚠️ Đơn này chưa ghi nhận thanh toán. Chỉ bấm xác nhận khi tiền thực tế đã vào tài khoản ngân hàng của shop:
                        </Text>
                        <TouchableOpacity
                          style={{ backgroundColor: '#047857', paddingVertical: 8, borderRadius: 6, alignItems: 'center', marginTop: 6 }}
                          onPress={() => handleConfirmBankPaymentAndApprove(selectedOrder.id)}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>✓ Xác nhận thanh toán & Duyệt đơn</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Items Table */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Danh sách mặt hàng</Text>
                {selectedOrder?.items?.map((it: any, idx: number) => (
                  <View key={idx} style={styles.modalItemRow}>
                    <Text style={{ flex: 1, fontSize: 13, color: '#1e293b', paddingRight: 8 }} numberOfLines={2}>
                      {it.product_name} ({it.size || 'M'}) x{it.quantity}
                    </Text>
                    <Text style={{ fontWeight: '700', fontSize: 13, flexShrink: 0, textAlign: 'right' }}>
                      {formatVND(it.price * it.quantity)}
                    </Text>
                  </View>
                ))}
                <View style={styles.modalTotalRow}>
                  <Text style={{ fontSize: 14, fontWeight: '700', flex: 1 }}>Tổng giá trị thanh toán:</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a', flexShrink: 0, textAlign: 'right' }}>
                    {formatVND(selectedOrder?.total_price)}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedOrder && selectedOrder.status === 'Processing' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#0284c7',
                    paddingHorizontal: 13,
                    paddingVertical: 9,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onPress={() => handleConfirmDelivered(selectedOrder)}
                  activeOpacity={0.8}
                >
                  <IconSymbol name="checkmark.circle.fill" size={14} color="#ffffff" />
                  <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>
                    🚚 Đã giao hàng
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.adminPrintInvoiceModalFooterBtn}
                onPress={() => handlePrintOrderInvoice(selectedOrder)}
                activeOpacity={0.85}
              >
                <IconSymbol name="printer" size={14} color="#ffffff" />
                <Text style={styles.adminPrintInvoiceModalFooterBtnText}>In Hóa Đơn</Text>
              </TouchableOpacity>
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
              <Text style={[styles.modalTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới Vào Kho'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowProductModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <IconSymbol name="xmark" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={true}>
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

              {/* Danh mục sản phẩm (Có thể chọn nhanh các danh mục chuẩn) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Danh mục sản phẩm *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  {['Áo', 'Quần', 'Váy', 'Bộ', 'Giày', 'Phụ kiện'].map((cat) => {
                    const isSelected = prodForm.category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catOptionPill, isSelected && styles.catOptionPillActive]}
                        onPress={() => {
                          const newSizes = getCategorySizes(cat);
                          setProdForm({
                            ...prodForm,
                            category: cat,
                            selectedSizes: newSizes.slice(0, 4),
                          });
                        }}
                      >
                        <Text style={[styles.catOptionPillText, isSelected && styles.catOptionPillTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <View style={{ minHeight: 34, justifyContent: 'flex-end', marginBottom: 6 }}>
                    <Text style={[styles.formLabel, { marginBottom: 0 }]}>
                      Tổng tồn kho (Cái) *{prodForm.allocationMode === 'manual' ? ' (Tự tính)' : ''}
                    </Text>
                  </View>
                  <TextInput
                    style={[
                      styles.formInput,
                      { height: 42 },
                      prodForm.allocationMode === 'manual' && { backgroundColor: '#f1f5f9', color: '#047857', fontWeight: '700' },
                    ]}
                    keyboardType="numeric"
                    editable={prodForm.allocationMode !== 'manual'}
                    value={prodForm.stock}
                    onChangeText={(v) => setProdForm({ ...prodForm, stock: v })}
                    placeholder="60"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <View style={{ minHeight: 34, justifyContent: 'flex-end', marginBottom: 6 }}>
                    <Text style={[styles.formLabel, { marginBottom: 0 }]}>Giảm giá (%)</Text>
                  </View>
                  <TextInput
                    style={[styles.formInput, { height: 42 }]}
                    keyboardType="numeric"
                    value={prodForm.discount}
                    onChangeText={(v) => setProdForm({ ...prodForm, discount: v })}
                    placeholder="10"
                  />
                </View>
              </View>

              {/* KÍCH CỠ SẢN PHẨM (SIZE) */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.formLabel}>
                    Kích cỡ sản phẩm (Size) * <Text style={{ fontSize: 11, color: '#64748b' }}>({prodForm.selectedSizes.length} đã chọn)</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const allSizes = getCategorySizes(prodForm.category);
                      const isAll = prodForm.selectedSizes.length === allSizes.length;
                      setProdForm({
                        ...prodForm,
                        selectedSizes: isAll ? [allSizes[0]] : allSizes,
                      });
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#b78103', fontWeight: '700' }}>
                      {prodForm.selectedSizes.length === getCategorySizes(prodForm.category).length ? 'Bỏ bớt' : 'Chọn tất cả'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {getCategorySizes(prodForm.category).map((sz) => {
                    const isSelected = prodForm.selectedSizes.includes(sz);
                    return (
                      <TouchableOpacity
                        key={sz}
                        style={[styles.sizeOptionChip, isSelected && styles.sizeOptionChipActive]}
                        onPress={() => {
                          const current = prodForm.selectedSizes;
                          const next = isSelected
                            ? current.filter((s) => s !== sz)
                            : [...current, sz];
                          setProdForm({ ...prodForm, selectedSizes: next.length > 0 ? next : [sz] });
                        }}
                      >
                        <Text style={[styles.sizeOptionChipText, isSelected && styles.sizeOptionChipTextActive]}>
                          Size {sz}
                        </Text>
                        {isSelected && <IconSymbol name="checkmark" size={12} color="#ffffff" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* MÀU SẮC SẢN PHẨM (COLOR) */}
              <View style={styles.formGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.formLabel}>
                    Màu sắc sản phẩm * <Text style={{ fontSize: 11, color: '#64748b' }}>({prodForm.selectedColors.length} đã chọn)</Text>
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const isAll = prodForm.selectedColors.length === ADMIN_AVAILABLE_COLORS.length;
                      setProdForm({
                        ...prodForm,
                        selectedColors: isAll ? ['Đen'] : ADMIN_AVAILABLE_COLORS.map((c) => c.name),
                      });
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#b78103', fontWeight: '700' }}>
                      {prodForm.selectedColors.length === ADMIN_AVAILABLE_COLORS.length ? 'Bỏ bớt' : 'Chọn tất cả'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {ADMIN_AVAILABLE_COLORS.map((col) => {
                    const isSelected = prodForm.selectedColors.includes(col.name);
                    return (
                      <TouchableOpacity
                        key={col.name}
                        style={[styles.colorOptionChip, isSelected && styles.colorOptionChipActive]}
                        onPress={() => {
                          const current = prodForm.selectedColors;
                          const next = isSelected
                            ? current.filter((c) => c !== col.name)
                            : [...current, col.name];
                          setProdForm({ ...prodForm, selectedColors: next.length > 0 ? next : [col.name] });
                        }}
                      >
                        <View style={[styles.colorCircleSmall, { backgroundColor: col.code }]} />
                        <Text style={[styles.colorOptionChipText, isSelected && styles.colorOptionChipTextActive]}>
                          {col.name}
                        </Text>
                        {isSelected && <IconSymbol name="checkmark" size={11} color="#b78103" />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* CHẾ ĐỘ PHÂN BỔ TỒN KHO & MA TRẬN BIẾN THỂ */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Cách phân bổ tồn kho vào từng Size & Màu *</Text>
                <View style={styles.allocationTabRow}>
                  <TouchableOpacity
                    style={[
                      styles.allocationTabBtn,
                      prodForm.allocationMode === 'auto' && styles.allocationTabBtnActive,
                    ]}
                    onPress={() => setProdForm({ ...prodForm, allocationMode: 'auto' })}
                  >
                    <IconSymbol
                      name="bolt.fill"
                      size={14}
                      color={prodForm.allocationMode === 'auto' ? '#b78103' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.allocationTabBtnText,
                        prodForm.allocationMode === 'auto' && styles.allocationTabBtnTextActive,
                      ]}
                    >
                      ⚡ Chia đều tự động
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.allocationTabBtn,
                      prodForm.allocationMode === 'manual' && styles.allocationTabBtnActive,
                    ]}
                    onPress={() => {
                      const totalVariants = prodForm.selectedSizes.length * prodForm.selectedColors.length;
                      const baseQty = Math.floor((parseInt(prodForm.stock, 10) || 60) / Math.max(1, totalVariants));
                      const newStocks = { ...prodForm.variantStocks };
                      prodForm.selectedColors.forEach((col) => {
                        prodForm.selectedSizes.forEach((sz) => {
                          const k = `${sz}_${col}`;
                          if (!newStocks[k]) {
                            newStocks[k] = String(baseQty || 5);
                          }
                        });
                      });
                      let sum = 0;
                      prodForm.selectedColors.forEach((col) => {
                        prodForm.selectedSizes.forEach((sz) => {
                          sum += parseInt(newStocks[`${sz}_${col}`] || '0', 10) || 0;
                        });
                      });

                      setProdForm({
                        ...prodForm,
                        allocationMode: 'manual',
                        variantStocks: newStocks,
                        stock: String(sum),
                      });
                    }}
                  >
                    <IconSymbol
                      name="pencil"
                      size={14}
                      color={prodForm.allocationMode === 'manual' ? '#b78103' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.allocationTabBtnText,
                        prodForm.allocationMode === 'manual' && styles.allocationTabBtnTextActive,
                      ]}
                    >
                      ✏️ Tự điền từng Size & Màu
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {prodForm.allocationMode === 'auto' ? (
                <View style={styles.matrixPreviewBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <IconSymbol name="cube.box" size={14} color="#b78103" />
                    <Text style={styles.matrixPreviewTitle}>
                      Ma trận chia đều ({prodForm.selectedSizes.length} Size × {prodForm.selectedColors.length} Màu = {prodForm.selectedSizes.length * prodForm.selectedColors.length} phân loại):
                    </Text>
                  </View>
                  <Text style={styles.matrixPreviewSub}>
                    Tổng {prodForm.stock} cái sẽ tự động chia đều: ~ {Math.floor((parseInt(prodForm.stock || '60', 10) || 60) / Math.max(1, prodForm.selectedSizes.length * prodForm.selectedColors.length))} cái cho mỗi phân loại (S-Đen, S-Trắng, M-Đen...). Bấm nút "✏️ Tự điền từng Size & Màu" phía trên nếu muốn chỉnh số lượng chi tiết từng loại.
                  </Text>
                </View>
              ) : (
                <View style={styles.manualStockCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                      📦 Chi tiết số lượng từng phân loại:
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}>
                      Tổng: {prodForm.stock} cái
                    </Text>
                  </View>

                  {/* Nút điền nhanh */}
                  <View style={styles.quickFillRow}>
                    <Text style={{ fontSize: 11, color: '#64748b' }}>Điền nhanh:</Text>
                    {[5, 10, 20].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={styles.quickFillPill}
                        onPress={() => {
                          const updated: Record<string, string> = { ...prodForm.variantStocks };
                          prodForm.selectedColors.forEach((c) => {
                            prodForm.selectedSizes.forEach((s) => {
                              updated[`${s}_${c}`] = String(num);
                            });
                          });
                          const total = prodForm.selectedSizes.length * prodForm.selectedColors.length * num;
                          setProdForm({ ...prodForm, variantStocks: updated, stock: String(total) });
                        }}
                      >
                        <Text style={styles.quickFillPillText}>{num} cái / loại</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Danh sách nhập liệu theo từng Màu */}
                  {prodForm.selectedColors.map((colName) => {
                    const colObj = ADMIN_AVAILABLE_COLORS.find((c) => c.name === colName);
                    return (
                      <View key={colName} style={styles.variantColorGroup}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <View style={[styles.colorCircleSmall, { backgroundColor: colObj?.code || '#000000', width: 12, height: 12 }]} />
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155' }}>
                            Màu {colName}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {prodForm.selectedSizes.map((sz) => {
                            const key = `${sz}_${colName}`;
                            const currentVal = prodForm.variantStocks[key] ?? '5';
                            return (
                              <View key={key} style={styles.variantSizeItem}>
                                <Text style={styles.variantSizeLabel}>Size {sz}:</Text>
                                <TextInput
                                  style={styles.variantStockInput}
                                  keyboardType="numeric"
                                  value={currentVal}
                                  onChangeText={(newVal) => {
                                    const sanitized = newVal.replace(/\D/g, '');
                                    const nextStocks = {
                                      ...prodForm.variantStocks,
                                      [key]: sanitized,
                                    };
                                    let sum = 0;
                                    prodForm.selectedColors.forEach((c) => {
                                      prodForm.selectedSizes.forEach((s) => {
                                        sum += parseInt(nextStocks[`${s}_${c}`] || '0', 10) || 0;
                                      });
                                    });
                                    setProdForm({
                                      ...prodForm,
                                      variantStocks: nextStocks,
                                      stock: String(sum),
                                    });
                                  }}
                                />
                                <Text style={{ fontSize: 10, color: '#64748b' }}>cái</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

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
                    <Text style={{ color: '#475569', fontWeight: '600' }}>
                      {prodForm.image ? 'Đổi ảnh khác' : 'Tải ảnh lên'}
                    </Text>
                  </TouchableOpacity>

                  {prodForm.image ? (
                    <View style={{ position: 'relative' }}>
                      <Image
                        source={getImageSource(prodForm.image)}
                        style={{ width: 60, height: 60, borderRadius: 8, borderWidth: 1, borderColor: '#cbd5e1' }}
                        contentFit="cover"
                      />
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          backgroundColor: '#ef4444',
                          borderRadius: 10,
                          width: 20,
                          height: 20,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#ffffff',
                        }}
                        onPress={() => setProdForm((prev) => ({ ...prev, image: '' }))}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <IconSymbol name="xmark" size={10} color="#ffffff" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Mô tả sản phẩm</Text>
                <TextInput
                  style={[styles.formInput, { height: 75, textAlignVertical: 'top' }]}
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
          <View style={[styles.modalCard, { padding: 0, overflow: 'hidden' }, isDesktop ? { maxWidth: 760 } : { maxWidth: 540, width: '96%' }]}>
            {selectedVariantProduct && (() => {
              let variants: any[] = [];
              if (selectedVariantProduct.variants) {
                try {
                  variants = typeof selectedVariantProduct.variants === 'string'
                    ? JSON.parse(selectedVariantProduct.variants)
                    : selectedVariantProduct.variants;
                } catch (e) {
                  variants = [];
                }
              }
              const sizes: string[] = Array.from(new Set(variants.map((v: any) => String(v.size || '')).filter(Boolean)));
              const colors: string[] = Array.from(new Set(variants.map((v: any) => String(v.color || '')).filter(Boolean)));

              return (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, marginRight: 8 }}>
                      <View style={[styles.importIconBadge, { width: 36, height: 36, borderRadius: 10, backgroundColor: '#ede9fe', flexShrink: 0 }]}>
                        <IconSymbol name="slider.horizontal.3" size={18} color="#4338ca" />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.modalTitle} numberOfLines={1}>Bảng Tồn Kho Chi Tiết</Text>
                        <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                          SKU #{selectedVariantProduct.id} • {selectedVariantProduct.name}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedVariantProduct(null)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{ padding: 6, borderRadius: 8, backgroundColor: '#f8fafc', flexShrink: 0 }}
                    >
                      <IconSymbol name="xmark" size={18} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ paddingHorizontal: 18, paddingVertical: 14 }}>
                    {/* Header info card */}
                    <View style={styles.matrixInfoBanner}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Image
                          source={getImageSource(selectedVariantProduct.image)}
                          style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, backgroundColor: '#f1f5f9' }}
                          contentFit="cover"
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }} numberOfLines={2}>
                            {selectedVariantProduct.name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#475569' }}>
                              Giá bán: <Text style={{ color: '#0f172a', fontWeight: '700' }}>{formatVND(selectedVariantProduct.price)}</Text>
                            </Text>
                            <Text style={{ fontSize: 12, color: '#cbd5e1' }}>•</Text>
                            <Text style={{ fontSize: 12.5, fontWeight: '600', color: '#475569' }}>
                              Tổng tồn: <Text style={{ fontWeight: '800', color: '#15803d' }}>{selectedVariantProduct.stock} cái</Text>
                            </Text>
                          </View>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.matrixImportActionBtn}
                        onPress={() => {
                          const p = selectedVariantProduct;
                          setSelectedVariantProduct(null);
                          handleOpenImportModal(p);
                        }}
                      >
                        <IconSymbol name="plus" size={13} color="#ffffff" />
                        <Text style={styles.matrixImportActionBtnText}>📦 Nhập hàng lô này</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Stock Status Legend */}
                    <View style={styles.legendRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                        <Text style={styles.legendText}>Còn hàng (&gt; 5)</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
                        <Text style={styles.legendText}>Sắp hết (1 - 5)</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendText}>Hết hàng (0)</Text>
                      </View>
                    </View>

                    {/* Matrix Grid Table or Fallback */}
                    {sizes.length === 0 || colors.length === 0 ? (
                      <View style={{ padding: 24, backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' }}>
                        <IconSymbol name="slider.horizontal.3" size={28} color="#94a3b8" />
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#475569', marginTop: 8 }}>Chưa có ma trận kích cỡ & màu sắc</Text>
                        <Text style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 }}>
                          Sản phẩm này hiện đang quản lý theo tồn kho tổng ({selectedVariantProduct.stock} cái). Bạn có thể chỉnh sửa sản phẩm để bổ sung phân loại.
                        </Text>
                      </View>
                    ) : (() => {
                      const colColorWidth = isDesktop ? 150 : 120;
                      const colTotalWidth = isDesktop ? 110 : 95;
                      const colSizeWidth = isDesktop
                        ? Math.min(130, Math.max(85, Math.floor((700 - colColorWidth - colTotalWidth) / Math.max(sizes.length, 1))))
                        : 75;
                      const tableWidth = colColorWidth + sizes.length * colSizeWidth + colTotalWidth;

                      return (
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={true}
                          contentContainerStyle={{ minWidth: '100%' }}
                          style={{ width: '100%' }}
                        >
                          <View style={[styles.matrixTable, { width: tableWidth, minWidth: tableWidth }]}>
                            {/* Table Header Row */}
                            <View style={styles.matrixHeaderRow}>
                              <View style={[styles.matrixCell, { width: colColorWidth, minWidth: colColorWidth, alignItems: 'flex-start', paddingLeft: 12 }]}>
                                <Text style={styles.matrixHeaderCell}>MÀU SẮC</Text>
                              </View>
                              {sizes.map((sz: string) => (
                                <View key={sz} style={[styles.matrixCell, { width: colSizeWidth, minWidth: colSizeWidth }]}>
                                  <Text style={styles.matrixHeaderCell}>SIZE {sz}</Text>
                                </View>
                              ))}
                              <View style={[styles.matrixCell, { width: colTotalWidth, minWidth: colTotalWidth, paddingRight: 10 }]}>
                                <Text style={styles.matrixHeaderCell}>TỔNG MÀU</Text>
                              </View>
                            </View>

                            {/* Data Rows */}
                            {colors.map((col: string) => {
                              let totalColorStock = 0;
                              const matchingColorVariant = variants.find((v: any) => v.color === col);
                              const colorCode = matchingColorVariant?.color_code || '#000000';

                              return (
                                <View key={col} style={styles.matrixDataRow}>
                                  <View style={[styles.matrixCell, { width: colColorWidth, minWidth: colColorWidth, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12 }]}>
                                    <View style={[styles.colorSampleDot, { backgroundColor: colorCode }]} />
                                    <Text style={styles.matrixColorName} numberOfLines={1}>{col}</Text>
                                  </View>

                                  {sizes.map((sz: string) => {
                                    const v = variants.find((item: any) => item.size === sz && item.color === col);
                                    const vStock = v ? Number(v.stock) || 0 : 0;
                                    totalColorStock += vStock;

                                    return (
                                      <View key={sz} style={[styles.matrixCell, { width: colSizeWidth, minWidth: colSizeWidth }]}>
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

                                  <View style={[styles.matrixCell, { width: colTotalWidth, minWidth: colTotalWidth, paddingRight: 10 }]}>
                                    <Text style={styles.matrixTotalColorStock}>{totalColorStock} cái</Text>
                                  </View>
                                </View>
                              );
                            })}

                            {/* Table Footer: Total per Size */}
                            <View style={[styles.matrixDataRow, { backgroundColor: '#f8fafc', borderBottomWidth: 0 }]}>
                              <View style={[styles.matrixCell, { width: colColorWidth, minWidth: colColorWidth, alignItems: 'flex-start', paddingLeft: 12 }]}>
                                <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 12 }}>TỔNG SIZE:</Text>
                              </View>
                              {sizes.map((sz: string) => {
                                const sizeTotal = variants
                                  .filter((v: any) => v.size === sz)
                                  .reduce((sum: number, v: any) => sum + (Number(v.stock) || 0), 0);
                                return (
                                  <View key={sz} style={[styles.matrixCell, { width: colSizeWidth, minWidth: colSizeWidth }]}>
                                    <Text style={{ fontWeight: '800', color: '#0f172a', fontSize: 13 }}>
                                      {sizeTotal}
                                    </Text>
                                  </View>
                                );
                              })}
                              <View style={[styles.matrixCell, { width: colTotalWidth, minWidth: colTotalWidth, paddingRight: 10 }]}>
                                <Text style={{ fontWeight: '900', color: '#15803d', fontSize: 13.5 }}>
                                  {selectedVariantProduct.stock} cái
                                </Text>
                              </View>
                            </View>
                          </View>
                        </ScrollView>
                      );
                    })()}

                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 12, backgroundColor: '#eff6ff', padding: 10, borderRadius: 8 }}>
                      <Text style={{ fontSize: 13 }}>💡</Text>
                      <Text style={{ fontSize: 11.5, color: '#1e40af', flex: 1, lineHeight: 16 }}>
                        Khi khách hàng chọn Size và Màu trên ứng dụng, hệ thống tự động đối soát ma trận tồn kho này trong thời gian thực. Các size/màu hết hàng (0) sẽ tự động khóa nút đặt hàng.
                      </Text>
                    </View>
                  </ScrollView>

                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9', backgroundColor: '#ffffff' }}>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 }}>
                      <View style={[styles.importIconBadge, { width: 34, height: 34, borderRadius: 8, flexShrink: 0 }]}>
                        <IconSymbol name="cube.box" size={18} color="#15803d" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalTitle} numberOfLines={1}>Biên Bản Nhập Kho & QC</Text>
                        <Text style={{ fontSize: 12, color: '#64748b' }} numberOfLines={1}>
                          Phiếu #{selectedStockImport.id} • Lô SX: {selectedStockImport.batch_code}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => setSelectedStockImport(null)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{ padding: 4, flexShrink: 0 }}
                    >
                      <IconSymbol name="xmark" size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 540 }} contentContainerStyle={{ paddingVertical: 10 }}>
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
                          ĐÃ NGHIỆM THU: ĐẠT CHUẨN XUẤT XƯỞNG CÔNG NGHIỆP (&ldquo;100 CÁI NHƯ 100&rdquo;)
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
        <View style={[styles.modalOverlay, isMobile && { padding: 10 }]}>
          <View style={[styles.modalCard, isDesktop && { maxWidth: 620 }, isMobile && { padding: 14 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 }}>
                <View style={styles.importIconBadge}>
                  <IconSymbol name="cube.box" size={16} color="#15803d" />
                </View>
                <Text style={[styles.modalTitle, isMobile && { fontSize: 14 }]} numberOfLines={1}>Phiếu Nhập Hàng Vào Kho</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4, flexShrink: 0 }}
              >
                <IconSymbol name="xmark" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 520 }}
              contentContainerStyle={{ paddingHorizontal: 2, paddingBottom: 12 }}
            >
              {/* Product Selector - All 26 products searchable */}
              <View style={styles.formGroup}>
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.formLabel}>
                    Chọn sản phẩm nhập kho ({products.length} SP có sẵn) *
                  </Text>
                  {importProduct && (
                    <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
                      Đang chọn: #{importProduct.id} - {importProduct.name}
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
              <View style={[styles.formRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
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
              <View style={[styles.formRow, isMobile && { flexDirection: 'column', gap: 10 }]}>
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
                    <Text style={styles.qcCheckTitle}>Đạt chuẩn dây chuyền công nghiệp (&ldquo;100 cái như 100&rdquo;)</Text>
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
              <Text style={[styles.modalTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
                Tạo Mã Voucher Khuyến Mãi Mới
              </Text>
              <TouchableOpacity
                onPress={() => setShowVoucherModal(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={{ padding: 4 }}
              >
                <IconSymbol name="xmark" size={20} color="#64748b" />
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

      {/* MODAL TÙY CHỌN CHỈ SỐ IN & XUẤT BÁO CÁO (Selective Print & Export Modal) */}
      <Modal
        visible={showSelectiveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSelectiveModal(false)}
      >
        <View style={styles.selectiveModalOverlay}>
          <View style={[styles.calendarModalCard, { maxWidth: 580, maxHeight: '92%', padding: 20 }]}>
            {/* Header */}
            <View style={styles.calendarModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calendarModalTitle}>⚙️ Tùy Chọn Chỉ Số & Thời Gian In Báo Cáo</Text>
                <Text style={styles.calendarModalSub}>
                  Chọn phạm vi ngày tháng năm và các trường dữ liệu cần in hoặc xuất CSV
                </Text>
              </View>
              <TouchableOpacity
                style={styles.calendarCloseBtn}
                onPress={() => setShowSelectiveModal(false)}
              >
                <IconSymbol name="xmark" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flexGrow: 1, marginVertical: 6 }} showsVerticalScrollIndicator={false}>
              {/* SECTION 1: PHẠM VI THỜI GIAN & NGÀY THÁNG NĂM BÁO CÁO */}
              <View style={{ backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <IconSymbol name="calendar" size={15} color="#0284c7" />
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a', textTransform: 'uppercase' }}>
                      1. Thời Gian & Ngày Tháng Năm In Báo Cáo
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#0369a1' }}>
                      Đang chọn: {getReportPeriodString()}
                    </Text>
                  </View>
                </View>

                {/* Chọn chế độ thời gian */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.quickDateBtn,
                      reportPeriod === 'custom' && customMode === 'single' && styles.quickDateBtnActive,
                    ]}
                    onPress={() => {
                      setReportPeriod('custom');
                      setCustomMode('single');
                      setCustomEndDate(customStartDate);
                    }}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      reportPeriod === 'custom' && customMode === 'single' && styles.quickDateBtnTextActive,
                    ]}>
                      📅 1 Ngày Cố Định
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickDateBtn,
                      reportPeriod === 'custom' && customMode === 'range' && styles.quickDateBtnActive,
                    ]}
                    onPress={() => {
                      setReportPeriod('custom');
                      setCustomMode('range');
                    }}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      reportPeriod === 'custom' && customMode === 'range' && styles.quickDateBtnTextActive,
                    ]}>
                      📆 Khoảng Ngày (Từ - Đến)
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickDateBtn,
                      reportPeriod === 'month' && styles.quickDateBtnActive,
                    ]}
                    onPress={() => {
                      setReportPeriod('month');
                    }}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      reportPeriod === 'month' && styles.quickDateBtnTextActive,
                    ]}>
                      🗓️ Theo Tháng
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickDateBtn,
                      reportPeriod === 'year' && styles.quickDateBtnActive,
                    ]}
                    onPress={() => {
                      setReportPeriod('year');
                    }}
                  >
                    <Text style={[
                      styles.quickDateBtnText,
                      reportPeriod === 'year' && styles.quickDateBtnTextActive,
                    ]}>
                      📊 Cả Năm {reportYear}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Chi tiết theo chế độ đã chọn */}
                {reportPeriod === 'custom' && customMode === 'single' && (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      Chọn ngày cụ thể cần in báo cáo (YYYY-MM-DD):
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <TextInput
                        style={[styles.customDateInput, { flex: 1, height: 36 }]}
                        value={customStartDate}
                        onChangeText={(val) => {
                          setCustomStartDate(val);
                          setCustomEndDate(val);
                        }}
                        placeholder="YYYY-MM-DD"
                      />
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 }}
                        onPress={() => openCalendarModal('single')}
                      >
                        <IconSymbol name="calendar" size={13} color="#ffffff" />
                        <Text style={{ fontSize: 11.5, fontWeight: '700', color: '#ffffff' }}>Mở lịch</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {['2026-10-01', '2026-10-05', '2026-10-09'].map((d) => (
                        <TouchableOpacity
                          key={d}
                          style={[styles.quickDateBtn, customStartDate === d && styles.quickDateBtnActive]}
                          onPress={() => {
                            setCustomStartDate(d);
                            setCustomEndDate(d);
                          }}
                        >
                          <Text style={[styles.quickDateBtnText, customStartDate === d && styles.quickDateBtnTextActive]}>
                            {d.split('-').reverse().join('/')}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      <TouchableOpacity
                        style={[styles.quickDateBtn, customStartDate === new Date().toISOString().slice(0, 10) && styles.quickDateBtnActive]}
                        onPress={() => {
                          const today = new Date().toISOString().slice(0, 10);
                          setCustomStartDate(today);
                          setCustomEndDate(today);
                        }}
                      >
                        <Text style={[styles.quickDateBtnText, customStartDate === new Date().toISOString().slice(0, 10) && styles.quickDateBtnTextActive]}>
                          Hôm nay
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {reportPeriod === 'custom' && customMode === 'range' && (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      Chọn khoảng ngày báo cáo (Từ ngày → Đến ngày):
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TextInput
                          style={[styles.customDateInput, { flex: 1, height: 36 }]}
                          value={customStartDate}
                          onChangeText={setCustomStartDate}
                          placeholder="Từ YYYY-MM-DD"
                        />
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' }}
                          onPress={() => openCalendarModal('start')}
                        >
                          <IconSymbol name="calendar" size={13} color="#0284c7" />
                        </TouchableOpacity>
                      </View>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#64748b' }}>→</Text>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <TextInput
                          style={[styles.customDateInput, { flex: 1, height: 36 }]}
                          value={customEndDate}
                          onChangeText={setCustomEndDate}
                          placeholder="Đến YYYY-MM-DD"
                        />
                        <TouchableOpacity
                          style={{ padding: 8, backgroundColor: '#f1f5f9', borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1' }}
                          onPress={() => openCalendarModal('end')}
                        >
                          <IconSymbol name="calendar" size={13} color="#0284c7" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <TouchableOpacity
                        style={[styles.quickDateBtn, customStartDate === '2026-10-01' && customEndDate === '2026-10-05' && styles.quickDateBtnActive]}
                        onPress={() => {
                          setCustomStartDate('2026-10-01');
                          setCustomEndDate('2026-10-05');
                        }}
                      >
                        <Text style={[styles.quickDateBtnText, customStartDate === '2026-10-01' && customEndDate === '2026-10-05' && styles.quickDateBtnTextActive]}>
                          01/10 - 05/10
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.quickDateBtn, customStartDate === '2026-10-01' && customEndDate === '2026-10-10' && styles.quickDateBtnActive]}
                        onPress={() => {
                          setCustomStartDate('2026-10-01');
                          setCustomEndDate('2026-10-10');
                        }}
                      >
                        <Text style={[styles.quickDateBtnText, customStartDate === '2026-10-01' && customEndDate === '2026-10-10' && styles.quickDateBtnTextActive]}>
                          01/10 - 10/10
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {reportPeriod === 'month' && (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      Chọn tháng báo cáo của năm {reportYear}:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <TouchableOpacity
                          key={m}
                          style={[styles.quickDateBtn, reportMonth === m && styles.quickDateBtnActive]}
                          onPress={() => setReportMonth(m)}
                        >
                          <Text style={[styles.quickDateBtnText, reportMonth === m && styles.quickDateBtnTextActive]}>
                            Th{m}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {reportPeriod === 'year' && (
                  <View style={{ backgroundColor: '#ffffff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#cbd5e1' }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6 }}>
                      Chọn năm báo cáo:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[2025, 2026, 2027].map((y) => (
                        <TouchableOpacity
                          key={y}
                          style={[styles.quickDateBtn, reportYear === y && styles.quickDateBtnActive]}
                          onPress={() => setReportYear(y)}
                        >
                          <Text style={[styles.quickDateBtnText, reportYear === y && styles.quickDateBtnTextActive]}>
                            Năm {y}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Quick Presets / Chọn mẫu nhanh */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>
                  2. Mẫu chọn nhanh (1 chạm):
                </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    selectiveOptions.kpiRevenue && selectiveOptions.kpiAov && !selectiveOptions.kpiCompletedOrders && !selectiveOptions.kpiCancelRate && styles.quickDateBtnActive,
                  ]}
                  onPress={() => {
                    setSelectiveOptions({
                      kpiRevenue: true,
                      kpiAov: true,
                      kpiCompletedOrders: false,
                      kpiCancelRate: false,
                      kpiTotalOrders: false,
                      tableChartData: true,
                      tableCategory: false,
                      tableTopProducts: false,
                    });
                  }}
                >
                  <Text style={[
                    styles.quickDateBtnText,
                    selectiveOptions.kpiRevenue && selectiveOptions.kpiAov && !selectiveOptions.kpiCompletedOrders && !selectiveOptions.kpiCancelRate && styles.quickDateBtnTextActive,
                  ]}>
                    ⚡ Chỉ Doanh thu & AOV
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    selectiveOptions.kpiRevenue && !selectiveOptions.kpiAov && !selectiveOptions.kpiCompletedOrders && !selectiveOptions.kpiCancelRate && styles.quickDateBtnActive,
                  ]}
                  onPress={() => {
                    setSelectiveOptions({
                      kpiRevenue: true,
                      kpiAov: false,
                      kpiCompletedOrders: false,
                      kpiCancelRate: false,
                      kpiTotalOrders: false,
                      tableChartData: true,
                      tableCategory: false,
                      tableTopProducts: false,
                    });
                  }}
                >
                  <Text style={[
                    styles.quickDateBtnText,
                    selectiveOptions.kpiRevenue && !selectiveOptions.kpiAov && !selectiveOptions.kpiCompletedOrders && !selectiveOptions.kpiCancelRate && styles.quickDateBtnTextActive,
                  ]}>
                    ⚡ Chỉ Doanh thu
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    !selectiveOptions.kpiRevenue && selectiveOptions.kpiCompletedOrders && selectiveOptions.kpiCancelRate && styles.quickDateBtnActive,
                  ]}
                  onPress={() => {
                    setSelectiveOptions({
                      kpiRevenue: false,
                      kpiAov: false,
                      kpiCompletedOrders: true,
                      kpiCancelRate: true,
                      kpiTotalOrders: true,
                      tableChartData: false,
                      tableCategory: false,
                      tableTopProducts: false,
                    });
                  }}
                >
                  <Text style={[
                    styles.quickDateBtnText,
                    !selectiveOptions.kpiRevenue && selectiveOptions.kpiCompletedOrders && selectiveOptions.kpiCancelRate && styles.quickDateBtnTextActive,
                  ]}>
                    ⚡ Chỉ Đơn hàng & Vận hành
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    selectiveOptions.kpiRevenue && selectiveOptions.kpiCompletedOrders && selectiveOptions.kpiAov && selectiveOptions.kpiCancelRate && styles.quickDateBtnActive,
                  ]}
                  onPress={() => {
                    setSelectiveOptions({
                      kpiRevenue: true,
                      kpiAov: true,
                      kpiCompletedOrders: true,
                      kpiCancelRate: true,
                      kpiTotalOrders: true,
                      tableChartData: true,
                      tableCategory: true,
                      tableTopProducts: true,
                    });
                  }}
                >
                  <Text style={[
                    styles.quickDateBtnText,
                    selectiveOptions.kpiRevenue && selectiveOptions.kpiCompletedOrders && selectiveOptions.kpiAov && selectiveOptions.kpiCancelRate && styles.quickDateBtnTextActive,
                  ]}>
                    ⚡ Chọn tất cả (Đầy đủ)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Checklist Group 1: Chỉ số KPI */}
            <View>
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                  3. Các Chỉ Số Tài Chính & Vận Hành (KPIs)
                </Text>
                {[
                  { key: 'kpiRevenue', label: 'Doanh thu thuần', sub: 'Tổng số tiền thực nhận sau khi trừ đơn hủy', val: formatVND(reportData?.kpis?.totalRevenue || 0), color: '#059669' },
                  { key: 'kpiAov', label: 'Giá trị TB / đơn (AOV)', sub: 'Doanh số bình quân trên mỗi đơn hàng', val: formatVND(reportData?.kpis?.aov || 0), color: '#d97706' },
                  { key: 'kpiCompletedOrders', label: 'Đơn hoàn tất thành công', sub: 'Số lượng đơn giao thành công & tỷ lệ %', val: `${reportData?.kpis?.completedOrders || 0} đơn`, color: '#2563eb' },
                  { key: 'kpiCancelRate', label: 'Tỷ lệ hủy đơn & Đơn hủy', sub: 'Kiểm soát rủi ro hoàn hủy đơn hàng', val: `${reportData?.kpis?.cancelRate || 0}%`, color: '#e11d48' },
                  { key: 'kpiTotalOrders', label: 'Tổng số đơn hàng phát sinh', sub: 'Toàn bộ đơn hàng được tạo trong kỳ', val: `${reportData?.kpis?.totalOrders || 0} đơn`, color: '#475569' },
                ].map((item) => {
                  const isChecked = (selectiveOptions as any)[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: isChecked ? '#f8fafc' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isChecked ? '#cbd5e1' : '#f1f5f9',
                        marginBottom: 6,
                      }}
                      onPress={() => {
                        setSelectiveOptions((prev) => ({
                          ...prev,
                          [item.key]: !isChecked,
                        }));
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          borderWidth: 1.5,
                          borderColor: isChecked ? '#0284c7' : '#94a3b8',
                          backgroundColor: isChecked ? '#0284c7' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isChecked && <IconSymbol name="checkmark" size={12} color="#ffffff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.label}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>{item.sub}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>{item.val}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Checklist Group 2: Dữ liệu Bảng Biểu Kèm Theo */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0f172a', textTransform: 'uppercase', marginBottom: 8 }}>
                  4. Bảng Biểu & Dữ Liệu Chi Tiết Kèm Theo
                </Text>
                {[
                  { key: 'tableChartData', label: 'Bảng kê chi tiết theo kỳ / khung giờ', sub: 'Chi tiết từng mốc thời gian kèm số đơn và doanh thu' },
                  { key: 'tableCategory', label: 'Cơ cấu doanh thu theo danh mục', sub: 'Tỷ trọng % và doanh thu của từng ngành hàng' },
                  { key: 'tableTopProducts', label: 'Bảng xếp hạng Top sản phẩm bán chạy', sub: 'Top 10 sản phẩm bán chạy nhất kỳ báo cáo' },
                ].map((item) => {
                  const isChecked = (selectiveOptions as any)[item.key];
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        backgroundColor: isChecked ? '#f8fafc' : '#ffffff',
                        borderWidth: 1,
                        borderColor: isChecked ? '#cbd5e1' : '#f1f5f9',
                        marginBottom: 6,
                      }}
                      onPress={() => {
                        setSelectiveOptions((prev) => ({
                          ...prev,
                          [item.key]: !isChecked,
                        }));
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                        <View style={{
                          width: 18,
                          height: 18,
                          borderRadius: 4,
                          borderWidth: 1.5,
                          borderColor: isChecked ? '#0284c7' : '#94a3b8',
                          backgroundColor: isChecked ? '#0284c7' : '#ffffff',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                          {isChecked && <IconSymbol name="checkmark" size={12} color="#ffffff" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{item.label}</Text>
                          <Text style={{ fontSize: 11, color: '#64748b' }}>{item.sub}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            </ScrollView>

            {/* Modal Actions Footer */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#0284c7',
                }}
                onPress={() => executeSelectivePrintOrExport('print')}
                activeOpacity={0.8}
              >
                <IconSymbol name="printer" size={15} color="#ffffff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>In Form Đã Chọn</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor: '#0f172a',
                }}
                onPress={() => executeSelectivePrintOrExport('export')}
                activeOpacity={0.8}
              >
                <IconSymbol name="arrow.down.doc" size={15} color="#ffffff" />
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#ffffff' }}>Xuất CSV Đã Chọn</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL LỊCH TƯƠNG TÁC (Interactive Calendar Datepicker - Rendered after selective modal for top stacking) */}
      <Modal
        visible={calendarModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarModalVisible(false)}
      >
        <View style={styles.calendarModalOverlay}>
          <View style={styles.calendarModalCard}>
            {/* Header */}
            <View style={styles.calendarModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.calendarModalTitle}>
                  {calendarTargetField === 'single'
                    ? '📅 Chọn Ngày Cố Định'
                    : calendarTargetField === 'start'
                    ? '📅 Chọn Ngày Bắt Đầu (Từ ngày)'
                    : '📅 Chọn Ngày Kết Thúc (Đến ngày)'}
                </Text>
                <Text style={styles.calendarModalSub}>
                  Chạm vào ngày bất kỳ trên lịch để chọn tự động
                </Text>
              </View>
              <TouchableOpacity
                style={styles.calendarCloseBtn}
                onPress={() => setCalendarModalVisible(false)}
              >
                <IconSymbol name="xmark" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigation Row */}
            <View style={styles.calendarNavRow}>
              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={handlePrevCalMonth}
                activeOpacity={0.7}
              >
                <IconSymbol name="chevron.left" size={16} color="#0f172a" />
              </TouchableOpacity>

              <View style={styles.calendarMonthYearDisplay}>
                <Text style={styles.calendarMonthYearText}>
                  Tháng {calViewMonth} Năm {calViewYear}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.calendarNavBtn}
                onPress={handleNextCalMonth}
                activeOpacity={0.7}
              >
                <IconSymbol name="chevron.right" size={16} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {/* Quick Month Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.calendarQuickMonthsRow}
            >
              {[9, 10, 11, 12].map((m) => {
                const isCur = calViewMonth === m && calViewYear === 2026;
                return (
                  <TouchableOpacity
                    key={m}
                    style={[styles.calendarQuickMonthChip, isCur && styles.calendarQuickMonthChipActive]}
                    onPress={() => {
                      setCalViewMonth(m);
                      setCalViewYear(2026);
                    }}
                  >
                    <Text style={[styles.calendarQuickMonthText, isCur && styles.calendarQuickMonthTextActive]}>
                      Tháng {m}/2026
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Weekday Labels (T2, T3, T4, T5, T6, T7, CN) */}
            <View style={styles.calendarWeekRow}>
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((w, idx) => (
                <View key={w} style={styles.calendarWeekCol}>
                  <Text style={[styles.calendarWeekText, (idx === 5 || idx === 6) && { color: '#ef4444' }]}>
                    {w}
                  </Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calendarGrid}>
              {getMonthDays(calViewYear, calViewMonth).map((item, index) => {
                if (!item.day) {
                  return <View key={`empty-${index}`} style={styles.calendarDayCell} />;
                }
                const selectedVal = calendarTargetField === 'end' ? customEndDate : customStartDate;
                const isSelected = selectedVal === item.dateStr;
                const isToday = item.dateStr === new Date().toISOString().slice(0, 10);
                const isInRange =
                  customMode === 'range' &&
                  customStartDate &&
                  customEndDate &&
                  item.dateStr >= customStartDate &&
                  item.dateStr <= customEndDate;

                return (
                  <TouchableOpacity
                    key={item.dateStr}
                    style={[
                      styles.calendarDayCell,
                      isInRange && styles.calendarDayInRange,
                      isSelected && styles.calendarDaySelected,
                    ]}
                    onPress={() => handleSelectCalendarDate(item.dateStr)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isInRange && styles.calendarDayTextInRange,
                        isSelected && styles.calendarDayTextSelected,
                        isToday && !isSelected && styles.calendarDayTextToday,
                      ]}
                    >
                      {item.day}
                    </Text>
                    {isToday && <View style={[styles.calendarTodayDot, isSelected && { backgroundColor: '#ffffff' }]} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Footer with Quick Jump Actions */}
            <View style={styles.calendarModalFooter}>
              <TouchableOpacity
                style={styles.calendarFooterActionBtn}
                onPress={() => handleSelectCalendarDate('2026-10-01')}
              >
                <Text style={styles.calendarFooterActionText}>01/10/2026</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.calendarFooterActionBtn}
                onPress={() => handleSelectCalendarDate('2026-10-05')}
              >
                <Text style={styles.calendarFooterActionText}>05/10/2026</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.calendarFooterActionBtn, { backgroundColor: '#0284c7', borderColor: '#0284c7' }]}
                onPress={() => handleSelectCalendarDate(new Date().toISOString().slice(0, 10))}
              >
                <Text style={[styles.calendarFooterActionText, { color: '#ffffff' }]}>Hôm nay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* GLOBAL IN-APP CONFIRM MODAL (Thiết kế chuẩn UI cao cấp, không dùng popup thô của trình duyệt) */}
      <ConfirmModal
        visible={confirmModalConfig.visible}
        title={confirmModalConfig.title}
        message={confirmModalConfig.message}
        confirmText={confirmModalConfig.confirmText}
        cancelText={confirmModalConfig.cancelText}
        confirmType={confirmModalConfig.confirmType}
        onConfirm={confirmModalConfig.onConfirm}
        onCancel={() => setConfirmModalConfig((prev) => ({ ...prev, visible: false }))}
      />
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
    padding: 10,
    paddingBottom: 70,
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
    minWidth: 140,
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
    minWidth: 155,
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
    padding: 12,
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
    lineHeight: 18,
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
    flexWrap: 'wrap',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  productActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  stockPillLow: {
    backgroundColor: '#fee2e2',
  },
  stockPillText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#15803d',
  },
  stockPillTextLow: {
    color: '#b91c1c',
  },
  soldCountText: {
    fontSize: 10.5,
    color: '#64748b',
    fontWeight: '600',
    flexShrink: 0,
  },
  importProdBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 5,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  importProdBtnText: {
    fontSize: 10.5,
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
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  matrixImportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#15803d',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  matrixImportActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
    alignItems: 'center',
    justifyContent: 'center',
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
    flexShrink: 0,
  },
  matrixColorName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flexShrink: 1,
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
    minWidth: 200,
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
    minWidth: 155,
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
    alignItems: 'center',
    flexWrap: 'wrap',
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
  /* ACTION CENTER: CÔNG VIỆC CẦN ADMIN XỬ LÝ */
  actionCenterContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionCenterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCenterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionCenterPulseWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCenterDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionCenterTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  actionCenterSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  actionCenterCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionCenterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionCardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCardItem: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  actionCardNormal: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  actionCardAlertAmber: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  actionCardAlertPurple: {
    backgroundColor: '#faf5ff',
    borderColor: '#ddd6fe',
  },
  actionCardAlertRed: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
  },
  actionCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionCardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionCardBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionCardBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  actionCardHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  actionCardDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 12,
  },
  actionCardFooter: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    paddingTop: 8,
  },
  actionCardLinkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  catOptionPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  catOptionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  catOptionPillTextActive: {
    color: '#ffffff',
  },
  sizeOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  sizeOptionChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  sizeOptionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  sizeOptionChipTextActive: {
    color: '#ffffff',
  },
  colorOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
  },
  colorOptionChipActive: {
    borderColor: '#b78103',
    backgroundColor: '#fffdf5',
  },
  colorCircleSmall: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  colorOptionChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#334155',
  },
  colorOptionChipTextActive: {
    fontWeight: '700',
    color: '#b78103',
  },
  matrixPreviewBox: {
    backgroundColor: '#fefce8',
    borderWidth: 1,
    borderColor: '#fef08a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  matrixPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#854d0e',
  },
  matrixPreviewSub: {
    fontSize: 11,
    color: '#713f12',
    lineHeight: 16,
  },
  allocationTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  allocationTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  allocationTabBtnActive: {
    borderColor: '#b78103',
    backgroundColor: '#fefce8',
  },
  allocationTabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  allocationTabBtnTextActive: {
    color: '#854d0e',
    fontWeight: '700',
  },
  manualStockCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 14,
  },
  quickFillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  quickFillPill: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  quickFillPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  variantColorGroup: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 8,
    marginBottom: 8,
  },
  variantSizeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  variantSizeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  variantStockInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    width: 44,
    textAlign: 'center',
  },
  // Reports & Analytics Styles
  reportHeaderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  reportHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  reportSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  reportPeriodScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  reportPeriodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reportPeriodPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  reportPeriodPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  reportPeriodPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  reportExportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reportExportBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportMonthChipsScroll: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reportMonthChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  reportMonthChipActive: {
    backgroundColor: '#b78103',
    borderColor: '#b78103',
  },
  reportMonthChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  reportMonthChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  customDateControlBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  customModeTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  customModeTabActive: {
    backgroundColor: '#e0f2fe',
    borderColor: '#0284c7',
  },
  customModeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  customModeTabTextActive: {
    color: '#0369a1',
    fontWeight: '700',
  },
  dateInputSection: {
    gap: 8,
  },
  dateInputLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  datePickerInputWrap: {
    maxWidth: 260,
  },
  dateTextInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  quickDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  quickDateTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    flexShrink: 0,
  },
  quickDateBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  quickDateBtnActive: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  quickDateBtnText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  quickDateBtnTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  customDateActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  customDateActiveBadgeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#0369a1',
    flex: 1,
  },
  reportKpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  reportKpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 13,
    flex: 1,
    minWidth: 140,
  },
  reportKpiTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  reportKpiIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportKpiLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  reportKpiBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  reportKpiBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#047857',
  },
  reportKpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.4,
    marginBottom: 3,
  },
  reportKpiSub: {
    fontSize: 10.5,
    color: '#94a3b8',
  },
  reportChartCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  reportChartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reportChartTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  reportChartSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reportChartScroll: {
    paddingBottom: 8,
  },
  reportBarTrackContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 190,
    gap: 10,
    paddingHorizontal: 8,
  },
  reportBarCol: {
    alignItems: 'center',
    width: 52,
    height: '100%',
    justifyContent: 'flex-end',
  },
  reportBarValueText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284c7',
    marginBottom: 4,
    textAlign: 'center',
  },
  reportBarShape: {
    width: 32,
    backgroundColor: '#0284c7',
    borderRadius: 6,
    minHeight: 6,
  },
  reportBarShapeActive: {
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: '#b78103',
  },
  reportBarLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginTop: 8,
  },
  reportBarOrderText: {
    fontSize: 9.5,
    color: '#64748b',
    marginTop: 2,
  },
  reportSelectedBarCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reportTableCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
  },
  reportTableWrapper: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    marginTop: 10,
  },
  reportTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reportTableHeadRow: {
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  reportTableTotalRow: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopColor: '#0f172a',
  },
  reportTableHeadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  reportTableCellText: {
    fontSize: 12,
    color: '#334155',
  },
  reportTwoColLayout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  reportColCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  reportCatItem: {
    marginBottom: 12,
  },
  reportCatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reportCatName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportCatVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  reportProgressBarBg: {
    height: 7,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  reportProgressBarFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 4,
  },
  reportVipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reportVipRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportVipRankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b45309',
  },
  reportVipName: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0f172a',
  },
  reportVipSub: {
    fontSize: 11,
    color: '#64748b',
  },
  reportVipSpent: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#047857',
    marginLeft: 'auto',
  },
  dateInputPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateTextInputWithBtn: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284c7',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 8,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  openCalendarBtnText: {
    color: '#ffffff',
    fontSize: 12.5,
    fontWeight: '700',
  },
  openCalendarBtnModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0284c7',
    paddingHorizontal: 10,
    height: 38,
    borderRadius: 6,
  },
  openCalendarBtnModalText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportHeaderActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 9,
    borderRadius: 8,
  },
  reportHeaderActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  selectiveModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 50000,
  },
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 999999,
  },
  calendarModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  calendarModalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  calendarModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  calendarModalSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  calendarCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 6,
    marginBottom: 10,
  },
  calendarNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthYearDisplay: {
    paddingHorizontal: 12,
  },
  calendarMonthYearText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  calendarQuickMonthsRow: {
    gap: 6,
    marginBottom: 12,
  },
  calendarQuickMonthChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  calendarQuickMonthChipActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  calendarQuickMonthText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  calendarQuickMonthTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarWeekCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calendarWeekText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  calendarDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
    borderRadius: 8,
    position: 'relative',
  },
  calendarDayInRange: {
    backgroundColor: '#e0f2fe',
    borderRadius: 4,
  },
  calendarDaySelected: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  calendarDayText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1e293b',
  },
  calendarDayTextInRange: {
    color: '#0369a1',
    fontWeight: '700',
  },
  calendarDayTextSelected: {
    color: '#ffffff',
    fontWeight: '800',
  },
  calendarDayTextToday: {
    color: '#0284c7',
    fontWeight: '800',
  },
  calendarTodayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0284c7',
    position: 'absolute',
    bottom: 3,
  },
  calendarModalFooter: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  calendarFooterActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarFooterActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#334155',
  },
  adminPrintInvoiceCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
  },
  adminPrintInvoiceCardBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  adminPrintInvoiceHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 7,
  },
  adminPrintInvoiceHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  adminPrintInvoiceModalFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
  },
  adminPrintInvoiceModalFooterBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* MODULAR REPORTS & DEDICATED SUB-SECTIONS */
  reportHeaderActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reportOpenFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reportOpenFormBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  reportPrintQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0284c7',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  reportPrintQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  reportSectionRibbonWrap: {
    marginTop: 14,
    marginBottom: 8,
  },
  reportSectionRibbonScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  reportSectionTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 22,
  },
  reportSectionTabPillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  reportSectionTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
  },
  reportSectionTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  reportSectionBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  reportSectionBadgeActive: {
    backgroundColor: '#1e293b',
  },
  reportSectionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  reportSectionBadgeTextActive: {
    color: '#38bdf8',
  },
  reportSectionHeaderBanner: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportSectionBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  reportSectionBannerSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 3,
  },
  reportSectionPrintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  reportSectionPrintBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  reportProductRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  reportSearchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 220,
  },
  reportSearchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
    padding: 0,
  },

  /* MODAL A4 DOCUMENT STYLES */
  reportFormModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  reportFormModalCard: {
    width: '100%',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    maxHeight: '94%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  reportFormModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  reportFormModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  reportFormModalSub: {
    fontSize: 11.5,
    color: '#64748b',
    marginTop: 2,
  },
  reportFormPaperScroll: {
    flexGrow: 1,
  },
  reportA4Sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 24,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  reportA4HeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 2,
    borderBottomColor: '#0f172a',
    paddingBottom: 14,
  },
  reportA4BrandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: 0.5,
  },
  reportA4BrandSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reportA4DocCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  reportA4DateText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  reportA4OfficialStamp: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#93c5fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  reportA4StampText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#1d4ed8',
    letterSpacing: 0.5,
  },
  reportA4TitleWrap: {
    alignItems: 'center',
    marginVertical: 18,
  },
  reportA4DocTitle: {
    fontSize: 16,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#0f172a',
    textAlign: 'center',
  },
  reportA4PeriodChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  reportA4PeriodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284c7',
  },
  reportA4KpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  reportA4KpiItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  reportA4KpiNum: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  reportA4KpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  reportA4TableHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  reportA4TableWrap: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    overflow: 'hidden',
  },
  reportA4TableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  reportA4TableHead: {
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  reportA4Th: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1e293b',
  },
  reportA4Td: {
    fontSize: 11.5,
    color: '#334155',
  },
  reportA4SignatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 36,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  reportA4SigCol: {
    flex: 1,
    alignItems: 'center',
  },
  reportA4SigTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#0f172a',
  },
  reportA4SigSub: {
    fontSize: 10,
    fontStyle: 'italic',
    color: '#64748b',
    marginTop: 2,
  },
  reportA4SigName: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
    paddingTop: 4,
    minWidth: 120,
    textAlign: 'center',
  },
  reportFormModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  reportCustomOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
  },
  reportCustomOptionBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#ffffff',
  },
  kpiCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  kpiCardActionPrintBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiCardActionCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiCardActionText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  customDateInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: '#0f172a',
    minWidth: 0,
  },
});


