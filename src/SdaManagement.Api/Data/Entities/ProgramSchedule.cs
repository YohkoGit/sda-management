namespace SdaManagement.Api.Data.Entities;

public class ProgramSchedule
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? HostName { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
