import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, usePathname } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/contexts/AuthContext';
import { useResponsive } from '@/hooks/useResponsive';
import { API_URL } from '@/constants/config';
import { getImageSource } from '@/constants/images';

interface ProductItem {
  id: number;
  name: string;
  price: number;
  original_price?: number;
  discount?: number;
  category?: string;
  image?: string;
}

interface OrderInfo {
  id: number;
  order_code: string;
  status: string;
  status_desc?: string;
  total_price: number;
  customer_name?: string;
  items?: any[];
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  intent?: string;
  data?: {
    products?: ProductItem[];
    order?: OrderInfo;
    height?: number;
    weight?: number;
    recommended_size?: string;
    pant_size?: string;
    vouchers?: any[];
    recent_orders?: any[];
  };
  suggested_actions?: string[];
}

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome-msg',
  sender: 'bot',
  text: `👋 **Xin chào quý khách!** Em là **Trợ lý AI Stylist** của ThoiTrangHD.\n\nEm luôn sẵn sàng hỗ trợ bạn 24/7:\n• 📏 **Tư vấn chuẩn size** theo chiều cao & cân nặng\n• 🛍️ **Gợi ý outfit hot trend** & trang phục theo sở thích\n• 📦 **Tra cứu đơn hàng** tức thì theo mã đơn\n• 🎟️ **Mã giảm giá hot & chính sách đổi trả** 7 ngày\n\nBạn cần em tư vấn điều gì hôm nay ạ? ✨`,
  timestamp: 'Vừa xong',
  suggested_actions: [
    '📏 Tư vấn chọn size',
    '🔥 Mẫu áo Polo hot',
    '👖 Quần Jean nam',
    '📦 Tra cứu đơn hàng',
    '🎟️ Mã giảm giá hôm nay',
  ],
};

const QUICK_TOPICS = [
  { label: '📏 Tư vấn size', query: 'Tư vấn chọn size cho mình với' },
  { label: '🔥 Áo Polo hot', query: 'Gợi ý các mẫu áo Polo bán chạy' },
  { label: '👖 Quần Jean', query: 'Tìm quần Jean form đẹp' },
  { label: '📦 Đơn của tôi', query: 'Tra cứu đơn hàng của tôi' },
  { label: '🎟️ Mã giảm giá', query: 'Hôm nay có voucher mã giảm giá nào không?' },
  { label: '🔄 Đổi trả & Ship', query: 'Chính sách đổi trả và phí vận chuyển như thế nào?' },
];

