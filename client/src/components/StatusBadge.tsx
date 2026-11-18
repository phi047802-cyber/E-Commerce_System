import React from 'react';

export type StatusBadgeType =
  | 'PENDING'
  | 'WAITING_COMPANION_RESPONSE'
  | 'HELD'
  | 'ACCEPTED'
  | 'IN_SESSION'
  | 'COMPLETED'
  | 'RELEASED'
  | 'DISPUTED'
  | 'FROZEN'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'ONLINE'
  | 'OFFLINE'
  | 'BUSY'
  | 'VERIFIED'
  | 'ACTIVE';

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const norm = (status || '').toUpperCase();

  let bgClass = 'bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A]';
  let dotClass = 'bg-[#6B6B6B]';
  let displayLabel = label || status;

  switch (norm) {
    // 1. Đang giữ / Chờ xử lý -> Cam #F59E0B
    case 'PENDING':
    case 'PENDING_ACCEPTANCE':
    case 'WAITING_COMPANION_RESPONSE':
    case 'HELD':
    case 'PROCESSING':
    case 'EVIDENCE_PENDING':
    case 'UNDER_REVIEW':
      bgClass = 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30';
      dotClass = 'bg-[#F59E0B]';
      if (!label) {
        if (norm === 'HELD') displayLabel = 'Đang giữ (Escrow)';
        else if (norm === 'WAITING_COMPANION_RESPONSE') displayLabel = 'Chờ phản hồi (180s)';
        else if (norm === 'EVIDENCE_PENDING') displayLabel = 'Chờ chứng cứ';
        else displayLabel = 'Đang chờ';
      }
      break;

    // 2. Đóng băng / Tranh chấp -> Đỏ #E11D2E
    case 'FROZEN':
    case 'DISPUTED':
    case 'DISPUTE_OPENED':
    case 'SUSPENDED':
    case 'FAILED':
      bgClass = 'bg-[#E11D2E]/10 text-[#E11D2E] border-[#E11D2E]/30';
      dotClass = 'bg-[#E11D2E]';
      if (!label) {
        if (norm === 'FROZEN') displayLabel = 'Đóng băng';
        else if (norm === 'DISPUTED') displayLabel = 'Khiếu nại';
        else if (norm === 'SUSPENDED') displayLabel = 'Đình chỉ';
        else displayLabel = 'Sự cố';
      }
      break;

    // 3. Đã giải phóng / Hoàn tất / Online -> Xanh lá #22C55E
    case 'COMPLETED':
    case 'RELEASED':
    case 'ACCEPTED':
    case 'ACTIVE':
    case 'RESOLVED':
    case 'ONLINE':
    case 'VERIFIED':
    case 'SUCCESS':
      bgClass = 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30';
      dotClass = 'bg-[#22C55E]';
      if (!label) {
        if (norm === 'RELEASED') displayLabel = 'Đã giải phóng';
        else if (norm === 'COMPLETED') displayLabel = 'Hoàn tất';
        else if (norm === 'ACCEPTED') displayLabel = 'Đã chấp nhận';
        else if (norm === 'ONLINE') displayLabel = 'Online';
        else if (norm === 'VERIFIED') displayLabel = 'Đã xác minh';
        else displayLabel = 'Thành công';
      }
      break;

    // 4. Đã hoàn / Hủy / Từ chối -> Xám #6B6B6B
    case 'REFUNDED':
    case 'CANCELLED':
    case 'REJECTED':
    case 'OFFLINE':
    case 'CLOSED':
    case 'ENDED':
    default:
      bgClass = 'bg-[#1C1C1C] text-[#A3A3A3] border-[#2A2A2A]';
      dotClass = 'bg-[#6B6B6B]';
      if (!label) {
        if (norm === 'REFUNDED') displayLabel = 'Đã hoàn tiền';
        else if (norm === 'CANCELLED') displayLabel = 'Đã hủy';
        else if (norm === 'REJECTED') displayLabel = 'Đã từ chối';
        else if (norm === 'OFFLINE') displayLabel = 'Offline';
        else if (norm === 'ENDED') displayLabel = 'Đã kết thúc';
        else displayLabel = norm;
      }
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${bgClass} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <span>{displayLabel}</span>
    </span>
  );
};
