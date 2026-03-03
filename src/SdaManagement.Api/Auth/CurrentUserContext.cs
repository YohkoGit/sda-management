using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Auth;

// Mutable scoped service — populated by CurrentUserContextMiddleware once per request
public class CurrentUserContext : ICurrentUserContext
{
    public bool IsAuthenticated { get; private set; }
    public int UserId { get; private set; }
    public UserRole Role { get; private set; } = UserRole.Anonymous;
    public IReadOnlyList<int> DepartmentIds { get; private set; } = [];

    public void Initialize(int userId, UserRole role, List<int> departmentIds)
    {
        IsAuthenticated = true;
        UserId = userId;
        Role = role;
        DepartmentIds = departmentIds.AsReadOnly();
    }
}