export function ChatbotWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { isMobile } = useResponsive();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [loading, setLoading] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Ẩn Chatbot nếu đang ở trang Admin hoặc Checkout để không che nút Đặt hàng và thông tin thanh toán
  const isHidden = pathname?.includes('admin') || pathname?.includes('checkout');

  // Hiệu ứng nhịp đập nhẹ nhàng cho nút FAB
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [messages, isOpen, loading]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInputText('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          userId: user?.id || null,
        }),
      });

      const data = await res.json();
      if (data && data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply || 'Dạ em đã ghi nhận thông tin từ bạn!',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          intent: data.intent,
          data: data.data,
          suggested_actions: data.suggested_actions || [],
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.reply || 'Dạ hiện tại hệ thống AI đang cập nhật, bạn có thể thử lại câu hỏi khác nhé! 🙏',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          suggested_actions: ['📏 Tư vấn chọn size', '🔥 Áo Polo hot', '📦 Tra cứu đơn hàng'],
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      const fallbackMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: 'Dạ mạng kết nối tới máy chủ tạm thời gián đoạn. Bạn thử kết nối lại hoặc chọn các gợi ý bên dưới nhé! 💖',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        suggested_actions: ['📏 Tư vấn chọn size', '🔥 Áo Polo hot', '📦 Tra cứu đơn hàng'],
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME]);
  };

  const renderFormattedText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return (
      <Text style={styles.bubbleText}>
        {parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text key={index} style={styles.boldText}>
                {part.slice(2, -2)}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  if (isHidden) return null;

  return (
    <>
      {/* 1. NÚT FAB KÍCH HOẠT CHATBOT (LUÔN NỔI GÓC DƯỚI BÊN PHẢI) */}
      {!isOpen && (
        <View style={styles.fabWrapper}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.fabButton}
              onPress={() => setIsOpen(true)}>
              <View style={styles.fabIconBadge}>
                <MaterialIcons name="smart-toy" size={24} color="#ffffff" />
                <View style={styles.onlineDot} />
              </View>
              <View style={styles.fabTextContainer}>
                <Text style={styles.fabTitle}>AI Stylist</Text>
                <Text style={styles.fabSubtitle}>Tư vấn 24/7</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* 2. CỬA SỔ TRỢ LÝ AI (NATIVE MODAL CHO CẢ MOBILE EXPO & WEB) */}
      <Modal
        visible={isOpen}
        transparent={true}
        animationType={isMobile ? 'slide' : 'fade'}
        onRequestClose={() => setIsOpen(false)}
        statusBarTranslucent>
        <View
          style={[
            styles.modalOverlay,
            isMobile ? styles.modalOverlayMobile : styles.modalOverlayDesktop,
          ]}>
          {/* Backdrop mờ phía sau - bấm để đóng */}
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsOpen(false)}>
            <View style={styles.backdrop} />
          </TouchableOpacity>

          <View
            style={[
              styles.sheetContainer,
              isMobile ? styles.sheetContainerMobile : styles.sheetContainerDesktop,
            ]}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
              style={styles.keyboardContainer}>
            {/* A. HEADER CHATBOT */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.headerAvatar}>
                  <MaterialIcons name="smart-toy" size={22} color="#fbbf24" />
                </View>
                <View>
                  <View style={styles.headerTitleRow}>
                    <Text style={styles.headerTitle}>ThoiTrangHD Stylist AI</Text>
                    <View style={styles.headerLivePill}>
                      <View style={styles.liveIndicator} />
                      <Text style={styles.liveText}>Online</Text>
                    </View>
                  </View>
                  <Text style={styles.headerDesc}>Tư vấn chọn size • Tìm đồ • Tra đơn</Text>
                </View>
              </View>

              <View style={styles.headerRight}>
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={handleResetChat}>
                  <MaterialIcons name="refresh" size={20} color="#cbd5e1" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.headerIconBtn, styles.closeBtn]}
                  onPress={() => setIsOpen(false)}>
                  <MaterialIcons name="close" size={20} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* B. THANH CHỦ ĐỀ GỢI Ý NHANH (QUICK PILLS) */}
            <View style={styles.quickBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickBarContent}>
                {QUICK_TOPICS.map((topic, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={styles.quickChip}
                    onPress={() => handleSendMessage(topic.query)}>
                    <Text style={styles.quickChipText}>{topic.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* C. DANH SÁCH TIN NHẮN */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              keyboardShouldPersistTaps="handled">
              {messages.map((msg) => (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    msg.sender === 'user' ? styles.messageRowUser : styles.messageRowBot,
                  ]}>
                  {msg.sender === 'bot' && (
                    <View style={styles.botAvatarSmall}>
                      <MaterialIcons name="smart-toy" size={16} color="#ffffff" />
                    </View>
                  )}

                  <View
                    style={[
                      styles.bubble,
                      msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot,
                    ]}>
                    {/* Nội dung chữ */}
                    {msg.sender === 'user' ? (
                      <Text style={styles.bubbleTextUser}>{msg.text}</Text>
                    ) : (
                      renderFormattedText(msg.text)
                    )}

                    {/* CARD GỢI Ý SẢN PHẨM (NẾU CÓ) */}
                    {msg.data?.products && msg.data.products.length > 0 && (
                      <View style={styles.productsSection}>
                        <Text style={styles.sectionHeaderTitle}>🛍️ Mẫu đề xuất cho bạn:</Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={styles.productsScroll}>
                          {msg.data.products.map((p) => (
                            <TouchableOpacity
                              key={p.id}
                              style={styles.productCard}
                              activeOpacity={0.85}
                              onPress={() => {
                                setIsOpen(false);
                                router.push(`/products/${p.id}` as any);
                              }}>
                              <Image
                                source={getImageSource(p.image)}
                                style={styles.productThumb}
                                contentFit="cover"
                              />
                              {p.discount ? (
                                <View style={styles.discountBadge}>
                                  <Text style={styles.discountText}>-{p.discount}%</Text>
                                </View>
                              ) : null}
                              <View style={styles.productCardBody}>
                                <Text style={styles.productName} numberOfLines={2}>
                                  {p.name}
                                </Text>
                                <Text style={styles.productPrice}>
                                  {Number(p.price).toLocaleString('vi-VN')}đ
                                </Text>
                                <View style={styles.viewDetailBtn}>
                                  <Text style={styles.viewDetailText}>Xem ngay →</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* CARD THÔNG TIN ĐƠN HÀNG (NẾU CÓ) */}
                    {msg.data?.order && (
                      <View style={styles.orderCard}>
                        <View style={styles.orderCardHeader}>
                          <Text style={styles.orderCardCode}>
                            Mã đơn: #{msg.data.order.order_code || msg.data.order.id}
                          </Text>
                          <View
                            style={[
                              styles.orderStatusPill,
                              msg.data.order.status === 'Completed'
                                ? styles.statusGreen
                                : msg.data.order.status === 'Processing'
                                ? styles.statusBlue
                                : msg.data.order.status === 'Cancelled'
                                ? styles.statusRed
                                : styles.statusAmber,
                            ]}>
                            <Text style={styles.orderStatusText}>
                              {msg.data.order.status_desc || msg.data.order.status}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.orderCardTotal}>
                          Tổng tiền: {Number(msg.data.order.total_price).toLocaleString('vi-VN')}đ
                        </Text>
                        <TouchableOpacity
                          style={styles.viewOrdersBtn}
                          onPress={() => {
                            setIsOpen(false);
                            router.push('/orders' as any);
                          }}>
                          <Text style={styles.viewOrdersBtnText}>
                            👉 Xem danh sách đơn hàng của tôi
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* DANH SÁCH ĐƠN HÀNG GẦN ĐÂY (NẾU CÓ) */}
                    {msg.data?.recent_orders && msg.data.recent_orders.length > 0 && (
                      <View style={styles.recentOrdersList}>
                        <Text style={styles.sectionHeaderTitle}>📦 Đơn hàng gần nhất của bạn:</Text>
                        {msg.data.recent_orders.map((ord: any) => (
                          <View key={ord.id} style={styles.recentOrderItem}>
                            <View style={styles.recentOrderTop}>
                              <Text style={styles.recentOrderCode}>#{ord.order_code || ord.id}</Text>
                              <View
                                style={[
                                  styles.orderStatusPill,
                                  ord.status === 'Completed'
                                    ? styles.statusGreen
                                    : ord.status === 'Processing'
                                    ? styles.statusBlue
                                    : ord.status === 'Cancelled'
                                    ? styles.statusRed
                                    : styles.statusAmber,
                                ]}>
                                <Text style={styles.orderStatusText}>
                                  {ord.status_desc || ord.status}
                                </Text>
                              </View>
                            </View>

                            {ord.items_summary ? (
                              <Text style={styles.recentOrderItems} numberOfLines={2}>
                                🛍️ {ord.items_summary}
                              </Text>
                            ) : null}

                            <View style={styles.recentOrderMeta}>
                              <Text style={styles.recentOrderPrice}>
                                {Number(ord.total_price).toLocaleString('vi-VN')}đ
                              </Text>
                              <Text style={styles.recentOrderDate}>
                                {new Date(ord.created_at).toLocaleDateString('vi-VN')}
                              </Text>
                            </View>

                            <View style={styles.recentOrderBtnsRow}>
                              <TouchableOpacity
                                style={styles.trackOrderQuickBtn}
                                onPress={() => handleSendMessage(`Tra cứu #${ord.order_code || ord.id}`)}>
                                <MaterialIcons name="local-shipping" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                                <Text style={styles.trackOrderQuickText}>Tra cứu hành trình</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.viewOrderDetailBtn}
                                onPress={() => {
                                  setIsOpen(false);
                                  router.push('/orders' as any);
                                }}>
                                <Text style={styles.viewOrderDetailText}>Chi tiết đơn →</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* CÁC GỢI Ý HÀNH ĐỘNG DƯỚI BUBBLE (SUGGESTED ACTIONS) */}
                    {msg.suggested_actions && msg.suggested_actions.length > 0 && (
                      <View style={styles.actionsWrap}>
                        {msg.suggested_actions.map((act, aIdx) => (
                          <TouchableOpacity
                            key={aIdx}
                            style={styles.actionPill}
                            onPress={() => {
                              if (act === 'Đơn hàng của tôi') {
                                setIsOpen(false);
                                router.push('/orders' as any);
                              } else {
                                handleSendMessage(act);
                              }
                            }}>
                            <Text style={styles.actionPillText}>{act}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <Text
                      style={[
                        styles.timestamp,
                        msg.sender === 'user' ? styles.timeUser : styles.timeBot,
                      ]}>
                      {msg.timestamp}
                    </Text>
                  </View>
                </View>
              ))}

              {/* TYPING INDICATOR */}
              {loading && (
                <View style={[styles.messageRow, styles.messageRowBot]}>
                  <View style={styles.botAvatarSmall}>
                    <MaterialIcons name="smart-toy" size={16} color="#ffffff" />
                  </View>
                  <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                    <ActivityIndicator size="small" color="#6366f1" />
                    <Text style={styles.typingText}>Trợ lý AI đang soạn câu trả lời...</Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* D. KHUNG NHẬP TIN NHẮN */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Hỏi chọn size, tìm mẫu áo, tra mã đơn..."
                placeholderTextColor="#94a3b8"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() || loading ? styles.sendButtonDisabled : styles.sendButtonActive,
                ]}
                disabled={!inputText.trim() || loading}
                onPress={() => handleSendMessage()}>
                <MaterialIcons name="send" size={18} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Chú thích nhỏ dưới input */}
            <View style={styles.footerNote}>
              <Text style={styles.footerNoteText}>
                ⚡ ThoiTrangHD AI • Hỗ trợ mua sắm & chăm sóc khách hàng 24/7
              </Text>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  </>
  );
}

const styles = StyleSheet.create({
  // NÚT FAB
  fabWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 86 : 94,
    right: 16,
    zIndex: 9999,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#4338ca',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(67, 56, 202, 0.45)',
        cursor: 'pointer',
      },
      default: {
        elevation: 10,
        shadowColor: '#4338ca',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
      },
    }),
  },
  fabIconBadge: {
    position: 'relative',
    marginRight: 9,
  },
  onlineDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    borderWidth: 1.5,
    borderColor: '#0f172a',
  },
  fabTextContainer: {
    flexDirection: 'column',
  },
  fabTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  fabSubtitle: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '600',
  },

  // MODAL OVERLAY
  modalOverlay: {
    flex: 1,
  },
  modalOverlayMobile: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 0,
  },
  modalOverlayDesktop: {
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingBottom: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  keyboardContainer: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.28)',
      },
      default: {
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
    }),
  },
  sheetContainerMobile: {
    width: '100%',
    maxWidth: 520,
    height: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  sheetContainerDesktop: {
    width: 410,
    height: 640,
    maxHeight: '90%',
    borderRadius: 24,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#4338ca',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    marginRight: 6,
  },
  headerLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#22c55e',
    marginRight: 4,
  },
  liveText: {
    color: '#4ade80',
    fontSize: 9,
    fontWeight: '700',
  },
  headerDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#ef4444',
  },

  // QUICK PILLS BAR
  quickBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 8,
  },
  quickBarContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  quickChip: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 5,
    paddingHorizontal: 11,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickChipText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },

  // MESSAGES LIST
  messagesList: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 12,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginVertical: 2,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowBot: {
    justifyContent: 'flex-start',
  },
  botAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4338ca',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  bubble: {
    maxWidth: '84%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
    }),
  },
  bubbleUser: {
    backgroundColor: '#1e1b4b',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 19,
  },
  bubbleText: {
    color: '#1e293b',
    fontSize: 13,
    lineHeight: 20,
  },
  boldText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeUser: {
    color: '#c7d2fe',
  },
  timeBot: {
    color: '#94a3b8',
  },

  // TYPING
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  typingText: {
    color: '#64748b',
    fontSize: 12,
    fontStyle: 'italic',
  },

  // PRODUCTS SECTION
  productsSection: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  productsScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  productCard: {
    width: 130,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  productThumb: {
    width: '100%',
    height: 100,
    backgroundColor: '#f1f5f9',
  },
  discountBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  productCardBody: {
    padding: 7,
  },
  productName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
    height: 28,
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
    marginTop: 2,
  },
  viewDetailBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
    marginTop: 6,
  },
  viewDetailText: {
    color: '#4338ca',
    fontSize: 10,
    fontWeight: '700',
  },

  // ORDER CARD
  orderCard: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderCardCode: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusGreen: { backgroundColor: '#dcfce7' },
  statusBlue: { backgroundColor: '#dbeafe' },
  statusAmber: { backgroundColor: '#fef3c7' },
  statusRed: { backgroundColor: '#fee2e2' },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  orderCardTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 6,
  },
  viewOrdersBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewOrdersBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // RECENT ORDERS LIST
  recentOrdersList: {
    marginTop: 10,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  recentOrderItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  recentOrderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recentOrderCode: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  recentOrderItems: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 16,
  },
  recentOrderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  recentOrderPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  recentOrderDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  recentOrderBtnsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  trackOrderQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4338ca',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  trackOrderQuickText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  viewOrderDetailBtn: {
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewOrderDetailText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },

  // ACTIONS PILLS
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionPill: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  actionPillText: {
    color: '#4338ca',
    fontSize: 11,
    fontWeight: '600',
  },

  // INPUT BAR
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sendButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#4338ca',
  },
  sendButtonDisabled: {
    backgroundColor: '#cbd5e1',
  },
  footerNote: {
    backgroundColor: '#f8fafc',
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 24 : 6,
    alignItems: 'center',
  },
  footerNoteText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '500',
  },
});
