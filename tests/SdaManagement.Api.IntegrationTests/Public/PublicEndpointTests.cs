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
}
