namespace SdaManagement.Api.Dtos.Department;

public class DepartmentWithStaffingListItem
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Abbreviation { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public string? Description { get; init; }
    public int SubMinistryCount { get; init; }
    public int UpcomingActivityCount { get; init; }
    public string AggregateStaffingStatus { get; init; } = "NoActivities";
}
