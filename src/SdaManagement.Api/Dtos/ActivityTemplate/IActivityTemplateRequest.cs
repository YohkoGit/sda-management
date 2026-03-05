namespace SdaManagement.Api.Dtos.ActivityTemplate;

public interface IActivityTemplateRequest
{
    string Name { get; }
    string? Description { get; }
    List<TemplateRoleRequest> Roles { get; }
}
