using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Public;

public class PublicCalendarEndpointTests : IntegrationTestBase
{
    private int _departmentId;
    private int _department2Id;
    private int _predicateurUserId;

    public PublicCalendarEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);

        _departmentId = await CreateTestDepartment("Culte", "CU", "#F43F5E");
        _department2Id = await CreateTestDepartment("Jeunesse Adventiste", "JA", "#14B8A6");

        var predicateur = await CreateTestUser("predicateur@test.local", UserRole.Viewer);
        _predicateurUserId = predicateur.Id;
        await UpdateUserName(predicateur.Id, "Jean", "Dupont");
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

    private async Task UpdateUserName(int userId, string firstName, string lastName)
    {
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SdaManagement.Api.Data.AppDbContext>();
        var user = await dbContext.Users.FindAsync(userId);
        user!.FirstName = firstName;
        user.LastName = lastName;
        await dbContext.SaveChangesAsync();
    }

    [Fact]
    public async Task GetCalendarActivities_ReturnsOnlyPublicActivitiesInDateRange()
    {
        var rangeStart = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var rangeEnd = rangeStart.AddDays(30);

        // Public activity within range — should be returned
        await CreateTestActivity(
            _departmentId,
            title: "Public Culte",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        // Authenticated activity within range — should NOT be returned
        await CreateTestActivity(
            _departmentId,
            title: "Private Meeting",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Authenticated);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={rangeStart:yyyy-MM-dd}&end={rangeEnd:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("Public Culte");
    }

    [Fact]
    public async Task GetCalendarActivities_FiltersByDateRange()
    {
        var rangeStart = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var rangeEnd = rangeStart.AddDays(14);

        // Within range
        await CreateTestActivity(
            _departmentId,
            title: "In Range",
            date: rangeStart.AddDays(7),
            visibility: ActivityVisibility.Public);

        // Outside range (after end)
        await CreateTestActivity(
            _departmentId,
            title: "Out of Range",
            date: rangeEnd.AddDays(30),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={rangeStart:yyyy-MM-dd}&end={rangeEnd:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("In Range");
    }

    [Fact]
    public async Task GetCalendarActivities_NoActivities_Returns200WithEmptyArray()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var end = start.AddDays(30);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task GetCalendarActivities_OrderedByDateThenStartTime()
    {
        var baseDate = DateOnly.FromDateTime(DateTime.Now.AddDays(7));

        // Afternoon first (inserted first, but should appear second)
        using (var scope = Factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SdaManagement.Api.Data.AppDbContext>();
            dbContext.Activities.Add(new Activity
            {
                Title = "Afternoon",
                DepartmentId = _departmentId,
                Date = baseDate,
                StartTime = new TimeOnly(14, 0),
                EndTime = new TimeOnly(16, 0),
                Visibility = ActivityVisibility.Public,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            dbContext.Activities.Add(new Activity
            {
                Title = "Morning",
                DepartmentId = _departmentId,
                Date = baseDate,
                StartTime = new TimeOnly(9, 0),
                EndTime = new TimeOnly(12, 0),
                Visibility = ActivityVisibility.Public,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await dbContext.SaveChangesAsync();
        }

        var start = baseDate.AddDays(-1);
        var end = baseDate.AddDays(1);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(2);
        arr[0].GetProperty("title").GetString().ShouldBe("Morning");
        arr[1].GetProperty("title").GetString().ShouldBe("Afternoon");
    }

    [Fact]
    public async Task GetCalendarActivities_AccessibleWithoutAuthentication()
    {
        var start = DateOnly.FromDateTime(DateTime.Now);
        var end = start.AddDays(30);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetCalendarActivities_IncludesDepartmentInfo()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var end = start.AddDays(30);

        await CreateTestActivity(
            _departmentId,
            title: "Culte avec Dept",
            date: start.AddDays(7),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement[0];

        item.GetProperty("departmentName").GetString().ShouldBe("Culte");
        item.GetProperty("departmentAbbreviation").GetString().ShouldBe("CU");
        item.GetProperty("departmentColor").GetString().ShouldBe("#F43F5E");
    }

    [Fact]
    public async Task GetCalendarActivities_IncludesPredicateurInfo()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var end = start.AddDays(30);

        await CreateTestActivity(
            _departmentId,
            title: "Culte avec Predicateur",
            date: start.AddDays(7),
            visibility: ActivityVisibility.Public,
            roles: [("Prédicateur", 1, [_predicateurUserId])]);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement[0];

        item.GetProperty("predicateurName").GetString().ShouldBe("Jean Dupont");
    }

    [Fact]
    public async Task GetCalendarActivities_RateLimitedEndpoint_Returns200()
    {
        // Rate limiting behavior is tested in Auth/RateLimitingTests.cs with a dedicated factory.
        // This test verifies the endpoint is functional under the "public" rate limiting policy
        // (the [EnableRateLimiting("public")] attribute is present at code level).
        var start = DateOnly.FromDateTime(DateTime.Now);
        var end = start.AddDays(30);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetCalendarActivities_MaxRangeGuard_CapsAt90Days()
    {
        // Seed activity at day 30 (within 90-day cap)
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        await CreateTestActivity(
            _departmentId,
            title: "Within Cap",
            date: start.AddDays(30),
            visibility: ActivityVisibility.Public);

        // Seed activity at day 120 (beyond 90-day cap)
        await CreateTestActivity(
            _departmentId,
            title: "Beyond Cap",
            date: start.AddDays(120),
            visibility: ActivityVisibility.Public);

        // Request with absurd range: start to start+365 days
        var end = start.AddDays(365);
        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        // Only the activity within 90 days should be returned
        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("Within Cap");
    }

    [Fact]
    public async Task GetCalendarActivities_StartAfterEnd_ReturnsEmptyArray()
    {
        var start = DateOnly.FromDateTime(DateTime.Now.AddDays(30));
        var end = DateOnly.FromDateTime(DateTime.Now.AddDays(1));

        // Seed activity that would match if range were valid
        await CreateTestActivity(
            _departmentId,
            title: "Should Not Appear",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(15)),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync(
            $"/api/public/calendar?start={start:yyyy-MM-dd}&end={end:yyyy-MM-dd}");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }
}
