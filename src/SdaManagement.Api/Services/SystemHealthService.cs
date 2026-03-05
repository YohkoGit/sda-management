using System.Diagnostics;
using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using SdaManagement.Api.Data;
using SdaManagement.Api.Dtos.SystemHealth;

namespace SdaManagement.Api.Services;

public class SystemHealthService(
    HealthCheckService healthCheckService,
    AppDbContext db,
    IWebHostEnvironment env) : ISystemHealthService
{
    public async Task<SystemHealthResponse> GetSystemHealthAsync(CancellationToken cancellationToken)
    {
        var report = await healthCheckService.CheckHealthAsync(null, cancellationToken);

        var checks = report.Entries.Select(entry => new HealthCheckItem
        {
            Name = entry.Key,
            Status = entry.Value.Status.ToString(),
            Description = entry.Value.Description ?? entry.Value.Exception?.Message,
            Duration = entry.Value.Duration.ToString(),
        }).ToList();

        var version = typeof(Program).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            ?? typeof(Program).Assembly.GetName().Version?.ToString()
            ?? "unknown";

        var uptime = DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime();
        var uptimeSeconds = (long)uptime.TotalSeconds;

        var setupStatus = new SetupStatusResponse
        {
            ChurchConfigExists = await db.ChurchConfigs.AnyAsync(cancellationToken),
            DepartmentCount = await db.Departments.CountAsync(cancellationToken),
            TemplateCount = await db.ActivityTemplates.CountAsync(cancellationToken),
            ScheduleCount = await db.ProgramSchedules.CountAsync(cancellationToken),
            UserCount = await db.Users.CountAsync(cancellationToken),
        };

        return new SystemHealthResponse
        {
            Status = report.Status.ToString(),
            Checks = checks,
            Version = version,
            UptimeSeconds = uptimeSeconds,
            Environment = env.EnvironmentName,
            SetupStatus = setupStatus,
        };
    }
}
