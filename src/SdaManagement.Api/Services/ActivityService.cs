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

        var projected = await query
            .OrderByDescending(a => a.Date)
            .ThenBy(a => a.StartTime)
            .Select(a => new
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
                IsMeeting = a.IsMeeting,
                MeetingType = a.MeetingType,
                LocationName = a.LocationName,
                RoleCount = a.Roles.Count,
                TotalHeadcount = a.Roles.Sum(r => r.Headcount),
                AssignedCount = a.Roles.Sum(r => r.Assignments.Count),
                // EF Core 10 + Npgsql translates this collection projection to a correlated subquery (not N+1).
                // Verified: produces single SQL query with JSON aggregation for role-level data.
                RoleDetails = a.Roles.Select(r => new { r.RoleName, AssignmentCount = r.Assignments.Count }).ToList(),
                CreatedAt = a.CreatedAt,
            })
            .ToListAsync();

        return projected.Select(a => new ActivityListItem
        {
            Id = a.Id,
            Title = a.Title,
            Date = a.Date,
            StartTime = a.StartTime,
            EndTime = a.EndTime,
            DepartmentId = a.DepartmentId,
            DepartmentName = a.DepartmentName,
            DepartmentColor = a.DepartmentColor,
            Visibility = a.Visibility,
            SpecialType = a.SpecialType,
            IsMeeting = a.IsMeeting,
            MeetingType = a.MeetingType,
            LocationName = a.LocationName,
            RoleCount = a.RoleCount,
            TotalHeadcount = a.TotalHeadcount,
            AssignedCount = a.AssignedCount,
            StaffingStatus = ComputeStaffingStatus(
                a.TotalHeadcount,
                a.AssignedCount,
                a.RoleDetails.Select(r => (r.RoleName, r.AssignmentCount))),
            CreatedAt = a.CreatedAt,
        }).ToList();
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

        var isMeeting = request.IsMeeting == true;

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
            IsMeeting = isMeeting,
            MeetingType = isMeeting ? request.MeetingType : null,
            ZoomLink = isMeeting && request.MeetingType == "zoom" ? request.ZoomLink : null,
            LocationName = isMeeting && request.MeetingType == "physical" ? request.LocationName : null,
            LocationAddress = isMeeting && request.MeetingType == "physical" ? request.LocationAddress : null,
            CreatedAt = now,
            UpdatedAt = now,
        };

        // Meetings don't have roles — skip role/template processing
        if (!isMeeting && request.Roles is { Count: > 0 })
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
        else if (!isMeeting && request.TemplateId.HasValue)
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

    public async Task<ActivityResponse?> UpdateAsync(int id, UpdateActivityRequest request, bool force = false)
    {
        var activity = await dbContext.Activities
            .FirstOrDefaultAsync(a => a.Id == id);

        if (activity is null)
            return null;

        // Set original version for concurrency check (skip when force-saving)
        if (!force)
            dbContext.Entry(activity).Property(a => a.Version).OriginalValue = request.ConcurrencyToken;

        var now = DateTime.UtcNow;

        var isMeeting = request.IsMeeting == true;

        activity.Title = sanitizer.Sanitize(request.Title);
        activity.Description = sanitizer.SanitizeNullable(request.Description);
        activity.Date = request.Date;
        activity.StartTime = request.StartTime;
        activity.EndTime = request.EndTime;
        activity.DepartmentId = request.DepartmentId;
        activity.Visibility = Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true);
        activity.SpecialType = string.IsNullOrWhiteSpace(request.SpecialType) ? null : request.SpecialType;
        activity.IsMeeting = isMeeting;
        activity.MeetingType = isMeeting ? request.MeetingType : null;
        activity.ZoomLink = isMeeting && request.MeetingType == "zoom" ? request.ZoomLink : null;
        activity.LocationName = isMeeting && request.MeetingType == "physical" ? request.LocationName : null;
        activity.LocationAddress = isMeeting && request.MeetingType == "physical" ? request.LocationAddress : null;
        activity.UpdatedAt = now;

        // Meetings: clear all existing roles
        if (isMeeting)
        {
            var existingRoles = await dbContext.ActivityRoles
                .Where(r => r.ActivityId == activity.Id)
                .ToListAsync();
            dbContext.ActivityRoles.RemoveRange(existingRoles);
        }
        else if (request.Roles is not null)
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

    public async Task<List<MyAssignmentListItem>> GetMyAssignmentsAsync(int userId)
    {
        // Step A — Load entities via .Include() chain
        // Cannot use .Select() projection because avatarService.GetAvatarUrl() is not translatable to SQL
        // Note: no .AsNoTracking() because ActivityRole→Assignments creates a cycle back to RoleAssignment.
        // Tracking queries handle cycles via identity map. Same pattern as GetByIdAsync().
        var assignments = await dbContext.RoleAssignments
            .Include(ra => ra.ActivityRole)
                .ThenInclude(ar => ar.Activity)
                    .ThenInclude(a => a.Department)
            .Include(ra => ra.ActivityRole)
                .ThenInclude(ar => ar.Assignments)
                    .ThenInclude(ra2 => ra2.User)
            .Where(ra => ra.UserId == userId)
            .Where(ra => ra.ActivityRole.Activity.Date >= DateOnly.FromDateTime(DateTime.UtcNow))
            .OrderBy(ra => ra.ActivityRole.Activity.Date)
                .ThenBy(ra => ra.ActivityRole.Activity.StartTime)
            .Take(50)
            .ToListAsync();

        // Step B — Map to DTOs after materialization
        return assignments.Select(ra => new MyAssignmentListItem
        {
            ActivityId = ra.ActivityRole.Activity.Id,
            ActivityTitle = ra.ActivityRole.Activity.Title,
            Date = ra.ActivityRole.Activity.Date,
            StartTime = ra.ActivityRole.Activity.StartTime,
            EndTime = ra.ActivityRole.Activity.EndTime,
            DepartmentName = ra.ActivityRole.Activity.Department?.Name ?? string.Empty,
            DepartmentAbbreviation = ra.ActivityRole.Activity.Department?.Abbreviation ?? string.Empty,
            DepartmentColor = ra.ActivityRole.Activity.Department?.Color ?? string.Empty,
            SpecialType = ra.ActivityRole.Activity.SpecialType,
            RoleName = ra.ActivityRole.RoleName,
            CoAssignees = ra.ActivityRole.Assignments
                .Where(a => a.UserId != userId)
                .Select(a => new CoAssigneeResponse
                {
                    UserId = a.UserId,
                    FirstName = a.User.FirstName,
                    LastName = a.User.LastName,
                    AvatarUrl = avatarService.GetAvatarUrl(a.UserId),
                    IsGuest = a.User.IsGuest,
                })
                .ToList(),
        }).ToList();
    }

    public async Task<List<DashboardActivityItem>> GetDashboardActivitiesAsync(
        UserRole role, IReadOnlyList<int> departmentIds)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var query = dbContext.Activities
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .Where(a => a.Date >= today);

        // Role-based department filtering
        if (role == UserRole.Admin)
            query = query.Where(a => a.DepartmentId.HasValue
                && departmentIds.Contains(a.DepartmentId.Value));
        // VIEWER and OWNER see all activities (no filter)

        var activities = await query
            .OrderBy(a => a.Date)
                .ThenBy(a => a.StartTime)
            .Take(20)
            .ToListAsync();

        return activities.Select(activity =>
        {
            // Extract predicateur from roles
            var predicateurRole = activity.Roles
                .FirstOrDefault(r => r.RoleName.Contains("prédicateur", StringComparison.OrdinalIgnoreCase)
                    || r.RoleName.Contains("predicateur", StringComparison.OrdinalIgnoreCase));
            var predicateur = predicateurRole?.Assignments.FirstOrDefault()?.User;

            // Compute staffing
            var totalHeadcount = activity.Roles.Sum(r => r.Headcount);
            var assignedCount = activity.Roles.Sum(r => r.Assignments.Count);
            var roleDetails = activity.Roles.Select(r => (r.RoleName, r.Assignments.Count));
            var staffingStatus = ComputeStaffingStatus(totalHeadcount, assignedCount, roleDetails);

            return new DashboardActivityItem
            {
                Id = activity.Id,
                Title = activity.Title,
                Date = activity.Date,
                StartTime = activity.StartTime,
                EndTime = activity.EndTime,
                DepartmentId = activity.DepartmentId,
                DepartmentName = activity.Department?.Name ?? string.Empty,
                DepartmentAbbreviation = activity.Department?.Abbreviation ?? string.Empty,
                DepartmentColor = activity.Department?.Color ?? string.Empty,
                Visibility = activity.Visibility.ToString().ToLowerInvariant(),
                SpecialType = activity.SpecialType,
                IsMeeting = activity.IsMeeting,
                MeetingType = activity.MeetingType,
                LocationName = activity.LocationName,
                PredicateurName = predicateur is not null
                    ? $"{predicateur.FirstName} {predicateur.LastName}"
                    : null,
                PredicateurAvatarUrl = predicateur is not null
                    ? avatarService.GetAvatarUrl(predicateur.Id)
                    : null,
                RoleCount = activity.Roles.Count,
                TotalHeadcount = totalHeadcount,
                AssignedCount = assignedCount,
                StaffingStatus = staffingStatus,
            };
        }).ToList();
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

    internal static string ComputeStaffingStatus(
        int totalHeadcount,
        int assignedCount,
        IEnumerable<(string RoleName, int AssignmentCount)> roleDetails)
    {
        if (totalHeadcount == 0)
            return "NoRoles";

        // "Ancien de Service", "Ancien du Sabbat" match — but NOT "Ancienne Musique"
        // Uses "ancien " (with trailing space) + exact "ancien" to avoid feminine-form false positives
        var hasCriticalGap = roleDetails.Any(r =>
            r.AssignmentCount == 0 &&
            (r.RoleName.Equals("ancien", StringComparison.OrdinalIgnoreCase) ||
             r.RoleName.StartsWith("ancien ", StringComparison.OrdinalIgnoreCase) ||
             r.RoleName.Contains("predicateur", StringComparison.OrdinalIgnoreCase)));

        if (hasCriticalGap)
            return "CriticalGap";

        if (assignedCount >= totalHeadcount)
            return "FullyStaffed";

        return "PartiallyStaffed";
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
            DepartmentAbbreviation = activity.Department?.Abbreviation ?? string.Empty,
            DepartmentColor = activity.Department?.Color ?? string.Empty,
            Visibility = activity.Visibility.ToString().ToLowerInvariant(),
            SpecialType = activity.SpecialType,
            IsMeeting = activity.IsMeeting,
            MeetingType = activity.MeetingType,
            ZoomLink = activity.ZoomLink,
            LocationName = activity.LocationName,
            LocationAddress = activity.LocationAddress,
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
            StaffingStatus = ComputeStaffingStatus(
                activity.Roles.Sum(r => r.Headcount),
                activity.Roles.Sum(r => r.Assignments.Count),
                activity.Roles.Select(r => (r.RoleName, r.Assignments.Count))),
            ConcurrencyToken = activity.Version,
            CreatedAt = activity.CreatedAt,
            UpdatedAt = activity.UpdatedAt,
        };
    }
}
