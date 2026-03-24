using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.ActivityTemplate;

namespace SdaManagement.Api.Services;

public class ActivityTemplateService(AppDbContext dbContext, ISanitizationService sanitizer) : IActivityTemplateService
{
    public async Task<List<ActivityTemplateListItem>> GetAllAsync()
    {
        return await dbContext.ActivityTemplates
            .OrderBy(t => t.Name)
            .Select(t => new ActivityTemplateListItem
            {
                Id = t.Id,
                Name = t.Name,
                Description = t.Description,
                RoleSummary = string.Join(", ", t.Roles
                    .OrderBy(r => r.SortOrder)
                    .Select(r => r.RoleName + " (" + r.DefaultHeadcount + ")")),
                RoleCount = t.Roles.Count,
                Roles = t.Roles
                    .OrderBy(r => r.SortOrder)
                    .Select(r => new TemplateRoleResponse
                    {
                        Id = r.Id,
                        RoleName = r.RoleName,
                        DefaultHeadcount = r.DefaultHeadcount,
                        SortOrder = r.SortOrder,
                        IsCritical = r.IsCritical,
                        IsPredicateur = r.IsPredicateur,
                    })
                    .ToList(),
            })
            .ToListAsync();
    }

    public async Task<ActivityTemplateResponse?> GetByIdAsync(int id)
    {
        return await dbContext.ActivityTemplates
            .Where(t => t.Id == id)
            .Select(t => new ActivityTemplateResponse
            {
                Id = t.Id,
                Name = t.Name,
                Description = t.Description,
                Roles = t.Roles
                    .OrderBy(r => r.SortOrder)
                    .Select(r => new TemplateRoleResponse
                    {
                        Id = r.Id,
                        RoleName = r.RoleName,
                        DefaultHeadcount = r.DefaultHeadcount,
                        SortOrder = r.SortOrder,
                        IsCritical = r.IsCritical,
                        IsPredicateur = r.IsPredicateur,
                    })
                    .ToList(),
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ActivityTemplateResponse> CreateAsync(CreateActivityTemplateRequest request)
    {
        var now = DateTime.UtcNow;

        var template = new ActivityTemplate
        {
            Name = sanitizer.Sanitize(request.Name),
            Description = sanitizer.SanitizeNullable(request.Description),
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.ActivityTemplates.Add(template);

        for (var i = 0; i < request.Roles.Count; i++)
        {
            var role = new TemplateRole
            {
                RoleName = sanitizer.Sanitize(request.Roles[i].RoleName),
                DefaultHeadcount = request.Roles[i].DefaultHeadcount,
                SortOrder = i,
                IsCritical = request.Roles[i].IsCritical ?? false,
                IsPredicateur = request.Roles[i].IsPredicateur ?? false,
                ActivityTemplate = template,
                CreatedAt = now,
                UpdatedAt = now,
            };
            dbContext.TemplateRoles.Add(role);
        }

        await dbContext.SaveChangesAsync();

        return new ActivityTemplateResponse
        {
            Id = template.Id,
            Name = template.Name,
            Description = template.Description,
            Roles = template.Roles
                .OrderBy(r => r.SortOrder)
                .Select(r => new TemplateRoleResponse
                {
                    Id = r.Id,
                    RoleName = r.RoleName,
                    DefaultHeadcount = r.DefaultHeadcount,
                    SortOrder = r.SortOrder,
                })
                .ToList(),
            CreatedAt = template.CreatedAt,
            UpdatedAt = template.UpdatedAt,
        };
    }

    public async Task<ActivityTemplateResponse?> UpdateAsync(int id, UpdateActivityTemplateRequest request)
    {
        var template = await dbContext.ActivityTemplates
            .Include(t => t.Roles)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (template is null)
            return null;

        template.Name = sanitizer.Sanitize(request.Name);
        template.Description = sanitizer.SanitizeNullable(request.Description);
        template.UpdatedAt = DateTime.UtcNow;

        // Full replacement strategy: remove all existing roles, add new ones
        dbContext.TemplateRoles.RemoveRange(template.Roles);

        for (var i = 0; i < request.Roles.Count; i++)
        {
            var role = new TemplateRole
            {
                RoleName = sanitizer.Sanitize(request.Roles[i].RoleName),
                DefaultHeadcount = request.Roles[i].DefaultHeadcount,
                SortOrder = i,
                IsCritical = request.Roles[i].IsCritical ?? false,
                IsPredicateur = request.Roles[i].IsPredicateur ?? false,
                ActivityTemplate = template,
                CreatedAt = template.UpdatedAt,
                UpdatedAt = template.UpdatedAt,
            };
            dbContext.TemplateRoles.Add(role);
        }

        await dbContext.SaveChangesAsync();

        return (await GetByIdAsync(template.Id))!;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var template = await dbContext.ActivityTemplates.FindAsync(id);
        if (template is null)
            return false;

        dbContext.ActivityTemplates.Remove(template);
        await dbContext.SaveChangesAsync();
        return true;
    }
}
