using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.ProgramSchedule;

namespace SdaManagement.Api.Services;

public class ProgramScheduleService(AppDbContext dbContext, ISanitizationService sanitizer) : IProgramScheduleService
{
    public async Task<List<ProgramScheduleListItem>> GetAllAsync()
    {
        return await dbContext.ProgramSchedules
            .OrderBy(p => p.DayOfWeek)
            .ThenBy(p => p.StartTime)
            .Select(p => new ProgramScheduleListItem
            {
                Id = p.Id,
                Title = p.Title,
                DayOfWeek = (int)p.DayOfWeek,
                StartTime = p.StartTime.ToString("HH:mm"),
                EndTime = p.EndTime.ToString("HH:mm"),
                HostName = p.HostName,
                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department != null ? p.Department.Name : null,
            })
            .ToListAsync();
    }

    public async Task<ProgramScheduleResponse?> GetByIdAsync(int id)
    {
        return await dbContext.ProgramSchedules
            .Where(p => p.Id == id)
            .Select(p => new ProgramScheduleResponse
            {
                Id = p.Id,
                Title = p.Title,
                DayOfWeek = (int)p.DayOfWeek,
                StartTime = p.StartTime.ToString("HH:mm"),
                EndTime = p.EndTime.ToString("HH:mm"),
                HostName = p.HostName,
                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department != null ? p.Department.Name : null,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ProgramScheduleResponse?> CreateAsync(CreateProgramScheduleRequest request)
    {
        if (request.DepartmentId.HasValue)
        {
            var departmentExists = await dbContext.Departments.AnyAsync(d => d.Id == request.DepartmentId.Value);
            if (!departmentExists)
                return null;
        }

        var now = DateTime.UtcNow;

        var schedule = new ProgramSchedule
        {
            Title = sanitizer.Sanitize(request.Title),
            DayOfWeek = (DayOfWeek)request.DayOfWeek,
            StartTime = TimeOnly.ParseExact(request.StartTime, "HH:mm"),
            EndTime = TimeOnly.ParseExact(request.EndTime, "HH:mm"),
            HostName = sanitizer.SanitizeNullable(request.HostName),
            DepartmentId = request.DepartmentId,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.ProgramSchedules.Add(schedule);
        await dbContext.SaveChangesAsync();

        // Reload with department name
        return await GetByIdAsync(schedule.Id);
    }

    public async Task<ProgramScheduleResponse?> UpdateAsync(int id, UpdateProgramScheduleRequest request)
    {
        var schedule = await dbContext.ProgramSchedules.FindAsync(id);
        if (schedule is null)
            return null;

        if (request.DepartmentId.HasValue)
        {
            var departmentExists = await dbContext.Departments.AnyAsync(d => d.Id == request.DepartmentId.Value);
            if (!departmentExists)
                return null;
        }

        schedule.Title = sanitizer.Sanitize(request.Title);
        schedule.DayOfWeek = (DayOfWeek)request.DayOfWeek;
        schedule.StartTime = TimeOnly.ParseExact(request.StartTime, "HH:mm");
        schedule.EndTime = TimeOnly.ParseExact(request.EndTime, "HH:mm");
        schedule.HostName = sanitizer.SanitizeNullable(request.HostName);
        schedule.DepartmentId = request.DepartmentId;
        schedule.UpdatedAt = DateTime.UtcNow;

        await dbContext.SaveChangesAsync();

        return await GetByIdAsync(schedule.Id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var schedule = await dbContext.ProgramSchedules.FindAsync(id);
        if (schedule is null)
            return false;

        dbContext.ProgramSchedules.Remove(schedule);
        await dbContext.SaveChangesAsync();
        return true;
    }
}
