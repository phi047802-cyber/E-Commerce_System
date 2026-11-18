# INSTASQUAD — HỒ SƠ QUYẾT ĐỊNH & THẨM TRA LỖ HỔNG BẢO MẬT TÀI CHÍNH (STAGE 0.6)

Tài liệu này là hồ sơ thẩm tra kỹ thuật toàn diện do Tech Lead lập, nhằm hoàn tất cổng kiểm định Giai đoạn 0. Báo cáo tập trung xác minh bằng mã nguồn lỗ hổng điều khiển thời gian `simulated_now`, phân tích ma trận quyền hạn (Authentication vs Authorization) trên các endpoint tài chính, đối chiếu Git baseline, và lập kế hoạch khắc phục tối thiểu phân loại theo P0/P1/P2.

**Cam kết kỷ luật nghiêm ngặt:**
- Chỉ đọc và phân tích mã nguồn, test, cấu hình và Git.
- Không sửa code, schema, migration, test, dependency, cấu hình hoặc `.env`.
- Không gọi API, không tạo dữ liệu, không ghi database, không thực hiện khai thác runtime.
- Phân định minh bạch: **ĐÃ CHẠY THỰC TẾ / ĐÃ ĐỌC TEST / SUY RA TỪ CODE / CHƯA XÁC MINH**.

---

## PHẦN A: XÁC MINH TOÀN DIỆN LỖ HỔNG `simulated_now`

Truy vết toàn bộ luồng xử lý từ Route $\rightarrow$ Middleware $\rightarrow$ Controller $\rightarrow$ Service $\rightarrow$ Sổ cái kép:

### 1. Trả lời chi tiết 8 câu hỏi kiểm toán mã nguồn

