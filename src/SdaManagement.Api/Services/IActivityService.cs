using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Services;

public interface IActivityService
{
    Task<List<ActivityListItem>> GetAllAsync(int? departmentId);
    Task<ActivityResponse?> GetByIdAsync(int id);
    Task<ActivityResponse> CreateAsync(CreateActivityRequest request);
    Task<ActivityResponse?> UpdateAsync(int id, UpdateActivityRequest request);
    Task<bool> DeleteAsync(int id);
}
