using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class ActivityEndpointTests : IntegrationTestBase
{
    private int _deptMifemId;
    private int _deptJaId;
    private int _adminUserId;
    private int _ownerUserId;

    public ActivityEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        _ownerUserId = owner.Id;
        _adminUserId = admin.Id;

        // Create departments via DbContext directly
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
        dbContext.Departments.Add(mifem);
        dbContext.Departments.Add(ja);
        await dbContext.SaveChangesAsync();

        _deptMifemId = mifem.Id;
        _deptJaId = ja.Id;

        // Admin is assigned only to MIFEM
        await AssignDepartmentToUser(_adminUserId, _deptMifemId);
    }

    private object ValidActivityPayload(
        string title = "Culte du Sabbat",
        int? departmentId = null,
        string visibility = "public") => new
    {
        title,
        date = "2026-03-07",
        startTime = "10:00:00",
        endTime = "12:00:00",
        departmentId = departmentId ?? _deptMifemId,
        visibility,
    };

    private async Task<(int Id, uint ConcurrencyToken)> CreateActivityAndGetIdAndToken(
        string title = "Culte du Sabbat",
        int? departmentId = null)
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload(title, departmentId));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return (
            doc.RootElement.GetProperty("id").GetInt32(),
            doc.RootElement.GetProperty("concurrencyToken").GetUInt32()
        );
    }

    private async Task<(int Id, uint ConcurrencyToken, JsonElement Roles)> CreateActivityWithRoles(
        object[] roles,
        string title = "Culte du Sabbat",
        int? departmentId = null)
    {
        var payload = new
        {
            title,
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = departmentId ?? _deptMifemId,
            visibility = "public",
            roles,
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        return (
            root.GetProperty("id").GetInt32(),
            root.GetProperty("concurrencyToken").GetUInt32(),
            root.GetProperty("roles").Clone()
        );
    }

    // --- POST create ---

    [Fact]
    public async Task CreateActivity_AsAdmin_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/activities", ValidActivityPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        response.Headers.Location.ShouldNotBeNull();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("title").GetString().ShouldBe("Culte du Sabbat");
        root.GetProperty("date").GetString().ShouldBe("2026-03-07");
        root.GetProperty("visibility").GetString().ShouldBe("public");
        root.GetProperty("departmentName").GetString().ShouldBe("MIFEM");
        root.GetProperty("concurrencyToken").GetUInt32().ShouldBeGreaterThan(0u);
    }

    [Fact]
    public async Task CreateActivity_AsAdminWrongDepartment_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/activities", ValidActivityPayload(departmentId: _deptJaId));
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateActivity_AsOwner_Returns201()
    {
        // Owner can create for any department
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload(departmentId: _deptJaId));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("departmentName").GetString().ShouldBe("Jeunesse Adventiste");
    }

    [Fact]
    public async Task CreateActivity_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateActivity_WithInvalidData_Returns400()
    {
        // Missing title, endTime before startTime
        var payload = new
        {
            title = "",
            date = "2026-03-07",
            startTime = "12:00:00",
            endTime = "10:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateActivity_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/activities", ValidActivityPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    // --- POST create with template ---

    [Fact]
    public async Task CreateActivity_WithTemplateId_Returns201WithRoles()
    {
        var template = await CreateTestActivityTemplate(
            "Culte du Sabbat",
            [("Predicateur", 1), ("Ancien de Service", 1), ("Diacres", 2)]);

        var payload = new
        {
            title = "Sabbat Service",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            templateId = template.Id,
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        var roles = root.GetProperty("roles");

        roles.GetArrayLength().ShouldBe(3);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
        roles[0].GetProperty("headcount").GetInt32().ShouldBe(1);
        roles[1].GetProperty("roleName").GetString().ShouldBe("Ancien de Service");
        roles[1].GetProperty("headcount").GetInt32().ShouldBe(1);
        roles[2].GetProperty("roleName").GetString().ShouldBe("Diacres");
        roles[2].GetProperty("headcount").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task CreateActivity_WithTemplateId_RolesAreIndependentCopies()
    {
        var template = await CreateTestActivityTemplate(
            "Independence Test",
            [("Predicateur", 1)]);

        var payload = new
        {
            title = "Independent Activity",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            templateId = template.Id,
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var activityJson = await response.Content.ReadAsStringAsync();
        using var activityDoc = JsonDocument.Parse(activityJson);
        var activityId = activityDoc.RootElement.GetProperty("id").GetInt32();

        // Modify the template role directly in the database
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var templateRole = dbContext.Set<TemplateRole>().First(r => r.ActivityTemplateId == template.Id);
        templateRole.RoleName = "Modified Role";
        templateRole.DefaultHeadcount = 99;
        await dbContext.SaveChangesAsync();

        // Verify the activity's roles are unchanged
        var getResponse = await OwnerClient.GetAsync($"/api/activities/{activityId}");
        var getJson = await getResponse.Content.ReadAsStringAsync();
        using var getDoc = JsonDocument.Parse(getJson);
        var roles = getDoc.RootElement.GetProperty("roles");

        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
        roles[0].GetProperty("headcount").GetInt32().ShouldBe(1);
    }

    [Fact]
    public async Task CreateActivity_WithInvalidTemplateId_Returns400()
    {
        var payload = new
        {
            title = "Bad Template",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            templateId = 99999,
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateActivity_WithoutTemplateId_Returns201WithNoRoles()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("roles").GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task CreateActivity_WithTemplateId_AsViewer_Returns403()
    {
        var template = await CreateTestActivityTemplate();

        var payload = new
        {
            title = "Viewer Attempt",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            templateId = template.Id,
        };

        var response = await ViewerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateActivity_WithTemplateId_WrongDepartment_Returns403()
    {
        var template = await CreateTestActivityTemplate();

        var payload = new
        {
            title = "Wrong Dept",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptJaId,
            visibility = "public",
            templateId = template.Id,
        };

        // Admin only has MIFEM access, not JA
        var response = await AdminClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // --- GET list ---

    [Fact]
    public async Task GetActivities_AsAdmin_ReturnsOnlyDepartmentActivities()
    {
        // Create activities in MIFEM and JA
        await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload("MIFEM Activity", _deptMifemId));
        await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload("JA Activity", _deptJaId));

        var response = await AdminClient.GetAsync($"/api/activities?departmentId={_deptMifemId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement;

        items.GetArrayLength().ShouldBe(1);
        items[0].GetProperty("title").GetString().ShouldBe("MIFEM Activity");
    }

    [Fact]
    public async Task GetActivities_AsOwner_WithoutDepartmentId_ReturnsAll()
    {
        await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload("MIFEM Activity", _deptMifemId));
        await OwnerClient.PostAsJsonAsync("/api/activities", ValidActivityPayload("JA Activity", _deptJaId));

        var response = await OwnerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(2);
    }

    // --- GET by id ---

    [Fact]
    public async Task GetActivity_AsAdmin_ReturnsActivityWithRolesAndConcurrencyToken()
    {
        var (activityId, _) = await CreateActivityAndGetIdAndToken();

        var response = await AdminClient.GetAsync($"/api/activities/{activityId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBe(activityId);
        root.GetProperty("title").GetString().ShouldBe("Culte du Sabbat");
        root.GetProperty("concurrencyToken").GetUInt32().ShouldBeGreaterThan(0u);
        root.GetProperty("roles").GetArrayLength().ShouldBe(0);
    }

    // --- PUT update ---

    [Fact]
    public async Task UpdateActivity_AsAdmin_Returns200()
    {
        var (activityId, token) = await CreateActivityAndGetIdAndToken();

        var updatePayload = new
        {
            title = "Updated Title",
            date = "2026-03-14",
            startTime = "09:00:00",
            endTime = "11:00:00",
            departmentId = _deptMifemId,
            visibility = "authenticated",
            concurrencyToken = token,
        };

        var response = await AdminClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("title").GetString().ShouldBe("Updated Title");
        doc.RootElement.GetProperty("visibility").GetString().ShouldBe("authenticated");
    }

    [Fact]
    public async Task UpdateActivity_AsAdminWrongDepartment_Returns403()
    {
        var (activityId, token) = await CreateActivityAndGetIdAndToken(departmentId: _deptJaId);

        var updatePayload = new
        {
            title = "Updated",
            date = "2026-03-14",
            startTime = "09:00:00",
            endTime = "11:00:00",
            departmentId = _deptJaId,
            visibility = "public",
            concurrencyToken = token,
        };

        var response = await AdminClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateActivity_CrossDepartmentHijack_Returns403()
    {
        // Activity belongs to JA — admin has no JA access
        var (activityId, token) = await CreateActivityAndGetIdAndToken(departmentId: _deptJaId);

        // Admin tries to steal the JA activity by sending departmentId=MIFEM (which they own)
        var hijackPayload = new
        {
            title = "Hijacked",
            date = "2026-03-14",
            startTime = "09:00:00",
            endTime = "11:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
        };

        var response = await AdminClient.PutAsJsonAsync($"/api/activities/{activityId}", hijackPayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateActivity_WithStaleConcurrencyToken_Returns409()
    {
        var (activityId, originalToken) = await CreateActivityAndGetIdAndToken();

        // First update succeeds, changing the xmin
        var firstUpdate = new
        {
            title = "First Update",
            date = "2026-03-14",
            startTime = "09:00:00",
            endTime = "11:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = originalToken,
        };
        var firstResponse = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", firstUpdate);
        firstResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Second update with stale token should return 409
        var staleUpdate = new
        {
            title = "Second Update",
            date = "2026-03-14",
            startTime = "09:00:00",
            endTime = "11:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = originalToken,
        };
        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", staleUpdate);
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("urn:sdac:conflict");
    }

    // --- DELETE ---

    [Fact]
    public async Task DeleteActivity_AsAdmin_Returns204()
    {
        var (activityId, _) = await CreateActivityAndGetIdAndToken();

        var response = await AdminClient.DeleteAsync($"/api/activities/{activityId}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var getResponse = await OwnerClient.GetAsync($"/api/activities/{activityId}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteActivity_CascadesRolesAndAssignments()
    {
        // Create activity with roles and assignments via helper
        var viewer = await CreateTestUser("cascade-test@test.local", UserRole.Viewer);
        var activity = await CreateTestActivity(
            _deptMifemId,
            "Cascade Test",
            roles:
            [
                ("Predicateur", 1, new List<int> { viewer.Id }),
                ("Ancien", 1, null),
            ]);

        // Delete the activity
        var response = await OwnerClient.DeleteAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        // Verify cascade: roles and assignments should be gone
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var rolesExist = dbContext.ActivityRoles.Any(r => r.ActivityId == activity.Id);
        rolesExist.ShouldBeFalse();
        var assignmentsExist = dbContext.RoleAssignments.Any(ra => ra.ActivityRole.ActivityId == activity.Id);
        assignmentsExist.ShouldBeFalse();
    }

    // --- POST create with explicit roles (Story 4.3) ---

    [Fact]
    public async Task CreateActivity_WithExplicitRoles_Returns201WithRoles()
    {
        var roles = new object[]
        {
            new { roleName = "Predicateur", headcount = 1 },
            new { roleName = "Ancien de Service", headcount = 1 },
            new { roleName = "Diacres", headcount = 3 },
        };

        var (_, _, rolesResult) = await CreateActivityWithRoles(roles);

        rolesResult.GetArrayLength().ShouldBe(3);
        rolesResult[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
        rolesResult[0].GetProperty("headcount").GetInt32().ShouldBe(1);
        rolesResult[0].GetProperty("sortOrder").GetInt32().ShouldBe(0);
        rolesResult[1].GetProperty("roleName").GetString().ShouldBe("Ancien de Service");
        rolesResult[1].GetProperty("headcount").GetInt32().ShouldBe(1);
        rolesResult[1].GetProperty("sortOrder").GetInt32().ShouldBe(1);
        rolesResult[2].GetProperty("roleName").GetString().ShouldBe("Diacres");
        rolesResult[2].GetProperty("headcount").GetInt32().ShouldBe(3);
        rolesResult[2].GetProperty("sortOrder").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task CreateActivity_WithRolesAndTemplateId_RolesOverrideTemplate()
    {
        var template = await CreateTestActivityTemplate(
            "Override Test",
            [("Template Role", 5)]);

        var payload = new
        {
            title = "Override Activity",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            templateId = template.Id,
            roles = new[] { new { roleName = "Explicit Role", headcount = 2 } },
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");

        roles.GetArrayLength().ShouldBe(1);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Explicit Role");
        roles[0].GetProperty("headcount").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task CreateActivity_WithDuplicateRoleNames_Returns400()
    {
        var payload = new
        {
            title = "Duplicate Roles",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles = new[]
            {
                new { roleName = "Predicateur", headcount = 1 },
                new { roleName = "Predicateur", headcount = 2 },
            },
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateActivity_WithInvalidRoleHeadcount_Returns400()
    {
        var payload = new
        {
            title = "Invalid Headcount",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles = new[] { new { roleName = "Predicateur", headcount = 0 } },
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateActivity_WithRoleNameTooLong_Returns400()
    {
        var payload = new
        {
            title = "Long Name",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles = new[] { new { roleName = new string('a', 101), headcount = 1 } },
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateActivity_WithMaxRoles_Succeeds()
    {
        var roles = Enumerable.Range(1, 20)
            .Select(i => new { roleName = $"Role {i}", headcount = 1 })
            .ToArray();

        var payload = new
        {
            title = "Max Roles",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles,
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("roles").GetArrayLength().ShouldBe(20);
    }

    [Fact]
    public async Task CreateActivity_WithTooManyRoles_Returns400()
    {
        var roles = Enumerable.Range(1, 21)
            .Select(i => new { roleName = $"Role {i}", headcount = 1 })
            .ToArray();

        var payload = new
        {
            title = "Too Many Roles",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles,
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // --- PUT update with roles (Story 4.3) ---

    [Fact]
    public async Task UpdateActivity_AddNewRole_Returns200WithAddedRole()
    {
        var (activityId, token, existingRoles) = await CreateActivityWithRoles(
            [new { roleName = "Predicateur", headcount = 1 }]);

        var existingRoleId = existingRoles[0].GetProperty("id").GetInt32();

        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new object[]
            {
                new { id = existingRoleId, roleName = "Predicateur", headcount = 1 },
                new { roleName = "Musique Speciale", headcount = 3 },
            },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");

        roles.GetArrayLength().ShouldBe(2);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
        roles[1].GetProperty("roleName").GetString().ShouldBe("Musique Speciale");
        roles[1].GetProperty("headcount").GetInt32().ShouldBe(3);
    }

    [Fact]
    public async Task UpdateActivity_ChangeRoleHeadcount_Returns200WithUpdatedHeadcount()
    {
        var (activityId, token, existingRoles) = await CreateActivityWithRoles(
            [new { roleName = "Diacres", headcount = 2 }]);

        var roleId = existingRoles[0].GetProperty("id").GetInt32();

        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new[] { new { id = roleId, roleName = "Diacres", headcount = 4 } },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("roles")[0].GetProperty("headcount").GetInt32().ShouldBe(4);
    }

    [Fact]
    public async Task UpdateActivity_RemoveRole_Returns200WithoutRemovedRole()
    {
        var (activityId, token, _) = await CreateActivityWithRoles(
        [
            new { roleName = "Predicateur", headcount = 1 },
            new { roleName = "Annonces", headcount = 1 },
        ]);

        // Get fresh data to get role IDs
        var getResponse = await OwnerClient.GetAsync($"/api/activities/{activityId}");
        var getJson = await getResponse.Content.ReadAsStringAsync();
        using var getDoc = JsonDocument.Parse(getJson);
        var currentRoles = getDoc.RootElement.GetProperty("roles");
        var predicateurId = currentRoles[0].GetProperty("id").GetInt32();

        // Keep only Predicateur, remove Annonces
        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new[] { new { id = predicateurId, roleName = "Predicateur", headcount = 1 } },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");
        roles.GetArrayLength().ShouldBe(1);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
    }

    [Fact]
    public async Task UpdateActivity_RemoveRoleWithAssignments_CascadeDeletes()
    {
        // Create activity with a role that has assignments
        var viewer = await CreateTestUser("role-cascade@test.local", UserRole.Viewer);
        var activity = await CreateTestActivity(
            _deptMifemId,
            "Role Cascade Test",
            roles:
            [
                ("Predicateur", 1, new List<int> { viewer.Id }),
                ("Ancien", 1, null),
            ]);

        // Get concurrency token
        var getResponse = await OwnerClient.GetAsync($"/api/activities/{activity.Id}");
        var getJson = await getResponse.Content.ReadAsStringAsync();
        using var getDoc = JsonDocument.Parse(getJson);
        var token = getDoc.RootElement.GetProperty("concurrencyToken").GetUInt32();
        var ancienId = getDoc.RootElement.GetProperty("roles")[1].GetProperty("id").GetInt32();

        // Update: keep Ancien only, remove Predicateur (which has assignments)
        var updatePayload = new
        {
            title = "Role Cascade Test",
            date = "2026-03-15",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new[] { new { id = ancienId, roleName = "Ancien", headcount = 1 } },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activity.Id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");
        roles.GetArrayLength().ShouldBe(1);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Ancien");

        // Verify assignments are also gone
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var assignmentsExist = dbContext.RoleAssignments.Any(ra => ra.ActivityRole.ActivityId == activity.Id && ra.UserId == viewer.Id);
        assignmentsExist.ShouldBeFalse();
    }

    [Fact]
    public async Task UpdateActivity_NullRoles_PreservesExistingRoles()
    {
        var (activityId, token, _) = await CreateActivityWithRoles(
            [new { roleName = "Predicateur", headcount = 1 }]);

        // Update without roles field (null = don't modify)
        var updatePayload = new
        {
            title = "Updated Title",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");
        roles.GetArrayLength().ShouldBe(1);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
    }

    [Fact]
    public async Task UpdateActivity_EmptyRoles_RemovesAllRoles()
    {
        var (activityId, token, _) = await CreateActivityWithRoles(
        [
            new { roleName = "Predicateur", headcount = 1 },
            new { roleName = "Ancien", headcount = 1 },
        ]);

        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = Array.Empty<object>(),
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("roles").GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task UpdateActivity_RolesWithStaleToken_Returns409()
    {
        var (activityId, originalToken, _) = await CreateActivityWithRoles(
            [new { roleName = "Predicateur", headcount = 1 }]);

        // First update succeeds
        var firstUpdate = new
        {
            title = "First Update",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = originalToken,
            roles = new[] { new { roleName = "Updated Role", headcount = 2 } },
        };
        var firstResponse = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", firstUpdate);
        firstResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Second update with stale token should fail
        var staleUpdate = new
        {
            title = "Second Update",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = originalToken,
            roles = new[] { new { roleName = "Stale Role", headcount = 1 } },
        };
        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", staleUpdate);
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateActivity_DuplicateRoleNames_Returns400()
    {
        var (activityId, token, _) = await CreateActivityWithRoles(
            [new { roleName = "Predicateur", headcount = 1 }]);

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
                new { roleName = "Duplicate", headcount = 1 },
                new { roleName = "Duplicate", headcount = 2 },
            },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateActivity_ReorderRoles_UpdatesSortOrder()
    {
        var (activityId, token, existingRoles) = await CreateActivityWithRoles(
        [
            new { roleName = "Alpha", headcount = 1 },
            new { roleName = "Beta", headcount = 1 },
            new { roleName = "Gamma", headcount = 1 },
        ]);

        var alphaId = existingRoles[0].GetProperty("id").GetInt32();
        var betaId = existingRoles[1].GetProperty("id").GetInt32();
        var gammaId = existingRoles[2].GetProperty("id").GetInt32();

        // Reorder: Gamma, Alpha, Beta
        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new object[]
            {
                new { id = gammaId, roleName = "Gamma", headcount = 1 },
                new { id = alphaId, roleName = "Alpha", headcount = 1 },
                new { id = betaId, roleName = "Beta", headcount = 1 },
            },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");

        roles[0].GetProperty("roleName").GetString().ShouldBe("Gamma");
        roles[0].GetProperty("sortOrder").GetInt32().ShouldBe(0);
        roles[1].GetProperty("roleName").GetString().ShouldBe("Alpha");
        roles[1].GetProperty("sortOrder").GetInt32().ShouldBe(1);
        roles[2].GetProperty("roleName").GetString().ShouldBe("Beta");
        roles[2].GetProperty("sortOrder").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task UpdateActivity_Roles_AsViewer_Returns403()
    {
        var (activityId, token, _) = await CreateActivityWithRoles(
            [new { roleName = "Predicateur", headcount = 1 }]);

        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken = token,
            roles = new[] { new { roleName = "Hacked", headcount = 1 } },
        };

        var response = await ViewerClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateActivity_Roles_WrongDepartment_Returns403()
    {
        // Create activity in JA (admin only has MIFEM access)
        var (activityId, token, _) = await CreateActivityWithRoles(
            [new { roleName = "Predicateur", headcount = 1 }],
            departmentId: _deptJaId);

        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptJaId,
            visibility = "public",
            concurrencyToken = token,
            roles = new[] { new { roleName = "Hacked", headcount = 1 } },
        };

        var response = await AdminClient.PutAsJsonAsync($"/api/activities/{activityId}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }
}
