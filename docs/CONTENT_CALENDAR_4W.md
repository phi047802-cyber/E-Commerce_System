# Lịch nội dung 4 tuần — TikTok / Reels / Threads / Facebook Group (G8)

> Áp dụng `NON_GAMER_GROWTH_STRATEGY.md` §3–4. Bắt đầu **thứ Hai 23/11/2026**. Nhãn **DEMO_POLICY**: nội dung mẫu cho đồ án; KPI G8 (≥ 40% phiên từ social) đo bằng bảng "Chuyển đổi theo kênh nguồn" trên dashboard Admin.
> Thay `<domain>` bằng domain thật trước khi đăng. Mỗi bài có **một link riêng** với `utm_campaign` không trùng để so sánh hiệu quả từng bài.

## Quy ước link

- Dạng: `https://<domain>/go/<đích>?utm_source=<kênh>&utm_medium=<định dạng>&utm_campaign=g8-w<tuần>-<thứ>-<kênh>`.
- `utm_source`: `tiktok`, `facebook`, `instagram`, `threads` (4 kênh tính vào KPI social G8). `utm_medium`: `video`, `reels`, `post`, `live`.
- Đích: `/go/discover?c=social|game` (tab Khám phá), `/go/companion/prof-comp-04` (Quang Huy — Xem phim cùng), `/go/companion/prof-comp-03` (Lan Chi — Tâm sự & Lắng nghe). Link mở App nếu đã cài, nếu không mở trang landing (`growth.router.ts`).
- Server làm sạch UTM (chữ thường, chỉ `a-z0-9_.-`), mỗi IP/ngày/đường dẫn ghi 1 phiên vào `site_visits`; người dùng đăng ký sau đó giữ kênh first-touch (D47).

## Tổng quan 4 tuần

| Tuần | Ngày | Chủ đề | Mục tiêu |
|:-:|---|---|---|
| 1 | 23/11–29/11 | Không cần mê game | Nhận biết: INSTASQUAD không chỉ dành cho game thủ |
| 2 | 30/11–06/12 | Tiền của bạn an toàn | Niềm tin: ký quỹ Escrow, hoàn tiền, xử lý khiếu nại |
| 3 | 07/12–13/12 | Xem phim & nghe nhạc cùng | Dùng thử dịch vụ Non-gamer: xem phim, nghe nhạc, tâm sự |
| 4 | 14/12–20/12 | Party & cộng đồng | Giữ chân: party game, đánh giá, quay lại |

## Tuần 1 — Không cần mê game (23/11–29/11)

