namespace SdaManagement.Api.Dtos.Activity;

public class DashboardActivityItem
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int? DepartmentId { get; init; }
    public string DepartmentName { get; init; } = string.Empty;
    public string DepartmentAbbreviation { get; init; } = string.Empty;
    public string DepartmentColor { get; init; } = string.Empty;
    public string Visibility { get; init; } = string.Empty;
    public string? SpecialType { get; init; }
    public string? PredicateurName { get; init; }
    public string? PredicateurAvatarUrl { get; init; }
    public int RoleCount { get; init; }
    public int TotalHeadcount { get; init; }
    public int AssignedCount { get; init; }
    public string StaffingStatus { get; init; } = string.Empty;
}
