using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public interface ICalendarService
{
    Task<List<PublicActivityListItem>> GetCalendarActivitiesAsync(
        DateOnly start, DateOnly end, List<int>? departmentIds = null);
}
