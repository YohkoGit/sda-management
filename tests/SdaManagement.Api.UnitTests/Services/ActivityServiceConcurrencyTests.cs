using Microsoft.EntityFrameworkCore;
using NSubstitute;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

public class ActivityServiceConcurrencyTests : IDisposable
{
    private readonly AppDbContext _dbContext;
    private readonly ActivityService _service;

    public ActivityServiceConcurrencyTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: $"ConcurrencyTest_{Guid.NewGuid()}")
            .Options;

        _dbContext = new AppDbContext(options);

        var sanitizer = Substitute.For<ISanitizationService>();
        sanitizer.Sanitize(Arg.Any<string?>()).Returns(ci => ci.Arg<string?>() ?? "");
        sanitizer.SanitizeNullable(Arg.Any<string?>()).Returns(ci => ci.Arg<string?>());

        var avatarService = Substitute.For<IAvatarService>();
        var notificationService = Substitute.For<IActivityNotificationService>();

        _service = new ActivityService(_dbContext, sanitizer, avatarService, notificationService);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }

    private async Task<Activity> SeedActivity()
    {
        var dept = new Department
        {
            Name = "Test Dept",
            Abbreviation = "TD",
            Color = "#000000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _dbContext.Departments.Add(dept);
        await _dbContext.SaveChangesAsync();

        var activity = new Activity
        {
            Title = "Test Activity",
            DepartmentId = dept.Id,
            Date = new DateOnly(2026, 3, 15),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            Visibility = ActivityVisibility.Public,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _dbContext.Activities.Add(activity);
        await _dbContext.SaveChangesAsync();

        // Detach so the service loads fresh
        _dbContext.ChangeTracker.Clear();

        return activity;
    }

    private UpdateActivityRequest MakeRequest(uint concurrencyToken) => new()
    {
        Title = "Updated Title",
        Date = new DateOnly(2026, 3, 15),
        StartTime = new TimeOnly(10, 0),
        EndTime = new TimeOnly(12, 0),
        DepartmentId = 1,
        Visibility = "public",
        ConcurrencyToken = concurrencyToken,
    };

    [Fact]
    public async Task UpdateAsync_ForceTrue_SkipsOriginalValueOverride()
    {
        var activity = await SeedActivity();
        var request = MakeRequest(concurrencyToken: 99999); // Deliberately stale token

        // force=true should skip the OriginalValue override, so the freshly-loaded
        // Version (which matches the DB) is used — SaveChanges succeeds.
        var result = await _service.UpdateAsync(activity.Id, request, force: true);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task UpdateAsync_ForceFalse_SetsOriginalValue_MatchingToken_Succeeds()
    {
        var activity = await SeedActivity();

        // Load fresh to get the current Version value
        var fresh = await _dbContext.Activities.AsNoTracking().FirstAsync(a => a.Id == activity.Id);
        _dbContext.ChangeTracker.Clear();

        var request = MakeRequest(concurrencyToken: fresh.Version);

        // force=false with matching token should succeed
        var result = await _service.UpdateAsync(activity.Id, request, force: false);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task UpdateAsync_ForceFalse_Default_SetsOriginalValue_MatchingToken_Succeeds()
    {
        var activity = await SeedActivity();

        var fresh = await _dbContext.Activities.AsNoTracking().FirstAsync(a => a.Id == activity.Id);
        _dbContext.ChangeTracker.Clear();

        var request = MakeRequest(concurrencyToken: fresh.Version);

        // Calling without explicit force parameter (defaults to false)
        var result = await _service.UpdateAsync(activity.Id, request);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Updated Title");
    }

    [Fact]
    public async Task UpdateAsync_ForceTrue_WithStaleToken_StillSucceeds()
    {
        var activity = await SeedActivity();

        // Perform a first update to change the Version
        var fresh = await _dbContext.Activities.AsNoTracking().FirstAsync(a => a.Id == activity.Id);
        var originalVersion = fresh.Version;
        _dbContext.ChangeTracker.Clear();

        var firstRequest = MakeRequest(concurrencyToken: originalVersion);
        await _service.UpdateAsync(activity.Id, firstRequest, force: false);
        _dbContext.ChangeTracker.Clear();

        // Now Version has changed — use original (stale) token with force=true
        var staleRequest = new UpdateActivityRequest
        {
            Title = "Force Updated",
            Date = new DateOnly(2026, 3, 15),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            DepartmentId = 1,
            Visibility = "public",
            ConcurrencyToken = originalVersion, // stale
        };

        var result = await _service.UpdateAsync(activity.Id, staleRequest, force: true);

        result.ShouldNotBeNull();
        result.Title.ShouldBe("Force Updated");
    }

    [Fact]
    public async Task UpdateAsync_NonExistentActivity_ReturnsNull()
    {
        await SeedActivity();

        var request = MakeRequest(concurrencyToken: 1);

        var result = await _service.UpdateAsync(99999, request, force: true);

        result.ShouldBeNull();
    }
}
