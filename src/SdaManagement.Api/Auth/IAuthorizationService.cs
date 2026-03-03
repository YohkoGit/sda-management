namespace SdaManagement.Api.Auth;

// WARNING: naming conflict with Microsoft.AspNetCore.Authorization.IAuthorizationService
// Use fully-qualified name or alias: using SdacAuth = SdaManagement.Api.Auth;
public interface IAuthorizationService
{
    bool CanView();
    bool CanManage(int departmentId);
    bool IsOwner();
    bool IsAuthenticated();
}
