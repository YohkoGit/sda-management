namespace SdaManagement.Api.Dtos.ProgramSchedule;

public record CreateProgramScheduleRequest : IProgramScheduleRequest
{
    public string Title { get; init; } = string.Empty;
    public int DayOfWeek { get; init; }
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
    public string? HostName { get; init; }
    public int? DepartmentId { get; init; }
}
