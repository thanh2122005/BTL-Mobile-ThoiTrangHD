import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_URL } from '@/constants/config';

export interface Voucher {
  code: string;
  discount_type?: 'percent' | 'fixed';
  discountType?: 'percent' | 'fixed';
  value: number;
  min_spend?: number;
  usage_limit?: number;
  times_used?: number;
  expires_at?: string | null;
}

interface VoucherModalProps {
  visible: boolean;
  onClose: () => void;
  subtotalPrice: number;
  appliedVoucher: Voucher | null;
  onApplyVoucher: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemoveVoucher?: () => void;
}

const formatVND = (num: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

export const calcVoucherSavings = (v: Voucher, subtotal: number): number => {
  const isPercent = v.discount_type === 'percent' || v.discountType === 'percent';
  if (isPercent) {
    return Math.round((subtotal * Number(v.value)) / 100);
  }
  return Math.min(Number(v.value), subtotal);
};

export const VoucherModal: React.FC<VoucherModalProps> = ({
  visible,
  onClose,
  subtotalPrice,
  appliedVoucher,
  onApplyVoucher,
  onRemoveVoucher,
}) => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputCode, setInputCode] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/vouchers`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVouchers(data.data);
      }
    } catch (err) {
      console.log('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchVouchers();
      setFeedbackMsg(null);
      setInputCode('');
    }
  }, [visible]);

  const handleApply = async (codeToApply: string) => {
    if (!codeToApply.trim()) {
      setFeedbackMsg({ text: 'Vui lòng nhập mã khuyến mãi', isError: true });
      return;
    }
    try {
      setApplyingCode(codeToApply);
      setFeedbackMsg(null);
      const res = await onApplyVoucher(codeToApply.trim().toUpperCase());
      if (res.success) {
        setFeedbackMsg({ text: res.message || 'Áp dụng mã thành công!', isError: false });
        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        setFeedbackMsg({ text: res.message || 'Mã không hợp lệ hoặc chưa đủ điều kiện', isError: true });
      }
    } catch (error: any) {
      setFeedbackMsg({ text: error?.message || 'Có lỗi xảy ra', isError: true });
    } finally {
      setApplyingCode(null);
    }
  };

  // Best savings voucher first
  const eligibleVouchers = vouchers
    .filter((v) => subtotalPrice >= (v.min_spend || 0))
    .sort((a, b) => calcVoucherSavings(b, subtotalPrice) - calcVoucherSavings(a, subtotalPrice));

  const maxSavings = eligibleVouchers.length > 0 ? calcVoucherSavings(eligibleVouchers[0], subtotalPrice) : 0;

  // Ineligible vouchers below
  const ineligibleVouchers = vouchers
    .filter((v) => subtotalPrice < (v.min_spend || 0))
    .sort((a, b) => (a.min_spend || 0) - (b.min_spend || 0));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <IconSymbol name="ticket.fill" size={22} color="#b78103" />
                <Text style={styles.title}>Chọn Mã Giảm Giá</Text>
              </View>
              <Text style={styles.subtitle}>Gợi ý mã giảm nhiều nhất cho đơn hàng của bạn</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <IconSymbol name="xmark" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Nh?p m? th? c?ng */}
          <View style={styles.inputSection}>
            <View style={styles.inputWrapper}>
              <IconSymbol name="tag.fill" size={18} color="#888" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.input}
                placeholder="Nhập mã voucher (VD: HD10, HD20, HD50K...)"
                placeholderTextColor="#999"
                value={inputCode}
                onChangeText={(val) => {
                  setInputCode(val);
                  if (feedbackMsg) setFeedbackMsg(null);
                }}
                autoCapitalize="characters"
              />
              {inputCode.length > 0 && (
                <TouchableOpacity onPress={() => setInputCode('')} style={{ padding: 8 }}>
                  <IconSymbol name="xmark" size={16} color="#999" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.inputApplyBtn, (!inputCode.trim() || applyingCode === inputCode) && styles.inputApplyBtnDisabled]}
              onPress={() => handleApply(inputCode)}
              disabled={!inputCode.trim() || applyingCode === inputCode}
            >
              {applyingCode === inputCode ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.inputApplyBtnText}>Áp dụng</Text>
              )}
            </TouchableOpacity>
          </View>

          {feedbackMsg && (
            <View style={[styles.msgBox, feedbackMsg.isError ? styles.msgBoxError : styles.msgBoxSuccess]}>
              <Text style={[styles.msgText, feedbackMsg.isError ? styles.msgTextError : styles.msgTextSuccess]}>
                {feedbackMsg.text}
              </Text>
            </View>
          )}

          {/* Danh s?ch vouchers */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#b78103" />
              <Text style={styles.loadingText}>Đang tải danh sách voucher...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={true}>
              {/* Eligible vouchers (best savings first) */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>MÃ CÓ THỂ ÁP DỤNG ({eligibleVouchers.length})</Text>
                <Text style={styles.currentTotalText}>Đơn hiện tại: {formatVND(subtotalPrice)}</Text>
              </View>

              {eligibleVouchers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>Chưa có mã nào đủ điều kiện cho đơn hàng này.</Text>
                </View>
              ) : (
                eligibleVouchers.map((v, index) => {
                  const isApplied = appliedVoucher?.code === v.code;
                  const isPercent = v.discount_type === 'percent' || v.discountType === 'percent';
                  const discLabel = isPercent ? `Giảm ${v.value}%` : `Giảm ${formatVND(v.value)}`;
                  const savings = calcVoucherSavings(v, subtotalPrice);
                  const isBestDeal = savings === maxSavings && maxSavings > 0;
                  const minSpendLabel = v.min_spend ? `Đơn tối thiểu ${formatVND(v.min_spend)}` : 'Áp dụng cho mọi đơn hàng';

                  return (
                    <View
                      key={v.code}
                      style={[
                        styles.voucherCard,
                        styles.eligibleCard,
                        isBestDeal && styles.bestDealCard,
                        isApplied && styles.activeVoucherCard,
                      ]}
                    >
                      {/* Best deal badge */}
                      {isBestDeal && (
                        <View style={styles.bestDealBadge}>
                          <Text style={styles.bestDealBadgeText}>♕ ƯU ĐÃI TỐT NHẤT - Tiết kiệm {formatVND(savings)}</Text>
                        </View>
                      )}

                      <View style={styles.cardContentRow}>
                        <View style={[styles.voucherLeftBadge, isBestDeal && styles.bestDealLeftBadge]}>
                          <IconSymbol name="ticket.fill" size={20} color={isBestDeal ? '#b78103' : '#b78103'} />
                          <Text style={styles.voucherCodeBadge}>{v.code}</Text>
                        </View>

                        <View style={styles.voucherMainInfo}>
                          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                            <Text style={styles.voucherDiscount}>{discLabel}</Text>
                            <Text style={styles.voucherSavingsText}>(-{formatVND(savings)})</Text>
                          </View>
                          <Text style={styles.voucherMinSpend}>{minSpendLabel}</Text>
                          <View style={styles.eligibleTag}>
                            <Text style={styles.eligibleTagText}>✓ Đủ điều kiện</Text>
                          </View>
                        </View>

                        <View style={styles.voucherActionCol}>
                          {isApplied ? (
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                              <View style={styles.appliedBadge}>
                                <Text style={styles.appliedBadgeText}>Đang dùng</Text>
                              </View>
                              {onRemoveVoucher && (
                                <TouchableOpacity onPress={onRemoveVoucher} style={styles.removeBtnSmall}>
                                  <Text style={styles.removeBtnSmallText}>Gỡ bỏ</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.applyBtn,
                                isBestDeal && styles.bestDealApplyBtn,
                                applyingCode === v.code && styles.applyBtnLoading
                              ]}
                              onPress={() => handleApply(v.code)}
                              disabled={applyingCode === v.code}
                            >
                              {applyingCode === v.code ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Text style={styles.applyBtnText}>Áp dụng</Text>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}

              {/* Ineligible vouchers */}
              {ineligibleVouchers.length > 0 && (
                <View style={{ marginTop: 24 }}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={[styles.sectionHeaderTitle, { color: '#888' }]}>
                      CHƯA ĐIỀU KIỆN ÁP DỤNG ({ineligibleVouchers.length})
                    </Text>
                  </View>

                  {ineligibleVouchers.map((v) => {
                    const isPercent = v.discount_type === 'percent' || v.discountType === 'percent';
                    const discLabel = isPercent ? `Giảm ${v.value}%` : `Giảm ${formatVND(v.value)}`;
                    const minSpend = v.min_spend || 0;
                    const minSpendLabel = `Đơn tối thiểu ${formatVND(minSpend)}`;
                    const neededMore = minSpend - subtotalPrice;

                    return (
                      <View key={v.code} style={[styles.voucherCard, styles.ineligibleCard]}>
                        <View style={styles.cardContentRow}>
                          <View style={[styles.voucherLeftBadge, styles.ineligibleLeftBadge]}>
                            <IconSymbol name="ticket" size={20} color="#888" />
                            <Text style={[styles.voucherCodeBadge, { color: '#666' }]}>{v.code}</Text>
                          </View>

                          <View style={styles.voucherMainInfo}>
                            <Text style={[styles.voucherDiscount, { color: '#666' }]}>{discLabel}</Text>
                            <Text style={styles.voucherMinSpend}>{minSpendLabel}</Text>
                            <View style={styles.ineligibleNote}>
                              <Text style={styles.ineligibleNoteText}>
                                ⚠️ Cần mua thêm {formatVND(neededMore)} để dùng mã này
                              </Text>
                            </View>
                          </View>

                          <View style={styles.voucherActionCol}>
                            <View style={styles.disabledApplyBtn}>
                              <Text style={styles.disabledApplyBtnText}>Chưa đủ ĐK</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeFooterBtn} onPress={onClose}>
              <Text style={styles.closeFooterBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 9999,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 540,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1c1c',
  },
  subtitle: {
    fontSize: 12,
    color: '#747878',
    marginTop: 3,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  inputSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    gap: 10,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fafafa',
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1c1c',
  },
  inputApplyBtn: {
    backgroundColor: '#1a1c1c',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputApplyBtnDisabled: {
    backgroundColor: '#c4c7c7',
  },
  inputApplyBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  msgBox: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  msgBoxError: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  msgBoxSuccess: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  msgText: {
    fontSize: 12,
    fontWeight: '500',
  },
  msgTextError: {
    color: '#c62828',
  },
  msgTextSuccess: {
    color: '#2e7d32',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: '#747878',
  },
  scrollList: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexGrow: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#1a1c1c',
  },
  currentTotalText: {
    fontSize: 11,
    color: '#747878',
    fontWeight: '500',
  },
  emptyBox: {
    padding: 20,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#747878',
  },
  voucherCard: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardContentRow: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  // Eligible card
  eligibleCard: {
    backgroundColor: '#ffffff',
    borderColor: '#ecd8ad',
    shadowColor: '#b78103',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  // Best deal card
  bestDealCard: {
    borderColor: '#e6a100',
    borderWidth: 1.8,
    backgroundColor: '#fffdf8',
  },
  bestDealBadge: {
    backgroundColor: '#fff5d6',
    borderBottomWidth: 1,
    borderBottomColor: '#f7d67d',
    paddingVertical: 4,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bestDealBadgeText: {
    color: '#8a5c00',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bestDealLeftBadge: {
    backgroundColor: '#fff7e0',
    borderColor: '#f2cd6d',
  },
  bestDealApplyBtn: {
    backgroundColor: '#b78103',
  },
  activeVoucherCard: {
    borderColor: '#2e7d32',
    borderWidth: 1.8,
    backgroundColor: '#f6fbf6',
  },
  // Ineligible card
  ineligibleCard: {
    backgroundColor: '#ebebeb',
    borderColor: '#d6d6d6',
    opacity: 0.72,
  },
  voucherLeftBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fcf8ec',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f2e4c2',
    width: 80,
  },
  ineligibleLeftBadge: {
    backgroundColor: '#dedede',
    borderColor: '#cecece',
  },
  voucherCodeBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b78103',
    marginTop: 4,
    textAlign: 'center',
  },
  voucherMainInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  voucherDiscount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1a1c1c',
  },
  voucherSavingsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2e7d32',
  },
  voucherMinSpend: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  eligibleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  eligibleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2e7d32',
  },
  ineligibleNote: {
    marginTop: 4,
  },
  ineligibleNoteText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#c62828',
  },
  voucherActionCol: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtn: {
    backgroundColor: '#1a1c1c',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 78,
    alignItems: 'center',
  },
  applyBtnLoading: {
    opacity: 0.8,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  appliedBadge: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#2e7d32',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  appliedBadgeText: {
    color: '#2e7d32',
    fontSize: 11,
    fontWeight: '700',
  },
  removeBtnSmall: {
    paddingVertical: 2,
  },
  removeBtnSmallText: {
    color: '#d32f2f',
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  disabledApplyBtn: {
    backgroundColor: '#d6d6d6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 78,
    alignItems: 'center',
  },
  disabledApplyBtnText: {
    color: '#777777',
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  closeFooterBtn: {
    backgroundColor: '#eeeeee',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeFooterBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444444',
  },
});
