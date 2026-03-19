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
    public string DepartmentAbbreviation { get; init; } = string.Empty;
    public string DepartmentColor { get; init; } = string.Empty;
    public string Visibility { get; init; } = string.Empty;
    public string? SpecialType { get; init; }
    public bool IsMeeting { get; init; }
    public string? MeetingType { get; init; }
    public string? ZoomLink { get; init; }
    public string? LocationName { get; init; }
    public string? LocationAddress { get; init; }
    public List<ActivityRoleResponse> Roles { get; init; } = [];
    public string StaffingStatus { get; init; } = string.Empty;
    public uint ConcurrencyToken { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
