using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Auth;

public interface ICurrentUserContext
{
    bool IsAuthenticated { get; }
    int UserId { get; }
    UserRole Role { get; }
    IReadOnlyList<int> DepartmentIds { get; }
}
