using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Services;

/// <summary>
/// Service-level tests for SetupProgressService. Moved from the unit-test project so the
/// DB queries (AnyAsync, CountAsync against the EF model) run against real Postgres, matching
/// how production filters by IsGuest and Role enum values.
/// </summary>
public class SetupProgressServiceTests : IntegrationTestBase
{
    public SetupProgressServiceTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    private SetupProgressService CreateService(AppDbContext db) => new(db);

    [Fact]
    public async Task GetSetupProgressAsync_EmptyDb_Step1CurrentRestPending()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db);

        var result = await sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps.Count.ShouldBe(5);
        result.Steps[0].Id.ShouldBe("church-config");
        result.Steps[0].Status.ShouldBe("current");
        result.Steps[1].Id.ShouldBe("departments");
        result.Steps[1].Status.ShouldBe("pending");
        result.Steps[2].Id.ShouldBe("templates");
        result.Steps[2].Status.ShouldBe("pending");
        result.Steps[3].Id.ShouldBe("schedules");
        result.Steps[3].Status.ShouldBe("pending");
        result.Steps[4].Id.ShouldBe("members");
        result.Steps[4].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_ConfigExists_Step1CompleteStep2Current()
    {
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
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db);

        var result = await sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("current");
        result.Steps[2].Status.ShouldBe("pending");
        result.Steps[3].Status.ShouldBe("pending");
        result.Steps[4].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_ConfigAndDepartments_Steps12CompleteStep3Current()
    {
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
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db);

        var result = await sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("complete");
        result.Steps[2].Status.ShouldBe("current");
        result.Steps[3].Status.ShouldBe("pending");
        result.Steps[4].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_ConfigDepartmentsTemplates_Steps123CompleteStep4Current()
    {
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
            seedDb.ActivityTemplates.Add(new ActivityTemplate
            {
                Name = "Sabbath Service",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db);

        var result = await sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("complete");
        result.Steps[2].Status.ShouldBe("complete");
        result.Steps[3].Status.ShouldBe("current");
        result.Steps[4].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_AllComplete_IsSetupCompleteTrue()
    {
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
            seedDb.ActivityTemplates.Add(new ActivityTemplate
            {
                Name = "Sabbath Service",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            seedDb.ProgramSchedules.Add(new ProgramSchedule
            {
                Title = "Divine Service",
                DayOfWeek = DayOfWeek.Saturday,
                StartTime = new TimeOnly(10, 0),
                EndTime = new TimeOnly(12, 0),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            seedDb.Users.Add(new User
            {
                Email = "member@test.local",
                FirstName = "Test",
                LastName = "Member",
                Role = UserRole.Viewer,
                IsGuest = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var sut = CreateService(db);

        var result = await sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps.Count.ShouldBe(5);
        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("complete");
        result.Steps[2].Status.ShouldBe("complete");
        result.Steps[3].Status.ShouldBe("complete");
        result.Steps[4].Status.ShouldBe("complete");
        result.IsSetupComplete.ShouldBeTrue();
    }
}
