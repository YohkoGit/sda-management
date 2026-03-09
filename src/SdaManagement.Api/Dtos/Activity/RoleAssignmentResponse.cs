namespace SdaManagement.Api.Dtos.Activity;

public class RoleAssignmentResponse
{
    public int Id { get; init; }
    public int UserId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
}
