using SdaManagement.Api.Dtos.ProgramSchedule;

namespace SdaManagement.Api.Services;

public interface IProgramScheduleService
{
    Task<List<ProgramScheduleListItem>> GetAllAsync();
    Task<ProgramScheduleResponse?> GetByIdAsync(int id);
    Task<ProgramScheduleResponse?> CreateAsync(CreateProgramScheduleRequest request);
    Task<ProgramScheduleResponse?> UpdateAsync(int id, UpdateProgramScheduleRequest request);
    Task<bool> DeleteAsync(int id);
}
