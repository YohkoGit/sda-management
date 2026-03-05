namespace SdaManagement.Api.Dtos.ActivityTemplate;

public record CreateActivityTemplateRequest : IActivityTemplateRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public List<TemplateRoleRequest> Roles { get; init; } = [];
}
