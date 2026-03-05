namespace SdaManagement.Api.Dtos.ActivityTemplate;

public class ActivityTemplateResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string? Description { get; init; }
    public List<TemplateRoleResponse> Roles { get; init; } = [];
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
