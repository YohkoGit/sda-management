using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
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

    [Fact]
    public async Task GetSetupProgress_AsOwner_Returns200WithValidResponse()
    {
        var response = await OwnerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("steps").GetArrayLength().ShouldBe(4);
        root.GetProperty("isSetupComplete").GetBoolean().ShouldBeFalse();
    }

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

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var steps = doc.RootElement.GetProperty("steps");

        steps[0].GetProperty("id").GetString().ShouldBe("church-config");
        steps[0].GetProperty("status").GetString().ShouldBe("current");
        steps[1].GetProperty("status").GetString().ShouldBe("pending");
        steps[2].GetProperty("status").GetString().ShouldBe("pending");
        steps[3].GetProperty("status").GetString().ShouldBe("pending");
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

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var steps = doc.RootElement.GetProperty("steps");

        steps[0].GetProperty("status").GetString().ShouldBe("complete");
        steps[1].GetProperty("status").GetString().ShouldBe("current");
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
        await db.SaveChangesAsync();

        var response = await OwnerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("isSetupComplete").GetBoolean().ShouldBeTrue();

        var steps = doc.RootElement.GetProperty("steps");
        for (var i = 0; i < steps.GetArrayLength(); i++)
        {
            steps[i].GetProperty("status").GetString().ShouldBe("complete");
        }
    }
}
