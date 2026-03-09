namespace SdaManagement.Api.Dtos.Activity;

public class ActivityRoleResponse
{
    public int Id { get; init; }
    public string RoleName { get; init; } = string.Empty;
    public int Headcount { get; init; }
    public int SortOrder { get; init; }
    public List<RoleAssignmentResponse> Assignments { get; init; } = [];
}
