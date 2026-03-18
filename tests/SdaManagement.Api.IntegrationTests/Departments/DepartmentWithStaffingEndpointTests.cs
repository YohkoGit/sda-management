using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Departments;

public class DepartmentWithStaffingEndpointTests : IntegrationTestBase
{
    private int _deptMifemId;
    private int _deptJaId;
    private int _deptDiaId;
    private int _viewerUserId;

    public DepartmentWithStaffingEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        var viewer = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        _viewerUserId = viewer.Id;

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
        var ja = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#10B981",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var dia = new Department
        {
            Name = "Diaconat",
            Abbreviation = "DIA",
            Color = "#EF4444",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Departments.AddRange(mifem, ja, dia);
        await dbContext.SaveChangesAsync();

        _deptMifemId = mifem.Id;
        _deptJaId = ja.Id;
        _deptDiaId = dia.Id;
    }

    [Fact]
    public async Task GetDepartmentsWithStaffing_AsViewer_ReturnsAggregateStatus()
    {
        // Seed a fully staffed activity for MIFEM (future date)
        await CreateTestActivity(
            _deptMifemId,
            title: "Fully Staffed Activity",
            date: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Predicateur", 1, [_viewerUserId]), ("Ancien de Service", 1, [_viewerUserId])]);

        // Seed a critical gap activity for JA (predicateur with 0 assignments)
        await CreateTestActivity(
            _deptJaId,
            title: "Critical Gap Activity",
            date: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            roles: [("Predicateur", 1, null), ("Choriste", 2, [_viewerUserId])]);

        // DIA has no activities → NoActivities

        var response = await ViewerClient.GetAsync("/api/departments/with-staffing");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var departments = doc.RootElement;
        departments.GetArrayLength().ShouldBe(3);

        // Find each department by name (sorted alphabetically)
        var diaElem = departments.EnumerateArray().First(d => d.GetProperty("abbreviation").GetString() == "DIA");
        var jaElem = departments.EnumerateArray().First(d => d.GetProperty("abbreviation").GetString() == "JA");
        var mifemElem = departments.EnumerateArray().First(d => d.GetProperty("abbreviation").GetString() == "MIFEM");

        diaElem.GetProperty("aggregateStaffingStatus").GetString().ShouldBe("NoActivities");
        diaElem.GetProperty("upcomingActivityCount").GetInt32().ShouldBe(0);

        jaElem.GetProperty("aggregateStaffingStatus").GetString().ShouldBe("CriticalGap");
        jaElem.GetProperty("upcomingActivityCount").GetInt32().ShouldBe(1);

        mifemElem.GetProperty("aggregateStaffingStatus").GetString().ShouldBe("FullyStaffed");
        mifemElem.GetProperty("upcomingActivityCount").GetInt32().ShouldBe(1);
    }

    [Fact]
    public async Task GetDepartmentsWithStaffing_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/departments/with-staffing");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetDepartmentsWithStaffing_PastActivitiesExcluded_ReturnsNoActivitiesStatus()
    {
        // Past activities should not affect the aggregate staffing status
        await CreateTestActivity(
            _deptMifemId,
            title: "Past Activity",
            date: DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-7)),
            roles: [("Predicateur", 1, null)]);

        var response = await ViewerClient.GetAsync("/api/departments/with-staffing");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        // MIFEM should be NoActivities since the only activity is in the past
        var mifemElem = doc.RootElement.EnumerateArray()
            .First(d => d.GetProperty("abbreviation").GetString() == "MIFEM");
        mifemElem.GetProperty("aggregateStaffingStatus").GetString().ShouldBe("NoActivities");
        mifemElem.GetProperty("upcomingActivityCount").GetInt32().ShouldBe(0);
    }
}
