using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Services;

public interface IActivityService
{
    Task<List<ActivityListItem>> GetAllAsync(int? departmentId, string? visibility = null);
    Task<ActivityResponse?> GetByIdAsync(int id);
    Task<ActivityResponse> CreateAsync(CreateActivityRequest request);
    Task<ActivityResponse?> UpdateAsync(int id, UpdateActivityRequest request, bool force = false);
    Task<bool> DeleteAsync(int id);
    Task<List<MyAssignmentListItem>> GetMyAssignmentsAsync(int userId);
    Task<List<DashboardActivityItem>> GetDashboardActivitiesAsync(
        UserRole role, IReadOnlyList<int> departmentIds);
}
