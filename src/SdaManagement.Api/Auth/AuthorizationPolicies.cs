using Microsoft.AspNetCore.Authorization;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Auth;

/// <summary>
/// Named policies enforced by ASP.NET authorization. Add policies here, not as inline
/// controller checks. Resource-based policies (e.g., department-scoped) use
/// <see cref="DepartmentManageRequirement"/> via <c>IAuthorizationService.AuthorizeAsync</c>.
/// </summary>
public static class AuthorizationPolicies
{
    public const string Authenticated = "Authenticated";
    public const string AdminOrOwner = "AdminOrOwner";
    public const string OwnerOnly = "OwnerOnly";
    public const string CanManageDepartment = "CanManageDepartment";

    // Role claim values match what TokenService emits (uppercased enum name).
    private static readonly string OwnerRole = UserRole.Owner.ToString().ToUpperInvariant();
    private static readonly string AdminRole = UserRole.Admin.ToString().ToUpperInvariant();

    public static void Configure(AuthorizationOptions options)
    {
        options.AddPolicy(Authenticated, policy =>
            policy.RequireAuthenticatedUser());

        options.AddPolicy(AdminOrOwner, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireRole(AdminRole, OwnerRole));

        options.AddPolicy(OwnerOnly, policy =>
            policy.RequireAuthenticatedUser()
                  .RequireRole(OwnerRole));

        options.AddPolicy(CanManageDepartment, policy =>
            policy.RequireAuthenticatedUser()
                  .AddRequirements(new DepartmentManageRequirement()));
    }
}

/// <summary>
/// Resource-based requirement: caller must be OWNER, or ADMIN with the
/// target department in <see cref="ICurrentUserContext.DepartmentIds"/>.
/// Invoke via <c>IAuthorizationService.AuthorizeAsync(user, departmentId, AuthorizationPolicies.CanManageDepartment)</c>.
/// </summary>
public sealed class DepartmentManageRequirement : IAuthorizationRequirement;

public sealed class DepartmentManageHandler(ICurrentUserContext ctx)
    : AuthorizationHandler<DepartmentManageRequirement, int>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        DepartmentManageRequirement requirement,
        int departmentId)
    {
        if (!ctx.IsAuthenticated)
            return Task.CompletedTask;

        if (ctx.Role == UserRole.Owner ||
            (ctx.Role == UserRole.Admin && ctx.DepartmentIds.Contains(departmentId)))
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}
