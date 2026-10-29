# INSTASQUAD — Quy tắc tài chính, Sổ cái & Kiểm thử bảo toàn tiền (Financial Rules & Ledger Invariants)

Tài liệu này xác lập các nguyên lý kế toán kép (Double-Entry Ledger), công thức toán học số nguyên VND và các kịch bản kiểm thử bảo toàn dòng tiền cho hệ thống **INSTASQUAD**.

---

## 1. Nguyên tắc cốt lõi về dữ liệu tài chính

1. **Đơn vị tiền tệ duy nhất**: Toàn bộ số tiền được biểu diễn bằng **số nguyên VND** (`BigInt` trong code TypeScript, `INTEGER` trong SQLite, `BIGINT` trong PostgreSQL). Tuyệt đối không dùng số thực `Float` hay `Double` để tránh lỗi trôi dấu phẩy động (Floating-point error).
2. **Nguyên tắc Sổ cái bất biến (Immutable Double-Entry Ledger)**:
   - Nghiêm cấm mọi câu lệnh `UPDATE wallet SET available_balance = ...` một cách trực tiếp.
   - Số dư ví chỉ được phép thay đổi thông qua việc ghi nhận một giao dịch `LEDGER_TRANSACTION` bao gồm ít nhất 2 dòng bút toán đối ứng `LEDGER_ENTRY` (`DEBIT` và `CREDIT`).
   - Mỗi `LEDGER_ENTRY` bắt buộc ghi kèm `balance_after` để phục vụ đối soát và kiểm toán lịch sử.
3. **Phương trình bảo toàn tổng tiền (Total System Money Conservation Invariant)**:
   Tại mọi thời điểm $t$, tổng tiền trong toàn bộ hệ thống phải thỏa mãn:
   $$\sum \text{AvailableBalances}_t + \sum \text{EscrowBalances}_t + \sum \text{PlatformRevenue}_t + \sum \text{WithdrawnAmount}_t \equiv \sum \text{TotalDepositedAmount}_t$$
   Không có tiền tự nhiên sinh ra hoặc mất đi mà không có nguồn gốc từ giao dịch nạp tiền (`Payment`).

---

## 2. Công thức phân chia & Quy tắc làm tròn số nguyên (Zero-Cent Rounding)

### 2.1. Phân chia chuẩn 88/12 khi đơn hoàn tất
Cho đơn hàng có tổng phí `total_fee` (VND):
- **Phí hoa hồng nền tảng (12%)**:
  $$\text{platform\_fee} = \lfloor \text{total\_fee} \times 0.12 \rfloor$$
- **Thu nhập của Companion (88%)**:
  $$\text{companion\_fee} = \text{total\_fee} - \text{platform\_fee}$$
- **Kiểm chứng bảo toàn**:
  $$\text{platform\_fee} + \text{companion\_fee} \equiv \text{total\_fee} \quad (\forall \text{total\_fee} \in \mathbb{Z}^+)$$

### 2.2. Phân chia khi Renter hủy đơn từ 10 đến 29 phút trước giờ hẹn
- **Số tiền hoàn lại cho Renter (70%)**:
  $$\text{renter\_refund} = \lfloor \text{total\_fee} \times 0.70 \rfloor$$
- **Số tiền bồi thường thời gian cho Companion (30%)**:
  $$\text{companion\_compensation} = \text{total\_fee} - \text{renter\_refund}$$
- **Kiểm chứng bảo toàn**:
  $$\text{renter\_refund} + \text{companion\_compensation} \equiv \text{total\_fee}$$

### 2.3. Phân chia khi Renter hủy dưới 10 phút (`[DEMO_POLICY]`)
- **Khoản phạt của Renter**: $100\%$ tiền ký quỹ (`total_fee`).
- **Phần chia cho Companion (88%)**:
  $$\text{companion\_penalty\_share} = \text{total\_fee} - \lfloor \text{total\_fee} \times 0.12 \rfloor$$
- **Phần thu của Nền tảng (12%)**:
  $$\text{platform\_penalty\_share} = \lfloor \text{total\_fee} \times 0.12 \rfloor$$
- **Kiểm chứng bảo toàn**:
  $$\text{companion\_penalty\_share} + \text{platform\_penalty\_share} \equiv \text{total\_fee}$$

---

## 3. Các ví dụ số học thực tế bằng số nguyên VND

Giả sử hệ thống bắt đầu với trạng thái ban đầu:
- Renter có `available_balance = 0 VND`, `escrow_balance = 0 VND`.
- Companion có `available_balance = 0 VND`, `escrow_balance = 0 VND`.
- Doanh thu sàn `PLATFORM_REVENUE = 0 VND`.

---