| Ngày | Kênh | Định dạng | Nội dung | Link (CTA) |
|---|---|---|---|---|
| T2 23/11 | TikTok | Video dọc 15–45s | POV: tối thứ Hai có người cùng xem phim | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-t2-tiktok` |
| T2 23/11 | Facebook Reels | Reels 30–60s / carousel | 3 lý do bạn không cần mê game | `/go/discover?c=social&utm_source=facebook&utm_medium=reels&utm_campaign=g8-w1-t2-facebook` |
| T2 23/11 | Threads | Bài ngắn / poll | Phim gần nhất làm bạn khóc là phim gì? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-t2-threads` |
| T3 24/11 | TikTok | Video dọc 15–45s | 3 lý do bạn không cần mê game để dùng INSTASQUAD | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-t3-tiktok` |
| T3 24/11 | Threads | Bài ngắn / poll | Nếu không chơi game, tối nay bạn muốn làm gì? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-t3-threads` |
| T4 25/11 | TikTok | Video dọc 15–45s | Mẹo leo rank 30 giây cùng Companion | `/go/discover?c=game&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-t4-tiktok` |
| T4 25/11 | Instagram Reels | Reels 30–60s / carousel | Carousel: 5 dịch vụ ngoài game | `/go/discover?c=social&utm_source=instagram&utm_medium=reels&utm_campaign=g8-w1-t4-instagram` |
| T4 25/11 | Threads | Bài ngắn / poll | Poll: xem phim / nghe nhạc / tâm sự / party? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-t4-threads` |
| T5 26/11 | TikTok | Video dọc 15–45s | Một buổi tối với Companion: tâm sự sau giờ làm | `/go/companion/prof-comp-03?utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-t5-tiktok` |
| T5 26/11 | Threads | Bài ngắn / poll | Bạn hay rảnh lúc mấy giờ? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-t5-threads` |
| T6 27/11 | TikTok | Video dọc 15–45s | Hỏi nhanh: bạn muốn làm gì tối nay? | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-t6-tiktok` |
| T6 27/11 | Facebook Reels | Reels 30–60s / carousel | Highlight Companion tuần: Lan Chi | `/go/companion/prof-comp-03?utm_source=facebook&utm_medium=reels&utm_campaign=g8-w1-t6-facebook` |
| T6 27/11 | Threads | Bài ngắn / poll | Một điều nhỏ làm bạn vui hôm nay? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-t6-threads` |
| T7 28/11 | TikTok | Video dọc 15–45s | Hậu trường: Companion chuẩn bị buổi xem phim | `/go/companion/prof-comp-04?utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-t7-tiktok` |
| T7 28/11 | Instagram Reels | Reels 30–60s / carousel | Một buổi tối xem phim cùng | `/go/companion/prof-comp-04?utm_source=instagram&utm_medium=reels&utm_campaign=g8-w1-t7-instagram` |
| T7 28/11 | Threads | Bài ngắn / poll | Cuối tuần này bạn định làm gì? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-t7-threads` |
| T7 28/11 | Facebook Group | Livestream 60 phút | Livestream: Hỏi đáp an toàn & hoàn tiền cùng CS | `/go/discover?c=social&utm_source=facebook&utm_medium=live&utm_campaign=g8-w1-t7-facebook-live` |
| CN 29/11 | TikTok | Video dọc 15–45s | Tổng kết tuần: dịch vụ được chọn nhiều nhất | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w1-cn-tiktok` |
| CN 29/11 | Threads | Bài ngắn / poll | Gợi ý dịch vụ mới cho INSTASQUAD? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w1-cn-threads` |

## Tuần 2 — Tiền của bạn an toàn (30/11–06/12)

| Ngày | Kênh | Định dạng | Nội dung | Link (CTA) |
|---|---|---|---|---|
| T2 30/11 | TikTok | Video dọc 15–45s | Tiền đi đâu khi bạn đặt lịch? (hoạt hình Escrow) | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-t2-tiktok` |
| T2 30/11 | Facebook Reels | Reels 30–60s / carousel | Escrow giải thích trong 30 giây | `/go/discover?c=social&utm_source=facebook&utm_medium=reels&utm_campaign=g8-w2-t2-facebook` |
| T2 30/11 | Threads | Bài ngắn / poll | Bạn từng mất tiền vì "bùng kèo" chưa? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-t2-threads` |
| T3 01/12 | TikTok | Video dọc 15–45s | Companion không đến? Bạn được hoàn 100% | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-t3-tiktok` |
| T3 01/12 | Threads | Bài ngắn / poll | Điều gì khiến bạn tin một nền tảng? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-t3-threads` |
| T4 02/12 | TikTok | Video dọc 15–45s | Hủy trước 30 phút: hoàn đủ — giải thích 20 giây | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-t4-tiktok` |
| T4 02/12 | Instagram Reels | Reels 30–60s / carousel | Carousel: hành trình 8 bước an toàn | `/go/discover?c=social&utm_source=instagram&utm_medium=reels&utm_campaign=g8-w2-t4-instagram` |
| T4 02/12 | Threads | Bài ngắn / poll | Poll: bạn lo nhất điều gì khi thuê người đồng hành? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-t4-threads` |
| T5 03/12 | TikTok | Video dọc 15–45s | 15 phút nghiệm thu là gì? | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-t5-tiktok` |
| T5 03/12 | Threads | Bài ngắn / poll | Hỏi CS bất cứ điều gì về hoàn tiền | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-t5-threads` |
| T6 04/12 | TikTok | Video dọc 15–45s | eKYC: vì sao Companion phải xác minh | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-t6-tiktok` |
| T6 04/12 | Facebook Reels | Reels 30–60s / carousel | Câu chuyện người dùng: được hoàn tiền | `/go/discover?c=social&utm_source=facebook&utm_medium=reels&utm_campaign=g8-w2-t6-facebook` |
| T6 04/12 | Threads | Bài ngắn / poll | Bạn có đọc điều khoản không? (thật lòng) | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-t6-threads` |
| T7 05/12 | TikTok | Video dọc 15–45s | Báo sự cố trong 2 chạm | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-t7-tiktok` |
| T7 05/12 | Instagram Reels | Reels 30–60s / carousel | Huy hiệu an toàn trên thẻ Companion | `/go/discover?c=social&utm_source=instagram&utm_medium=reels&utm_campaign=g8-w2-t7-instagram` |
| T7 05/12 | Threads | Bài ngắn / poll | Chia sẻ trải nghiệm đặt lịch đầu tiên | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-t7-threads` |
| CN 06/12 | TikTok | Video dọc 15–45s | Hỏi đáp an toàn: trả lời bình luận | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w2-cn-tiktok` |
| CN 06/12 | Threads | Bài ngắn / poll | Tổng kết tuần: câu hỏi an toàn hay nhất | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w2-cn-threads` |

## Tuần 3 — Xem phim & nghe nhạc cùng (07/12–13/12)

| Ngày | Kênh | Định dạng | Nội dung | Link (CTA) |
|---|---|---|---|---|
| T2 07/12 | TikTok | Video dọc 15–45s | Xem phim cùng: chọn phim tối thứ Hai | `/go/companion/prof-comp-04?utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-t2-tiktok` |
| T2 07/12 | Facebook Reels | Reels 30–60s / carousel | Xem phim cùng Quang Huy | `/go/companion/prof-comp-04?utm_source=facebook&utm_medium=reels&utm_campaign=g8-w3-t2-facebook` |
| T2 07/12 | Threads | Bài ngắn / poll | Bài hát bạn nghe khi buồn? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-t2-threads` |
| T3 08/12 | TikTok | Video dọc 15–45s | Nghe nhạc cùng: playlist cho ngày mưa | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-t3-tiktok` |
| T3 08/12 | Threads | Bài ngắn / poll | Phim bạn muốn xem cùng ai đó? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-t3-threads` |
| T4 09/12 | TikTok | Video dọc 15–45s | Tâm sự 30 phút sau deadline | `/go/companion/prof-comp-03?utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-t4-tiktok` |
| T4 09/12 | Instagram Reels | Reels 30–60s / carousel | Playlist nghe nhạc cùng | `/go/discover?c=social&utm_source=instagram&utm_medium=reels&utm_campaign=g8-w3-t4-instagram` |
| T4 09/12 | Threads | Bài ngắn / poll | Poll: phim hành động hay tình cảm? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-t4-threads` |
| T5 10/12 | TikTok | Video dọc 15–45s | Đố vui: phim nào khiến bạn khóc? | `/go/companion/prof-comp-04?utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-t5-tiktok` |
| T5 10/12 | Threads | Bài ngắn / poll | Kể về một lần được lắng nghe | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-t5-threads` |
| T6 11/12 | TikTok | Video dọc 15–45s | Thử dịch vụ mới cuối tuần | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-t6-tiktok` |
| T6 11/12 | Facebook Reels | Reels 30–60s / carousel | Tâm sự & lắng nghe: bạn không một mình | `/go/companion/prof-comp-03?utm_source=facebook&utm_medium=reels&utm_campaign=g8-w3-t6-facebook` |
| T6 11/12 | Threads | Bài ngắn / poll | Playlist cho đêm thứ Sáu? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-t6-threads` |
| T7 12/12 | TikTok | Video dọc 15–45s | Review thật của người dùng (đã đồng ý) | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-t7-tiktok` |
| T7 12/12 | Instagram Reels | Reels 30–60s / carousel | Carousel: chọn dịch vụ theo tâm trạng | `/go/discover?c=social&utm_source=instagram&utm_medium=reels&utm_campaign=g8-w3-t7-instagram` |
| T7 12/12 | Threads | Bài ngắn / poll | Bạn thử dịch vụ nào tuần này? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-t7-threads` |
| T7 12/12 | Facebook Group | Livestream 60 phút | Livestream: Party game cùng Companion | `/go/discover?c=social&utm_source=facebook&utm_medium=live&utm_campaign=g8-w3-t7-facebook-live` |
| CN 13/12 | TikTok | Video dọc 15–45s | Chủ nhật chill: nghe nhạc cùng | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w3-cn-tiktok` |
| CN 13/12 | Threads | Bài ngắn / poll | Gợi ý chủ đề tâm sự tuần sau | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w3-cn-threads` |

