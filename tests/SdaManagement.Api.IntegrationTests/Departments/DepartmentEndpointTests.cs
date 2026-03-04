using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Departments;

public class DepartmentEndpointTests : IntegrationTestBase
{
    public DepartmentEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
    }

    private static object ValidDepartmentPayload(
        string name = "Jeunesse Adventiste",
        string abbreviation = "JA",
        string color = "#4F46E5",
        string? description = "Activites pour la jeunesse") => new
    {
        name,
        abbreviation,
        color,
        description,
    };

    private static object ValidDepartmentWithSubMinistriesPayload() => new
    {
        name = "Jeunesse Adventiste",
        abbreviation = "JA",
        color = "#4F46E5",
        description = "Activites pour la jeunesse",
        subMinistryNames = new[] { "Eclaireurs", "Ambassadeurs", "Compagnons" },
    };

    private async Task<int> CreateDepartmentAndGetId(
        string name = "Jeunesse Adventiste",
        string abbreviation = "JA",
        string color = "#4F46E5")
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentPayload(name, abbreviation, color));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("id").GetInt32();
    }

    // --- Department CRUD Tests ---

    [Fact]
    public async Task GetDepartments_AsViewer_ReturnsEmptyList()
    {
        var response = await ViewerClient.GetAsync("/api/departments");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task GetDepartments_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/departments");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task CreateDepartment_AsOwner_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        response.Headers.Location.ShouldNotBeNull();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        root.GetProperty("name").GetString().ShouldBe("Jeunesse Adventiste");
        root.GetProperty("abbreviation").GetString().ShouldBe("JA");
        root.GetProperty("color").GetString().ShouldBe("#4F46E5");
        root.GetProperty("description").GetString().ShouldBe("Activites pour la jeunesse");
    }

    [Fact]
    public async Task CreateDepartment_AsAdmin_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/departments", ValidDepartmentPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateDepartment_WithDuplicateAbbreviation_Returns409()
    {
        await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentPayload());

        var response = await OwnerClient.PostAsJsonAsync("/api/departments",
            ValidDepartmentPayload(name: "Other Dept", abbreviation: "JA", color: "#FF0000"));
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:conflict");
    }

    [Fact]
    public async Task CreateDepartment_WithDuplicateColor_Returns409()
    {
        await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentPayload());

        var response = await OwnerClient.PostAsJsonAsync("/api/departments",
            ValidDepartmentPayload(name: "Other Dept", abbreviation: "OD", color: "#4F46E5"));
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CreateDepartment_WithInvalidData_Returns400()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", new
        {
            name = "",
            abbreviation = "JA",
            color = "#4F46E5",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    [Fact]
    public async Task CreateDepartment_WithInvalidHexColor_Returns400()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments",
            ValidDepartmentPayload(color: "red"));
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateDepartment_WithoutAbbreviation_AutoFillsFromName()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", new
        {
            name = "Musique",
            color = "#AB12CD",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("abbreviation").GetString().ShouldBe("MUSIQUE");
    }

    [Fact]
    public async Task CreateDepartment_SanitizesHtmlInput()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", new
        {
            name = "<script>alert('xss')</script>JA",
            abbreviation = "JA",
            color = "#4F46E5",
            description = "<b>Bold</b> description",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("name").GetString().ShouldNotContain("<script>");
        root.GetProperty("name").GetString().ShouldContain("JA");
        root.GetProperty("description").GetString().ShouldNotContain("<b>");
        root.GetProperty("description").GetString().ShouldContain("description");
    }

    [Fact]
    public async Task CreateDepartment_WithSubMinistries_CreatesAll()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentWithSubMinistriesPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("subMinistries").GetArrayLength().ShouldBe(3);
    }

    [Fact]
    public async Task GetDepartment_ById_ReturnsDetailWithSubMinistries()
    {
        // Create with sub-ministries
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentWithSubMinistriesPayload());
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("id").GetInt32();

        // Get by id
        var response = await ViewerClient.GetAsync($"/api/departments/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("name").GetString().ShouldBe("Jeunesse Adventiste");
        root.GetProperty("subMinistries").GetArrayLength().ShouldBe(3);
        root.TryGetProperty("createdAt", out _).ShouldBeTrue();
        root.TryGetProperty("updatedAt", out _).ShouldBeTrue();
    }

    [Fact]
    public async Task GetDepartment_NotFound_Returns404()
    {
        var response = await ViewerClient.GetAsync("/api/departments/999");
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateDepartment_AsOwner_ReturnsUpdated()
    {
        var id = await CreateDepartmentAndGetId();

        var response = await OwnerClient.PutAsJsonAsync($"/api/departments/{id}", new
        {
            name = "Updated Name",
            abbreviation = "UN",
            color = "#FF0000",
            description = "Updated description",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("name").GetString().ShouldBe("Updated Name");
        doc.RootElement.GetProperty("abbreviation").GetString().ShouldBe("UN");
        doc.RootElement.GetProperty("color").GetString().ShouldBe("#FF0000");
    }

    [Fact]
    public async Task UpdateDepartment_AsAdmin_Returns403()
    {
        var id = await CreateDepartmentAndGetId();

        var response = await AdminClient.PutAsJsonAsync($"/api/departments/{id}", ValidDepartmentPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateDepartment_WithDuplicateAbbreviation_Returns409()
    {
        await CreateDepartmentAndGetId(name: "Dept A", abbreviation: "DA", color: "#111111");
        var idB = await CreateDepartmentAndGetId(name: "Dept B", abbreviation: "DB", color: "#222222");

        var response = await OwnerClient.PutAsJsonAsync($"/api/departments/{idB}", new
        {
            name = "Dept B",
            abbreviation = "DA",
            color = "#222222",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateDepartment_WithDuplicateColor_Returns409()
    {
        await CreateDepartmentAndGetId(name: "Dept A", abbreviation: "DA", color: "#111111");
        var idB = await CreateDepartmentAndGetId(name: "Dept B", abbreviation: "DB", color: "#222222");

        var response = await OwnerClient.PutAsJsonAsync($"/api/departments/{idB}", new
        {
            name = "Dept B",
            abbreviation = "DB",
            color = "#111111",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateDepartment_NotFound_Returns404()
    {
        var response = await OwnerClient.PutAsJsonAsync("/api/departments/999", ValidDepartmentPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteDepartment_AsOwner_Returns204()
    {
        var id = await CreateDepartmentAndGetId();

        var deleteResponse = await OwnerClient.DeleteAsync($"/api/departments/{id}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        // Verify GET now returns 404
        var getResponse = await ViewerClient.GetAsync($"/api/departments/{id}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteDepartment_AsAdmin_Returns403()
    {
        var id = await CreateDepartmentAndGetId();

        var response = await AdminClient.DeleteAsync($"/api/departments/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteDepartment_CascadesSubMinistries()
    {
        // Create with sub-ministries
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/departments", ValidDepartmentWithSubMinistriesPayload());
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("id").GetInt32();

        // Verify sub-ministries exist before deletion
        var getBeforeDelete = await ViewerClient.GetAsync($"/api/departments/{id}");
        getBeforeDelete.StatusCode.ShouldBe(HttpStatusCode.OK);
        var beforeJson = await getBeforeDelete.Content.ReadAsStringAsync();
        using var beforeDoc = JsonDocument.Parse(beforeJson);
        beforeDoc.RootElement.GetProperty("subMinistries").GetArrayLength().ShouldBe(3);

        // Delete department
        var deleteResponse = await OwnerClient.DeleteAsync($"/api/departments/{id}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        // Verify department gone
        var getResponse = await ViewerClient.GetAsync($"/api/departments/{id}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Re-create department with same name — should succeed (no orphan constraint violations)
        var recreateResponse = await OwnerClient.PostAsJsonAsync("/api/departments",
            ValidDepartmentPayload());
        recreateResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    // --- Sub-Ministry CRUD Tests ---

    [Fact]
    public async Task AddSubMinistry_AsOwner_Returns201()
    {
        var deptId = await CreateDepartmentAndGetId();

        var response = await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        doc.RootElement.GetProperty("name").GetString().ShouldBe("Eclaireurs");
    }

    [Fact]
    public async Task AddSubMinistry_DuplicateName_Returns409()
    {
        var deptId = await CreateDepartmentAndGetId();

        await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });

        var response = await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task AddSubMinistry_AsAdmin_Returns403()
    {
        var deptId = await CreateDepartmentAndGetId();

        var response = await AdminClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Test" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateSubMinistry_AsAdmin_Returns403()
    {
        var deptId = await CreateDepartmentAndGetId();
        var addResponse = await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });
        var addJson = await addResponse.Content.ReadAsStringAsync();
        using var addDoc = JsonDocument.Parse(addJson);
        var subId = addDoc.RootElement.GetProperty("id").GetInt32();

        var response = await AdminClient.PutAsJsonAsync($"/api/departments/{deptId}/sub-ministries/{subId}", new { name = "Updated" });
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteSubMinistry_AsAdmin_Returns403()
    {
        var deptId = await CreateDepartmentAndGetId();
        var addResponse = await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });
        var addJson = await addResponse.Content.ReadAsStringAsync();
        using var addDoc = JsonDocument.Parse(addJson);
        var subId = addDoc.RootElement.GetProperty("id").GetInt32();

        var response = await AdminClient.DeleteAsync($"/api/departments/{deptId}/sub-ministries/{subId}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task AddSubMinistry_DepartmentNotFound_Returns404()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments/999/sub-ministries", new { name = "Test" });
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UpdateSubMinistry_AsOwner_Returns200()
    {
        var deptId = await CreateDepartmentAndGetId();

        // Add sub-ministry
        var addResponse = await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });
        var addJson = await addResponse.Content.ReadAsStringAsync();
        using var addDoc = JsonDocument.Parse(addJson);
        var subId = addDoc.RootElement.GetProperty("id").GetInt32();

        // Update
        var response = await OwnerClient.PutAsJsonAsync($"/api/departments/{deptId}/sub-ministries/{subId}", new { name = "Pathfinders" });
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("name").GetString().ShouldBe("Pathfinders");
    }

    [Fact]
    public async Task DeleteSubMinistry_AsOwner_Returns204()
    {
        var deptId = await CreateDepartmentAndGetId();

        // Add sub-ministry
        var addResponse = await OwnerClient.PostAsJsonAsync($"/api/departments/{deptId}/sub-ministries", new { name = "Eclaireurs" });
        var addJson = await addResponse.Content.ReadAsStringAsync();
        using var addDoc = JsonDocument.Parse(addJson);
        var subId = addDoc.RootElement.GetProperty("id").GetInt32();

        // Delete
        var response = await OwnerClient.DeleteAsync($"/api/departments/{deptId}/sub-ministries/{subId}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }
}
