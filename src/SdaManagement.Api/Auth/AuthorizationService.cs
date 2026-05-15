using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Auth;

public class AuthorizationService(ICurrentUserContext ctx) : IAuthorizationService
{
    public bool IsOwner() => ctx.Role == UserRole.Owner;
}
