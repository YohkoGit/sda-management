using Microsoft.AspNetCore.SignalR;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Dtos.Notifications;
using SdaManagement.Api.Hubs;

namespace SdaManagement.Api.Services;

/// <summary>
/// Broadcasts lightweight signal DTOs via SignalR instead of full ActivityResponse payloads.
/// This is an intentional deviation from architecture.md's generic "payload is full read DTO" guidance:
/// the "public" group must never receive authenticated-only field values (roles, assignments, ZoomLinks)
/// through SignalR. Clients re-fetch via their own auth-scoped REST endpoints after receiving
/// the invalidation signal.
/// </summary>
public class ActivityNotificationService(
    IHubContext<NotificationHub> hubContext,
    ILogger<ActivityNotificationService> logger) : IActivityNotificationService
{
    public async Task NotifyActivityCreatedAsync(ActivityResponse activity)
    {
        var group = ResolveGroup(activity.Visibility, activity.DepartmentId);
        var payload = new ActivityNotification(
            activity.Id, activity.Title, activity.Date,
            activity.DepartmentId, activity.Visibility,
            activity.ConcurrencyToken, DateTime.UtcNow);

        try
        {
            await hubContext.Clients.Group(group).SendAsync("ActivityCreated", payload);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to broadcast ActivityCreated for activity {ActivityId} to group {Group}", activity.Id, group);
        }
    }

    public async Task NotifyActivityUpdatedAsync(ActivityResponse activity, string? updatedFields)
    {
        var group = ResolveGroup(activity.Visibility, activity.DepartmentId);
        var payload = new ActivityNotification(
            activity.Id, activity.Title, activity.Date,
            activity.DepartmentId, activity.Visibility,
            activity.ConcurrencyToken, DateTime.UtcNow, updatedFields);

        try
        {
            await hubContext.Clients.Group(group).SendAsync("ActivityUpdated", payload);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to broadcast ActivityUpdated for activity {ActivityId} to group {Group}", activity.Id, group);
        }
    }

    public async Task NotifyActivityDeletedAsync(int activityId, int? departmentId, string visibility)
    {
        var group = ResolveGroup(visibility, departmentId);
        var payload = new ActivityDeletedNotification(activityId, departmentId, visibility, DateTime.UtcNow);

        try
        {
            await hubContext.Clients.Group(group).SendAsync("ActivityDeleted", payload);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to broadcast ActivityDeleted for activity {ActivityId} to group {Group}", activityId, group);
        }
    }

    internal static string ResolveGroup(string visibility, int? departmentId) =>
        string.Equals(visibility, "public", StringComparison.OrdinalIgnoreCase) ? "public"
        : departmentId.HasValue ? $"dept:{departmentId}"
        : "authenticated";
}
