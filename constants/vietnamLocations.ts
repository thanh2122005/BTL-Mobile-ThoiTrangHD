// [Dịch vụ Địa giới Hành chính Việt Nam - Tích hợp Open API 63 Tỉnh Thành]
// Tự động đồng bộ từ https://provinces.open-api.vn/api/ kèm bộ nhớ đệm (Cache) tốc độ cao

export interface WardItem {
  code?: number;
  name: string;
}

export interface DistrictItem {
  code?: number;
  name: string;
  wards: string[];
}

export interface ProvinceItem {
  code?: number;
  name: string;
  districts: DistrictItem[];
}

// Kiểu dữ liệu tương thích ngược
export type District = DistrictItem;
export type Province = ProvinceItem;

// Cache bộ nhớ đệm (In-memory Cache)
let cachedProvinces: ProvinceItem[] | null = null;
const districtCache = new Map<string | number, DistrictItem[]>();
const wardCache = new Map<string | number, string[]>();

// Danh mục dự phòng gọn nhẹ khi offline hoặc server API nghẽn (~25 dòng)
export const FALLBACK_PROVINCES: ProvinceItem[] = [
  {
    name: 'Thành phố Hà Nội',
    districts: [
      { name: 'Quận Cầu Giấy', wards: ['Phường Dịch Vọng', 'Phường Dịch Vọng Hậu', 'Phường Mai Dịch', 'Phường Nghĩa Đô', 'Phường Nghĩa Tân', 'Phường Quan Hoa', 'Phường Trung Hòa', 'Phường Yên Hòa'] },
      { name: 'Quận Hoàn Kiếm', wards: ['Phường Hàng Bạc', 'Phường Hàng Bồ', 'Phường Hàng Bông', 'Phường Hàng Buồm', 'Phường Hàng Đào', 'Phường Tràng Tiền', 'Phường Phan Chu Trinh'] },
      { name: 'Quận Đống Đa', wards: ['Phường Cát Linh', 'Phường Hàng Bột', 'Phường Khâm Thiên', 'Phường Láng Hạ', 'Phường Ô Chợ Dừa', 'Phường Văn Miếu'] },
      { name: 'Quận Ba Đình', wards: ['Phường Cống Vị', 'Phường Điện Biên', 'Phường Đội Cấn', 'Phường Giảng Võ', 'Phường Kim Mã', 'Phường Liễu Giai'] },
    ],
  },
  {
    name: 'Thành phố Hồ Chí Minh',
    districts: [
      { name: 'Quận 1', wards: ['Phường Bến Nghé', 'Phường Bến Thành', 'Phường Cầu Kho', 'Phường Đa Kao', 'Phường Tân Định'] },
      { name: 'Quận 3', wards: ['Phường Võ Thị Sáu', 'Phường 1', 'Phường 2', 'Phường 3', 'Phường 4', 'Phường 5'] },
      { name: 'Quận Bình Thạnh', wards: ['Phường 1', 'Phường 2', 'Phường 3', 'Phường 14', 'Phường 25'] },
    ],
  },
  {
    name: 'Thành phố Đà Nẵng',
    districts: [
      { name: 'Quận Hải Châu', wards: ['Phường Hải Châu I', 'Phường Hải Châu II', 'Phường Thạch Thang', 'Phường Thanh Bình'] },
      { name: 'Quận Thanh Khê', wards: ['Phường Vĩnh Trung', 'Phường Tân Chính', 'Phường Tam Thuận', 'Phường Xuân Hà'] },
    ],
  },
];

// Xuất đồng bộ tương thích ngược (fallback ban đầu)
export const VIETNAM_PROVINCES: ProvinceItem[] = FALLBACK_PROVINCES;

// Lấy danh sách 63 Tỉnh/Thành phố từ Open API
export async function getProvinces(): Promise<ProvinceItem[]> {
  if (cachedProvinces && cachedProvinces.length > 0) {
    return cachedProvinces;
  }
  try {
    const res = await fetch('https://provinces.open-api.vn/api/p/');
    if (!res.ok) throw new Error('API response not ok');
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      cachedProvinces = data.map((p: any) => ({
        code: p.code,
        name: p.name,
        districts: [],
      }));
      return cachedProvinces;
    }
  } catch (err) {
    console.warn('[Location API] Không thể tải 63 tỉnh từ API, chuyển sang chế độ dự phòng:', err);
  }
  return FALLBACK_PROVINCES;
}

// Lấy danh sách Quận/Huyện của 1 Tỉnh từ Open API
export async function getDistricts(provinceCodeOrName: number | string): Promise<DistrictItem[]> {
  const cacheKey = provinceCodeOrName;
  if (districtCache.has(cacheKey)) {
    return districtCache.get(cacheKey)!;
  }

  let code: number | undefined;
  if (typeof provinceCodeOrName === 'number') {
    code = provinceCodeOrName;
  } else {
    const provs = cachedProvinces || await getProvinces();
    const cleanName = String(provinceCodeOrName).replace(/^(Thành phố|Tỉnh|TP\.)\s*/i, '').trim().toLowerCase();
    const found = provs.find(
      (p) => p.name.toLowerCase() === String(provinceCodeOrName).toLowerCase() ||
             p.name.toLowerCase().includes(cleanName)
    );
    code = found?.code;
  }

  if (code) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/p/${code}?depth=2`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.districts)) {
          const districts: DistrictItem[] = data.districts.map((d: any) => ({
            code: d.code,
            name: d.name,
            wards: [],
          }));
          districtCache.set(cacheKey, districts);
          return districts;
        }
      }
    } catch (err) {
      console.warn('[Location API] Lỗi tải quận/huyện:', err);
    }
  }

  // Fallback từ mảng có sẵn nếu API không phản hồi
  const fb = FALLBACK_PROVINCES.find(
    (p) => p.name.toLowerCase() === String(provinceCodeOrName).toLowerCase() ||
           String(provinceCodeOrName).toLowerCase().includes(p.name.replace(/^(Thành phố|Tỉnh|TP\.)\s*/i, '').toLowerCase())
  );
  return fb ? fb.districts : [];
}

// Lấy danh sách Phường/Xã của 1 Quận/Huyện từ Open API
export async function getWards(districtCodeOrName: number | string, provinceCodeOrName?: number | string): Promise<string[]> {
  const cacheKey = `${provinceCodeOrName || ''}_${districtCodeOrName}`;
  if (wardCache.has(cacheKey)) {
    return wardCache.get(cacheKey)!;
  }

  let code: number | undefined;
  if (typeof districtCodeOrName === 'number') {
    code = districtCodeOrName;
  } else if (provinceCodeOrName) {
    const districts = await getDistricts(provinceCodeOrName);
    const cleanDist = String(districtCodeOrName).replace(/^(Quận|Huyện|Thị xã|TP\.)\s*/i, '').trim().toLowerCase();
    const found = districts.find(
      (d) => d.name.toLowerCase() === String(districtCodeOrName).toLowerCase() ||
             d.name.toLowerCase().includes(cleanDist)
    );
    code = found?.code;
  }

  if (code) {
    try {
      const res = await fetch(`https://provinces.open-api.vn/api/d/${code}?depth=2`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.wards)) {
          const wards: string[] = data.wards.map((w: any) => w.name);
          wardCache.set(cacheKey, wards);
          return wards;
        }
      }
    } catch (err) {
      console.warn('[Location API] Lỗi tải phường/xã:', err);
    }
  }

  return [];
}
