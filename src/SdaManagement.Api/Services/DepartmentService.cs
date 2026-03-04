using Microsoft.EntityFrameworkCore;
using Npgsql;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Department;

namespace SdaManagement.Api.Services;

public class DepartmentService(AppDbContext dbContext, ISanitizationService sanitizer) : IDepartmentService
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

    public async Task<DepartmentResponse?> GetByIdAsync(int id)
    {
        return await dbContext.Departments
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
                    })
                    .ToList(),
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
            })
            .FirstOrDefaultAsync();
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
                .Select(s => new SubMinistryResponse { Id = s.Id, Name = s.Name })
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

        var now = DateTime.UtcNow;
        var subMinistry = new SubMinistry
        {
            Name = sanitizer.Sanitize(request.Name),
            DepartmentId = departmentId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.SubMinistries.Add(subMinistry);
        await dbContext.SaveChangesAsync();

        return new SubMinistryResponse { Id = subMinistry.Id, Name = subMinistry.Name };
    }

    public async Task<SubMinistryResponse?> UpdateSubMinistryAsync(int departmentId, int subMinistryId, UpdateSubMinistryRequest request)
    {
        var subMinistry = await dbContext.SubMinistries
            .FirstOrDefaultAsync(s => s.Id == subMinistryId && s.DepartmentId == departmentId);

        if (subMinistry is null)
            return null;

        subMinistry.Name = sanitizer.Sanitize(request.Name);
        subMinistry.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return new SubMinistryResponse { Id = subMinistry.Id, Name = subMinistry.Name };
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
}
