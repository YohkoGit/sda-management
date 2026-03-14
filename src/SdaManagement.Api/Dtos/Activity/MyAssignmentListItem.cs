namespace SdaManagement.Api.Dtos.Activity;

public class MyAssignmentListItem
{
    public int ActivityId { get; init; }
    public string ActivityTitle { get; init; } = string.Empty;
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentAbbreviation { get; init; } = string.Empty;
    public string DepartmentColor { get; init; } = string.Empty;
    public string? SpecialType { get; init; }
    public string RoleName { get; init; } = string.Empty;
    public List<CoAssigneeResponse> CoAssignees { get; init; } = [];
}
