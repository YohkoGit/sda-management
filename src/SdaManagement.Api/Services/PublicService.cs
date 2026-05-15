using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public class PublicService(AppDbContext dbContext, IAvatarService avatarService) : IPublicService
{
    // The church is in Saint-Hubert, Quebec — civil "today" must be evaluated against
    // America/Toronto regardless of where the server runs. Using DateTime.Now would
    // depend on server-local time and produce off-by-X-hours bugs once deployed.
    private static readonly TimeZoneInfo QuebecTimeZone =
        TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");

    private static DateOnly QuebecToday() =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, QuebecTimeZone));

    public async Task<PublicNextActivityResponse?> GetNextActivityAsync()
    {
        var today = QuebecToday();

        var activity = await dbContext.Activities
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .Where(a => a.Visibility == ActivityVisibility.Public && a.Date >= today)
            .OrderBy(a => a.Date)
                .ThenBy(a => a.StartTime)
            .FirstOrDefaultAsync();

        if (activity is null)
            return null;

        var (predicateurName, predicateurAvatarUrl) = ExtractPredicateur(activity);

        return new PublicNextActivityResponse(
            Id: activity.Id,
            Title: activity.Title,
            Date: activity.Date,
            StartTime: activity.StartTime,
            EndTime: activity.EndTime,
            DepartmentName: activity.Department?.Name,
            DepartmentAbbreviation: activity.Department?.Abbreviation,
            DepartmentColor: activity.Department?.Color,
            PredicateurName: predicateurName,
            PredicateurAvatarUrl: predicateurAvatarUrl,
            SpecialType: activity.SpecialType);
    }

    public async Task<List<PublicActivityListItem>> GetUpcomingActivitiesAsync()
    {
        var today = QuebecToday();
        var fourWeeksOut = today.AddDays(28);

        var activities = await dbContext.Activities
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .Where(a => a.Visibility == ActivityVisibility.Public
                     && a.Date >= today
                     && a.Date <= fourWeeksOut)
            .OrderBy(a => a.Date)
                .ThenBy(a => a.StartTime)
            .Take(20)
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

    public async Task<List<PublicProgramScheduleResponse>> GetProgramSchedulesAsync()
    {
        return await dbContext.ProgramSchedules
            .OrderBy(ps => ps.DayOfWeek)
                .ThenBy(ps => ps.StartTime)
            .Select(ps => new PublicProgramScheduleResponse(
                ps.Title,
                ps.DayOfWeek,
                ps.StartTime,
                ps.EndTime,
                ps.HostName,
                ps.Department != null ? ps.Department.Name : null,
                ps.Department != null ? ps.Department.Color : null))
            .ToListAsync();
    }

    public async Task<List<PublicDepartmentResponse>> GetPublicDepartmentsAsync()
    {
        var today = QuebecToday();

        var departments = await dbContext.Departments
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Abbreviation,
                d.Color,
                d.Description,
                NextActivity = dbContext.Activities
                    .Where(a => a.DepartmentId == d.Id
                             && a.Visibility == ActivityVisibility.Public
                             && a.Date >= today)
                    .OrderBy(a => a.Date)
                        .ThenBy(a => a.StartTime)
                    .Select(a => new { a.Title, a.Date, a.StartTime })
                    .FirstOrDefault()
            })
            .ToListAsync();

        return departments.Select(d => new PublicDepartmentResponse(
            d.Id,
            d.Name,
            d.Abbreviation,
            d.Color,
            d.Description,
            d.NextActivity?.Title,
            d.NextActivity?.Date,
            d.NextActivity?.StartTime))
            .ToList();
    }

    public async Task<List<PublicActivityListItem>> GetCalendarActivitiesAsync(DateOnly start, DateOnly end)
    {
        if (start > end)
            return [];

        // Cap range to 90 days to prevent abuse
        var maxEnd = start.AddDays(90);
        if (end > maxEnd)
            end = maxEnd;

        var activities = await dbContext.Activities
            .AsNoTracking()
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .Where(a => a.Visibility == ActivityVisibility.Public
                     && a.Date >= start
                     && a.Date <= end)
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

    private (string? Name, string? AvatarUrl) ExtractPredicateur(Activity activity)
    {
        var role = activity.Roles.FirstOrDefault(r => r.IsPredicateur);
        if (role is null) return (null, null);
        var assignment = role.Assignments.FirstOrDefault();
        if (assignment?.User is not { } user) return (null, null);
        return ($"{user.FirstName} {user.LastName}",
                avatarService.GetAvatarUrl(assignment.UserId));
    }
}
