using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Users;

public class GuestEndpointTests : IntegrationTestBase
{
    private int _adminUserId;
    private int _deptMifemId;

    public GuestEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        _adminUserId = admin.Id;

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var mifem = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Departments.Add(mifem);
        await db.SaveChangesAsync();

        _deptMifemId = mifem.Id;
        await AssignDepartmentToUser(_adminUserId, _deptMifemId);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    // --- POST /api/users/guests ---

    [Fact]
    public async Task CreateGuest_WithValidData_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien", phone = "514-555-1234" });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("userId").GetInt32().ShouldBeGreaterThan(0);
        root.GetProperty("firstName").GetString().ShouldBe("Pasteur");
        root.GetProperty("lastName").GetString().ShouldBe("Damien");
        root.GetProperty("isGuest").GetBoolean().ShouldBeTrue();
    }

    [Fact]
    public async Task CreateGuest_NameOnly_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("firstName").GetString().ShouldBe("Pasteur");
        root.GetProperty("lastName").GetString().ShouldBe("Damien");
        root.GetProperty("isGuest").GetBoolean().ShouldBeTrue();
    }

    [Fact]
    public async Task CreateGuest_SingleWordName_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Damien" });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("firstName").GetString().ShouldBe("Damien");
        root.GetProperty("lastName").GetString().ShouldBe("");
        root.GetProperty("isGuest").GetBoolean().ShouldBeTrue();
    }

    [Fact]
    public async Task CreateGuest_InvalidName_Returns400()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "" });
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateGuest_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateGuest_Unauthenticated_Returns401Or403()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });
        // Anonymous hits [Authorize] attribute → 401 or 403 depending on auth scheme
        new[] { HttpStatusCode.Unauthorized, HttpStatusCode.Forbidden }.ShouldContain(response.StatusCode);
    }

    // --- Guest in activity assignment ---

    [Fact]
    public async Task CreateActivity_WithGuestAssignment_Returns201_WithIsGuest()
    {
        // Create guest
        var guestResponse = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });
        guestResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var guestJson = await guestResponse.Content.ReadAsStringAsync();
        using var guestDoc = JsonDocument.Parse(guestJson);
        var guestUserId = guestDoc.RootElement.GetProperty("userId").GetInt32();

        // Create activity with guest assignment
        var activityPayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles = new[]
            {
                new
                {
                    roleName = "Predicateur",
                    headcount = 1,
                    assignments = new[] { new { userId = guestUserId } }
                }
            }
        };

        var activityResponse = await AdminClient.PostAsJsonAsync("/api/activities", activityPayload);
        activityResponse.StatusCode.ShouldBe(HttpStatusCode.Created);

        var actJson = await activityResponse.Content.ReadAsStringAsync();
        using var actDoc = JsonDocument.Parse(actJson);
        var roles = actDoc.RootElement.GetProperty("roles");
        var assignments = roles[0].GetProperty("assignments");
        assignments[0].GetProperty("userId").GetInt32().ShouldBe(guestUserId);
        assignments[0].GetProperty("isGuest").GetBoolean().ShouldBeTrue();
    }

    [Fact]
    public async Task UpdateActivity_AddGuestAssignment_Returns200_WithIsGuest()
    {
        // Create activity without assignments
        var createPayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles = new[]
            {
                new { roleName = "Predicateur", headcount = 1, assignments = Array.Empty<object>() }
            }
        };
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/activities", createPayload);
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var activityId = createDoc.RootElement.GetProperty("id").GetInt32();
        var token = createDoc.RootElement.GetProperty("concurrencyToken").GetUInt32();
        var roleId = createDoc.RootElement.GetProperty("roles")[0].GetProperty("id").GetInt32();

        // Create guest
        var guestResponse = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });
        guestResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var guestJson = await guestResponse.Content.ReadAsStringAsync();
        using var guestDoc = JsonDocument.Parse(guestJson);
        var guestUserId = guestDoc.RootElement.GetProperty("userId").GetInt32();

        // Update with guest assignment
        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new[]
            {
                new
                {
                    id = roleId,
                    roleName = "Predicateur",
                    headcount = 1,
                    assignments = new[] { new { userId = guestUserId } }
                }
            }
        };
        var updateResponse = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updateJson = await updateResponse.Content.ReadAsStringAsync();
        using var updateDoc = JsonDocument.Parse(updateJson);
        var assignments = updateDoc.RootElement.GetProperty("roles")[0].GetProperty("assignments");
        assignments[0].GetProperty("isGuest").GetBoolean().ShouldBeTrue();
    }

    // --- Guest exclusions (FR31) ---

    [Fact]
    public async Task AssignableOfficers_ExcludesGuests()
    {
        // Create a guest
        await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });

        // Fetch assignable officers
        var response = await AdminClient.GetAsync("/api/users/assignable-officers");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        // None should be guests (guests don't have isGuest in AssignableOfficerResponse,
        // and they're filtered out by the query)
        foreach (var item in items.EnumerateArray())
        {
            var firstName = item.GetProperty("firstName").GetString();
            var lastName = item.GetProperty("lastName").GetString();
            // Guest was "Pasteur Damien" — should not appear
            (firstName == "Pasteur" && lastName == "Damien").ShouldBeFalse(
                "Guests should be excluded from assignable officers list");
        }
    }

    [Fact]
    public async Task UserList_ExcludesGuests()
    {
        // Create a guest
        await AdminClient.PostAsJsonAsync("/api/users/guests", new { name = "Pasteur Damien" });

        // Fetch user list
        var response = await AdminClient.GetAsync("/api/users");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        foreach (var item in items.EnumerateArray())
        {
            var firstName = item.GetProperty("firstName").GetString();
            var lastName = item.GetProperty("lastName").GetString();
            (firstName == "Pasteur" && lastName == "Damien").ShouldBeFalse(
                "Guests should be excluded from user admin list");
        }
    }
}
