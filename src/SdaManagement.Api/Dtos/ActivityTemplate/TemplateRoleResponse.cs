namespace SdaManagement.Api.Dtos.ActivityTemplate;

public class TemplateRoleResponse
{
    public int Id { get; init; }
    public string RoleName { get; init; } = string.Empty;
    public int DefaultHeadcount { get; init; }
    public int SortOrder { get; init; }
}
