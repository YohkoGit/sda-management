namespace SdaManagement.Api.Dtos.Notifications;

public record ActivityDeletedNotification(
    int ActivityId,
    int? DepartmentId,
    string Visibility,
    DateTime Timestamp);
