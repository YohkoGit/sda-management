using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Services;

public class ActivityService(
    AppDbContext dbContext,
    ISanitizationService sanitizer,
    IAvatarService avatarService) : IActivityService
{
    public async Task<List<ActivityListItem>> GetAllAsync(int? departmentId)
    {
        var query = dbContext.Activities.AsQueryable();

        if (departmentId.HasValue)
            query = query.Where(a => a.DepartmentId == departmentId.Value);

        return await query
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.StartTime)
            .Select(a => new ActivityListItem
            {
                Id = a.Id,
                Title = a.Title,
                Date = a.Date,
                StartTime = a.StartTime,
                EndTime = a.EndTime,
                DepartmentId = a.DepartmentId,
                DepartmentName = a.Department != null ? a.Department.Name : string.Empty,
                DepartmentColor = a.Department != null ? a.Department.Color : string.Empty,
                Visibility = a.Visibility.ToString().ToLowerInvariant(),
                RoleCount = a.Roles.Count,
                CreatedAt = a.CreatedAt,
            })
            .ToListAsync();
    }

    public async Task<ActivityResponse?> GetByIdAsync(int id)
    {
        var activity = await dbContext.Activities
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activity is null)
            return null;

        return MapToResponse(activity);
    }

    public async Task<ActivityResponse> CreateAsync(CreateActivityRequest request)
    {
        var now = DateTime.UtcNow;

        var activity = new Activity
        {
            Title = sanitizer.Sanitize(request.Title),
            Description = sanitizer.SanitizeNullable(request.Description),
            Date = request.Date,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            DepartmentId = request.DepartmentId,
            Visibility = Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true),
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (request.TemplateId.HasValue)
        {
            var template = await dbContext.ActivityTemplates
                .Include(t => t.Roles.OrderBy(r => r.SortOrder))
                .FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value);

            if (template is null)
                throw new KeyNotFoundException($"Activity template {request.TemplateId.Value} not found");

            foreach (var templateRole in template.Roles)
            {
                activity.Roles.Add(new ActivityRole
                {
                    RoleName = templateRole.RoleName,
                    Headcount = templateRole.DefaultHeadcount,
                    SortOrder = templateRole.SortOrder,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
        }

        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        // Re-fetch with Department included for response
        return (await GetByIdAsync(activity.Id))!;
    }

    public async Task<ActivityResponse?> UpdateAsync(int id, UpdateActivityRequest request)
    {
        var activity = await dbContext.Activities
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activity is null)
            return null;

        // Set original version for concurrency check
        dbContext.Entry(activity).Property(a => a.Version).OriginalValue = request.ConcurrencyToken;

        activity.Title = sanitizer.Sanitize(request.Title);
        activity.Description = sanitizer.SanitizeNullable(request.Description);
        activity.Date = request.Date;
        activity.StartTime = request.StartTime;
        activity.EndTime = request.EndTime;
        activity.DepartmentId = request.DepartmentId;
        activity.Visibility = Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true);
        activity.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return (await GetByIdAsync(activity.Id))!;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var activity = await dbContext.Activities.FindAsync(id);
        if (activity is null)
            return false;

        dbContext.Activities.Remove(activity);
        await dbContext.SaveChangesAsync();
        return true;
    }

    private ActivityResponse MapToResponse(Activity activity)
    {
        return new ActivityResponse
        {
            Id = activity.Id,
            Title = activity.Title,
            Description = activity.Description,
            Date = activity.Date,
            StartTime = activity.StartTime,
            EndTime = activity.EndTime,
            DepartmentId = activity.DepartmentId,
            DepartmentName = activity.Department?.Name ?? string.Empty,
            Visibility = activity.Visibility.ToString().ToLowerInvariant(),
            Roles = activity.Roles
                .OrderBy(r => r.SortOrder)
                .Select(r => new ActivityRoleResponse
                {
                    Id = r.Id,
                    RoleName = r.RoleName,
                    Headcount = r.Headcount,
                    SortOrder = r.SortOrder,
                    Assignments = r.Assignments.Select(ra => new RoleAssignmentResponse
                    {
                        Id = ra.Id,
                        UserId = ra.UserId,
                        FirstName = ra.User.FirstName,
                        LastName = ra.User.LastName,
                        AvatarUrl = avatarService.GetAvatarUrl(ra.UserId),
                    }).ToList(),
                })
                .ToList(),
            ConcurrencyToken = activity.Version,
            CreatedAt = activity.CreatedAt,
            UpdatedAt = activity.UpdatedAt,
        };
    }
}
