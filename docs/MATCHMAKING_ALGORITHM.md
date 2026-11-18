# THUẬT TOÁN GỢI Ý GHÉP CẶP COMPANION (MATCHMAKING ALGORITHM)

Tài liệu đặc tả thuật toán tính điểm độ phù hợp và cơ chế gợi ý ghép cặp đồng đội (Companion) theo yêu cầu **FR-002** và **UC02**.

---

## 1. Mục tiêu và Nguyên tắc Thiết kế

1. **Minh bạch và giải thích được (Explainability):** Mỗi gợi ý đều trả về điểm tổng hợp kèm bảng bóc tách thành phần (`match_breakdown`) và câu giải thích bằng tiếng Việt tự nhiên giúp người thuê hiểu rõ lý do đồng đội được đề xuất.
2. **Khả năng đáp ứng tiêu chí một phần (UC02 Luồng 2a):** Khi người dùng chỉ chọn một hoặc một vài tiêu chí (ví dụ chỉ chọn mức giá hoặc chỉ chọn tựa game), hệ thống vẫn tính toán điểm phù hợp dựa trên các tiêu chí đã cung cấp mà không bắt buộc điền đủ 5 tiêu chí.
3. **Xử lý trạng thái trống (UC02 Luồng 4a):** Khi bộ lọc quá chặt dẫn đến 0 kết quả phù hợp, hệ thống trả về thông điệp hướng dẫn nhẹ nhàng: *"Không tìm thấy đồng đội phù hợp với bộ lọc hiện tại. Vui lòng thử nới lỏng điều kiện tìm kiếm."*
4. **Xử lý lỗi nhà cung cấp bên thứ ba (UC02 Luồng ngoại lệ 2):** Khi dịch vụ kiểm tra rank bên ngoài không phản hồi, hệ thống dự phòng bằng cách hiển thị mức xếp hạng theo khai báo của Companion kèm ghi chú minh bạch.

---

## 2. Công thức Tính Điểm Tổng Hợp

Điểm phù hợp tổng thể ($\text{MatchScore}$) được tính trên thang điểm 100 theo công thức trọng số:

$$\text{MatchScore} = S_{\text{game}} + S_{\text{rank}} + S_{\text{price}} + S_{\text{slot}} + S_{\text{trust}}$$

Trong đó:

| Thành phần | Trọng số tối đa | Tiêu chí đánh giá | Quy tắc tính điểm |
| :--- | :---: | :--- | :--- |
| $S_{\text{game}}$ | **30 điểm** | Tương thích tựa game | - Khớp chính xác tựa game được chọn: **30 điểm**<br>- Người dùng không chỉ định tựa game (chọn "Tất cả"): **15 điểm**<br>- Khác tựa game được chọn: **0 điểm** |
| $S_{\text{rank}}$ | **25 điểm** | Bậc xếp hạng (Skill Tier) | - Khớp chính xác bậc rank mong muốn: **25 điểm**<br>- Không chỉ định rank: **15 điểm**<br>- Khác rank nhưng cùng tựa game: **5 điểm** |
| $S_{\text{price}}$ | **20 điểm** | Phù hợp ngân sách | - Nếu có mức giá mục tiêu $P_{\text{target}}$: $20 - \min\left(20, \frac{\|P_{\text{comp}} - P_{\text{target}}\|}{P_{\text{target}}} \times 20\right)$<br>- Nếu nằm trong khoảng $[P_{\min}, P_{\max}]$: **20 điểm**<br>- Vượt ngoài khoảng: **5 điểm**<br>- Không lọc giá: **15 điểm** |
| $S_{\text{slot}}$ | **15 điểm** | Lịch rảnh khả dụng | - Có slot rảnh (\`AVAILABLE\`) trong tương lai hoặc khung giờ yêu cầu: **15 điểm**<br>- Đang trực tuyến (\`ONLINE\`) nhưng chưa đăng ký slot: **10 điểm**<br>- Đang bận (\`BUSY\`): **5 điểm**<br>- Ngoại tuyến (\`OFFLINE\`) không có slot: **0 điểm** |
| $S_{\text{trust}}$ | **10 điểm** | Điểm tín nhiệm TrustScore | Điểm chuẩn hóa theo tỷ lệ: $\min\left(10, \text{round}\left(\frac{\text{TrustScore}}{100} \times 10\right)\right)$ |

---

## 3. Cấu trúc Dữ liệu Phản hồi

Mỗi đối tượng Companion trong kết quả trả về của API `GET /api/companions` chứa thông tin ghép cặp:

```json
{
  "profile_id": "prof-comp-01",
  "hourly_rate": 150000,
  "trust_score": 95.0,
  "is_kyc_verified": true,
  "kyc_badge": "VERIFIED",
  "rank_verification": {
    "verified": true,
    "provider_status": "VERIFIED_MOCK",
    "declared_tier_id": "LMHT-CHALLENGER",
    "actual_tier_id": "LMHT-CHALLENGER",
    "provider_name": "MockGameRankProvider (External Game API)",
    "is_simulated": true,
    "note": "Đã đối chiếu (mô phỏng)"
  },
  "match_score": 95,
  "match_breakdown": {
    "game": 30,
    "rank": 25,
    "price": 20,
    "slot": 10,
    "trust": 10,
    "explanation": "Khớp tựa game Liên Minh Huyền Thoại; Đúng bậc xếp hạng Thách Đấu; Mức giá 150.000đ/h phù hợp ngân sách; Có lịch rảnh khả dụng; Điểm tín nhiệm cao (95)"
  }
}
```

---

## 4. Xử lý Lỗi Nhà Cung cấp Đối chiếu Rank (GameRankProvider)

Hệ thống triển khai giao diện `GameRankProvider` với bản hiện thực `MockGameRankProvider`:

1. **Trạng thái bình thường (`VERIFIED_MOCK`):** Trả về `verified: true`, ghi nhận *"Đã đối chiếu (mô phỏng)"*.
2. **Trạng thái lỗi nhà cung cấp (`PROVIDER_UNAVAILABLE`):** Khi API nhà phát hành game (Riot, Valve, Blizzard...) gặp sự cố, timeout hoặc bảo trì, hệ thống:
   - Trả về `verified: false`.
   - Giữ nguyên hiển thị bậc rank do Companion tự khai báo để không làm gián đoạn trải nghiệm người dùng.
   - Kèm thông báo: *"Hệ thống đối chiếu rank bên thứ ba không phản hồi. Hiển thị mức xếp hạng theo khai báo của Companion."*
3. **Trạng thái sai lệch (`MISMATCH`):** Phát hiện rank khai báo không khớp với dữ liệu máy chủ game, hệ thống gắn cờ cảnh báo để CS Agent rà soát.
