using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.ActivityTemplates;

public class ActivityTemplateEndpointTests : IntegrationTestBase
{
    public ActivityTemplateEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
    }

    private static object ValidTemplatePayload(
        string name = "Culte du Sabbat",
        string? description = "Service principal du samedi") => new
    {
        name,
        description,
        roles = new[]
        {
            new { roleName = "Predicateur", defaultHeadcount = 1 },
            new { roleName = "Ancien de Service", defaultHeadcount = 1 },
            new { roleName = "Diacres", defaultHeadcount = 2 },
        },
    };

    private async Task<int> CreateTemplateAndGetId(
        string name = "Culte du Sabbat",
        string? description = "Service principal du samedi")
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", ValidTemplatePayload(name, description));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("id").GetInt32();
    }

    // --- GET list ---

    [Fact]
    public async Task GetTemplates_AsViewer_ReturnsEmptyList()
    {
        var response = await ViewerClient.GetAsync("/api/activity-templates");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task GetTemplates_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/activity-templates");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    // --- POST create ---

    [Fact]
    public async Task CreateTemplate_AsOwner_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", ValidTemplatePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        response.Headers.Location.ShouldNotBeNull();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("name").GetString().ShouldBe("Culte du Sabbat");
        root.GetProperty("description").GetString().ShouldBe("Service principal du samedi");
        root.GetProperty("roles").GetArrayLength().ShouldBe(3);

        var roles = root.GetProperty("roles");
        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
        roles[0].GetProperty("defaultHeadcount").GetInt32().ShouldBe(1);
        roles[0].GetProperty("sortOrder").GetInt32().ShouldBe(0);
        roles[1].GetProperty("roleName").GetString().ShouldBe("Ancien de Service");
        roles[2].GetProperty("roleName").GetString().ShouldBe("Diacres");
        roles[2].GetProperty("defaultHeadcount").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task CreateTemplate_AsAdmin_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/activity-templates", ValidTemplatePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateTemplate_EmptyName_Returns400()
    {
        var payload = new
        {
            name = "",
            roles = new[] { new { roleName = "Role", defaultHeadcount = 1 } },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateTemplate_NoRoles_Returns400()
    {
        var payload = new
        {
            name = "Test Template",
            roles = Array.Empty<object>(),
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateTemplate_HeadcountZero_Returns400()
    {
        var payload = new
        {
            name = "Test Template",
            roles = new[] { new { roleName = "Role", defaultHeadcount = 0 } },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateTemplate_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/activity-templates", ValidTemplatePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateTemplate_DuplicateRoleNames_Returns400()
    {
        var payload = new
        {
            name = "Template With Dup Roles",
            roles = new[]
            {
                new { roleName = "Predicateur", defaultHeadcount = 1 },
                new { roleName = "Predicateur", defaultHeadcount = 2 },
            },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("unique");
    }

    [Fact]
    public async Task CreateTemplate_DuplicateName_Returns409()
    {
        await CreateTemplateAndGetId();

        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", ValidTemplatePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("conflict");
    }

    [Fact]
    public async Task CreateTemplate_HtmlSanitization_StripsTagsFromNameAndRoles()
    {
        var payload = new
        {
            name = "<script>alert('xss')</script>Template",
            description = "<b>Bold</b> description",
            roles = new[]
            {
                new { roleName = "<img src=x onerror=alert(1)>Predicateur", defaultHeadcount = 1 },
            },
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/activity-templates", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("name").GetString().ShouldNotContain("<script>");
        root.GetProperty("description").GetString().ShouldNotContain("<b>");
        root.GetProperty("roles")[0].GetProperty("roleName").GetString().ShouldNotContain("<img");
    }

    // --- GET by id ---

    [Fact]
    public async Task GetTemplateById_ReturnsTemplateWithRolesOrderedBySortOrder()
    {
        var id = await CreateTemplateAndGetId();

        var response = await ViewerClient.GetAsync($"/api/activity-templates/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBe(id);
        root.GetProperty("name").GetString().ShouldBe("Culte du Sabbat");

        var roles = root.GetProperty("roles");
        roles.GetArrayLength().ShouldBe(3);
        roles[0].GetProperty("sortOrder").GetInt32().ShouldBe(0);
        roles[1].GetProperty("sortOrder").GetInt32().ShouldBe(1);
        roles[2].GetProperty("sortOrder").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task GetTemplateById_NotFound_Returns404()
    {
        var response = await ViewerClient.GetAsync("/api/activity-templates/99999");
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // --- PUT update ---

    [Fact]
    public async Task UpdateTemplate_AsOwner_Returns200WithReplacedRoles()
    {
        var id = await CreateTemplateAndGetId();

        var updatePayload = new
        {
            name = "Culte du Sabbat Updated",
            description = "Updated description",
            roles = new[]
            {
                new { roleName = "Predicateur", defaultHeadcount = 1 },
                new { roleName = "Musique Speciale", defaultHeadcount = 3 },
            },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activity-templates/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("name").GetString().ShouldBe("Culte du Sabbat Updated");
        root.GetProperty("roles").GetArrayLength().ShouldBe(2);
        root.GetProperty("roles")[1].GetProperty("roleName").GetString().ShouldBe("Musique Speciale");
        root.GetProperty("roles")[1].GetProperty("defaultHeadcount").GetInt32().ShouldBe(3);
    }

    [Fact]
    public async Task UpdateTemplate_AsAnonymous_Returns401()
    {
        var payload = new
        {
            name = "Updated",
            roles = new[] { new { roleName = "Role", defaultHeadcount = 1 } },
        };

        var response = await AnonymousClient.PutAsJsonAsync("/api/activity-templates/1", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateTemplate_AsAdmin_Returns403()
    {
        var id = await CreateTemplateAndGetId();

        var updatePayload = new
        {
            name = "Updated",
            roles = new[] { new { roleName = "Role", defaultHeadcount = 1 } },
        };

        var response = await AdminClient.PutAsJsonAsync($"/api/activity-templates/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateTemplate_DuplicateName_Returns409()
    {
        await CreateTemplateAndGetId("Template A");
        var idB = await CreateTemplateAndGetId("Template B");

        var updatePayload = new
        {
            name = "Template A",
            roles = new[] { new { roleName = "Role", defaultHeadcount = 1 } },
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/activity-templates/{idB}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("conflict");
    }

    [Fact]
    public async Task UpdateTemplate_AsViewer_Returns403()
    {
        var id = await CreateTemplateAndGetId();

        var updatePayload = new
        {
            name = "Updated",
            roles = new[] { new { roleName = "Role", defaultHeadcount = 1 } },
        };

        var response = await ViewerClient.PutAsJsonAsync($"/api/activity-templates/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    // --- DELETE ---

    [Fact]
    public async Task DeleteTemplate_AsOwner_Returns204AndCascadeDeletesRoles()
    {
        var id = await CreateTemplateAndGetId();

        var deleteResponse = await OwnerClient.DeleteAsync($"/api/activity-templates/{id}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var getResponse = await ViewerClient.GetAsync($"/api/activity-templates/{id}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteTemplate_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.DeleteAsync("/api/activity-templates/1");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeleteTemplate_AsAdmin_Returns403()
    {
        var id = await CreateTemplateAndGetId();

        var response = await AdminClient.DeleteAsync($"/api/activity-templates/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteTemplate_AsViewer_Returns403()
    {
        var id = await CreateTemplateAndGetId();

        var response = await ViewerClient.DeleteAsync($"/api/activity-templates/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }
}
