using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Users;

public class AssignableOfficersEndpointTests : IntegrationTestBase
{
    private int _deptJaId;
    private int _deptMifemId;

    public AssignableOfficersEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var ja = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var mifem = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#10B981",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Departments.AddRange(ja, mifem);
        await db.SaveChangesAsync();

        _deptJaId = ja.Id;
        _deptMifemId = mifem.Id;

        await AssignDepartmentToUser(admin.Id, _deptMifemId);
    }

    private async Task<User> CreateUserWithName(string firstName, string lastName, UserRole role = UserRole.Viewer, bool isGuest = false)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Email = $"{firstName.ToLower()}.{lastName.ToLower()}@test.local",
            FirstName = firstName,
            LastName = lastName,
            Role = role,
            IsGuest = isGuest,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    // --- Authorization ---

    [Fact]
    public async Task GetAssignableOfficers_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetAssignableOfficers_AsViewer_Returns200()
    {
        var response = await ViewerClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAssignableOfficers_AsAdmin_Returns200()
    {
        var response = await AdminClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetAssignableOfficers_AsOwner_Returns200()
    {
        var response = await OwnerClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    // --- Guest exclusion ---

    [Fact]
    public async Task GetAssignableOfficers_ExcludesGuestUsers()
    {
        await CreateUserWithName("Regular", "Member");
        await CreateUserWithName("Guest", "Speaker", isGuest: true);

        var response = await ViewerClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        // Should not contain the guest
        var names = items.EnumerateArray()
            .Select(i => i.GetProperty("lastName").GetString())
            .ToList();
        names.ShouldContain("Member");
        names.ShouldNotContain("Speaker");
    }

    // --- Soft-deleted exclusion ---

    [Fact]
    public async Task GetAssignableOfficers_ExcludesSoftDeletedUsers()
    {
        var user = await CreateUserWithName("Deleted", "Person");

        // Soft-delete the user
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var entity = await db.Users.FindAsync(user.Id);
        entity!.DeletedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        var response = await ViewerClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        var names = items.EnumerateArray()
            .Select(i => i.GetProperty("lastName").GetString())
            .ToList();
        names.ShouldNotContain("Person");
    }

    // --- Search filtering ---

    [Fact]
    public async Task GetAssignableOfficers_FiltersbySearchTerm_CaseInsensitive()
    {
        await CreateUserWithName("Luis", "Vicuna");
        await CreateUserWithName("Marie", "Durand");

        var response = await ViewerClient.GetAsync("/api/users/assignable-officers?search=vic");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        var names = items.EnumerateArray()
            .Select(i => i.GetProperty("lastName").GetString())
            .ToList();
        names.ShouldContain("Vicuna");
        names.ShouldNotContain("Durand");
    }

    [Fact]
    public async Task GetAssignableOfficers_ReturnsEmptyForNoMatches()
    {
        await CreateUserWithName("Alice", "Tremblay");

        var response = await ViewerClient.GetAsync("/api/users/assignable-officers?search=zzzzz");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");
        items.GetArrayLength().ShouldBe(0);
    }

    // --- Department info ---

    [Fact]
    public async Task GetAssignableOfficers_IncludesDepartmentInfo()
    {
        var user = await CreateUserWithName("Jean", "Baptiste");
        await AssignDepartmentToUser(user.Id, _deptJaId);

        var response = await ViewerClient.GetAsync("/api/users/assignable-officers?search=Baptiste");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        items.GetArrayLength().ShouldBeGreaterThan(0);
        var first = items[0];
        var departments = first.GetProperty("departments");
        departments.GetArrayLength().ShouldBe(1);
        departments[0].GetProperty("name").GetString().ShouldBe("Jeunesse Adventiste");
        departments[0].GetProperty("abbreviation").GetString().ShouldBe("JA");
        departments[0].GetProperty("color").GetString().ShouldBe("#4F46E5");
    }

    // --- Response format ---

    [Fact]
    public async Task GetAssignableOfficers_ReturnsWrappedResponse()
    {
        var response = await ViewerClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.TryGetProperty("items", out _).ShouldBeTrue();
        root.TryGetProperty("nextCursor", out var cursor).ShouldBeTrue();
        cursor.ValueKind.ShouldBe(JsonValueKind.Null);
    }
}
