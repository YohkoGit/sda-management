using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Setup;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Setup;

public class SetupProgressEndpointTests : IntegrationTestBase
{
    public SetupProgressEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    [Fact]
    public async Task GetSetupProgress_AsAdmin_Returns403()
    {
        var response = await AdminClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSetupProgress_AsViewer_Returns403()
    {
        var response = await ViewerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSetupProgress_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSetupProgress_EmptyDb_Step1IsCurrent()
    {
        var response = await OwnerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<SetupProgressResponse>(JsonOptions);
        result.ShouldNotBeNull();

        result.Steps.Count.ShouldBe(5);
        result.Steps[0].Id.ShouldBe("church-config");
        result.Steps[0].Status.ShouldBe("current");
        result.Steps[1].Status.ShouldBe("pending");
        result.Steps[2].Status.ShouldBe("pending");
        result.Steps[3].Status.ShouldBe("pending");
        result.Steps[4].Id.ShouldBe("members");
        // SeedTestData creates Admin + Viewer users, so members step is already complete
        result.Steps[4].Status.ShouldBe("complete");
    }

    [Fact]
    public async Task GetSetupProgress_AfterConfigCreated_Step2IsCurrent()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var response = await OwnerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<SetupProgressResponse>(JsonOptions);
        result.ShouldNotBeNull();
        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("current");
    }

    [Fact]
    public async Task GetSetupProgress_AllComplete_IsSetupCompleteTrue()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        db.Departments.Add(new Department
        {
            Name = "Youth",
            Abbreviation = "YO",
            Color = "#FF0000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        db.ActivityTemplates.Add(new ActivityTemplate
        {
            Name = "Sabbath Service",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        db.ProgramSchedules.Add(new ProgramSchedule
        {
            Title = "Divine Service",
            DayOfWeek = DayOfWeek.Saturday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        // Need a non-owner, non-guest member for the "members" step
        db.Users.Add(new User
        {
            Email = "member@test.local",
            FirstName = "Test",
            LastName = "Member",
            Role = UserRole.Viewer,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var response = await OwnerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<SetupProgressResponse>(JsonOptions);
        result.ShouldNotBeNull();
        result.Steps.Count.ShouldBe(5);
        result.IsSetupComplete.ShouldBeTrue();
        result.Steps.ShouldAllBe(s => s.Status == "complete");
    }
}
