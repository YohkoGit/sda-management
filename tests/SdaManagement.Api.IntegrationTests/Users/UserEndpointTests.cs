using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Setup;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Users;

public class UserEndpointTests : IntegrationTestBase
{
    public UserEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    private int _ownerUserId;
    private int _adminUserId;
    private int _deptJaId;
    private int _deptMifemId;

    protected override async Task SeedTestData()
    {
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        _ownerUserId = owner.Id;
        _adminUserId = admin.Id;

        // Create departments
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

        // Assign ADMIN to department JA
        await AssignDepartmentToUser(_adminUserId, _deptJaId);
    }

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private object ValidUserPayload(
        string firstName = "Marie-Claire",
        string lastName = "Legault",
        string email = "mc.legault@gmail.com",
        string role = "Viewer",
        int[]? departmentIds = null) => new
    {
        firstName,
        lastName,
        email,
        role,
        departmentIds = departmentIds ?? [_deptJaId],
    };

    // --- GET /api/users ---

    [Fact]
    public async Task GetUsers_AsOwner_Returns200WithAllUsers()
    {
        var response = await OwnerClient.GetAsync("/api/users");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");
        // 3 seeded users (owner, admin, viewer), all non-guest
        items.GetArrayLength().ShouldBe(3);
    }

    [Fact]
    public async Task GetUsers_AsAdmin_Returns200WithDeptScopedUsers()
    {
        // Admin is assigned to JA. Create a user in JA to verify scoping.
        await OwnerClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(email: "ja.user@test.com", departmentIds: [_deptJaId]));

