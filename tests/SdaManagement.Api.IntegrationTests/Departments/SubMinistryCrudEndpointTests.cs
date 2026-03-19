using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Departments;

public class SubMinistryCrudEndpointTests : IntegrationTestBase
{
    private int _deptMifemId;
    private int _deptJaId;
    private int _memberUserId;
    private int _nonMemberUserId;

    public SubMinistryCrudEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

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

        // Admin assigned to MIFEM only
        await AssignDepartmentToUser(admin.Id, _deptMifemId);

        // Create a user who is a member of MIFEM (for lead assignment)
        var member = await CreateTestUser("member@test.local", UserRole.Viewer);
        _memberUserId = member.Id;
        await AssignDepartmentToUser(member.Id, _deptMifemId);

        // Create a user who is NOT a member of MIFEM (for invalid lead test)
        var nonMember = await CreateTestUser("nonmember@test.local", UserRole.Viewer);
        _nonMemberUserId = nonMember.Id;
        await AssignDepartmentToUser(nonMember.Id, _deptJaId);
    }

    // Task 5.1: Create sub-ministry as ADMIN with scope → 201
    [Fact]
    public async Task CreateSubMinistry_AsAdminWithScope_Returns201()
    {
        var response = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Éclaireurs" });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        root.GetProperty("name").GetString().ShouldBe("Éclaireurs");
    }

    // Task 5.2: Create sub-ministry with lead assignment → 201
    [Fact]
    public async Task CreateSubMinistry_WithLead_Returns201WithLeadInfo()
    {
        var response = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Ambassadeurs", leadUserId = _memberUserId });

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        root.GetProperty("name").GetString().ShouldBe("Ambassadeurs");
        root.GetProperty("leadUserId").GetInt32().ShouldBe(_memberUserId);
        root.GetProperty("leadFirstName").GetString().ShouldBe("Test");
        root.GetProperty("leadLastName").GetString().ShouldBe("Viewer");
    }

    // Task 5.3: Create sub-ministry with invalid LeadUserId → 400
    [Fact]
    public async Task CreateSubMinistry_WithLeadNotInDepartment_Returns400()
    {
        var response = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Invalid Lead Test", leadUserId = _nonMemberUserId });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("detail").GetString()
            .ShouldContain("not a member of this department");
    }

    // Task 5.4: Update sub-ministry name and lead → 200
    [Fact]
    public async Task UpdateSubMinistry_NameAndLead_Returns200()
    {
        // Create first
        var createResponse = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Pathfinders" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        // Update
        var updateResponse = await AdminClient.PutAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries/{subId}",
            new { name = "Pathfinders Updated", leadUserId = _memberUserId });

        updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await updateResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("name").GetString().ShouldBe("Pathfinders Updated");
        root.GetProperty("leadUserId").GetInt32().ShouldBe(_memberUserId);
    }

    // Task 5.5: Update sub-ministry to remove lead → 200
    [Fact]
    public async Task UpdateSubMinistry_RemoveLead_Returns200()
    {
        // Create with lead
        var createResponse = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "With Lead", leadUserId = _memberUserId });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        // Remove lead by setting to null
        var updateResponse = await AdminClient.PutAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries/{subId}",
            new { name = "With Lead", leadUserId = (int?)null });

        updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await updateResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.TryGetProperty("leadUserId", out _).ShouldBeFalse();
    }

    // Task 5.6: Delete sub-ministry as ADMIN with scope → 204
    [Fact]
    public async Task DeleteSubMinistry_AsAdminWithScope_Returns204()
    {
        var createResponse = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "To Delete" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var deleteResponse = await AdminClient.DeleteAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries/{subId}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    // Task 5.7: ADMIN without scope → 403
    [Fact]
    public async Task CreateSubMinistry_AsAdminWithoutScope_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries",
            new { name = "Unauthorized" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateSubMinistry_AsAdminWithoutScope_Returns403()
    {
        // Create via OWNER in JA dept
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries",
            new { name = "JA Sub" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        // Admin (MIFEM only) tries to update JA sub-ministry
        var response = await AdminClient.PutAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries/{subId}",
            new { name = "Unauthorized Update" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteSubMinistry_AsAdminWithoutScope_Returns403()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries",
            new { name = "JA Sub Delete" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await AdminClient.DeleteAsync(
            $"/api/departments/{_deptJaId}/sub-ministries/{subId}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // Task 5.8: VIEWER → 403
    [Fact]
    public async Task CreateSubMinistry_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Viewer Test" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateSubMinistry_AsViewer_Returns403()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Viewer Update Test" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await ViewerClient.PutAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries/{subId}",
            new { name = "Unauthorized" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteSubMinistry_AsViewer_Returns403()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Viewer Delete Test" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await ViewerClient.DeleteAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries/{subId}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // Task 5.9: OWNER → 201/200/204 for any department
    [Fact]
    public async Task CreateSubMinistry_AsOwner_AnyDepartment_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries",
            new { name = "Owner JA Sub" });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task UpdateSubMinistry_AsOwner_AnyDepartment_Returns200()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries",
            new { name = "Owner Update Test" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await OwnerClient.PutAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries/{subId}",
            new { name = "Owner Updated" });
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteSubMinistry_AsOwner_AnyDepartment_Returns204()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptJaId}/sub-ministries",
            new { name = "Owner Delete Test" });
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var subId = createDoc.RootElement.GetProperty("id").GetInt32();

        var response = await OwnerClient.DeleteAsync(
            $"/api/departments/{_deptJaId}/sub-ministries/{subId}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    // Task 5.10: Duplicate name in same department → 409
    [Fact]
    public async Task CreateSubMinistry_DuplicateName_Returns409()
    {
        await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Duplicate Test" });

        var response = await AdminClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Duplicate Test" });

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    // Task 5.11: OWNER assigns lead from different department → 400
    [Fact]
    public async Task CreateSubMinistry_OwnerAssignsLeadFromDifferentDept_Returns400()
    {
        // _nonMemberUserId belongs to JA, not MIFEM
        var response = await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "Cross Dept Lead", leadUserId = _nonMemberUserId });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("detail").GetString()
            .ShouldContain("not a member of this department");
    }

    // Task 5.12: Verify GetById returns lead info
    [Fact]
    public async Task GetDepartment_ReturnsSubMinistriesWithLeadInfo()
    {
        // Create sub-ministry with lead
        await OwnerClient.PostAsJsonAsync(
            $"/api/departments/{_deptMifemId}/sub-ministries",
            new { name = "With Lead Info", leadUserId = _memberUserId });

        // Get department detail
        var response = await OwnerClient.GetAsync($"/api/departments/{_deptMifemId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var subMinistries = doc.RootElement.GetProperty("subMinistries");
        subMinistries.GetArrayLength().ShouldBeGreaterThanOrEqualTo(1);

        var withLead = subMinistries.EnumerateArray()
            .First(s => s.GetProperty("name").GetString() == "With Lead Info");
        withLead.GetProperty("leadUserId").GetInt32().ShouldBe(_memberUserId);
        withLead.TryGetProperty("leadFirstName", out _).ShouldBeTrue();
        withLead.TryGetProperty("leadLastName", out _).ShouldBeTrue();
    }
}
