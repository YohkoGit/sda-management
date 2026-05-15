namespace SdaManagement.Api.Auth;

// WARNING: naming conflict with Microsoft.AspNetCore.Authorization.IAuthorizationService
// Use fully-qualified name or alias: using SdacAuth = SdaManagement.Api.Auth;
//
// Dept-scoped checks should use IAuthorizationService.AuthorizeAsync with
// AuthorizationPolicies.CanManageDepartment, not a predicate method on this service.
public interface IAuthorizationService
{
    bool IsOwner();
}
