-- G9: ghi nhận kênh nguồn first-touch lúc đăng ký để tính conversion theo utm_source (D47).
BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[users] ADD [signup_utm_source] NVARCHAR(1000),
[signup_utm_medium] NVARCHAR(1000),
[signup_utm_campaign] NVARCHAR(1000);

CREATE NONCLUSTERED INDEX [users_signup_utm_source_idx] ON [dbo].[users]([signup_utm_source]);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
