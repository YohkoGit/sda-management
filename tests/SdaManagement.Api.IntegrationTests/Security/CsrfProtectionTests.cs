using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.IntegrationTests.Auth;

namespace SdaManagement.Api.IntegrationTests.Security;

public class CsrfProtectionTests : IntegrationTestBase
{
    public CsrfProtectionTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
    }

    /// <summary>
    /// Returns an HttpClient that has the test auth role header but NO X-Requested-With header.
    /// This simulates a cross-origin form submission that the browser would send without custom headers.
    /// </summary>
    private HttpClient CreateClientWithoutCsrfHeader(string? role = null)
    {
        var client = Factory.CreateClient();
        if (role != null)
            client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        return client;
    }

    [Fact]
    public async Task Post_WithoutCsrfHeader_Returns403()
    {
        using var client = CreateClientWithoutCsrfHeader("Owner");

        var response = await client.PostAsJsonAsync("/api/activities", new
        {
            title = "CSRF Test",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = 1,
            visibility = "public",
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("type").GetString().ShouldBe("urn:sdac:csrf-rejected");
        root.GetProperty("status").GetInt32().ShouldBe(403);
    }

    [Fact]
    public async Task Put_WithoutCsrfHeader_Returns403()
    {
        using var client = CreateClientWithoutCsrfHeader("Owner");

        var response = await client.PutAsJsonAsync("/api/activities/1", new
        {
            title = "CSRF Test",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = 1,
            visibility = "public",
            concurrencyToken = 0,
        });

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Delete_WithoutCsrfHeader_Returns403()
    {
        using var client = CreateClientWithoutCsrfHeader("Owner");

        var response = await client.DeleteAsync("/api/activities/1");

        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Post_WithCsrfHeader_PassesMiddleware()
    {
        // OwnerClient has X-Requested-With set by default in IntegrationTestBase.
        // A POST that passes CSRF should reach the controller (may succeed or fail
        // for business reasons, but NOT return 403 with urn:sdac:csrf-rejected).
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", new
        {
            title = "CSRF Allowed",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = 999, // non-existent dept — will fail with 404, not 403
            visibility = "public",
        });

        // The request should NOT be blocked by CSRF middleware.
        // It may return 404 (dept not found) or another error, but not 403 csrf-rejected.
        response.StatusCode.ShouldNotBe(HttpStatusCode.Forbidden,
            "Request with X-Requested-With header should not be blocked by CSRF middleware");
    }

    [Fact]
    public async Task Get_WithoutCsrfHeader_Succeeds()
    {
        // GET requests are safe methods and should never be blocked by CSRF middleware,
        // even without the X-Requested-With header.
        using var client = CreateClientWithoutCsrfHeader();

        var response = await client.GetAsync("/health");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Get_ApiEndpoint_WithoutCsrfHeader_Succeeds()
    {
        // GET to an authenticated endpoint without CSRF header should pass CSRF middleware.
        // It will return 401 (unauthenticated) but NOT 403 (csrf-rejected).
        using var client = CreateClientWithoutCsrfHeader();

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task HealthEndpoint_Post_WithoutCsrfHeader_IsExempt()
    {
        // /health is exempt from CSRF checks. While health is normally GET,
        // verify the exemption logic works for the path prefix.
        using var client = CreateClientWithoutCsrfHeader();

        // Health endpoint only supports GET, so a POST will get 404/405 — not 403 csrf.
        var response = await client.PostAsync("/health", null);

        // Should NOT be 403 with csrf-rejected (it's exempt).
        response.StatusCode.ShouldNotBe(HttpStatusCode.Forbidden,
            "/health should be exempt from CSRF validation");
    }
}
