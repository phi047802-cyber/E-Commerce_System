-- D45: cho phép đặt lại slot đã được giải phóng (Companion từ chối / Renter hủy / quá hạn 180s).
-- Trước đây `bookings.slot_id` UNIQUE trên toàn cột → booking CANCELLED vẫn chiếm slot, đặt lại báo lỗi 500.
-- Thay bằng filtered unique index: mỗi slot có tối đa 1 booking chưa hủy (bảo vệ tầng DB chống đặt trùng),
-- còn các booking CANCELLED không giới hạn. Prisma chưa hỗ trợ filtered index → giữ trong migration (giống D34).
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[bookings] DROP CONSTRAINT [bookings_slot_id_key];

CREATE NONCLUSTERED INDEX [bookings_slot_id_idx] ON [dbo].[bookings]([slot_id]);

CREATE UNIQUE NONCLUSTERED INDEX [bookings_slot_id_active_key] ON [dbo].[bookings]([slot_id]) WHERE [status] <> 'CANCELLED';

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