        var response = await AdminClient.GetAsync("/api/users");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");
        // Should include: admin (JA) + newly created user (JA)
        items.GetArrayLength().ShouldBeGreaterThanOrEqualTo(2);
    }

    [Fact]
    public async Task GetUsers_AsViewer_Returns200AllNonGuestUsers()
    {
        var response = await ViewerClient.GetAsync("/api/users");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("items").GetArrayLength().ShouldBe(3);
    }

    [Fact]
    public async Task GetUsers_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/users");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetUsers_CursorPagination_WorksCorrectly()
    {
        // Seed 25 additional users
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        for (var i = 0; i < 25; i++)
        {
            db.Users.Add(new User
            {
                Email = $"page-user-{i:D2}@test.com",
                FirstName = "Page",
                LastName = $"User{i:D2}",
                Role = UserRole.Viewer,
                IsGuest = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
        }
        await db.SaveChangesAsync();

        // First page (default limit 20)
        var response1 = await OwnerClient.GetAsync("/api/users?limit=20");
        response1.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json1 = await response1.Content.ReadAsStringAsync();
        using var doc1 = JsonDocument.Parse(json1);
        doc1.RootElement.GetProperty("items").GetArrayLength().ShouldBe(20);
        var nextCursor = doc1.RootElement.GetProperty("nextCursor").GetString();
        nextCursor.ShouldNotBeNull();

        // Second page
        var response2 = await OwnerClient.GetAsync($"/api/users?limit=20&cursor={nextCursor}");
        response2.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json2 = await response2.Content.ReadAsStringAsync();
        using var doc2 = JsonDocument.Parse(json2);
        var page2Items = doc2.RootElement.GetProperty("items").GetArrayLength();
        page2Items.ShouldBe(8); // 28 total (3 seed + 25 new) - 20 = 8
        doc2.RootElement.TryGetProperty("nextCursor", out var nc);
        // nextCursor should be null (no more pages)
        (nc.ValueKind == JsonValueKind.Null || nc.ValueKind == JsonValueKind.Undefined).ShouldBeTrue();
    }

    // --- POST /api/users ---

    [Fact]
    public async Task CreateUser_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/users", ValidUserPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateUser_AsOwnerWithOwnerRole_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(role: "Owner", departmentIds: [_deptJaId]));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("role").GetString().ShouldBe("Owner");
        response.Headers.Location.ShouldNotBeNull();
    }

    [Fact]
    public async Task CreateUser_AsAdminWithViewerInJa_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(role: "Viewer", departmentIds: [_deptJaId]));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("firstName").GetString().ShouldBe("Marie-Claire");
        doc.RootElement.GetProperty("lastName").GetString().ShouldBe("Legault");
        doc.RootElement.GetProperty("email").GetString().ShouldBe("mc.legault@gmail.com");
        doc.RootElement.GetProperty("role").GetString().ShouldBe("Viewer");
        doc.RootElement.GetProperty("departments").GetArrayLength().ShouldBe(1);
    }

    [Fact]
    public async Task CreateUser_AsAdminWithOwnerRole_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(role: "Owner", departmentIds: [_deptJaId]));
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateUser_AsAdminWithMifemDepartment_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(departmentIds: [_deptMifemId]));
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateUser_DuplicateEmail_Returns409()
    {
        await OwnerClient.PostAsJsonAsync("/api/users", ValidUserPayload());

        var response = await OwnerClient.PostAsJsonAsync("/api/users", ValidUserPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:conflict");
    }

    [Fact]
    public async Task CreateUser_InvalidBody_Returns400()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/users", new
        {
            firstName = "",
            lastName = "",
            email = "not-valid",
            role = "SuperAdmin",
            departmentIds = Array.Empty<int>(),
        });
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    // --- GET /api/users/{id} ---

    [Fact]
    public async Task GetUserById_ReturnsUserDetail()
    {
        // Create a user first
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(departmentIds: [_deptJaId]));
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var userId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await OwnerClient.GetAsync($"/api/users/{userId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("firstName").GetString().ShouldBe("Marie-Claire");
        doc.RootElement.GetProperty("departments").GetArrayLength().ShouldBe(1);
        doc.RootElement.TryGetProperty("createdAt", out _).ShouldBeTrue();
        doc.RootElement.TryGetProperty("updatedAt", out _).ShouldBeTrue();
    }

    [Fact]
    public async Task GetUserById_AsAdminForUserOutsideScope_Returns403()
    {
        // Create a user in MIFEM only (admin has JA)
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(email: "mifem.user@test.com", departmentIds: [_deptMifemId]));
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var userId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await AdminClient.GetAsync($"/api/users/{userId}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // --- Setup Progress Integration ---

    [Fact]
    public async Task SetupProgress_WithMember_MembersStepComplete()
    {
        // Create a non-owner, non-guest member
        await OwnerClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(departmentIds: [_deptJaId]));

        // Also need church config, departments, templates, schedules for full test
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
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

        var result = await response.Content.ReadFromJsonAsync<SetupProgressResponse>(JsonOptions);
        result.ShouldNotBeNull();
        result.Steps.Count.ShouldBe(5);
        result.Steps[4].Id.ShouldBe("members");
        result.Steps[4].Status.ShouldBe("complete");
        result.IsSetupComplete.ShouldBeTrue();
    }

    [Fact]
    public async Task SetupProgress_WithSeededUsers_MembersStepComplete()
    {
        // SeedTestData creates ADMIN and VIEWER — both satisfy !IsGuest && Role != Owner
        var response = await OwnerClient.GetAsync("/api/setup-progress");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<SetupProgressResponse>(JsonOptions);
        result.ShouldNotBeNull();
        result.Steps.Count.ShouldBe(5);
        result.Steps[4].Id.ShouldBe("members");
        result.Steps[4].Status.ShouldBe("complete");
    }

    // --- POST /api/users/bulk ---

    private object ValidBulkPayload(int count = 5, int[]? departmentIds = null) => new
    {
        users = Enumerable.Range(1, count).Select(i => new
        {
            firstName = $"User{i}",
            lastName = $"Batch{i}",
            email = $"bulk{i}@test.com",
            role = "Viewer",
            departmentIds = departmentIds ?? new[] { _deptJaId },
        }).ToArray(),
    };

    [Fact]
    public async Task BulkCreate_AsOwner_WithValidUsers_Returns201WithCount()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/users/bulk", ValidBulkPayload(5));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("count").GetInt32().ShouldBe(5);
        doc.RootElement.GetProperty("created").GetArrayLength().ShouldBe(5);
    }

    [Fact]
    public async Task BulkCreate_AsAdmin_WithOwnDepartments_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users/bulk", ValidBulkPayload(3, [_deptJaId]));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("count").GetInt32().ShouldBe(3);
    }

    [Fact]
    public async Task BulkCreate_AsAdmin_WithOwnerRoleInAnyRow_Returns403()
    {
        var payload = new
        {
            users = new[]
            {
                new { firstName = "A", lastName = "B", email = "a@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "C", lastName = "D", email = "c@test.com", role = "Owner", departmentIds = new[] { _deptJaId } },
            },
        };
        var response = await AdminClient.PostAsJsonAsync("/api/users/bulk", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task BulkCreate_AsAdmin_WithOutOfScopeDepartment_Returns403()
    {
        var payload = new
        {
            users = new[]
            {
                new { firstName = "A", lastName = "B", email = "a@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "C", lastName = "D", email = "c@test.com", role = "Viewer", departmentIds = new[] { _deptMifemId } },
            },
        };
        var response = await AdminClient.PostAsJsonAsync("/api/users/bulk", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task BulkCreate_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/users/bulk", ValidBulkPayload(2));
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task BulkCreate_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/users/bulk", ValidBulkPayload(2));
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task BulkCreate_WithInvalidData_Returns400WithPerRowErrors()
    {
        var payload = new
        {
            users = new[]
            {
                new { firstName = "", lastName = "B", email = "valid@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "C", lastName = "D", email = "not-valid", role = "Viewer", departmentIds = new[] { _deptJaId } },
            },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/users/bulk", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
        var errors = doc.RootElement.GetProperty("errors");
        // Should have per-row error keys
        errors.EnumerateObject().ShouldContain(e => e.Name.Contains("[0]"));
        errors.EnumerateObject().ShouldContain(e => e.Name.Contains("[1]"));
    }

    [Fact]
    public async Task BulkCreate_WithDuplicateEmailInDb_Returns409()
    {
        // Create a user first
        await OwnerClient.PostAsJsonAsync("/api/users", ValidUserPayload(email: "existing@test.com"));

        // Bulk create with same email
        var payload = new
        {
            users = new[]
            {
                new { firstName = "A", lastName = "B", email = "existing@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
            },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/users/bulk", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:conflict");
        doc.RootElement.GetProperty("detail").GetString().ShouldContain("already exist");
    }

    [Fact]
    public async Task BulkCreate_WithDuplicateEmailWithinBatch_Returns400()
    {
        var payload = new
        {
            users = new[]
            {
                new { firstName = "A", lastName = "B", email = "dup@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "C", lastName = "D", email = "DUP@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
            },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/users/bulk", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BulkCreate_WithEmptyUsersArray_Returns400()
    {
        var payload = new { users = Array.Empty<object>() };
        var response = await OwnerClient.PostAsJsonAsync("/api/users/bulk", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BulkCreate_WithMoreThan30Users_Returns400()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/users/bulk", ValidBulkPayload(31));
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task BulkCreate_Atomicity_IfDbErrorNoUsersCreated()
    {
        // Create a user with email that will conflict
        await OwnerClient.PostAsJsonAsync("/api/users",
            ValidUserPayload(email: "conflict@test.com"));

        // Get current user count
        var beforeResponse = await OwnerClient.GetAsync("/api/users?limit=100");
        var beforeJson = await beforeResponse.Content.ReadAsStringAsync();
        using var beforeDoc = JsonDocument.Parse(beforeJson);
        var beforeCount = beforeDoc.RootElement.GetProperty("items").GetArrayLength();

        // Bulk create: 4 valid + 1 conflicting email (5th)
        var payload = new
        {
            users = new[]
            {
                new { firstName = "A", lastName = "A", email = "atom1@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "B", lastName = "B", email = "atom2@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "C", lastName = "C", email = "atom3@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "D", lastName = "D", email = "atom4@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
                new { firstName = "E", lastName = "E", email = "conflict@test.com", role = "Viewer", departmentIds = new[] { _deptJaId } },
            },
        };
        var bulkResponse = await OwnerClient.PostAsJsonAsync("/api/users/bulk", payload);
        bulkResponse.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // Verify no users were created (atomicity)
        var afterResponse = await OwnerClient.GetAsync("/api/users?limit=100");
        var afterJson = await afterResponse.Content.ReadAsStringAsync();
        using var afterDoc = JsonDocument.Parse(afterJson);
        var afterCount = afterDoc.RootElement.GetProperty("items").GetArrayLength();
        afterCount.ShouldBe(beforeCount);
    }
}
