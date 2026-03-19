namespace SdaManagement.Api.Dtos.Activity;

public record UpdateActivityRequest : IActivityRequest, IMeetingRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int DepartmentId { get; init; }
    public string Visibility { get; init; } = "public";
    public string? SpecialType { get; init; }
    public uint ConcurrencyToken { get; init; }
    public List<ActivityRoleInput>? Roles { get; init; }
    public bool? IsMeeting { get; init; }
    public string? MeetingType { get; init; }
    public string? ZoomLink { get; init; }
    public string? LocationName { get; init; }
    public string? LocationAddress { get; init; }
}
