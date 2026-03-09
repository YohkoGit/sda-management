namespace SdaManagement.Api.Dtos.Activity;

public class ActivityResponse
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int? DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string Visibility { get; init; } = string.Empty;
    public List<ActivityRoleResponse> Roles { get; init; } = [];
    public uint ConcurrencyToken { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
