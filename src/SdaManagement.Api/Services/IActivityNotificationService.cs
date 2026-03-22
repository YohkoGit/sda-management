using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Services;

public interface IActivityNotificationService
{
    Task NotifyActivityCreatedAsync(ActivityResponse activity);
    Task NotifyActivityUpdatedAsync(ActivityResponse activity, string? updatedFields);
    Task NotifyActivityDeletedAsync(int activityId, int? departmentId, string visibility);
}