### Ví dụ 1: Nạp tiền (Top-up qua Simulator)
- **Kịch bản**: Renter nạp 500.000 VND qua cổng thanh toán mô phỏng VNPay.
- **Thao tác**:
  - Giao dịch thanh toán `PAYMENT` thành công.
  - Tạo `LEDGER_TRANSACTION` loại `TOPUP`.
  - Bút toán `LEDGER_ENTRY`:
    - Dòng 1: `CREDIT` vào `Renter Wallet` (loại `AVAILABLE`): số tiền `+500.000 VND`, `balance_after = 500.000 VND`.
    - Dòng 2: `DEBIT` vào tài khoản trung gian hệ thống `SYSTEM_PAYMENT_CLEARING`: số tiền `-500.000 VND`.
- **Trạng thái sau giao dịch**:
  - Renter: `available = 500.000 VND`, `escrow = 0 VND`.
  - Tổng tiền người dùng: **500.000 VND** = Tiền nạp vào hệ thống.

---

### Ví dụ 2: Ký quỹ đặt lịch (Booking Escrow Hold)
- **Kịch bản**: Renter đặt lịch thuê Companion 2 giờ với đơn giá 100.000 VND/giờ $\rightarrow$ Tổng phí `total_fee_snapshot = 200.000 VND`.
- **Thao tác**:
  - Kiểm tra `available_balance (500.000 VND) >= 200.000 VND` $\rightarrow$ Hợp lệ.
  - Tạo `LEDGER_TRANSACTION` loại `ESCROW_HOLD`.
  - Bút toán `LEDGER_ENTRY`:
    - Dòng 1: `DEBIT` từ `Renter Wallet (AVAILABLE)`: số tiền `200.000 VND`, `balance_after = 300.000 VND`.
    - Dòng 2: `CREDIT` vào `Renter Wallet (ESCROW)`: số tiền `200.000 VND`, `balance_after = 200.000 VND`.
  - Tạo bản ghi `ESCROW` trạng thái `HELD` với số tiền `200.000 VND`.
- **Trạng thái sau giao dịch**:
  - Renter: `available = 300.000 VND`, `escrow = 200.000 VND`.
  - Tổng tài sản Renter: `300.000 + 200.000 = 500.000 VND` *(Bảo toàn tuyệt đối)*.

---

### Ví dụ 3: Nghiệm thu hoàn tất & Giải ngân 88/12 (Fulfillment Settlement)
- **Kịch bản**: Phiên chơi kết thúc tốt đẹp, Renter bấm "Hoàn tất".
- **Tính toán tiền**:
  - `total_fee = 200.000 VND`.
  - `platform_fee = floor(200.000 * 0.12) = 24.000 VND`.
  - `companion_fee = 200.000 - 24.000 = 176.000 VND`.
- **Thao tác Sổ cái**:
  - Tạo `LEDGER_TRANSACTION` loại `ESCROW_RELEASE`.
  - Bút toán `LEDGER_ENTRY`:
    - Dòng 1: `DEBIT` từ `Renter Wallet (ESCROW)`: `200.000 VND`, `balance_after = 0 VND`.
    - Dòng 2: `CREDIT` vào `Companion Wallet (AVAILABLE)`: `176.000 VND`, `balance_after = 176.000 VND`.
    - Dòng 3: `CREDIT` vào `PLATFORM_REVENUE`: `24.000 VND`, `balance_after = 24.000 VND`.
  - `ESCROW` chuyển sang `RELEASED`.
- **Trạng thái sau giao dịch**:
  - Renter: `available = 300.000 VND`, `escrow = 0 VND`.
  - Companion: `available = 176.000 VND`, `escrow = 0 VND`.
  - Nền tảng: `revenue = 24.000 VND`.
  - **Tổng hệ thống**: `300.000 + 176.000 + 24.000 = 500.000 VND` *(Bảo toàn 100%)*.

---

### Ví dụ 4: Kiểm thử làm tròn với số lẻ không chia hết (Odd Number Zero-Cent Test)
- **Kịch bản**: Tổng phí dịch vụ lẻ `total_fee = 155.555 VND`.
- **Tính toán**:
  - `platform_fee = floor(155.555 * 0.12) = floor(18.666,6) = 18.666 VND`.
  - `companion_fee = 155.555 - 18.666 = 136.889 VND`.
- **Kiểm tra**:
  - `18.666 + 136.889 = 155.555 VND` $\equiv \text{total\_fee}$.
  - Sai số phân kỳ: **0 VND**.

---

### Ví dụ 5: Companion từ chối hoặc Quá hạn 180s (Refund 100%)
- **Kịch bản**: Renter đã ký quỹ 200.000 VND, nhưng Companion không trả lời trong 180s.
- **Thao tác Sổ cái**:
  - Tạo `LEDGER_TRANSACTION` loại `ESCROW_REFUND`.
  - Bút toán `LEDGER_ENTRY`:
    - Dòng 1: `DEBIT` từ `Renter Wallet (ESCROW)`: `200.000 VND`, `balance_after = 0 VND`.
    - Dòng 2: `CREDIT` vào `Renter Wallet (AVAILABLE)`: `200.000 VND`, `balance_after = 500.000 VND`.
  - `ESCROW` chuyển sang `REFUNDED`. Companion bị trừ 3 điểm TrustScore.
