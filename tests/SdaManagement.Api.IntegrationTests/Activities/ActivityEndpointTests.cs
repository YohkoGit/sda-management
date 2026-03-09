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
}
