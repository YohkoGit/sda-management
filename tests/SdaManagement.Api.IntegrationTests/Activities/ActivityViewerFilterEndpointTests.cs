using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class ActivityViewerFilterEndpointTests : IntegrationTestBase
{
    private int _deptMifemId;

    public ActivityViewerFilterEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var mifem = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Departments.Add(mifem);
        await dbContext.SaveChangesAsync();
        _deptMifemId = mifem.Id;

        await AssignDepartmentToUser(
            (await dbContext.Users.FirstAsync(u => u.Role == UserRole.Admin)).Id,
            _deptMifemId);
    }

    [Fact]
    public async Task GetActivities_AsViewer_WithDepartmentFilter_ReturnsActivities()
    {
        await CreateTestActivity(_deptMifemId, title: "Viewer Visible Activity");

        var response = await ViewerClient.GetAsync($"/api/activities?departmentId={_deptMifemId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBeGreaterThan(0);
        doc.RootElement[0].GetProperty("title").GetString().ShouldBe("Viewer Visible Activity");
    }

    [Fact]
    public async Task GetActivities_AsAnonymous_WithDepartmentFilter_Returns401()
    {
        var response = await AnonymousClient.GetAsync($"/api/activities?departmentId={_deptMifemId}");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetActivities_AsViewer_WithoutDepartmentFilter_Returns403()
    {
        // Unfiltered GET /api/activities should remain OWNER-only
        var response = await ViewerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }
}
