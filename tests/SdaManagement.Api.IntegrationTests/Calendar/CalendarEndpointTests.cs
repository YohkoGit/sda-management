using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Calendar;

public class CalendarEndpointTests : IntegrationTestBase
{
    private int _department1Id;
    private int _department2Id;

    public CalendarEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        _department1Id = await CreateTestDepartment("Culte", "CU", "#F43F5E");
        _department2Id = await CreateTestDepartment("Jeunesse Adventiste", "JA", "#14B8A6");
    }

    private async Task<int> CreateTestDepartment(string name, string abbreviation, string color)
    {
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SdaManagement.Api.Data.AppDbContext>();
        var dept = new Department
        {
            Name = name,
            Abbreviation = abbreviation,
            Color = color,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Set<Department>().Add(dept);
        await dbContext.SaveChangesAsync();
        return dept.Id;
    }

    [Fact]
    public async Task GetCalendarActivities_Anonymous_Returns401()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var end = start.AddDays(30);

        var response = await AnonymousClient.GetAsync(
            $"/api/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetCalendarActivities_Authenticated_ReturnsBothPublicAndAuthenticatedActivities()
    {
        var rangeStart = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var rangeEnd = rangeStart.AddDays(30);

        await CreateTestActivity(
            _department1Id,
            title: "Public Culte",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        await CreateTestActivity(
            _department1Id,
            title: "Auth-Only Meeting",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Authenticated);

        var response = await ViewerClient.GetAsync(
            $"/api/calendar?start={rangeStart:yyyy-MM-dd}&end={rangeEnd:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(2);
        var titles = Enumerable.Range(0, arr.GetArrayLength())
            .Select(i => arr[i].GetProperty("title").GetString())
            .ToList();
        titles.ShouldContain("Public Culte");
        titles.ShouldContain("Auth-Only Meeting");
    }

    [Fact]
    public async Task GetCalendarActivities_WithSingleDepartmentId_ReturnsOnlyThatDepartment()
    {
        var rangeStart = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var rangeEnd = rangeStart.AddDays(30);

        await CreateTestActivity(
            _department1Id,
            title: "Culte Activity",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        await CreateTestActivity(
            _department2Id,
            title: "JA Activity",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        var response = await ViewerClient.GetAsync(
            $"/api/calendar?start={rangeStart:yyyy-MM-dd}&end={rangeEnd:yyyy-MM-dd}&departmentIds={_department1Id}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("Culte Activity");
    }

    [Fact]
    public async Task GetCalendarActivities_WithMultipleDepartmentIds_ReturnsActivitiesFromBoth()
    {
        var rangeStart = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var rangeEnd = rangeStart.AddDays(30);

        await CreateTestActivity(
            _department1Id,
            title: "Culte Activity",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        await CreateTestActivity(
            _department2Id,
            title: "JA Activity",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Authenticated);

        var response = await ViewerClient.GetAsync(
            $"/api/calendar?start={rangeStart:yyyy-MM-dd}&end={rangeEnd:yyyy-MM-dd}&departmentIds={_department1Id}&departmentIds={_department2Id}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(2);
    }

    [Fact]
    public async Task GetCalendarActivities_WithoutDepartmentIds_ReturnsAllActivities()
    {
        var rangeStart = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var rangeEnd = rangeStart.AddDays(30);

        await CreateTestActivity(
            _department1Id,
            title: "Culte Activity",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        await CreateTestActivity(
            _department2Id,
            title: "JA Activity",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Authenticated);

        var response = await ViewerClient.GetAsync(
            $"/api/calendar?start={rangeStart:yyyy-MM-dd}&end={rangeEnd:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(2);
    }

    [Fact]
    public async Task GetCalendarActivities_MaxRangeGuard_CapsAt90Days()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(1));

        await CreateTestActivity(
            _department1Id,
            title: "Within Cap",
            date: start.AddDays(30),
            visibility: ActivityVisibility.Public);

        await CreateTestActivity(
            _department1Id,
            title: "Beyond Cap",
            date: start.AddDays(120),
            visibility: ActivityVisibility.Public);

        var end = start.AddDays(365);
        var response = await ViewerClient.GetAsync(
            $"/api/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("Within Cap");
    }

    [Fact]
    public async Task GetCalendarActivities_StartAfterEnd_ReturnsEmptyArray()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(30));
        var end = DateOnly.FromDateTime(DateTime.Now.AddDays(1));

        var response = await ViewerClient.GetAsync(
            $"/api/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }
}