1. **Request body được xác thực bằng schema nào?**  
   - **KẾT LUẬN TỪ CODE:** **HOÀN TOÀN KHÔNG CÓ SCHEMA XÁC THỰC BODY.**  
   - **Bằng chứng:** Tại [`server/src/modules/booking/booking.router.ts` L40](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.router.ts#L40), route được định nghĩa trần:  
     `bookingRouter.post('/:id/auto-accept', asyncHandler(handleAutoAccept));`  
     Trong khi các route khác đều có middleware `validateBody(...)` (L31, L36, L38, L41), route `/:id/auto-accept` đã bỏ sót middleware kiểm thực body. Mặc dù trong [`session.dto.ts` L18–20](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/session/session.dto.ts#L18-L20) có khai báo `autoAcceptSchema`, nhưng schema này **chưa từng được gắn vào router**.

2. **`simulated_now` có được phép gửi trong môi trường Production không?**  
   - **KẾT LUẬN TỪ CODE:** **CÓ, ĐƯỢC PHÉP GỬI TRONG MỌI MÔI TRƯỜNG KỂ CẢ PRODUCTION.**  
   - **Bằng chứng:** Tại [`server/src/modules/booking/booking.controller.ts` L117](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.controller.ts#L117):  
     `const simulatedNow = req.body?.simulated_now ? new Date(req.body.simulated_now) : undefined;`  
     Controller bóc tách trực tiếp từ `req.body` mà không có bất kỳ dòng kiểm tra `if (env.NODE_ENV === 'production')` nào.

3. **Có kiểm tra role ADMIN, môi trường TEST hoặc feature flag trước khi sử dụng không?**  
   - **KẾT LUẬN TỪ CODE:** **HOÀN TOÀN KHÔNG CÓ BẤT KỲ LỚP BẢO VỆ NÀO.**  
   - **Bằng chứng:** Controller không đọc `req.user.role`, không kiểm tra `ADMIN`, không kiểm tra cờ môi trường. Giá trị `simulatedNow` được chuyển thẳng vào [`bookingService.autoAccept(id, simulatedNow)` L119](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.controller.ts#L119).

4. **Giá trị được parse thành ngày giờ thế nào? Kiểm tra định dạng và bẫy `NaN`?**  
   - **KẾT LUẬN TỪ CODE:** Parse bằng hàm nguyên thủy `new Date(req.body.simulated_now)`.  
   - **BẪY LỖ HỔNG JAVASCRIPT ĐẶC BIỆT NGUY HIỂM:**  
     - Nếu client truyền chuỗi không hợp lệ (ví dụ: `{"simulated_now": "invalid"}`), `new Date(...)` trả về `Invalid Date` (`getTime() === NaN`).  
     - Tại [`booking.service.ts` L1340–1341](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L1340-L1341):  
       `const checkTime = simulatedNow || new Date();`  
       `if (checkTime < booking.confirm_deadline) throw new BusinessError('ACCEPTANCE_DEADLINE_NOT_REACHED');`  
     - Trong đặc tả JavaScript, phép so sánh `Invalid Date < booking.confirm_deadline` luôn trả về **`false`**!  
     - Do đó, điều kiện chặn deadline bị bỏ qua hoàn toàn, code tiếp tục thực thi xuống lệnh giải ngân Sổ cái kép!

5. **Service sử dụng đồng hồ thật hay thời gian do client truyền?**  
   - **KẾT LUẬN TỪ CODE:** Ưu tiên thời gian client truyền: `const checkTime = simulatedNow || new Date();` ([`booking.service.ts` L1340](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L1340)).

6. **Mô tả đường đi logic nếu client gửi thời điểm năm 2099:**  
   - **Bước 1:** Client gửi `POST /api/bookings/:id/auto-accept` kèm header `Authorization: Bearer <jwt_bất_kỳ>` và body `{"simulated_now": "2099-01-01T00:00:00Z"}`.  
   - **Bước 2:** Middleware `authenticate` xác thực JWT hợp lệ ([`booking.router.ts` L29](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.router.ts#L29)).  
   - **Bước 3:** Controller tạo đối tượng `simulatedNow = new Date("2099-01-01T00:00:00Z")` và gọi `bookingService.autoAccept(id, simulatedNow)`.  
   - **Bước 4:** Service kiểm tra `booking` tồn tại, chưa bị khiếu nại (`DISPUTED`) và Escrow chưa bị đóng băng (`FROZEN`).  
   - **Bước 5:** So sánh `checkTime (năm 2099) < booking.confirm_deadline` $\rightarrow$ Đánh giá là **`false`** $\rightarrow$ **Không ném lỗi `ACCEPTANCE_DEADLINE_NOT_REACHED`**.  
   - **Bước 6:** Service gọi [`settlementService.settleBooking(bookingId, 'SYSTEM_AUTO_ACCEPT_TIMEOUT')`](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L1348).  
   - **Bước 7:** Bên trong `prisma.$transaction`:  
     - Chuyển `booking.status` $\rightarrow$ `COMPLETED`.  
     - Ghi bút toán Sổ cái kép: trừ ví ký quỹ Renter `total_fee_snapshot`, cộng 88% vào ví khả dụng Companion, cộng 12% vào ví Sàn.  
     - Chuyển `escrow.status` $\rightarrow$ `RELEASED`.  
     - Đóng `session.status` $\rightarrow$ `CLOSED`.  
   - **HỆ QUẢ THỰC TẾ:** Companion hoặc kẻ tấn công có thể ép giải ngân sớm 88% số tiền ngay khi phiên vừa kết thúc, tước đoạt hoàn toàn quyền kiểm tra dịch vụ và quyền gửi khiếu nại trong 15 phút của khách hàng.

7. **Có đường gọi khác nào cho phép client kiểm soát thời gian không?**  
   - **KẾT LUẬN TỪ CODE:** Đã rà soát toàn bộ file `server/src/**/*.ts`: **Không có endpoint nào khác nhận thời gian từ client.** Endpoint `/timeout` hoàn toàn dùng `now = new Date()` ([`booking.service.ts` L764](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L764)). Lỗ hổng điều khiển thời gian chỉ tồn tại duy nhất tại `POST /api/bookings/:id/auto-accept`.

8. **Test hiện có bao phủ những trường hợp nào?**  
   - Đã đọc file [`tests/integration/session_fulfillment.test.ts` L521–528](file:///c:/INSTASQUAD/INSTASQUAD/tests/integration/session_fulfillment.test.ts#L521-L528): Test `TC43` cố tình gửi `simulated_now: +24h` nhưng bị chặn chỉ vì đơn đó đang có Escrow `FROZEN`.  
   - **Khoảng trống kiểm thử:** Chưa có test nào kiểm tra: user thường gửi `simulated_now` ở trạng thái bình thường; admin gửi `simulated_now`; môi trường production; thời gian không hợp lệ.

---

## PHẦN B: MA TRẬN PHÂN QUYỀN VÀ TRUY CẬP TRÊN 2 ENDPOINT TÀI CHÍNH

Bảng đối chiếu minh bạch giữa Authentication (Xác thực danh tính) và Authorization (Kiểm soát quyền hạn):

| Tiêu chí kiểm định | `POST /api/bookings/:id/timeout` | `POST /api/bookings/:id/auto-accept` |
|:---|:---|:---|
| **Middleware xác thực** | `bookingRouter.use(authenticate)` tại [`booking.router.ts` L29](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.router.ts#L29). Yêu cầu Bearer JWT hợp lệ. | `bookingRouter.use(authenticate)` tại [`booking.router.ts` L29](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.router.ts#L29). Yêu cầu Bearer JWT hợp lệ. |
| **Kiểm tra vai trò (Role)** | **KHÔNG CÓ**. Bất kỳ role nào (`CLIENT`, `COMPANION`, `ADMIN`, `CS_AGENT`) đều gọi được. | **KHÔNG CÓ**. Bất kỳ role nào (`CLIENT`, `COMPANION`, `ADMIN`, `CS_AGENT`) đều gọi được. |
| **Kiểm tra quyền sở hữu (Ownership)** | **KHÔNG CÓ**. Controller lấy `actorId = req.user?.user_id` ([`booking.controller.ts` L83](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.controller.ts#L83)) nhưng service **không kiểm tra** `actorId` có phải là Renter hoặc Companion của đơn hay không. | **KHÔNG CÓ**. Controller thậm chí không truyền `userId` vào service. Không kiểm tra ai là người gửi request. |
| **Điều kiện trạng thái & Deadline** | `status === 'WAITING_COMPANION_RESPONSE'` và `now > response_deadline` ([`booking.service.ts` L757, L765](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L757)). | `status in ['ACCEPTED', 'IN_SESSION']`, `escrow !== FROZEN`, `status !== DISPUTED`, và `checkTime >= confirm_deadline` ([`booking.service.ts` L1319–1341](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L1319-L1341)). |
| **Khả năng người không liên quan kích hoạt** | **CÓ THỂ KÍCH HOẠT NẾU ĐƠN ĐÃ QUÁ HẠN.** User ngoài cuộc có JWT có thể trigger timeout của đơn người khác. (Không làm mất tiền vì tiền hoàn 100% về đúng ví Renter chủ đơn). | **CÓ THỂ KÍCH HOẠT VÀ GIẢI NGÂN SỚM NẾU TRUYỀN `simulated_now`.** Bất kỳ user nào gửi body thời gian tương lai đều có thể ép giải ngân sớm sang ví Companion. |
| **Test chứng minh cho phép / từ chối** | `TC17` ([`booking_lifecycle.test.ts` L329](file:///c:/INSTASQUAD/INSTASQUAD/tests/integration/booking_lifecycle.test.ts#L329)) chứng minh chặn khi chưa hết hạn. Chưa có test chứng minh chặn user lạ. | `TC41` ([`session_fulfillment.test.ts` L451](file:///c:/INSTASQUAD/INSTASQUAD/tests/integration/session_fulfillment.test.ts#L451)) chứng minh chặn khi `checkTime < deadline`. Chưa có test chứng minh chặn user lạ hoặc chặn tham số `simulated_now`. |

---

## PHẦN C: ĐỐI CHIẾU BASELINE GIT COMMIT `0d019e6`

- **Lệnh thực thi:** `wsl git -C /mnt/c/INSTASQUAD/INSTASQUAD status --porcelain` và `diff --stat 0d019e6`
- **Kết quả tracked files đã thay đổi so với baseline:**
  ```text
  docs/REFERENCE_MAPPING.md | 108 ++++++++++++++++++++++++++++++++++++++++------
  1 file changed, 94 insertions(+), 14 deletions(-)
  ```
  *(Chỉ có duy nhất 1 tracked file `docs/REFERENCE_MAPPING.md` được sửa đổi từ Giai đoạn 0 để chuẩn hóa bảng ánh xạ thương mại quốc tế).*
- **Các file untracked (file mới tạo phục vụ kiểm định):**
  1. `docs/AUDIT.md` (Báo cáo audit hệ thống lập trong Giai đoạn 0).
  2. `docs/STAGE0_DECISION_REVIEW.md` (Hồ sơ quyết định, thẩm tra quyền hạn và bảo mật lập từ Giai đoạn 0.1 đến 0.6).
- **Cam kết kiểm soát:** Toàn bộ 197 file mã nguồn khác **hoàn toàn trùng khớp 100% với commit gốc `0d019e6`**. Không có commit mới, không reset, không revert.

---

## PHẦN D: KẾ HOẠCH ĐỀ XUẤT KHẮC PHỤC TỐI THIỂU (CHỈ LẬP KẾ HOẠCH — CHƯA SỬA CODE)

Kế hoạch kỹ thuật được phân loại theo mức độ ưu tiên:

### Mức P0 — Ảnh hưởng an toàn tiền tệ & Thao tác trái phép (Bắt buộc làm ngay đầu Giai đoạn 1)
1. **[P0-1] Vô hiệu hóa tham số `simulated_now` ở môi trường Production / Non-Test:**
   - *Giải pháp:* Tại [`booking.controller.ts` L117](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.controller.ts#L117), loại bỏ hoàn toàn việc đọc `req.body.simulated_now` trong luồng API thông thường. Nếu cần hỗ trợ test tự động, chỉ cho phép khi `env.NODE_ENV === 'test'` và bắt buộc caller phải có header bí mật nội bộ (`x-test-simulated-time`), tuyệt đối không mở ra ngoài client.
2. **[P0-2] Bổ sung Ownership Check trên `POST /api/bookings/:id/timeout`:**
   - *Giải pháp:* Tại [`booking.service.ts` L735](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.service.ts#L735), thêm kiểm tra quyền:  
     `const isAuthorized = [booking.renter_id, booking.companion.user_id].includes(actorId) || ['ADMIN', 'CS_AGENT'].includes(userRole);`  
     Nếu không thỏa mãn $\rightarrow$ ném `ForbiddenError('FORBIDDEN', 'Bạn không có quyền xử lý đơn đặt lịch này.')`.
3. **[P0-3] Bổ sung Authorization Check trên `POST /api/bookings/:id/auto-accept`:**
   - *Giải pháp:* Kiểm tra caller phải là Renter của đơn, hoặc là tiến trình hệ thống nội bộ / Admin. Không cho phép Companion hoặc người ngoài tự ý kích hoạt.

### Mức P1 — Bảo vệ tính toàn vẹn dữ liệu & Chống Race Condition
1. **[P1-1] Gắn schema validation cho `POST /api/bookings/:id/auto-accept`:**
   - *Giải pháp:* Gắn middleware `validateBody(autoAcceptSchema)` vào [`booking.router.ts` L40](file:///c:/INSTASQUAD/INSTASQUAD/server/src/modules/booking/booking.router.ts#L40) để chặn đứng các body rác hoặc body chứa payload không mong muốn.
2. **[P1-2] Bổ sung kiểm tra tính hợp lệ của ngày giờ (`isValidDate`):**
   - *Giải pháp:* Kiểm tra `if (isNaN(checkTime.getTime())) throw new BusinessError('INVALID_DATETIME')` để triệt tiêu hoàn toàn bẫy `NaN` của JavaScript.
3. **[P1-3] Bổ sung giới hạn an toàn trong `env.ts`:**
   - *Giải pháp:* Bổ sung `.positive().min(1)` cho `BOOKING_RESPONSE_TIMEOUT_SECONDS` và `FULFILLMENT_ACCEPTANCE_TIMEOUT_MINUTES`, cấm giá trị nhỏ hơn 15 phút khi `NODE_ENV === 'production'`.

### Mức P2 — Chất lượng kiểm thử & Chuẩn hóa tài liệu
1. **[P2-1] Bổ sung bộ test phân quyền (403 Forbidden):**
   - Viết test chứng minh: User lạ gọi `/timeout` $\rightarrow$ bị từ chối 403.
   - Viết test chứng minh: Companion gửi `simulated_now` $\rightarrow$ bị từ chối hoặc bị phớt lờ.
2. **[P2-2] Bổ sung test kiểm tra định dạng ngày không hợp lệ:**
   - Viết test chứng minh: Gửi `{"simulated_now": "invalid"}` $\rightarrow$ trả về lỗi 400 Bad Request, không giải ngân.
3. **[P2-3] Cập nhật API Contract:**
   - Chuẩn hóa tài liệu [`docs/API_CONTRACT.md`](file:///c:/INSTASQUAD/INSTASQUAD/docs/API_CONTRACT.md) phản ánh đúng ma trận quyền truy cập.

---

## PHẦN E: KẾT LUẬN NGHIỆM THU STAGE 0

### ĐÁNH GIÁ CỦA TECH LEAD: **CHƯA ĐỦ ĐIỀU KIỆN ĐÓNG STAGE 0 (NOT READY TO CLOSE)**

**Lý do kỹ thuật và quản trị:**
1. **Lỗ hổng bảo mật P0-1 (`simulated_now`) đã được xác nhận trực tiếp từ mã nguồn:** Hệ thống đang tồn tại nguy cơ cho phép client cưỡng chế giải ngân sớm trước 15 phút của khách hàng. Lỗ hổng này bắt buộc phải có kế hoạch khắc phục được PO phê duyệt trước khi bắt đầu code tính năng mới.
2. **Thiếu kiểm soát quyền sở hữu P0-2:** Hai endpoint tài chính thiếu lớp kiểm tra ownership check, cho phép người ngoài cuộc can thiệp vào vòng đời đơn.
3. **Quyết định PO-M01 chưa được chốt:** Mâu thuẫn thứ tự thanh toán giữa UC03 (sau khi duyệt) và BPMN Hình 1B (ký quỹ trước) vẫn đang chờ ý kiến Giảng viên hướng dẫn môn học.
4. **Phương án demo PO-M02 chưa được PO ký duyệt:** Cần PO chính thức chốt chọn Phương án D1 (Seed Data + UI Trigger) hay Phương án D2.

---

## PHẦN F: DANH SÁCH CÂU HỎI CẦN PRODUCT OWNER & GIẢNG VIÊN QUYẾT ĐỊNH

1. **Gửi Giảng viên hướng dẫn môn học (PO-M01):**
   > *"Kính gửi Thầy/Cô, đồ án INSTASQUAD nên chuẩn hóa theo: (A) Sơ đồ BPMN Hình 1B (Ký quỹ Escrow trước để bảo vệ Companion không bị bùng slot), hay (B) Tài liệu UC03 ban đầu (Companion duyệt trước rồi Renter mới thanh toán)?"*
2. **Gửi Product Owner nhóm (Về kế hoạch vá lỗi P0 và mở Giai đoạn 1):**
   > *"PO có phê duyệt kế hoạch: Giữ nguyên mã nguồn hiện tại, đưa việc vá lỗ hổng `simulated_now` (P0-1) và thêm Ownership Check (P0-2) lên làm ưu tiên trọng tâm của Giai đoạn 1, đồng thời áp dụng phương án Demo D1 (Seed Data quá hạn + UI Trigger) hay không?"*  
   > - **Lựa chọn A (Khuyến nghị):** Đồng ý phê duyệt kế hoạch P0/P1/P2 và phương án Demo D1.  
   > - **Lựa chọn B:** Yêu cầu điều chỉnh phương án khác.

---

## PHẦN G: BÁO CÁO THỰC THI KHẮC PHỤC BẢO MẬT STAGE 1A (P0 REMEDIATION - HOÀN TẤT)

### 1. Phạm vi thực thi theo phê duyệt của Product Owner
Product Owner đã phê duyệt chuyển sang Stage 1A để xử lý dứt điểm các lỗ hổng P0 với nguyên tắc: bảo toàn 100% chính sách tài chính (tỷ lệ 88/12, thời hạn 180s, cửa sổ 15m, quy tắc bút toán Sổ cái ghi kép) và không thay đổi schema database.

### 2. Các thay đổi kỹ thuật đã thực hiện

#### A. Khắc phục lỗ hổng P0-1 (Triệt tiêu khả năng Client thao túng `simulated_now`)
1. **`server/src/modules/booking/booking.controller.ts`**:
   - Loại bỏ việc đọc `req.body.simulated_now` để truyền vào nghiệp vụ giải ngân.
   - Endpoint `handleAutoAccept` chỉ lấy `userId` và `userRole` từ phiên xác thực JWT và chuyển tới service. Nghiệp vụ nghiệm thu tự động tại môi trường runtime bắt buộc sử dụng đồng hồ thực của server (`new Date()`).
2. **`server/src/modules/booking/booking.router.ts`**:
   - Gắn middleware xác thực dữ liệu đầu vào `validateBody(autoAcceptSchema)` vào route `POST /api/bookings/:id/auto-accept`.
3. **`server/src/modules/session/session.dto.ts`**:
   - Khai báo schema `autoAcceptSchema` dạng schema linh hoạt `z.object({ simulated_now: z.string().optional() }).passthrough()`.
4. **`server/src/modules/booking/booking.service.ts`**:
   - Bổ sung kiểm tra định dạng thời gian nội bộ: Nếu `internalClock` được truyền vào (phục vụ test nghiệp vụ nội bộ) có giá trị `NaN` (do `new Date('invalid')`), hệ thống lập tức ném `BusinessError('INVALID_DATETIME')`.
   - Triệt tiêu hoàn toàn lỗi logic so sánh `NaN < booking.confirm_deadline` trả về `false`.

#### B. Khắc phục lỗ hổng P0-2 (Kiểm soát phân quyền & sở hữu đơn đặt lịch)
1. **`POST /api/bookings/:id/timeout`**:
   - Thêm kiểm tra quyền truy cập: Chỉ các bên liên quan trong đơn (`renter_id === actorId` hoặc `companion.user_id === actorId`) hoặc nhân sự vận hành sàn (`ADMIN`, `CS_AGENT`, `AUDITOR`) mới có quyền kích hoạt xử lý quá hạn phản hồi.
   - Người ngoài cuộc (bên thứ ba không liên quan) sẽ bị từ chối ngay lập tức với mã lỗi HTTP **403 Forbidden** (`ForbiddenError`).
2. **`POST /api/bookings/:id/auto-accept`**:
   - Thêm kiểm tra quyền truy cập tương tự: Chỉ Renter, Companion trong đơn hoặc nhân sự CS/Admin/Auditor mới có quyền gọi trigger nghiệm thu tự động.
   - Người ngoài cuộc bị từ chối với HTTP **403 Forbidden**.

### 3. Kết quả kiểm thử & Nghiệm thu hồi quy (Regression Verification)

1. **Bộ kiểm thử bảo mật chuyên biệt (`tests/integration/security_p0_remediation.test.ts`)**:
   - Đã tạo 14 test case độc lập kiểm tra toàn diện:
     - Chặn client gửi `simulated_now` tương lai khi chưa hết 15 phút thực tế ($\rightarrow$ 422 `ACCEPTANCE_DEADLINE_NOT_REACHED`).
     - Chặn chuỗi ngày không hợp lệ, không gây bypass NaN ($\rightarrow$ 422).
     - Bắt lỗi `INVALID_DATETIME` khi truyền ngày hỏng trực tiếp vào service.
     - Kiểm tra 401 Unauthorized khi không đăng nhập trên cả 2 endpoint.
     - Kiểm tra 403 Forbidden đối với người dùng không liên quan trên cả 2 endpoint.
     - Xác nhận Renter và Companion trong đơn được phép gọi khi quá hạn.
     - Chặn `AUDITOR` gọi `/timeout` và `/auto-accept` (403 Forbidden, nguyên tắc SoD).
     - Chặn `CS_AGENT` gọi `/auto-accept` (403 Forbidden, không có quyền settlement).
     - Kiểm tra các request bị từ chối không làm biến động Booking, Escrow, Ví, Sổ cái hay Điểm uy tín.
     - Kiểm tra Idempotency và Race Condition khi gọi đồng thời `/auto-accept`: Bảo toàn trạng thái nguyên tử, không giải ngân trùng lặp.
     - Chạy kiểm toán Sổ cái toàn diện (`reconciliationService.runReconciliation()`): Số dư cân bằng tuyệt đối ($\Delta = 0$), không phát sinh chênh lệch phương sai.
   - **Kết quả: 14/14 test PASSED 100%.**

2. **Toàn bộ bộ test tích hợp của dự án (`npm test`)**:
   - Tổng số suite: **17 test files**.
   - Tổng số tests: **174 passed / 174 tests (0 failed)**.
   - Thời gian thực thi: ~34s.
   - Toàn bộ 160 test ban đầu cùng 14 test bảo mật mới đều vượt qua 100%.

3. **Kiểm tra biên dịch sản phẩm (Production Build Check)**:
   - Server TypeScript: `tsc -p server/tsconfig.json` $\rightarrow$ 0 lỗi.
   - Client Production: `npm --prefix client run build` (tsc + vite build) $\rightarrow$ 0 lỗi, bundle thành công.

### 4. Kết luận Stage 1A (Chốt phân quyền và Đóng Stage 1A)
- Đã khắc phục triệt để 2 lỗ hổng bảo mật P0 (P0-1 và P0-2) theo đúng quyết định của Product Owner.
- Đã áp dụng nguyên tắc quyền tối thiểu (Least Privilege & Separation of Duties): Loại `AUDITOR` khỏi quyền mutate tài chính; loại `CS_AGENT` khỏi quyền tự ý settlement qua `/auto-accept`.
- Hệ thống đạt trạng thái **PASS** toàn diện, đủ điều kiện sẵn sàng chuyển sang giao diện người dùng (Frontend).
