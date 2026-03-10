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
    public async Task<List<ActivityListItem>> GetAllAsync(int? departmentId, string? visibility = null)
    {
        var query = dbContext.Activities.AsQueryable();

        if (departmentId.HasValue)
            query = query.Where(a => a.DepartmentId == departmentId.Value);

        if (!string.IsNullOrEmpty(visibility))
        {
            var parsed = Enum.Parse<ActivityVisibility>(visibility, ignoreCase: true);
            query = query.Where(a => a.Visibility == parsed);
        }

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
                SpecialType = a.SpecialType,
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
            SpecialType = string.IsNullOrWhiteSpace(request.SpecialType) ? null : request.SpecialType,
            CreatedAt = now,
            UpdatedAt = now,
        };

        if (request.Roles is { Count: > 0 })
        {
            // Validate assignment userIds if any assignments are provided
            var allAssignmentUserIds = request.Roles
                .Where(r => r.Assignments is { Count: > 0 })
                .SelectMany(r => r.Assignments!)
                .Select(a => a.UserId)
                .Distinct()
                .ToList();

            if (allAssignmentUserIds.Count > 0)
                await ValidateAssignmentUsersAsync(allAssignmentUserIds);

            for (var i = 0; i < request.Roles.Count; i++)
            {
                var roleInput = request.Roles[i];
                var activityRole = new ActivityRole
                {
                    RoleName = sanitizer.Sanitize(roleInput.RoleName),
                    Headcount = roleInput.Headcount,
                    SortOrder = i,
                    CreatedAt = now,
                    UpdatedAt = now,
                };

                if (roleInput.Assignments is { Count: > 0 })
                {
                    foreach (var assignment in roleInput.Assignments)
                    {
                        activityRole.Assignments.Add(new RoleAssignment
                        {
                            UserId = assignment.UserId,
                            CreatedAt = now,
                        });
                    }
                }

                activity.Roles.Add(activityRole);
            }
        }
        else if (request.TemplateId.HasValue)
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

        var now = DateTime.UtcNow;

        activity.Title = sanitizer.Sanitize(request.Title);
        activity.Description = sanitizer.SanitizeNullable(request.Description);
        activity.Date = request.Date;
        activity.StartTime = request.StartTime;
        activity.EndTime = request.EndTime;
        activity.DepartmentId = request.DepartmentId;
        activity.Visibility = Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true);
        activity.SpecialType = string.IsNullOrWhiteSpace(request.SpecialType) ? null : request.SpecialType;
        activity.UpdatedAt = now;

        if (request.Roles is not null)
        {
            // Include Assignments for reconciliation
            var existingRoles = await dbContext.ActivityRoles
                .Include(r => r.Assignments)
                .Where(r => r.ActivityId == activity.Id)
                .ToListAsync();

            // Validate assignment userIds if any assignments are provided
            var allAssignmentUserIds = request.Roles
                .Where(r => r.Assignments is { Count: > 0 })
                .SelectMany(r => r.Assignments!)
                .Select(a => a.UserId)
                .Distinct()
                .ToList();

            if (allAssignmentUserIds.Count > 0)
                await ValidateAssignmentUsersAsync(allAssignmentUserIds);

            var incomingIds = request.Roles
                .Where(r => r.Id.HasValue)
                .Select(r => r.Id!.Value)
                .ToHashSet();

            // DELETE: existing roles not in request (cascade deletes assignments)
            var toRemove = existingRoles.Where(r => !incomingIds.Contains(r.Id)).ToList();
            dbContext.ActivityRoles.RemoveRange(toRemove);

            // UPDATE existing + ADD new
            for (var i = 0; i < request.Roles.Count; i++)
            {
                var roleInput = request.Roles[i];
                if (roleInput.Id.HasValue)
                {
                    var existing = existingRoles.FirstOrDefault(r => r.Id == roleInput.Id.Value);
                    if (existing is not null)
                    {
                        existing.RoleName = sanitizer.Sanitize(roleInput.RoleName);
                        existing.Headcount = roleInput.Headcount;
                        existing.SortOrder = i;
                        existing.UpdatedAt = now;

                        // Reconcile assignments for existing role
                        ReconcileAssignments(existing, roleInput, now);
                    }
                }
                else
                {
                    var newRole = new ActivityRole
                    {
                        ActivityId = activity.Id,
                        RoleName = sanitizer.Sanitize(roleInput.RoleName),
                        Headcount = roleInput.Headcount,
                        SortOrder = i,
                        CreatedAt = now,
                        UpdatedAt = now,
                    };

                    if (roleInput.Assignments is { Count: > 0 })
                    {
                        foreach (var assignment in roleInput.Assignments)
                        {
                            newRole.Assignments.Add(new RoleAssignment
                            {
                                UserId = assignment.UserId,
                                CreatedAt = now,
                            });
                        }
                    }

                    dbContext.ActivityRoles.Add(newRole);
                }
            }

            // Post-reconciliation validation: assignments.Count <= headcount for all roles
            var allRoles = request.Roles
                .Where(r => r.Id.HasValue)
                .Select(r =>
                {
                    var existing = existingRoles.FirstOrDefault(er => er.Id == r.Id!.Value);
                    return existing;
                })
                .Where(r => r is not null)
                .ToList();

            foreach (var role in allRoles)
            {
                if (role!.Assignments.Count > role.Headcount)
                    throw new InvalidOperationException(
                        $"Role '{role.RoleName}' has {role.Assignments.Count} assignments but headcount is {role.Headcount}.");
            }
        }

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

    private void ReconcileAssignments(ActivityRole existingRole, ActivityRoleInput roleInput, DateTime now)
    {
        if (roleInput.Assignments is null)
            return; // null = don't modify

        var existingUserIds = existingRole.Assignments.Select(a => a.UserId).ToHashSet();
        var incomingUserIds = roleInput.Assignments.Select(a => a.UserId).ToHashSet();

        // Remove: existing but not in incoming
        var toRemove = existingRole.Assignments.Where(a => !incomingUserIds.Contains(a.UserId)).ToList();
        foreach (var assignment in toRemove)
        {
            existingRole.Assignments.Remove(assignment);
            dbContext.RoleAssignments.Remove(assignment);
        }

        // Add: incoming but not in existing
        foreach (var incoming in roleInput.Assignments.Where(a => !existingUserIds.Contains(a.UserId)))
        {
            existingRole.Assignments.Add(new RoleAssignment
            {
                ActivityRoleId = existingRole.Id,
                UserId = incoming.UserId,
                CreatedAt = now,
            });
        }
    }

    private async Task ValidateAssignmentUsersAsync(List<int> userIds)
    {
        var validUsers = await dbContext.Users
            .Where(u => userIds.Contains(u.Id) && u.DeletedAt == null)
            .Select(u => u.Id)
            .ToListAsync();

        var invalidIds = userIds.Except(validUsers).ToList();
        if (invalidIds.Count > 0)
            throw new InvalidOperationException(
                $"Invalid assignment userId(s): {string.Join(", ", invalidIds)}. Users must exist and not be deleted.");
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
            SpecialType = activity.SpecialType,
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
                        IsGuest = ra.User.IsGuest,
                    }).ToList(),
                })
                .ToList(),
            ConcurrencyToken = activity.Version,
            CreatedAt = activity.CreatedAt,
            UpdatedAt = activity.UpdatedAt,
        };
    }
}
