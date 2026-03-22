using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Hubs;

public class NotificationHub(AppDbContext dbContext) : Hub
{
    public override async Task OnConnectedAsync()
    {
        // All connections (anonymous + authenticated) join the public group
        await Groups.AddToGroupAsync(Context.ConnectionId, "public");

        if (Context.User?.Identity?.IsAuthenticated == true)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, "authenticated");

            var email = Context.User.FindFirst(ClaimTypes.Email)?.Value;
            if (email is not null)
            {
                var userInfo = await dbContext.Users
                    .Where(u => u.Email == email)
                    .Select(u => new { u.Role, DeptIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList() })
                    .FirstOrDefaultAsync();

                if (userInfo is not null)
                {
                    if (userInfo.Role == UserRole.Owner)
                    {
                        // OWNER gets ALL department groups regardless of assignment
                        var allDeptIds = await dbContext.Departments.Select(d => d.Id).ToListAsync();
                        foreach (var deptId in allDeptIds)
                        {
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"dept:{deptId}");
                        }
                    }
                    else if (userInfo.DeptIds.Count > 0)
                    {
                        foreach (var deptId in userInfo.DeptIds)
                        {
                            await Groups.AddToGroupAsync(Context.ConnectionId, $"dept:{deptId}");
                        }
                    }
                }
            }
        }

        await base.OnConnectedAsync();
    }
}
