namespace SdaManagement.Api.Dtos.ProgramSchedule;

public interface IProgramScheduleRequest
{
    string Title { get; }
    int DayOfWeek { get; }
    string StartTime { get; }
    string EndTime { get; }
    string? HostName { get; }
    int? DepartmentId { get; }
}
