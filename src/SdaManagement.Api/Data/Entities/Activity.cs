namespace SdaManagement.Api.Data.Entities;

public class Activity
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateOnly Date { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public ActivityVisibility Visibility { get; set; }
    public string? SpecialType { get; set; }
    public bool IsMeeting { get; set; }
    public string? MeetingType { get; set; }
    public string? ZoomLink { get; set; }
    public string? LocationName { get; set; }
    public string? LocationAddress { get; set; }
    public uint Version { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<ActivityRole> Roles { get; } = [];
}