- **Trạng thái sau giao dịch**:
  - Renter: `available = 500.000 VND`, `escrow = 0 VND`.
  - Không ai mất tiền, không phát sinh lệch số dư.

---

### Ví dụ 6: Hủy trước giờ hẹn từ 10 đến 29 phút (Phân chia 70/30)
- **Kịch bản**: Đang ký quỹ 200.000 VND. Renter bấm hủy trước giờ bắt đầu 15 phút.
- **Tính toán tiền**:
  - `renter_refund = floor(200.000 * 0.70) = 140.000 VND`.
  - `companion_comp = 200.000 - 140.000 = 60.000 VND`.
- **Thao tác Sổ cái**:
  - Bút toán `LEDGER_ENTRY`:
    - Dòng 1: `DEBIT` từ `Renter Wallet (ESCROW)`: `200.000 VND`, `balance_after = 0 VND`.
    - Dòng 2: `CREDIT` vào `Renter Wallet (AVAILABLE)`: `140.000 VND`, `balance_after = 440.000 VND`.
    - Dòng 3: `CREDIT` vào `Companion Wallet (AVAILABLE)`: `60.000 VND`, `balance_after = 60.000 VND`.
- **Kiểm chứng**:
  - Renter (440.000) + Companion (60.000) = **500.000 VND** *(Bảo toàn 100%)*.

---

### Ví dụ 7: Khiếu nại thành công — Companion lỗi $\ge 80\%$ (Hoàn 100% + Phạt 20%)
- **Kịch bản**: Đơn hàng 200.000 VND. Renter đã ký quỹ 200.000 VND (hiện đang `FROZEN`). Companion hiện đang có `available_balance = 100.000 VND`. CS phán quyết Companion lỗi 100%.
- **Tính toán tiền**:
  - Renter được hoàn 100% tiền ký quỹ: `200.000 VND`.
  - Khoản phạt thêm 20% giá trị đơn: `200.000 * 0.20 = 40.000 VND`.
  - Vì số dư Companion (`100.000 VND`) $\ge 40.000$ VND $\rightarrow$ trừ trực tiếp 40.000 VND chuyển sang ví Renter.
- **Thao tác Sổ cái**:
  - Giao dịch 1 (Hoàn ký quỹ):
    - `DEBIT` Renter Escrow: `200.000 VND`, `balance_after = 0 VND`.
    - `CREDIT` Renter Available: `200.000 VND`, `balance_after = 500.000 VND`.
  - Giao dịch 2 (Thu phạt bồi thường):
    - `DEBIT` Companion Available: `40.000 VND`, `balance_after = 60.000 VND`.
    - `CREDIT` Renter Available: `40.000 VND`, `balance_after = 540.000 VND`.
- **Kiểm chứng bảo toàn**:
  - Tổng tài sản ban đầu: Renter (300k avail + 200k escrow = 500k) + Companion (100k) = **600.000 VND**.
  - Tổng tài sản sau phán quyết: Renter (540k) + Companion (60k) = **600.000 VND**.

---

### Ví dụ 8: Vòng đời rút tiền (Withdrawal Reserve & Reject)
- **Kịch bản**: Companion có `available_balance = 176.000 VND`. Tạo yêu cầu rút 100.000 VND.
- **Bước 1 — Khóa số dư (Reserve)**:
  - Tạo `WITHDRAW_REQUEST` số tiền 100.000 VND (trạng thái `PENDING`).
  - Ghi Ledger: Trừ `available_balance` của Companion `100.000 VND`, số dư khả dụng mới là `76.000 VND`. Số tiền 100.000 VND được ghi nhận vào trạng thái tạm giữ rút tiền `WITHDRAW_RESERVED`.
- **Bước 2a — Admin từ chối duyệt (Reject)**:
  - Admin phát hiện số tài khoản ngân hàng sai, bấm "Từ chối" (`REJECTED`).
  - Hệ thống tự động kích hoạt transaction hoàn tiền:
    - `CREDIT` vào `Companion Wallet (AVAILABLE)`: `100.000 VND`, `balance_after = 176.000 VND`.
  - Tiền trở lại ví khả dụng của Companion nguyên vẹn.
- **Bước 2b — Admin phê duyệt chuyển khoản thành công (Complete)**:
  - Admin/Auditor xác nhận chuyển khoản ngân hàng thành công (`COMPLETED`).
  - Số tiền 100.000 VND rời khỏi hệ sinh thái nền tảng, ghi nhận vào `TOTAL_WITHDRAWN`.
