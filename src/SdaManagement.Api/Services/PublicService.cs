using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public class PublicService(AppDbContext dbContext, IAvatarService avatarService) : IPublicService
{
    public async Task<PublicNextActivityResponse?> GetNextActivityAsync()
    {
        // TODO: If hosted outside America/Toronto timezone (e.g., Azure US West),
        // replace with: TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Toronto"))
        var today = DateOnly.FromDateTime(DateTime.Now);

        var activity = await dbContext.Activities
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

        // Find prédicateur role and first assignment
        var predicateurRole = activity.Roles.FirstOrDefault(r =>
            r.RoleName.Equals("Predicateur", StringComparison.OrdinalIgnoreCase) ||
            r.RoleName.Equals("Prédicateur", StringComparison.OrdinalIgnoreCase));

        string? predicateurName = null;
        string? predicateurAvatarUrl = null;

        if (predicateurRole is not null)
        {
            var assignment = predicateurRole.Assignments.FirstOrDefault();
            if (assignment is not null)
            {
                predicateurName = $"{assignment.User.FirstName} {assignment.User.LastName}";
                predicateurAvatarUrl = avatarService.GetAvatarUrl(assignment.UserId);
            }
        }

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
}
