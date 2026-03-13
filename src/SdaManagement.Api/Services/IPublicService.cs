using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public interface IPublicService
{
    Task<PublicNextActivityResponse?> GetNextActivityAsync();
    Task<List<PublicActivityListItem>> GetUpcomingActivitiesAsync();
    Task<List<PublicProgramScheduleResponse>> GetProgramSchedulesAsync();
    Task<List<PublicDepartmentResponse>> GetPublicDepartmentsAsync();
}
