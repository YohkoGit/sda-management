using System.Net;
using System.Text.Json;
using SdaManagement.Api.Data.Entities;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.SystemHealth;

public class SystemHealthEndpointTests : IntegrationTestBase
{
    public SystemHealthEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
    }

    [Fact]
    public async Task GetSystemHealth_AsOwner_Returns200WithValidResponse()
    {
        var response = await OwnerClient.GetAsync("/api/system-health");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("status").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("checks").GetArrayLength().ShouldBeGreaterThan(0);
        root.GetProperty("version").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("uptimeSeconds").GetInt64().ShouldBeGreaterThan(0);
        root.GetProperty("environment").GetString().ShouldNotBeNullOrEmpty();
        root.GetProperty("setupStatus").ValueKind.ShouldBe(JsonValueKind.Object);
    }

    [Fact]
    public async Task GetSystemHealth_AsAdmin_Returns403()
    {
        var response = await AdminClient.GetAsync("/api/system-health");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSystemHealth_AsViewer_Returns403()
    {
        var response = await ViewerClient.GetAsync("/api/system-health");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task GetSystemHealth_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/system-health");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetSystemHealth_ReturnsHealthyStatus()
    {
        var response = await OwnerClient.GetAsync("/api/system-health");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("status").GetString().ShouldBe("Healthy");
    }

    [Fact]
    public async Task GetSystemHealth_SetupStatusContainsValidCounts()
    {
        var response = await OwnerClient.GetAsync("/api/system-health");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var setupStatus = doc.RootElement.GetProperty("setupStatus");

        setupStatus.GetProperty("departmentCount").GetInt32().ShouldBeGreaterThanOrEqualTo(0);
        setupStatus.GetProperty("templateCount").GetInt32().ShouldBeGreaterThanOrEqualTo(0);
        setupStatus.GetProperty("scheduleCount").GetInt32().ShouldBeGreaterThanOrEqualTo(0);
        setupStatus.GetProperty("userCount").GetInt32().ShouldBeGreaterThanOrEqualTo(1); // Seeded users
    }

    [Fact]
    public async Task GetSystemHealth_VersionIsNonEmpty()
    {
        var response = await OwnerClient.GetAsync("/api/system-health");
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("version").GetString().ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetSystemHealth_UptimeIsPositive()
    {
        var response = await OwnerClient.GetAsync("/api/system-health");
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("uptimeSeconds").GetInt64().ShouldBeGreaterThan(0);
    }
}
