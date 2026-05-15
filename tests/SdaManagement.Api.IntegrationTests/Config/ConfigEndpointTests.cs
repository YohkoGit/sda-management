using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Config;

public class ConfigEndpointTests : IntegrationTestBase
{
    public ConfigEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        // Seed users matching TestAuthHandler email patterns
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
    }

    private static object ValidConfigPayload() => new
    {
        churchName = "Eglise Adventiste de Saint-Hubert",
        address = "1234 Rue de l'Eglise, Saint-Hubert, QC",
        youTubeChannelUrl = "https://www.youtube.com/@sdac-st-hubert",
        phoneNumber = "+1 (450) 555-0100",
        welcomeMessage = "Bienvenue!",
        defaultLocale = "fr",
    };

    [Fact]
    public async Task GetPublicConfig_WhenNoConfig_Returns404()
    {
        var response = await AnonymousClient.GetAsync("/api/config");
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetPublicConfig_WhenConfigExists_ReturnsPublicFields()
    {
        // Seed config
        var putResponse = await OwnerClient.PutAsJsonAsync("/api/config", ValidConfigPayload());
        putResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Fetch public
        var response = await AnonymousClient.GetAsync("/api/config");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // Public fields present
        root.GetProperty("churchName").GetString().ShouldBe("Eglise Adventiste de Saint-Hubert");
        root.GetProperty("address").GetString().ShouldBe("1234 Rue de l'Eglise, Saint-Hubert, QC");
        root.GetProperty("welcomeMessage").GetString().ShouldBe("Bienvenue!");
        root.GetProperty("youTubeChannelUrl").GetString().ShouldBe("https://www.youtube.com/@sdac-st-hubert");

        // Private fields absent
        root.TryGetProperty("phoneNumber", out _).ShouldBeFalse();
        root.TryGetProperty("defaultLocale", out _).ShouldBeFalse();
        root.TryGetProperty("createdAt", out _).ShouldBeFalse();
        root.TryGetProperty("updatedAt", out _).ShouldBeFalse();
        root.TryGetProperty("id", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task GetAdminConfig_AsOwner_ReturnsAllFields()
    {
        // Seed config
        await OwnerClient.PutAsJsonAsync("/api/config", ValidConfigPayload());

        var response = await OwnerClient.GetAsync("/api/config/admin");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        root.GetProperty("churchName").GetString().ShouldBe("Eglise Adventiste de Saint-Hubert");
        root.GetProperty("address").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("youTubeChannelUrl").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("phoneNumber").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("welcomeMessage").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("defaultLocale").GetString().ShouldBe("fr");
        root.TryGetProperty("createdAt", out _).ShouldBeTrue();
        root.TryGetProperty("updatedAt", out _).ShouldBeTrue();
    }

    [Fact]
    public async Task GetAdminConfig_AsAdmin_Returns403()
    {
        var response = await AdminClient.GetAsync("/api/config/admin");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetAdminConfig_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/config/admin");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateConfig_AsOwner_CreatesConfig()
    {
        var response = await OwnerClient.PutAsJsonAsync("/api/config", ValidConfigPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBeGreaterThan(0);
        root.GetProperty("churchName").GetString().ShouldBe("Eglise Adventiste de Saint-Hubert");
        root.GetProperty("defaultLocale").GetString().ShouldBe("fr");

        // Verify public endpoint now returns data
        var publicResponse = await AnonymousClient.GetAsync("/api/config");
        publicResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task UpdateConfig_AsOwner_UpdatesExistingConfig()
    {
        // Create
        await OwnerClient.PutAsJsonAsync("/api/config", ValidConfigPayload());

        // Update
        var updatedPayload = new
        {
            churchName = "New Church Name",
            address = "456 New Address",
            defaultLocale = "en",
        };
        var response = await OwnerClient.PutAsJsonAsync("/api/config", updatedPayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("churchName").GetString().ShouldBe("New Church Name");
        doc.RootElement.GetProperty("address").GetString().ShouldBe("456 New Address");
        doc.RootElement.GetProperty("defaultLocale").GetString().ShouldBe("en");

        // Verify it's the same record (id should be the same)
        var adminResponse = await OwnerClient.GetAsync("/api/config/admin");
        var adminJson = await adminResponse.Content.ReadAsStringAsync();
        using var adminDoc = JsonDocument.Parse(adminJson);
        adminDoc.RootElement.GetProperty("id").GetInt32().ShouldBe(
            doc.RootElement.GetProperty("id").GetInt32());
    }

    [Fact]
    public async Task UpdateConfig_Response_CreatedAtIsIso8601WithOffset()
    {
        // Wire contract: createdAt/updatedAt are serialized as DateTimeOffset (ISO 8601 with offset),
        // not as DateTime (which omits the timezone marker and is parsed as local on the FE).
        // Regression guard: this prevents accidentally reverting the DTO back to DateTime.
        var response = await OwnerClient.PutAsJsonAsync("/api/config", ValidConfigPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var createdAtRaw = doc.RootElement.GetProperty("createdAt").GetString();
        var updatedAtRaw = doc.RootElement.GetProperty("updatedAt").GetString();

        createdAtRaw.ShouldNotBeNull();
        updatedAtRaw.ShouldNotBeNull();

        // Round-trip via DateTimeOffset.Parse — fails for naïve DateTime strings without offset
        var parsed = DateTimeOffset.Parse(createdAtRaw, System.Globalization.CultureInfo.InvariantCulture);
        parsed.Offset.ShouldBe(TimeSpan.Zero, $"createdAt offset should be UTC, got {parsed.Offset}");
        parsed.ShouldBeGreaterThan(DateTimeOffset.UtcNow.AddMinutes(-5));
    }

    [Fact]
    public async Task UpdateConfig_AsAdmin_Returns403()
    {
        var response = await AdminClient.PutAsJsonAsync("/api/config", ValidConfigPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateConfig_WithInvalidData_Returns400()
    {
        var response = await OwnerClient.PutAsJsonAsync("/api/config", new
        {
            churchName = "",
            address = "Some Address",
            defaultLocale = "fr",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    [Fact]
    public async Task UpdateConfig_WithInvalidYouTubeUrl_Returns400()
    {
        var response = await OwnerClient.PutAsJsonAsync("/api/config", new
        {
            churchName = "Test Church",
            address = "Some Address",
            youTubeChannelUrl = "not-a-url",
            defaultLocale = "fr",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateConfig_SanitizesHtmlInput()
    {
        var response = await OwnerClient.PutAsJsonAsync("/api/config", new
        {
            churchName = "<script>alert('xss')</script>Church Name",
            address = "<b>Bold</b> Address",
            welcomeMessage = "<img onerror='hack'>Welcome",
            defaultLocale = "fr",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Verify HTML is stripped
        var adminResponse = await OwnerClient.GetAsync("/api/config/admin");
        var json = await adminResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("churchName").GetString().ShouldNotContain("<script>");
        root.GetProperty("churchName").GetString().ShouldContain("Church Name");
        root.GetProperty("address").GetString().ShouldNotContain("<b>");
        root.GetProperty("address").GetString().ShouldContain("Address");
        root.GetProperty("welcomeMessage").GetString().ShouldNotContain("<img");
        root.GetProperty("welcomeMessage").GetString().ShouldContain("Welcome");
    }

    [Fact]
    public async Task UpdateConfig_WithInvalidLocale_Returns400()
    {
        var response = await OwnerClient.PutAsJsonAsync("/api/config", new
        {
            churchName = "Test Church",
            address = "Some Address",
            defaultLocale = "de",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAdminConfig_AsViewer_Returns403()
    {
        var response = await ViewerClient.GetAsync("/api/config/admin");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateConfig_AsViewer_Returns403()
    {
        var response = await ViewerClient.PutAsJsonAsync("/api/config", ValidConfigPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }
}
