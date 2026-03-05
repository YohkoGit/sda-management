using SdaManagement.Api.Dtos.ActivityTemplate;

namespace SdaManagement.Api.Services;

public interface IActivityTemplateService
{
    Task<List<ActivityTemplateListItem>> GetAllAsync();
    Task<ActivityTemplateResponse?> GetByIdAsync(int id);
    Task<ActivityTemplateResponse> CreateAsync(CreateActivityTemplateRequest request);
    Task<ActivityTemplateResponse?> UpdateAsync(int id, UpdateActivityTemplateRequest request);
    Task<bool> DeleteAsync(int id);
}
