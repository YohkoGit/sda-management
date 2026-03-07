namespace SdaManagement.Api.Dtos.User;

public record UpdateUserRequest
{
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public List<int> DepartmentIds { get; init; } = [];
}
