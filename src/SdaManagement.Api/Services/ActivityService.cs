using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Services;

public class ActivityService(
    AppDbContext dbContext,
    ISanitizationService sanitizer,
    IAvatarService avatarService,
    IActivityNotificationService notificationService) : IActivityService
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
                RoleDetails = a.Roles.Select(r => new { r.IsCritical, AssignmentCount = r.Assignments.Count }).ToList(),
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
                a.RoleDetails.Select(r => (r.IsCritical, r.AssignmentCount))),
            CreatedAt = a.CreatedAt,
        }).ToList();
    }

    public async Task<ActivityResponse?> GetByIdAsync(int id)
    {
        var activity = await dbContext.Activities
            .AsNoTracking()
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
            ZoomLink = isMeeting && request.MeetingType == Data.Entities.MeetingType.Zoom ? request.ZoomLink : null,
            LocationName = isMeeting && request.MeetingType == Data.Entities.MeetingType.Physical ? request.LocationName : null,
            LocationAddress = isMeeting && request.MeetingType == Data.Entities.MeetingType.Physical ? request.LocationAddress : null,
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
                    IsCritical = roleInput.IsCritical ?? false,
                    IsPredicateur = roleInput.IsPredicateur ?? false,
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
                    IsCritical = templateRole.IsCritical,
                    IsPredicateur = templateRole.IsPredicateur,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
        }

        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        // Re-fetch with Department included for response
        var response = (await GetByIdAsync(activity.Id))!;

        await notificationService.NotifyActivityCreatedAsync(response);

        return response;
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
        var snapshot = ActivitySnapshot.Capture(activity);
        var isMeeting = request.IsMeeting == true;

        ApplyScalarFieldUpdates(activity, request, isMeeting, now);

        if (isMeeting)
        {
            var existingRoles = await dbContext.ActivityRoles
                .Where(r => r.ActivityId == activity.Id)
                .ToListAsync();
            dbContext.ActivityRoles.RemoveRange(existingRoles);
        }
        else if (request.Roles is not null)
        {
            await ReconcileRolesAsync(activity, request.Roles, now);
        }

        await dbContext.SaveChangesAsync();

        var response = (await GetByIdAsync(activity.Id))!;
        var updatedFields = ComputeChangedFields(snapshot, activity, hasRoleChanges: request.Roles is not null);

        await notificationService.NotifyActivityUpdatedAsync(response, updatedFields);

        return response;
    }

    private void ApplyScalarFieldUpdates(Activity activity, UpdateActivityRequest request, bool isMeeting, DateTime now)
    {
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
        activity.ZoomLink = isMeeting && request.MeetingType == Data.Entities.MeetingType.Zoom ? request.ZoomLink : null;
        activity.LocationName = isMeeting && request.MeetingType == Data.Entities.MeetingType.Physical ? request.LocationName : null;
        activity.LocationAddress = isMeeting && request.MeetingType == Data.Entities.MeetingType.Physical ? request.LocationAddress : null;
        activity.UpdatedAt = now;
    }

    /// <summary>
    /// Reconciles the activity's roles against the incoming role list:
    /// removes roles not in the request (cascade-deletes their assignments),
    /// updates existing roles in-place + reconciles their assignments, and
    /// inserts new roles. Throws if the post-reconciliation state would have
    /// more assignments than headcount on any role.
    /// </summary>
    private async Task ReconcileRolesAsync(Activity activity, List<ActivityRoleInput> roleInputs, DateTime now)
    {
        var existingRoles = await dbContext.ActivityRoles
            .Include(r => r.Assignments)
            .Where(r => r.ActivityId == activity.Id)
            .ToListAsync();

        var allAssignmentUserIds = roleInputs
            .Where(r => r.Assignments is { Count: > 0 })
            .SelectMany(r => r.Assignments!)
            .Select(a => a.UserId)
            .Distinct()
            .ToList();

        if (allAssignmentUserIds.Count > 0)
            await ValidateAssignmentUsersAsync(allAssignmentUserIds);

        var incomingIds = roleInputs
            .Where(r => r.Id.HasValue)
            .Select(r => r.Id!.Value)
            .ToHashSet();

        // DELETE: existing roles not in request (cascade deletes assignments)
        var toRemove = existingRoles.Where(r => !incomingIds.Contains(r.Id)).ToList();
        dbContext.ActivityRoles.RemoveRange(toRemove);

        // UPDATE existing + ADD new
        for (var i = 0; i < roleInputs.Count; i++)
        {
            var roleInput = roleInputs[i];
            if (roleInput.Id.HasValue)
            {
                var existing = existingRoles.FirstOrDefault(r => r.Id == roleInput.Id.Value);
                if (existing is not null)
                {
                    existing.RoleName = sanitizer.Sanitize(roleInput.RoleName);
                    existing.Headcount = roleInput.Headcount;
                    existing.SortOrder = i;
                    if (roleInput.IsCritical.HasValue) existing.IsCritical = roleInput.IsCritical.Value;
                    if (roleInput.IsPredicateur.HasValue) existing.IsPredicateur = roleInput.IsPredicateur.Value;
                    existing.UpdatedAt = now;

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
                    IsCritical = roleInput.IsCritical ?? false,
                    IsPredicateur = roleInput.IsPredicateur ?? false,
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

        // Post-reconciliation validation: assignments.Count <= headcount on every retained role.
        foreach (var roleInput in roleInputs.Where(r => r.Id.HasValue))
        {
            var existing = existingRoles.FirstOrDefault(er => er.Id == roleInput.Id!.Value);
            if (existing is not null && existing.Assignments.Count > existing.Headcount)
            {
                throw new InvalidOperationException(
                    $"Role '{existing.RoleName}' has {existing.Assignments.Count} assignments but headcount is {existing.Headcount}.");
            }
        }
    }

    /// <summary>
    /// Returns a comma-separated string of changed field categories
    /// ("title", "date", "department", "visibility", "description", "roles"),
    /// or null if no relevant field changed.
    /// </summary>
    internal static string? ComputeChangedFields(ActivitySnapshot prev, Activity current, bool hasRoleChanges)
    {
        var changedFields = new List<string>();
        if (prev.Title != current.Title) changedFields.Add("title");
        if (prev.Date != current.Date || prev.StartTime != current.StartTime || prev.EndTime != current.EndTime) changedFields.Add("date");
        if (prev.DepartmentId != current.DepartmentId) changedFields.Add("department");
        if (prev.Visibility != current.Visibility) changedFields.Add("visibility");
        if (prev.Description != current.Description) changedFields.Add("description");
        if (hasRoleChanges) changedFields.Add("roles");
        return changedFields.Count > 0 ? string.Join(",", changedFields) : null;
    }

    /// <summary>
    /// Captures the pre-update field values needed for change-set computation.
    /// EF Core's <c>Entry.Properties</c> is intentionally NOT used here — the
    /// post-update snapshot we compare against is the live entity, not the
    /// EF property tracker.
    /// </summary>
    internal readonly record struct ActivitySnapshot(
        string Title,
        DateOnly Date,
        TimeOnly StartTime,
        TimeOnly EndTime,
        int? DepartmentId,
        ActivityVisibility Visibility,
        string? Description)
    {
        public static ActivitySnapshot Capture(Activity activity) => new(
            activity.Title,
            activity.Date,
            activity.StartTime,
            activity.EndTime,
            activity.DepartmentId,
            activity.Visibility,
            activity.Description);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var activity = await dbContext.Activities.FindAsync(id);
        if (activity is null)
            return false;

        var departmentId = activity.DepartmentId;
        var visibility = activity.Visibility.ToString();

        dbContext.Activities.Remove(activity);
        await dbContext.SaveChangesAsync();

        await notificationService.NotifyActivityDeletedAsync(id, departmentId, visibility);

        return true;
    }

    public async Task<List<MyAssignmentListItem>> GetMyAssignmentsAsync(int userId)
    {
        // Step A — Load entities via .Include() chain
        // Cannot use .Select() projection because avatarService.GetAvatarUrl() is not translatable to SQL.
        // Use AsNoTrackingWithIdentityResolution() because the Include path
        // RoleAssignment -> ActivityRole -> Assignments cycles back to RoleAssignment;
        // plain AsNoTracking() rejects cycles, while identity-resolution provides a per-query
        // identity map that handles the cycle without entering the change tracker.
        var assignments = await dbContext.RoleAssignments
            .AsNoTrackingWithIdentityResolution()
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
            .AsNoTracking()
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
            var predicateurRole = activity.Roles.FirstOrDefault(r => r.IsPredicateur);
            var predicateur = predicateurRole?.Assignments.FirstOrDefault()?.User;

            // Compute staffing
            var totalHeadcount = activity.Roles.Sum(r => r.Headcount);
            var assignedCount = activity.Roles.Sum(r => r.Assignments.Count);
            var roleDetails = activity.Roles.Select(r => (r.IsCritical, r.Assignments.Count));
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
        IEnumerable<(bool IsCritical, int AssignmentCount)> roleDetails)
    {
        if (totalHeadcount == 0)
            return "NoRoles";

        var hasCriticalGap = roleDetails.Any(r => r.IsCritical && r.AssignmentCount == 0);

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
                    IsCritical = r.IsCritical,
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
                activity.Roles.Select(r => (r.IsCritical, r.Assignments.Count))),
            ConcurrencyToken = activity.Version,
            CreatedAt = activity.CreatedAt,
            UpdatedAt = activity.UpdatedAt,
        };
    }
}
