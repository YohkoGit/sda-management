using SdaManagement.Api.Dtos.User;

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
    /// <summary>
    /// Department badges (id + name + abbreviation + color) for the user's
    /// scoped departments. Mirrors <see cref="DepartmentIds"/> in richer form
    /// so the sidebar can render dept names without a second round-trip.
    /// </summary>
    public List<UserDepartmentBadge> Departments { get; init; } = [];
}
