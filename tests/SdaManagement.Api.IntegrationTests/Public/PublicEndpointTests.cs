using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Public;

public class PublicEndpointTests : IntegrationTestBase
{
    private int _departmentId;
    private int _predicateurUserId;

    public PublicEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        // Seed users matching TestAuthHandler email patterns
        await CreateTestUser("test-owner@test.local", UserRole.Owner);

        // Seed a department
        _departmentId = await CreateTestDepartment("Culte", "CU", "#4F46E5");

        // Seed a prédicateur user for role assignments
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

    private async Task CreateTestProgramSchedule(
        string title,
        DayOfWeek dayOfWeek,
        TimeOnly startTime,
        TimeOnly endTime,
        string? hostName = null,
        int? departmentId = null)
    {
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<SdaManagement.Api.Data.AppDbContext>();
        var schedule = new ProgramSchedule
        {
            Title = title,
            DayOfWeek = dayOfWeek,
            StartTime = startTime,
            EndTime = endTime,
            HostName = hostName,
            DepartmentId = departmentId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Set<ProgramSchedule>().Add(schedule);
        await dbContext.SaveChangesAsync();
    }

    // ===== Next Activity Tests =====

    [Fact]
    public async Task GetNextActivity_WithPublicActivities_Returns200WithData()
    {
        // Seed a public activity with prédicateur role + assignment
        await CreateTestActivity(
            _departmentId,
            title: "Culte du Sabbat",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public,
            roles: [("Prédicateur", 1, [_predicateurUserId])],
            specialType: "sainte-cene");

        var response = await AnonymousClient.GetAsync("/api/public/next-activity");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("title").GetString().ShouldBe("Culte du Sabbat");
        root.GetProperty("predicateurName").GetString().ShouldBe("Jean Dupont");
        root.GetProperty("departmentName").GetString().ShouldBe("Culte");
        root.GetProperty("departmentAbbreviation").GetString().ShouldBe("CU");
        root.GetProperty("departmentColor").GetString().ShouldBe("#4F46E5");
        root.GetProperty("specialType").GetString().ShouldBe("sainte-cene");
        root.TryGetProperty("startTime", out _).ShouldBeTrue();
        root.TryGetProperty("endTime", out _).ShouldBeTrue();
        root.TryGetProperty("date", out _).ShouldBeTrue();
    }

    [Fact]
    public async Task GetNextActivity_NoPublicActivities_Returns204()
    {
        // No activities seeded

        var response = await AnonymousClient.GetAsync("/api/public/next-activity");

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task GetNextActivity_OnlyReturnsPublicVisibility()
    {
        // Seed an authenticated-only activity (should be excluded)
        await CreateTestActivity(
            _departmentId,
            title: "Réunion Privée",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
            visibility: ActivityVisibility.Authenticated);

        // Seed a public activity (should be returned)
        await CreateTestActivity(
            _departmentId,
            title: "Culte Public",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(2)),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync("/api/public/next-activity");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("title").GetString().ShouldBe("Culte Public");
    }

    [Fact]
    public async Task GetNextActivity_ReturnsClosestFutureActivity()
    {
        // Seed multiple public activities, verify chronological ordering
        await CreateTestActivity(
            _departmentId,
            title: "Activité Lointaine",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(14)),
            visibility: ActivityVisibility.Public);

        await CreateTestActivity(
            _departmentId,
            title: "Activité Proche",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(3)),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync("/api/public/next-activity");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("title").GetString().ShouldBe("Activité Proche");
    }

    [Fact]
    public async Task GetNextActivity_ResponseDoesNotContainSensitiveFields()
    {
        await CreateTestActivity(
            _departmentId,
            title: "Culte Test",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public,
            roles: [("Prédicateur", 1, [_predicateurUserId])]);

        var response = await AnonymousClient.GetAsync("/api/public/next-activity");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Assert no sensitive fields
        root.TryGetProperty("isGuest", out _).ShouldBeFalse();
        root.TryGetProperty("userId", out _).ShouldBeFalse();
        root.TryGetProperty("version", out _).ShouldBeFalse();
        root.TryGetProperty("concurrencyToken", out _).ShouldBeFalse();
        root.TryGetProperty("roles", out _).ShouldBeFalse();
        root.TryGetProperty("roleCount", out _).ShouldBeFalse();
        root.TryGetProperty("totalHeadcount", out _).ShouldBeFalse();
        root.TryGetProperty("assignedCount", out _).ShouldBeFalse();
        root.TryGetProperty("staffingStatus", out _).ShouldBeFalse();
        root.TryGetProperty("createdAt", out _).ShouldBeFalse();
        root.TryGetProperty("updatedAt", out _).ShouldBeFalse();
        root.TryGetProperty("description", out _).ShouldBeFalse();
    }

    // ===== Upcoming Activities Tests =====

    [Fact]
    public async Task GetUpcomingActivities_WithPublicActivities_Returns200WithList()
    {
        await CreateTestActivity(
            _departmentId,
            title: "Culte 1",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public);
        await CreateTestActivity(
            _departmentId,
            title: "Culte 2",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(14)),
            visibility: ActivityVisibility.Public);
        await CreateTestActivity(
            _departmentId,
            title: "Culte 3",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(21)),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(3);
        arr[0].GetProperty("title").GetString().ShouldBe("Culte 1");
        arr[1].GetProperty("title").GetString().ShouldBe("Culte 2");
        arr[2].GetProperty("title").GetString().ShouldBe("Culte 3");
    }

