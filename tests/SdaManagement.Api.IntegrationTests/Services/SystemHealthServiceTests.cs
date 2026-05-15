using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using NSubstitute;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Services;

/// <summary>
/// Service-level tests for SystemHealthService. Moved from the unit-test project so the DB
/// counts (ChurchConfigs.AnyAsync, Departments.CountAsync, etc.) run against real Postgres.
/// HealthCheckService is still substituted so we can drive status branches (Healthy / Unhealthy
/// / Degraded) deterministically — the substitution doesn't change which behaviour we're testing.
/// </summary>
public class SystemHealthServiceTests : IntegrationTestBase
{
    public SystemHealthServiceTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    private SystemHealthService CreateService(AppDbContext db, HealthCheckService healthCheckService)
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.EnvironmentName.Returns("Development");
        return new SystemHealthService(healthCheckService, db, env);
    }

    private static HealthCheckService SetupHealthReport(HealthStatus status, string? description, Exception? exception)
    {
        var healthCheckService = Substitute.For<HealthCheckService>();
        var entries = new Dictionary<string, HealthReportEntry>
        {
            ["npgsql"] = new(
                status,
                description,
                TimeSpan.FromMilliseconds(23),
                exception,
                null),
        };

        healthCheckService
            .CheckHealthAsync(Arg.Any<Func<HealthCheckRegistration, bool>?>(), Arg.Any<CancellationToken>())
            .Returns(new HealthReport(entries, TimeSpan.FromMilliseconds(23)));

        return healthCheckService;
    }

    [Fact]
    public async Task GetSystemHealthAsync_HealthyPostgreSql_ReturnsHealthyStatus()
    {
        var health = SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.Status.ShouldBe("Healthy");
        result.Checks.ShouldHaveSingleItem();
        result.Checks[0].Name.ShouldBe("npgsql");
        result.Checks[0].Status.ShouldBe("Healthy");
        result.Checks[0].Description.ShouldBeNull();
    }

    [Fact]
    public async Task GetSystemHealthAsync_UnhealthyPostgreSql_ReturnsUnhealthyWithDescription()
    {
        var health = SetupHealthReport(
            HealthStatus.Unhealthy,
            description: "Failed to connect",
            exception: new Exception("Connection refused"));

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.Status.ShouldBe("Unhealthy");
        result.Checks.ShouldHaveSingleItem();
        result.Checks[0].Status.ShouldBe("Unhealthy");
        result.Checks[0].Description.ShouldBe("Failed to connect");
    }

    [Fact]
    public async Task GetSystemHealthAsync_UnhealthyPostgreSql_NoDescription_FallsBackToExceptionMessage()
    {
        var health = SetupHealthReport(
            HealthStatus.Unhealthy,
            description: null,
            exception: new Exception("Connection refused"));

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.Checks[0].Description.ShouldBe("Connection refused");
    }

    [Fact]
    public async Task GetSystemHealthAsync_DegradedPostgreSql_ReturnsDegradedStatus()
    {
        var health = SetupHealthReport(HealthStatus.Degraded, description: "Slow response", exception: null);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.Status.ShouldBe("Degraded");
        result.Checks[0].Status.ShouldBe("Degraded");
    }

    [Fact]
    public async Task GetSystemHealthAsync_UptimeSeconds_IsNonNegative()
    {
        var health = SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        // uptime truncates to long, so 0 is valid in the first second after process start
        result.UptimeSeconds.ShouldBeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task GetSystemHealthAsync_SetupStatusCounts_AreCorrectlyPopulated()
    {
        var health = SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        using (var seedScope = Factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
            seedDb.ChurchConfigs.Add(new ChurchConfig
            {
                ChurchName = "Test Church",
                DefaultLocale = "fr",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            seedDb.Departments.Add(new Department
            {
                Name = "Youth",
                Abbreviation = "YO",
                Color = "#FF0000",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            seedDb.Departments.Add(new Department
            {
                Name = "Music",
                Abbreviation = "MU",
                Color = "#00FF00",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            seedDb.Users.Add(new User
            {
                Email = "test@test.local",
                FirstName = "Test",
                LastName = "User",
                Role = UserRole.Owner,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.SetupStatus.ChurchConfigExists.ShouldBeTrue();
        result.SetupStatus.DepartmentCount.ShouldBe(2);
        result.SetupStatus.TemplateCount.ShouldBe(0);
        result.SetupStatus.ScheduleCount.ShouldBe(0);
        result.SetupStatus.UserCount.ShouldBe(1);
    }

    [Fact]
    public async Task GetSystemHealthAsync_NoChurchConfig_ReturnsFalse()
    {
        var health = SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.SetupStatus.ChurchConfigExists.ShouldBeFalse();
        result.SetupStatus.DepartmentCount.ShouldBe(0);
    }

    [Fact]
    public async Task GetSystemHealthAsync_ReturnsEnvironmentName()
    {
        var health = SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.Environment.ShouldBe("Development");
    }

    [Fact]
    public async Task GetSystemHealthAsync_ReturnsNonEmptyVersion()
    {
        var health = SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db, health);

        var result = await sut.GetSystemHealthAsync(CancellationToken.None);

        result.Version.ShouldNotBeNullOrEmpty();
    }
}
