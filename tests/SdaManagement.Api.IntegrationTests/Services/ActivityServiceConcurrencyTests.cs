using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NSubstitute;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Services;

/// <summary>
/// Concurrency tests for ActivityService.UpdateAsync. Moved from the unit-test project so they
/// run against real Postgres — EF Core InMemory does not enforce concurrency tokens, so the unit
/// version could pass while production failed (xtoken mismatch was effectively ignored).
/// </summary>
public class ActivityServiceConcurrencyTests : IntegrationTestBase
{
    private int _departmentId;

    public ActivityServiceConcurrencyTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dept = new Department
        {
            Name = "Test Dept",
            Abbreviation = "TD",
            Color = "#000000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Departments.Add(dept);
        await db.SaveChangesAsync();
        _departmentId = dept.Id;
    }

    private ActivityService CreateService(AppDbContext db)
    {
        var sanitizer = Substitute.For<ISanitizationService>();
        sanitizer.Sanitize(Arg.Any<string?>()).Returns(ci => ci.Arg<string?>() ?? "");
        sanitizer.SanitizeNullable(Arg.Any<string?>()).Returns(ci => ci.Arg<string?>());

        var notificationService = Substitute.For<IActivityNotificationService>();

        return new ActivityService(db, sanitizer, notificationService);
    }

    private async Task<int> SeedActivity()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var activity = new Activity
        {
            Title = "Test Activity",
            DepartmentId = _departmentId,
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            Visibility = ActivityVisibility.Public,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Activities.Add(activity);
        await db.SaveChangesAsync();
        return activity.Id;
    }

    private UpdateActivityRequest MakeRequest(uint concurrencyToken) => new()
    {
        Title = "Updated Title",
        Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
        StartTime = new TimeOnly(10, 0),
        EndTime = new TimeOnly(12, 0),
        DepartmentId = _departmentId,
        Visibility = "public",
        ConcurrencyToken = concurrencyToken,
    };

    [Fact]
    public async Task UpdateAsync_ForceTrue_SkipsOriginalValueOverride()
    {
        var activityId = await SeedActivity();
        var request = MakeRequest(concurrencyToken: 99999); // Deliberately stale token

        // force=true should skip the OriginalValue override, so the freshly-loaded
        // Version (which matches the DB) is used — SaveChanges succeeds.
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = CreateService(db);

        var result = await service.UpdateAsync(activityId, request, force: true);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task UpdateAsync_ForceFalse_SetsOriginalValue_MatchingToken_Succeeds()
    {
        var activityId = await SeedActivity();

        // Load fresh to get the current Version value
        uint freshVersion;
        using (var readScope = Factory.Services.CreateScope())
        {
            var readDb = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fresh = await readDb.Activities.AsNoTracking().FirstAsync(a => a.Id == activityId);
            freshVersion = fresh.Version;
        }

        var request = MakeRequest(concurrencyToken: freshVersion);

        // force=false with matching token should succeed
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = CreateService(db);

        var result = await service.UpdateAsync(activityId, request, force: false);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task UpdateAsync_ForceFalse_Default_SetsOriginalValue_MatchingToken_Succeeds()
    {
        var activityId = await SeedActivity();

        uint freshVersion;
        using (var readScope = Factory.Services.CreateScope())
        {
            var readDb = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fresh = await readDb.Activities.AsNoTracking().FirstAsync(a => a.Id == activityId);
            freshVersion = fresh.Version;
        }

        var request = MakeRequest(concurrencyToken: freshVersion);

        // Calling without explicit force parameter (defaults to false)
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = CreateService(db);

        var result = await service.UpdateAsync(activityId, request);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task UpdateAsync_ForceFalse_WithStaleToken_ThrowsConcurrencyException()
    {
        // Real Postgres enforces the xtoken — this scenario was effectively a no-op under
        // InMemoryDatabase. Now we can assert the genuine concurrency behavior.
        var activityId = await SeedActivity();

        uint originalVersion;
        using (var readScope = Factory.Services.CreateScope())
        {
            var readDb = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fresh = await readDb.Activities.AsNoTracking().FirstAsync(a => a.Id == activityId);
            originalVersion = fresh.Version;
        }

        // First successful update — bumps Version
        using (var firstScope = Factory.Services.CreateScope())
        {
            var firstDb = firstScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var firstService = CreateService(firstDb);
            await firstService.UpdateAsync(activityId, MakeRequest(originalVersion), force: false);
        }

        // Second update with the stale token must fail
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = CreateService(db);

        var staleRequest = new UpdateActivityRequest
        {
            Title = "Should Not Land",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            DepartmentId = _departmentId,
            Visibility = "public",
            ConcurrencyToken = originalVersion, // stale
        };

        await Should.ThrowAsync<DbUpdateConcurrencyException>(
            () => service.UpdateAsync(activityId, staleRequest, force: false));
    }

    [Fact]
    public async Task UpdateAsync_ForceTrue_WithStaleToken_StillSucceeds()
    {
        var activityId = await SeedActivity();

        uint originalVersion;
        using (var readScope = Factory.Services.CreateScope())
        {
            var readDb = readScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var fresh = await readDb.Activities.AsNoTracking().FirstAsync(a => a.Id == activityId);
            originalVersion = fresh.Version;
        }

        // Perform a first update to bump Version
        using (var firstScope = Factory.Services.CreateScope())
        {
            var firstDb = firstScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var firstService = CreateService(firstDb);
            await firstService.UpdateAsync(activityId, MakeRequest(originalVersion), force: false);
        }

        // Now Version has changed — use original (stale) token with force=true
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = CreateService(db);

        var staleRequest = new UpdateActivityRequest
        {
            Title = "Force Updated",
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            DepartmentId = _departmentId,
            Visibility = "public",
            ConcurrencyToken = originalVersion, // stale
        };

        var result = await service.UpdateAsync(activityId, staleRequest, force: true);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Force Updated");
    }

    [Fact]
    public async Task UpdateAsync_NonExistentActivity_ReturnsNull()
    {
        await SeedActivity();

        var request = MakeRequest(concurrencyToken: 1);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var service = CreateService(db);

        var result = await service.UpdateAsync(99999, request, force: true);

        result.ShouldBeNull();
    }
}
