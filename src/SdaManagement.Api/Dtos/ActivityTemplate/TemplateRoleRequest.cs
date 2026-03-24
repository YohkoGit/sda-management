namespace SdaManagement.Api.Dtos.ActivityTemplate;

public record TemplateRoleRequest
{
    public string RoleName { get; init; } = string.Empty;
    public int DefaultHeadcount { get; init; }
    public bool? IsCritical { get; init; }
    public bool? IsPredicateur { get; init; }
}