## Tuần 4 — Party & cộng đồng (14/12–20/12)

| Ngày | Kênh | Định dạng | Nội dung | Link (CTA) |
|---|---|---|---|---|
| T2 14/12 | TikTok | Video dọc 15–45s | Party game nhẹ cho nhóm 4 người | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-t2-tiktok` |
| T2 14/12 | Facebook Reels | Reels 30–60s / carousel | Party game nhẹ: luật chơi | `/go/discover?c=social&utm_source=facebook&utm_medium=reels&utm_campaign=g8-w4-t2-facebook` |
| T2 14/12 | Threads | Bài ngắn / poll | Party game yêu thích của bạn? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-t2-threads` |
| T3 15/12 | TikTok | Video dọc 15–45s | Companion của tuần | `/go/companion/prof-comp-03?utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-t3-tiktok` |
| T3 15/12 | Threads | Bài ngắn / poll | Bạn sẽ giới thiệu INSTASQUAD cho ai? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-t3-threads` |
| T4 16/12 | TikTok | Video dọc 15–45s | Leo rank cùng bạn mới quen | `/go/discover?c=game&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-t4-tiktok` |
| T4 16/12 | Instagram Reels | Reels 30–60s / carousel | Companion của tháng | `/go/companion/prof-comp-03?utm_source=instagram&utm_medium=reels&utm_campaign=g8-w4-t4-instagram` |
| T4 16/12 | Threads | Bài ngắn / poll | Poll: livestream tối thứ Bảy mấy giờ? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-t4-threads` |
| T5 17/12 | TikTok | Video dọc 15–45s | Bạn quay lại vì điều gì? (kể chuyện) | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-t5-tiktok` |
| T5 17/12 | Threads | Bài ngắn / poll | Điều bạn muốn cải thiện ở App? | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-t5-threads` |
| T6 18/12 | TikTok | Video dọc 15–45s | Thử thách đánh giá 5 sao | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-t6-tiktok` |
| T6 18/12 | Facebook Reels | Reels 30–60s / carousel | Đánh giá thật từ cộng đồng | `/go/discover?c=social&utm_source=facebook&utm_medium=reels&utm_campaign=g8-w4-t6-facebook` |
| T6 18/12 | Threads | Bài ngắn / poll | Kể về Companion bạn nhớ nhất | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-t6-threads` |
| T7 19/12 | TikTok | Video dọc 15–45s | Livestream party tối nay — đặt chỗ | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-t7-tiktok` |
| T7 19/12 | Instagram Reels | Reels 30–60s / carousel | Hẹn bạn tháng sau | `/go/discover?c=social&utm_source=instagram&utm_medium=reels&utm_campaign=g8-w4-t7-instagram` |
| T7 19/12 | Threads | Bài ngắn / poll | Livestream tối nay — đặt câu hỏi trước | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-t7-threads` |
| CN 20/12 | TikTok | Video dọc 15–45s | Cảm ơn tháng đầu tiên | `/go/discover?c=social&utm_source=tiktok&utm_medium=video&utm_campaign=g8-w4-cn-tiktok` |
| CN 20/12 | Threads | Bài ngắn / poll | Cảm ơn bạn đã đồng hành tháng này | `/go/discover?c=social&utm_source=threads&utm_medium=post&utm_campaign=g8-w4-cn-threads` |

## Đo hiệu quả từng bài

- **Theo kênh** (KPI G8): dashboard Admin → "Chuyển đổi theo kênh nguồn" (phiên, tỉ trọng social, đăng ký, đơn ký quỹ, conversion).
- **Theo bài** (`utm_campaign`): truy vấn SQL Server —

```sql
SELECT utm_campaign, utm_source, COUNT(*) AS phien
FROM dbo.site_visits
WHERE utm_campaign LIKE 'g8-%'
GROUP BY utm_campaign, utm_source
ORDER BY phien DESC;
```

- Đăng ký theo bài: `SELECT signup_utm_campaign, COUNT(*) FROM dbo.users WHERE signup_utm_campaign LIKE 'g8-%' GROUP BY signup_utm_campaign;`
- Rà soát cuối mỗi tuần: giữ lại 3 chủ đề có nhiều phiên/đăng ký nhất cho tuần sau; bỏ chủ đề có tỉ lệ đăng ký thấp nhất.

_Tổng: 74 bài, 74 `utm_campaign` khác nhau._
