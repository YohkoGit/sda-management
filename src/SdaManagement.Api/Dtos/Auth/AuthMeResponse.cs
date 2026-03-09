namespace SdaManagement.Api.Dtos.Auth;

public class AuthMeResponse
{
    public int UserId { get; init; }
    public string Email { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public List<int> DepartmentIds { get; init; } = [];
}
