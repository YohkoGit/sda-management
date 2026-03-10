namespace SdaManagement.Api.Dtos.Activity;

public record ActivityRoleInput
{
    public int? Id { get; init; }
    public string RoleName { get; init; } = string.Empty;
    public int Headcount { get; init; }
    public List<RoleAssignmentInput>? Assignments { get; init; }
}
