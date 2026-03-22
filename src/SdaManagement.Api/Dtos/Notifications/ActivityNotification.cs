namespace SdaManagement.Api.Dtos.Notifications;

public record ActivityNotification(
    int ActivityId,
    string Title,
    DateOnly Date,
    int? DepartmentId,
    string Visibility,
    uint ConcurrencyToken,
    DateTime Timestamp,
    string? UpdatedFields = null);