    [Fact]
    public async Task GetUpcomingActivities_NoPublicActivities_Returns200WithEmptyList()
    {
        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task GetUpcomingActivities_OnlyReturnsPublicVisibility()
    {
        await CreateTestActivity(
            _departmentId,
            title: "Public Activity",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public);
        await CreateTestActivity(
            _departmentId,
            title: "Private Activity",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Authenticated);

        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("Public Activity");
    }

    [Fact]
    public async Task GetUpcomingActivities_OnlyReturnsNext4Weeks()
    {
        await CreateTestActivity(
            _departmentId,
            title: "Within 4 Weeks",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(14)),
            visibility: ActivityVisibility.Public);
        await CreateTestActivity(
            _departmentId,
            title: "Beyond 4 Weeks",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(35)),
            visibility: ActivityVisibility.Public);

        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(1);
        arr[0].GetProperty("title").GetString().ShouldBe("Within 4 Weeks");
    }

    [Fact]
    public async Task GetUpcomingActivities_OrderedByDateThenStartTime()
    {
        // Same day, different start times
        await CreateTestActivity(
            _departmentId,
            title: "Afternoon Activity",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public);

        // Create another activity at 08:00 on the same day
        using (var scope = Factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<SdaManagement.Api.Data.AppDbContext>();
            var activity = new Activity
            {
                Title = "Morning Activity",
                DepartmentId = _departmentId,
                Date = DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
                StartTime = new TimeOnly(8, 0),
                EndTime = new TimeOnly(9, 0),
                Visibility = ActivityVisibility.Public,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            dbContext.Activities.Add(activity);
            await dbContext.SaveChangesAsync();
        }

        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(2);
        arr[0].GetProperty("title").GetString().ShouldBe("Morning Activity");
        arr[1].GetProperty("title").GetString().ShouldBe("Afternoon Activity");
    }

    [Fact]
    public async Task GetUpcomingActivities_IncludesPredicateurNameAndAvatar()
    {
        await CreateTestActivity(
            _departmentId,
            title: "Culte avec Prédicateur",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public,
            roles: [("Prédicateur", 1, [_predicateurUserId])]);

        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement[0];

        item.GetProperty("predicateurName").GetString().ShouldBe("Jean Dupont");
        // predicateurAvatarUrl is null (no avatar uploaded) and omitted by WhenWritingNull serializer
        // Verify the field is either absent (null omitted) or present with a value
        if (item.TryGetProperty("predicateurAvatarUrl", out var avatarProp))
        {
            avatarProp.ValueKind.ShouldBeOneOf(JsonValueKind.String, JsonValueKind.Null);
        }
    }

    [Fact]
    public async Task GetUpcomingActivities_ResponseDoesNotContainSensitiveFields()
    {
        await CreateTestActivity(
            _departmentId,
            title: "Culte Test",
            date: DateOnly.FromDateTime(DateTime.Now.AddDays(7)),
            visibility: ActivityVisibility.Public,
            roles: [("Prédicateur", 1, [_predicateurUserId])]);

        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement[0];

        item.TryGetProperty("isGuest", out _).ShouldBeFalse();
        item.TryGetProperty("userId", out _).ShouldBeFalse();
        item.TryGetProperty("version", out _).ShouldBeFalse();
        item.TryGetProperty("concurrencyToken", out _).ShouldBeFalse();
        item.TryGetProperty("roles", out _).ShouldBeFalse();
        item.TryGetProperty("roleCount", out _).ShouldBeFalse();
        item.TryGetProperty("totalHeadcount", out _).ShouldBeFalse();
        item.TryGetProperty("assignedCount", out _).ShouldBeFalse();
        item.TryGetProperty("staffingStatus", out _).ShouldBeFalse();
        item.TryGetProperty("createdAt", out _).ShouldBeFalse();
        item.TryGetProperty("updatedAt", out _).ShouldBeFalse();
        item.TryGetProperty("description", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task GetUpcomingActivities_AnonymousAccess_Returns200()
    {
        var response = await AnonymousClient.GetAsync("/api/public/upcoming-activities");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    // ===== Program Schedules Tests =====

    [Fact]
    public async Task GetProgramSchedules_WithSchedules_Returns200WithList()
    {
        await CreateTestProgramSchedule(
            "École du Sabbat",
            DayOfWeek.Saturday,
            new TimeOnly(9, 30),
            new TimeOnly(10, 30),
            hostName: "Pierre Martin",
            departmentId: _departmentId);
        await CreateTestProgramSchedule(
            "Culte Divin",
            DayOfWeek.Saturday,
            new TimeOnly(11, 0),
            new TimeOnly(12, 30),
            departmentId: _departmentId);

        var response = await AnonymousClient.GetAsync("/api/public/program-schedules");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(2);
        arr[0].GetProperty("title").GetString().ShouldBe("École du Sabbat");
        arr[1].GetProperty("title").GetString().ShouldBe("Culte Divin");
    }

    [Fact]
    public async Task GetProgramSchedules_NoSchedules_Returns200WithEmptyList()
    {
        var response = await AnonymousClient.GetAsync("/api/public/program-schedules");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task GetProgramSchedules_OrderedByDayOfWeekThenStartTime()
    {
        // Saturday afternoon
        await CreateTestProgramSchedule(
            "Programme AY",
            DayOfWeek.Saturday,
            new TimeOnly(14, 0),
            new TimeOnly(16, 0));
        // Saturday morning
        await CreateTestProgramSchedule(
            "École du Sabbat",
            DayOfWeek.Saturday,
            new TimeOnly(9, 30),
            new TimeOnly(10, 30));
        // Wednesday evening
        await CreateTestProgramSchedule(
            "Prière du Mercredi",
            DayOfWeek.Wednesday,
            new TimeOnly(19, 0),
            new TimeOnly(20, 0));

        var response = await AnonymousClient.GetAsync("/api/public/program-schedules");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var arr = doc.RootElement;

        arr.GetArrayLength().ShouldBe(3);
        // Wednesday (3) comes before Saturday (6)
        arr[0].GetProperty("title").GetString().ShouldBe("Prière du Mercredi");
        // Saturday morning before Saturday afternoon
        arr[1].GetProperty("title").GetString().ShouldBe("École du Sabbat");
        arr[2].GetProperty("title").GetString().ShouldBe("Programme AY");
    }

    [Fact]
    public async Task GetProgramSchedules_IncludesDepartmentInfo()
    {
        await CreateTestProgramSchedule(
            "Culte Divin",
            DayOfWeek.Saturday,
            new TimeOnly(11, 0),
            new TimeOnly(12, 30),
            departmentId: _departmentId);

        var response = await AnonymousClient.GetAsync("/api/public/program-schedules");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement[0];

        item.GetProperty("departmentName").GetString().ShouldBe("Culte");
        item.GetProperty("departmentColor").GetString().ShouldBe("#4F46E5");
    }

    [Fact]
    public async Task GetProgramSchedules_ResponseDoesNotContainInternalFields()
    {
        await CreateTestProgramSchedule(
            "École du Sabbat",
            DayOfWeek.Saturday,
            new TimeOnly(9, 30),
            new TimeOnly(10, 30));

        var response = await AnonymousClient.GetAsync("/api/public/program-schedules");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement[0];

        item.TryGetProperty("id", out _).ShouldBeFalse();
        item.TryGetProperty("createdAt", out _).ShouldBeFalse();
        item.TryGetProperty("updatedAt", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task GetProgramSchedules_AnonymousAccess_Returns200()
    {
        var response = await AnonymousClient.GetAsync("/api/public/program-schedules");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }
}
