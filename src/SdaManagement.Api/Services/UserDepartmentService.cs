using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Services;

public class UserDepartmentService(AppDbContext db, ICurrentUserContext currentUser)
    : IUserDepartmentService
{
    public async Task<bool> SharesDepartmentWithCurrentUserAsync(int targetUserId)
    {
        if (currentUser.DepartmentIds.Count == 0)
            return false;

        return await db.Set<UserDepartment>()
            .AsNoTracking()
            .AnyAsync(ud => ud.UserId == targetUserId
                && currentUser.DepartmentIds.Contains(ud.DepartmentId));
    }
}
