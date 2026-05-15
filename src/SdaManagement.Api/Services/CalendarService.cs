using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public class CalendarService(AppDbContext dbContext) : ICalendarService
{
    public async Task<List<PublicActivityListItem>> GetCalendarActivitiesAsync(
        DateOnly start, DateOnly end, List<int>? departmentIds = null)
    {
        if (start > end)
            return [];

        // Cap range to 90 days to prevent abuse
        var maxEnd = start.AddDays(90);
        if (end > maxEnd)
            end = maxEnd;

        var query = dbContext.Activities
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .Where(a => (a.Visibility == ActivityVisibility.Public
                      || a.Visibility == ActivityVisibility.Authenticated)
                     && a.Date >= start
                     && a.Date <= end);

        if (departmentIds is { Count: > 0 })
            query = query.Where(a => a.DepartmentId != null && departmentIds.Contains(a.DepartmentId.Value));

        var activities = await query
            .OrderBy(a => a.Date)
                .ThenBy(a => a.StartTime)
            .ToListAsync();

        return activities.Select(a =>
        {
            var (predicateurName, predicateurAvatarUrl) = ExtractPredicateur(a);
            return new PublicActivityListItem(
                Id: a.Id,
                Title: a.Title,
                Date: a.Date,
                StartTime: a.StartTime,
                EndTime: a.EndTime,
                DepartmentName: a.Department?.Name,
                DepartmentAbbreviation: a.Department?.Abbreviation,
                DepartmentColor: a.Department?.Color,
                PredicateurName: predicateurName,
                PredicateurAvatarUrl: predicateurAvatarUrl,
                SpecialType: a.SpecialType);
        }).ToList();
    }

    private static (string? Name, string? AvatarUrl) ExtractPredicateur(Activity activity)
    {
        var role = activity.Roles.FirstOrDefault(r => r.IsPredicateur);
        if (role is null) return (null, null);
        var assignment = role.Assignments.FirstOrDefault();
        if (assignment?.User is not { } user) return (null, null);
        var avatarUrl = user.AvatarVersion == 0
            ? null
            : $"/api/avatars/{user.Id}?v={user.AvatarVersion}";
        return ($"{user.FirstName} {user.LastName}", avatarUrl);
    }
}
