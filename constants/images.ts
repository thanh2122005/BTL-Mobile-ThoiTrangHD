import { API_URL } from '@/constants/config';

export const imageMap: { [key: string]: any } = {
  'sp1.jpg': require('@/assets/images/sp1.jpg'),
  'sp2.jpg': require('@/assets/images/sp2.jpg'),
  'sp3.jpg': require('@/assets/images/sp3.jpg'),
  'sp4.jpg': require('@/assets/images/sp4.jpg'),
  'sp5.jpg': require('@/assets/images/sp5.jpg'),
  'sp6.jpg': require('@/assets/images/sp6.jpg'),
  'fashion1.png': require('@/assets/images/fashion1.png'),
  'fashion2.png': require('@/assets/images/fashion2.png'),
  'banner_fashion_hd.jpg': require('@/assets/images/banner_fashion_hd.jpg'),
};

export const getImageSource = (img: any) => {
  if (!img) return imageMap['sp1.jpg'];
  if (typeof img === 'string') {
    const trimmed = img.trim();
    if (imageMap[trimmed]) return imageMap[trimmed];
    const basename = trimmed.split('/').pop() || '';
    if (imageMap[basename]) return imageMap[basename];
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { uri: trimmed };
    }
    if (trimmed.startsWith('/uploads/')) {
      return { uri: `${API_URL}${trimmed}` };
    }
    // Fallback if local name not found
    return imageMap['sp1.jpg'];
  }
  return img;
};

