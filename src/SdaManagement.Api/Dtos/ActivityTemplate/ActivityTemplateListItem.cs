namespace SdaManagement.Api.Dtos.ActivityTemplate;

public class ActivityTemplateListItem
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string RoleSummary { get; init; } = string.Empty;
    public int RoleCount { get; init; }
    public List<TemplateRoleResponse> Roles { get; init; } = [];
}
