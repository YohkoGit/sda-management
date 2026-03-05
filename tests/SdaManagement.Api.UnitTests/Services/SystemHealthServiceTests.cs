using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Hosting;
using NSubstitute;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;
using Microsoft.AspNetCore.Hosting;

namespace SdaManagement.Api.UnitTests.Services;

public class SystemHealthServiceTests : IDisposable
{
    private readonly HealthCheckService _healthCheckService;
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;
    private readonly SystemHealthService _sut;

    public SystemHealthServiceTests()
    {
        _healthCheckService = Substitute.For<HealthCheckService>();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _env = Substitute.For<IWebHostEnvironment>();
        _env.EnvironmentName.Returns("Development");

        _sut = new SystemHealthService(_healthCheckService, _db, _env);
    }

    [Fact]
    public async Task GetSystemHealthAsync_HealthyPostgreSql_ReturnsHealthyStatus()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.Status.ShouldBe("Healthy");
        result.Checks.ShouldHaveSingleItem();
        result.Checks[0].Name.ShouldBe("npgsql");
        result.Checks[0].Status.ShouldBe("Healthy");
        result.Checks[0].Description.ShouldBeNull();
    }

    [Fact]
    public async Task GetSystemHealthAsync_UnhealthyPostgreSql_ReturnsUnhealthyWithDescription()
    {
        // Arrange
        SetupHealthReport(
            HealthStatus.Unhealthy,
            description: "Failed to connect",
            exception: new Exception("Connection refused"));

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.Status.ShouldBe("Unhealthy");
        result.Checks.ShouldHaveSingleItem();
        result.Checks[0].Status.ShouldBe("Unhealthy");
        result.Checks[0].Description.ShouldBe("Failed to connect");
    }

    [Fact]
    public async Task GetSystemHealthAsync_UnhealthyPostgreSql_NoDescription_FallsBackToExceptionMessage()
    {
        // Arrange
        SetupHealthReport(
            HealthStatus.Unhealthy,
            description: null,
            exception: new Exception("Connection refused"));

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.Checks[0].Description.ShouldBe("Connection refused");
    }

    [Fact]
    public async Task GetSystemHealthAsync_DegradedPostgreSql_ReturnsDegradedStatus()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Degraded, description: "Slow response", exception: null);

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.Status.ShouldBe("Degraded");
        result.Checks[0].Status.ShouldBe("Degraded");
    }

    [Fact]
    public async Task GetSystemHealthAsync_UptimeSeconds_IsPositive()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.UptimeSeconds.ShouldBeGreaterThan(0);
    }

    [Fact]
    public async Task GetSystemHealthAsync_SetupStatusCounts_AreCorrectlyPopulated()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        _db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Departments.Add(new Department
        {
            Name = "Youth",
            Abbreviation = "YO",
            Color = "#FF0000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Departments.Add(new Department
        {
            Name = "Music",
            Abbreviation = "MU",
            Color = "#00FF00",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Users.Add(new User
        {
            Email = "test@test.local",
            FirstName = "Test",
            LastName = "User",
            Role = UserRole.Owner,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.SetupStatus.ChurchConfigExists.ShouldBeTrue();
        result.SetupStatus.DepartmentCount.ShouldBe(2);
        result.SetupStatus.TemplateCount.ShouldBe(0);
        result.SetupStatus.ScheduleCount.ShouldBe(0);
        result.SetupStatus.UserCount.ShouldBe(1);
    }

    [Fact]
    public async Task GetSystemHealthAsync_NoChurchConfig_ReturnsFalse()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.SetupStatus.ChurchConfigExists.ShouldBeFalse();
        result.SetupStatus.DepartmentCount.ShouldBe(0);
    }

    [Fact]
    public async Task GetSystemHealthAsync_ReturnsEnvironmentName()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.Environment.ShouldBe("Development");
    }

    [Fact]
    public async Task GetSystemHealthAsync_ReturnsNonEmptyVersion()
    {
        // Arrange
        SetupHealthReport(HealthStatus.Healthy, description: null, exception: null);

        // Act
        var result = await _sut.GetSystemHealthAsync(CancellationToken.None);

        // Assert
        result.Version.ShouldNotBeNullOrEmpty();
    }

    private void SetupHealthReport(HealthStatus status, string? description, Exception? exception)
    {
        var entries = new Dictionary<string, HealthReportEntry>
        {
            ["npgsql"] = new(
                status,
                description,
                TimeSpan.FromMilliseconds(23),
                exception,
                null),
        };

        _healthCheckService
            .CheckHealthAsync(Arg.Any<Func<HealthCheckRegistration, bool>?>(), Arg.Any<CancellationToken>())
            .Returns(new HealthReport(entries, TimeSpan.FromMilliseconds(23)));
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
