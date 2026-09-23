// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'arrow.left': 'arrow-back',
  'arrow.right': 'arrow-forward',
  'star.fill': 'star',
  'magnifyingglass': 'search',
  'heart': 'favorite-border',
  'heart.fill': 'favorite',
  'bag': 'shopping-bag',
  'bag.fill': 'shopping-bag',
  'bag.badge.plus': 'add-shopping-cart',
  'location': 'location-on',
  'creditcard': 'credit-card',
  'bell': 'notifications',
  'gear': 'settings',
  'minus': 'remove',
  'plus': 'add',
  'trash': 'delete',
  'cart': 'shopping-cart',
  'cart.fill': 'shopping-cart',
  'square.grid.2x2': 'grid-view',
  'square.grid.2x2.fill': 'grid-view',
  'person.fill': 'person',
  'bag.fill.badge.plus': 'add-shopping-cart',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check-circle',
  'cube.box': 'inventory-2',
  'car': 'local-shipping',
  'doc.plaintext': 'receipt-long',
  'mappin.and.ellipse': 'place',
  'qrcode': 'qr-code-2',
  'banknote': 'payments',
  'line.3.horizontal': 'menu',
  'square.and.arrow.up': 'share',
  'slider.horizontal.3': 'tune',
  'building.columns': 'account-balance',
  'envelope': 'mail-outline',
  'lock': 'lock-outline',
  'eye': 'visibility',
  'eye.slash': 'visibility-off',
  'exclamationmark.circle.fill': 'error',
  'phone': 'phone',
  'person': 'person-outline',
  'gearshape': 'settings',
  'questionmark.circle': 'help-outline',
  'arrow.right.square': 'logout',
  'camera.fill': 'photo-camera',
  'house': 'home',
  'xmark': 'close',
  'tag': 'local-offer',
  'tag.fill': 'local-offer',
  'ticket': 'confirmation-number',
  'ticket.fill': 'confirmation-number',
  'sparkles': 'auto-awesome',
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
