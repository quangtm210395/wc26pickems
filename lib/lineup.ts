// Xếp đội hình ra sân theo sơ đồ (formation) + chấm điểm — logic thuần, test độc lập.

export type PitchPos = { x: number; y: number };

const DEFAULT_FORMATION = [4, 4, 2];

// Toạ độ chuẩn hoá 0..100. x = ngang (0 trái → 100 phải), y = sâu (0 = khung nhà → 100 = khung đối thủ).
const GK_Y = 8;
const FIRST_LINE_Y = 26; // hàng phòng ngự
const LAST_LINE_Y = 92; // hàng cao nhất (tiền đạo)

/**
 * Phân tích sơ đồ "4-3-3" → [4,3,3] (các tuyến NGOÀI sân, không tính thủ môn).
 * Hợp lệ khi mọi phần là số dương và tổng = 10 (10 cầu thủ + 1 thủ môn = 11). Sai → null.
 */
export function parseFormation(formation: string): number[] | null {
  const parts = formation.trim().split("-");
  if (parts.length < 2) return null;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n <= 0)) return null;
  const sum = nums.reduce((a, b) => a + b, 0);
  return sum === 10 ? nums : null;
}

/**
 * Toạ độ 11 cầu thủ đá chính theo sơ đồ. index 0 = thủ môn, sau đó từng tuyến từ thấp → cao.
 * Sơ đồ không hợp lệ → dùng mặc định 4-4-2 (luôn trả đủ 11 để vẽ).
 */
export function playerPositions(formation: string): PitchPos[] {
  const lines = parseFormation(formation) ?? DEFAULT_FORMATION;
  const positions: PitchPos[] = [{ x: 50, y: GK_Y }];

  const L = lines.length;
  lines.forEach((count, i) => {
    const y =
      L === 1 ? (FIRST_LINE_Y + LAST_LINE_Y) / 2 : FIRST_LINE_Y + ((LAST_LINE_Y - FIRST_LINE_Y) * i) / (L - 1);
    for (let j = 0; j < count; j++) {
      positions.push({ x: (100 * (j + 1)) / (count + 1), y });
    }
  });

  return positions;
}

/** Màu điểm kiểu SofaScore: ≥8 xuất sắc, ≥7 tốt, ≥6 trung bình, <6 kém. */
export function ratingColor(rating: number): string {
  if (rating >= 8) return "#16a34a"; // xanh đậm
  if (rating >= 7) return "#65a30d"; // xanh lá
  if (rating >= 6) return "#ca8a04"; // vàng
  return "#dc2626"; // đỏ
}
