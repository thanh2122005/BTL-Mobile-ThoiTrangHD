import Constants from 'expo-constants';
import { Platform } from 'react-native';

let API_URL = 'http://localhost:5000'; // Mặc định cho Web hoặc Simulator

if (Platform.OS !== 'web') {
  // Tự động lấy IP của máy vi tính đang chạy Expo (dành cho test trên điện thoại thật)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    API_URL = `http://${ip}:5000`;
  } else {
    // Dự phòng cứng IP LAN hiện tại
    API_URL = 'http://192.168.0.154:5000';
  }
}

export { API_URL };
