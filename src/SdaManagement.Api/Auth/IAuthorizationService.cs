namespace SdaManagement.Api.Auth;

// WARNING: naming conflict with Microsoft.AspNetCore.Authorization.IAuthorizationService
// Use fully-qualified name or alias: using SdacAuth = SdaManagement.Api.Auth;
public interface IAuthorizationService
{
    bool CanManage(int departmentId);
    bool IsOwner();
}
