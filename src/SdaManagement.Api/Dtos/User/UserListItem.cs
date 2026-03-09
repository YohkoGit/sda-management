namespace SdaManagement.Api.Dtos.User;

public class UserListItem
{
    public int Id { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public List<UserDepartmentBadge> Departments { get; init; } = [];
    public DateTime CreatedAt { get; init; }
}
