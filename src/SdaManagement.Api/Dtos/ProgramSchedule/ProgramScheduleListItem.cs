namespace SdaManagement.Api.Dtos.ProgramSchedule;

public class ProgramScheduleListItem
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public int DayOfWeek { get; init; }
    public string StartTime { get; init; } = string.Empty;
    public string EndTime { get; init; } = string.Empty;
    public string? HostName { get; init; }
    public int? DepartmentId { get; init; }
    public string? DepartmentName { get; init; }
}
