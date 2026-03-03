using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Auth;

public class AuthorizationService(ICurrentUserContext ctx) : IAuthorizationService
{
    public bool CanView() => ctx.IsAuthenticated;
    public bool IsOwner() => ctx.Role == UserRole.Owner;
    public bool IsAuthenticated() => ctx.IsAuthenticated;

    public bool CanManage(int departmentId)
    {
        if (!ctx.IsAuthenticated) return false;
        if (ctx.Role == UserRole.Owner) return true;
        if (ctx.Role == UserRole.Admin) return ctx.DepartmentIds.Contains(departmentId);
        return false;
    }
}
