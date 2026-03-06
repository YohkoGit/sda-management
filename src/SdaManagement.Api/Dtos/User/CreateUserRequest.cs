namespace SdaManagement.Api.Dtos.User;

public record CreateUserRequest
{
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public List<int> DepartmentIds { get; init; } = [];
}
