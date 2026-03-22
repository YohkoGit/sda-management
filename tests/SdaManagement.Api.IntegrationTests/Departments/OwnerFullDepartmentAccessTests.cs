// CRITICAL: OwnerClient user has ZERO department assignments.
// All tests prove OWNER bypass in CanManage(), not coincidental scope match.
// If anyone adds department assignments to the OWNER test user, the guard
// assertion in OwnerHasZeroDepartmentAssignments will fail — that is intentional.

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Departments;

public class OwnerFullDepartmentAccessTests : IntegrationTestBase
{
    private int _unassignedDeptId;
    private int _adminDeptId;
    private int _memberUserId;

    public OwnerFullDepartmentAccessTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Department that ADMIN is assigned to
        var adminDept = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        // Department that OWNER is NOT assigned to (and neither is ADMIN)
        var unassignedDept = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#10B981",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        dbContext.Departments.Add(adminDept);
        dbContext.Departments.Add(unassignedDept);
        await dbContext.SaveChangesAsync();

        _adminDeptId = adminDept.Id;
        _unassignedDeptId = unassignedDept.Id;

        // Admin assigned to MIFEM only — NOT to JA
        await AssignDepartmentToUser(admin.Id, _adminDeptId);

        // Create a member of the unassigned dept (for sub-ministry lead assignment test)
        var member = await CreateTestUser("member@test.local", UserRole.Viewer);
        _memberUserId = member.Id;
        await AssignDepartmentToUser(member.Id, _unassignedDeptId);
    }

    // ─── Guard Assertion: OWNER has zero department assignments ───

    [Fact]
    public async Task OwnerHasZeroDepartmentAssignments()
    {
        var response = await OwnerClient.GetAsync("/api/auth/me");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("role").GetString().ShouldBe("OWNER");
        root.GetProperty("departmentIds").GetArrayLength().ShouldBe(0);
    }

    // ─── Activity CRUD (OWNER on unassigned department) ───

    [Fact]
    public async Task CreateActivity_AsOwner_InUnassignedDepartment_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Culte JA",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _unassignedDeptId,
            visibility = "public",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        doc.RootElement.GetProperty("departmentId").GetInt32().ShouldBe(_unassignedDeptId);
    }

    [Fact]
    public async Task UpdateActivity_AsOwner_InUnassignedDepartment_Returns200()
    {
        // Create first
        var (id, token) = await CreateActivityInUnassignedDept("Update Target");

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{id}", new
        {
            title = "Updated by Owner",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _unassignedDeptId,
            visibility = "public",
            concurrencyToken = token,
        });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("title").GetString().ShouldBe("Updated by Owner");
    }

    [Fact]
    public async Task DeleteActivity_AsOwner_InUnassignedDepartment_Returns204()
    {
        var (id, _) = await CreateActivityInUnassignedDept("Delete Target");

        var response = await OwnerClient.DeleteAsync($"/api/activities/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    // ─── Meeting CRUD (OWNER on unassigned department) ───

    [Fact]
    public async Task CreateZoomMeeting_AsOwner_InUnassignedDepartment_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Réunion JA",
            date = FutureDate(),
            startTime = "19:00:00",
            endTime = "20:30:00",
            departmentId = _unassignedDeptId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/999888777",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("isMeeting").GetBoolean().ShouldBeTrue();
        doc.RootElement.GetProperty("meetingType").GetString().ShouldBe("zoom");
        doc.RootElement.GetProperty("zoomLink").GetString().ShouldBe("https://zoom.us/j/999888777");
    }

    [Fact]
    public async Task CreatePhysicalMeeting_AsOwner_InUnassignedDepartment_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Planification JA",
            date = FutureDate(),
            startTime = "18:30:00",
            endTime = "20:00:00",
            departmentId = _unassignedDeptId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "physical",
            locationName = "Salle communautaire",
            locationAddress = "123 rue Principale",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("meetingType").GetString().ShouldBe("physical");
        doc.RootElement.GetProperty("locationName").GetString().ShouldBe("Salle communautaire");
    }

    [Fact]
    public async Task UpdateMeeting_AsOwner_InUnassignedDepartment_Returns200()
    {
        var (id, token) = await CreateMeetingInUnassignedDept("Meeting to Update");

        var response = await OwnerClient.PutAsJsonAsync($"/api/activities/{id}", new
        {
            title = "Updated Meeting",
            date = FutureDate(),
            startTime = "19:00:00",
            endTime = "21:00:00",
            departmentId = _unassignedDeptId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/123456789",
            concurrencyToken = token,
        });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("title").GetString().ShouldBe("Updated Meeting");
    }

    [Fact]
    public async Task DeleteMeeting_AsOwner_InUnassignedDepartment_Returns204()
    {
        var (id, _) = await CreateMeetingInUnassignedDept("Meeting to Delete");

        var response = await OwnerClient.DeleteAsync($"/api/activities/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    // ─── Sub-ministry CRUD (OWNER on unassigned department) ───

    [Fact]
    public async Task CreateSubMinistry_AsOwner_InUnassignedDepartment_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries",
            new { name = "Éclaireurs" });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        doc.RootElement.GetProperty("name").GetString().ShouldBe("Éclaireurs");
    }

    [Fact]
    public async Task UpdateSubMinistry_AsOwner_InUnassignedDepartment_Returns200()
    {
        // Create first
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries",
            new { name = "Ambassadeurs" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await OwnerClient.PutAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries/{subId}",
            new { name = "Ambassadeurs Royaux" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("name").GetString().ShouldBe("Ambassadeurs Royaux");
    }

    [Fact]
    public async Task DeleteSubMinistry_AsOwner_InUnassignedDepartment_Returns204()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries",
            new { name = "To Delete" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await OwnerClient.DeleteAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries/{subId}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task AssignSubMinistryLead_AsOwner_InUnassignedDepartment_Returns200()
    {
        // Create sub-ministry without lead
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries",
            new { name = "Compagnons" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        // Assign lead (member is in the unassigned dept)
        var response = await OwnerClient.PutAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries/{subId}",
            new { name = "Compagnons", leadUserId = _memberUserId });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("leadUserId").GetInt32().ShouldBe(_memberUserId);
    }

    // ─── Department view tests ───

    [Fact]
    public async Task GetAllDepartments_AsOwner_ReturnsAllDepartments()
    {
        var response = await OwnerClient.GetAsync("/api/departments");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var departments = doc.RootElement.EnumerateArray().ToList();
        departments.Count.ShouldBeGreaterThanOrEqualTo(2);
        // Verify OWNER sees the unassigned department (proves visibility isn't scoped)
        departments.ShouldContain(d => d.GetProperty("id").GetInt32() == _unassignedDeptId);
    }

    [Fact]
    public async Task GetDepartmentDetail_AsOwner_UnassignedDepartment_Returns200()
    {
        var response = await OwnerClient.GetAsync($"/api/departments/{_unassignedDeptId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("name").GetString().ShouldBe("Jeunesse Adventiste");
        doc.RootElement.GetProperty("abbreviation").GetString().ShouldBe("JA");
    }

    [Fact]
    public async Task GetDepartmentsWithStaffing_AsOwner_ReturnsAllWithStaffing()
    {
        var response = await OwnerClient.GetAsync("/api/departments/with-staffing");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var departments = doc.RootElement.EnumerateArray().ToList();
        departments.Count.ShouldBeGreaterThanOrEqualTo(2);
        // Verify staffing fields are present on each department
        foreach (var dept in departments)
        {
            dept.TryGetProperty("subMinistryCount", out _).ShouldBeTrue();
            dept.TryGetProperty("upcomingActivityCount", out _).ShouldBeTrue();
            dept.TryGetProperty("aggregateStaffingStatus", out _).ShouldBeTrue();
        }
    }

    [Fact]
    public async Task GetActivities_AsOwner_FilterByUnassignedDepartment_ReturnsActivities()
    {
        // Create activity in unassigned dept
        await CreateActivityInUnassignedDept("Filterable Activity");

        var response = await OwnerClient.GetAsync($"/api/activities?departmentId={_unassignedDeptId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBeGreaterThanOrEqualTo(1);
    }

    // ─── Negative control tests (ADMIN blocked on unassigned department) ───

    [Fact]
    public async Task CreateActivity_AsAdmin_InUnassignedDepartment_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Unauthorized Activity",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _unassignedDeptId,
            visibility = "public",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateMeeting_AsAdmin_InUnassignedDepartment_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Unauthorized Meeting",
            date = FutureDate(),
            startTime = "19:00:00",
            endTime = "20:30:00",
            departmentId = _unassignedDeptId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/forbidden",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateSubMinistry_AsAdmin_InUnassignedDepartment_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_unassignedDeptId}/sub-ministries",
            new { name = "Unauthorized Sub" });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetAllActivities_AsAdmin_NoFilter_Returns403()
    {
        var response = await AdminClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // ─── Helpers ───

    private static string FutureDate(int offsetDays = 30) =>
        DateOnly.FromDateTime(DateTime.UtcNow.AddDays(offsetDays)).ToString("yyyy-MM-dd");

    private async Task<(int Id, uint ConcurrencyToken)> CreateActivityInUnassignedDept(string title)
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", new
        {
            title,
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _unassignedDeptId,
            visibility = "public",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return (
            doc.RootElement.GetProperty("id").GetInt32(),
            doc.RootElement.GetProperty("concurrencyToken").GetUInt32()
        );
    }

    private async Task<(int Id, uint ConcurrencyToken)> CreateMeetingInUnassignedDept(string title)
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", new
        {
            title,
            date = FutureDate(),
            startTime = "19:00:00",
            endTime = "20:30:00",
            departmentId = _unassignedDeptId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/123456789",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return (
            doc.RootElement.GetProperty("id").GetInt32(),
            doc.RootElement.GetProperty("concurrencyToken").GetUInt32()
        );
    }
}
