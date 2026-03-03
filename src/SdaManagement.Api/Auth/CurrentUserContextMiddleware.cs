using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;

namespace SdaManagement.Api.Auth;

// Runs AFTER UseAuthentication(), BEFORE UseAuthorization()
// Resolves user by email claim → DB → populates CurrentUserContext
public class CurrentUserContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ICurrentUserContext currentUserContext, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var emailClaim = context.User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(emailClaim))
            {
                var user = await dbContext.Users
                    .Where(u => u.Email == emailClaim)
                    .Select(u => new
                    {
                        u.Id,
                        u.Role,
                        DepartmentIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (user != null)
                    ((CurrentUserContext)currentUserContext).Initialize(user.Id, user.Role, user.DepartmentIds);
                // If user not found in DB (e.g., deleted): remain Anonymous (safe default)
            }
        }
        await next(context);
    }
}
