namespace SdaManagement.Api.Dtos.Activity;

public record CreateActivityRequest : IActivityRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int DepartmentId { get; init; }
    public string Visibility { get; init; } = "public";
    public string? SpecialType { get; init; }
    public int? TemplateId { get; init; }
    public List<ActivityRoleInput>? Roles { get; init; }
}
