namespace SdaManagement.Api.Dtos.Activity;

public class ActivityListItem
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int? DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentColor { get; init; } = string.Empty;
    public string Visibility { get; init; } = string.Empty;
    public int RoleCount { get; init; }
    public DateTime CreatedAt { get; init; }
}
