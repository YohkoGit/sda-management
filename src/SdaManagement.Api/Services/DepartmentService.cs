using Microsoft.EntityFrameworkCore;
using Npgsql;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Department;
using SdaManagement.Api.Exceptions;

namespace SdaManagement.Api.Services;

public class DepartmentService(AppDbContext dbContext, ISanitizationService sanitizer, IAvatarService avatarService) : IDepartmentService
{
    public async Task<List<DepartmentListItem>> GetAllAsync()
    {
        return await dbContext.Departments
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentListItem
            {
                Id = d.Id,
                Name = d.Name,
                Abbreviation = d.Abbreviation,
                Color = d.Color,
                Description = d.Description,
                SubMinistryCount = d.SubMinistries.Count,
            })
            .ToListAsync();
    }

    public async Task<List<DepartmentWithStaffingListItem>> GetAllWithStaffingAsync()
    {
        // Query 1: Departments with SubMinistryCount
        var departments = await dbContext.Departments
            .OrderBy(d => d.Name)
            .Select(d => new
            {
                d.Id, d.Name, d.Abbreviation, d.Color, d.Description,
                SubMinistryCount = d.SubMinistries.Count,
            })
            .ToListAsync();

        // Query 2: Upcoming activities with role details
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var activityData = await dbContext.Activities
            .Where(a => a.DepartmentId.HasValue && a.Date >= today)
            .Select(a => new
            {
                DepartmentId = a.DepartmentId!.Value,
                TotalHeadcount = a.Roles.Sum(r => r.Headcount),
                AssignedCount = a.Roles.Sum(r => r.Assignments.Count),
                RoleDetails = a.Roles.Select(r => new
                {
                    r.RoleName,
                    AssignmentCount = r.Assignments.Count,
                }).ToList(),
            })
            .ToListAsync();

        // In-memory: group by department, compute worst-case staffing
        var staffingByDept = activityData
            .GroupBy(a => a.DepartmentId)
            .ToDictionary(
                g => g.Key,
                g => new
                {
                    Count = g.Count(),
                    AggregateStatus = ComputeAggregateStaffing(g.Select(a => new ActivityStaffingData(
                        a.TotalHeadcount,
                        a.AssignedCount,
                        a.RoleDetails.Select(r => (r.RoleName, r.AssignmentCount))))),
                });

        return departments.Select(d =>
        {
            var staffing = staffingByDept.GetValueOrDefault(d.Id);
            return new DepartmentWithStaffingListItem
            {
                Id = d.Id,
                Name = d.Name,
                Abbreviation = d.Abbreviation,
                Color = d.Color,
                Description = d.Description,
                SubMinistryCount = d.SubMinistryCount,
                UpcomingActivityCount = staffing?.Count ?? 0,
                AggregateStaffingStatus = staffing?.AggregateStatus ?? "NoActivities",
            };
        }).ToList();
    }

    private static string ComputeAggregateStaffing(IEnumerable<ActivityStaffingData> activities)
    {
        var hasAny = false;
        var worstCase = "FullyStaffed";
        foreach (var a in activities)
        {
            var status = ActivityService.ComputeStaffingStatus(
                a.TotalHeadcount, a.AssignedCount, a.RoleDetails);
            if (status == "NoRoles")
                continue;
            hasAny = true;
            if (status == "CriticalGap")
                return "CriticalGap";
            if (status == "PartiallyStaffed")
                worstCase = "PartiallyStaffed";
        }
        return hasAny ? worstCase : "NoActivities";
    }

    private sealed record ActivityStaffingData(
        int TotalHeadcount,
        int AssignedCount,
        IEnumerable<(string RoleName, int AssignmentCount)> RoleDetails);

    public async Task<DepartmentResponse?> GetByIdAsync(int id)
    {
        var result = await dbContext.Departments
            .Where(d => d.Id == id)
            .Select(d => new DepartmentResponse
            {
                Id = d.Id,
                Name = d.Name,
                Abbreviation = d.Abbreviation,
                Color = d.Color,
                Description = d.Description,
                SubMinistries = d.SubMinistries
                    .OrderBy(s => s.Name)
                    .Select(s => new SubMinistryResponse
                    {
                        Id = s.Id,
                        Name = s.Name,
                        LeadUserId = s.LeadUserId,
                        LeadFirstName = s.Lead != null ? s.Lead.FirstName : null,
                        LeadLastName = s.Lead != null ? s.Lead.LastName : null,
                    })
                    .ToList(),
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
            })
            .FirstOrDefaultAsync();

        if (result != null)
        {
            foreach (var sm in result.SubMinistries.Where(sm => sm.LeadUserId.HasValue))
                sm.LeadAvatarUrl = avatarService.GetAvatarUrl(sm.LeadUserId!.Value);
        }

        return result;
    }

    private static string DeriveAbbreviation(string name)
    {
        return name.ToUpperInvariant().Length <= 10
            ? name.ToUpperInvariant()
            : name.ToUpperInvariant()[..10];
    }

    public async Task<DepartmentResponse> CreateAsync(CreateDepartmentRequest request)
    {
        var now = DateTime.UtcNow;
        var abbreviation = string.IsNullOrWhiteSpace(request.Abbreviation)
            ? DeriveAbbreviation(sanitizer.Sanitize(request.Name))
            : sanitizer.Sanitize(request.Abbreviation);

        var department = new Department
        {
            Name = sanitizer.Sanitize(request.Name),
            Abbreviation = abbreviation,
            Color = sanitizer.Sanitize(request.Color),
            Description = sanitizer.SanitizeNullable(request.Description),
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Departments.Add(department);

        if (request.SubMinistryNames is { Count: > 0 })
        {
            foreach (var name in request.SubMinistryNames)
            {
                var subMinistry = new SubMinistry
                {
                    Name = sanitizer.Sanitize(name),
                    Department = department,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                dbContext.SubMinistries.Add(subMinistry);
            }
        }

        await dbContext.SaveChangesAsync();

        return new DepartmentResponse
        {
            Id = department.Id,
            Name = department.Name,
            Abbreviation = department.Abbreviation,
            Color = department.Color,
            Description = department.Description,
            SubMinistries = department.SubMinistries
                .OrderBy(s => s.Name)
                .Select(s => new SubMinistryResponse { Id = s.Id, Name = s.Name })
                .ToList(),
            CreatedAt = department.CreatedAt,
            UpdatedAt = department.UpdatedAt,
        };
    }

    public async Task<DepartmentResponse?> UpdateAsync(int id, UpdateDepartmentRequest request)
    {
        var department = await dbContext.Departments
            .Include(d => d.SubMinistries)
                .ThenInclude(s => s.Lead)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department is null)
            return null;

        department.Name = sanitizer.Sanitize(request.Name);
        department.Abbreviation = string.IsNullOrWhiteSpace(request.Abbreviation)
            ? DeriveAbbreviation(sanitizer.Sanitize(request.Name))
            : sanitizer.Sanitize(request.Abbreviation);
        department.Color = sanitizer.Sanitize(request.Color);
        department.Description = sanitizer.SanitizeNullable(request.Description);
        department.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return new DepartmentResponse
        {
            Id = department.Id,
            Name = department.Name,
            Abbreviation = department.Abbreviation,
            Color = department.Color,
            Description = department.Description,
            SubMinistries = department.SubMinistries
                .OrderBy(s => s.Name)
                .Select(s => new SubMinistryResponse
                {
                    Id = s.Id,
                    Name = s.Name,
                    LeadUserId = s.LeadUserId,
                    LeadFirstName = s.Lead?.FirstName,
                    LeadLastName = s.Lead?.LastName,
                    LeadAvatarUrl = s.LeadUserId.HasValue ? avatarService.GetAvatarUrl(s.LeadUserId.Value) : null,
                })
                .ToList(),
            CreatedAt = department.CreatedAt,
            UpdatedAt = department.UpdatedAt,
        };
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var department = await dbContext.Departments.FindAsync(id);
        if (department is null)
            return false;

        dbContext.Departments.Remove(department);
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<SubMinistryResponse?> AddSubMinistryAsync(int departmentId, CreateSubMinistryRequest request)
    {
        var departmentExists = await dbContext.Departments.AnyAsync(d => d.Id == departmentId);
        if (!departmentExists)
            return null;

        User? lead = null;
        if (request.LeadUserId.HasValue)
            lead = await ValidateAndLoadLead(request.LeadUserId.Value, departmentId);

        var now = DateTime.UtcNow;
        var subMinistry = new SubMinistry
        {
            Name = sanitizer.Sanitize(request.Name),
            DepartmentId = departmentId,
            LeadUserId = request.LeadUserId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.SubMinistries.Add(subMinistry);
        await dbContext.SaveChangesAsync();

        return BuildSubMinistryResponse(subMinistry, lead);
    }

    public async Task<SubMinistryResponse?> UpdateSubMinistryAsync(int departmentId, int subMinistryId, UpdateSubMinistryRequest request)
    {
        var subMinistry = await dbContext.SubMinistries
            .FirstOrDefaultAsync(s => s.Id == subMinistryId && s.DepartmentId == departmentId);

        if (subMinistry is null)
            return null;

        User? lead = null;
        if (request.LeadUserId.HasValue)
            lead = await ValidateAndLoadLead(request.LeadUserId.Value, departmentId);

        subMinistry.Name = sanitizer.Sanitize(request.Name);
        subMinistry.LeadUserId = request.LeadUserId;
        subMinistry.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return BuildSubMinistryResponse(subMinistry, lead);
    }

    public async Task<bool> DeleteSubMinistryAsync(int departmentId, int subMinistryId)
    {
        var subMinistry = await dbContext.SubMinistries
            .FirstOrDefaultAsync(s => s.Id == subMinistryId && s.DepartmentId == departmentId);

        if (subMinistry is null)
            return false;

        dbContext.SubMinistries.Remove(subMinistry);
        await dbContext.SaveChangesAsync();
        return true;
    }

    private async Task<User> ValidateAndLoadLead(int leadUserId, int departmentId)
    {
        var user = await dbContext.Users.FindAsync(leadUserId)
            ?? throw new BadRequestException("Lead user does not exist");

        var isMember = await dbContext.Set<UserDepartment>()
            .AnyAsync(ud => ud.UserId == leadUserId && ud.DepartmentId == departmentId);

        if (!isMember)
            throw new BadRequestException("Lead user is not a member of this department");

        return user;
    }

    private SubMinistryResponse BuildSubMinistryResponse(SubMinistry subMinistry, User? lead = null)
    {
        return new SubMinistryResponse
        {
            Id = subMinistry.Id,
            Name = subMinistry.Name,
            LeadUserId = subMinistry.LeadUserId,
            LeadFirstName = lead?.FirstName,
            LeadLastName = lead?.LastName,
            LeadAvatarUrl = lead != null ? avatarService.GetAvatarUrl(lead.Id) : null,
        };
    }
}
