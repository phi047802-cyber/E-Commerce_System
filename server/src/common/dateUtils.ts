// Tiện ích xử lý múi giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh) theo DEMO_POLICY.md (D08)

export function getVietnamDayKey(date: Date): string {
  // Lấy chuỗi YYYY-MM-DD theo múi giờ UTC+7
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Định dạng chuẩn YYYY-MM-DD
}

export function calculateSlotDurationHours(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}
