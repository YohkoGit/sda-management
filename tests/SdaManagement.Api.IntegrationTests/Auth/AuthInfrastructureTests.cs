using System.Net;
using System.Text.Json;
using Npgsql;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class AuthInfrastructureTests : IntegrationTestBase
{
    public AuthInfrastructureTests(SdaManagementWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task UserEntity_WhenMigrationsRun_TablesExistWithCorrectSchema()
    {
        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        async Task<List<string>> GetColumns(string tableName)
        {
            await using var cmd = connection.CreateCommand();
            cmd.CommandText =
                "SELECT column_name FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = @t " +
                "ORDER BY ordinal_position";
            cmd.Parameters.AddWithValue("t", tableName);
            var cols = new List<string>();
            await using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
                cols.Add(reader.GetString(0));
            return cols;
        }

        // users table
        var userCols = await GetColumns("users");
        userCols.ShouldContain("id");
        userCols.ShouldContain("email");
        userCols.ShouldContain("first_name");
        userCols.ShouldContain("last_name");
        userCols.ShouldContain("role");
        userCols.ShouldContain("is_guest");
        userCols.ShouldContain("password_hash");
        userCols.ShouldContain("created_at");
        userCols.ShouldContain("updated_at");

        // snake_case verification — no camelCase
        userCols.ShouldNotContain("firstName");
        userCols.ShouldNotContain("lastName");
        userCols.ShouldNotContain("isGuest");
        userCols.ShouldNotContain("passwordHash");
        userCols.ShouldNotContain("createdAt");

        // user_departments junction table
        var udCols = await GetColumns("user_departments");
        udCols.ShouldContain("user_id");
        udCols.ShouldContain("department_id");

        // refresh_tokens table
        var rtCols = await GetColumns("refresh_tokens");
        rtCols.ShouldContain("id");
        rtCols.ShouldContain("user_id");
        rtCols.ShouldContain("token");
        rtCols.ShouldContain("expires_at");
        rtCols.ShouldContain("is_revoked");
        rtCols.ShouldContain("created_at");

        // departments table
        var deptCols = await GetColumns("departments");
        deptCols.ShouldContain("id");
        deptCols.ShouldContain("name");
        deptCols.ShouldContain("created_at");
    }

    [Fact]
    public async Task CurrentUserContext_WhenValidTestCredentialsSent_PopulatesContext()
    {
        // Arrange — create a Viewer user whose email matches TestAuthHandler's "Viewer" email claim
        var user = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        // Act — ViewerClient sends X-Test-Role: Viewer → TestAuthHandler sets email = test-viewer@test.local
        //        → CurrentUserContextMiddleware resolves user from DB → probe returns populated context
        var response = await ViewerClient.GetAsync("/api/auth/probe");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("isAuthenticated").GetBoolean().ShouldBeTrue();
        root.GetProperty("userId").GetInt32().ShouldBe(user.Id);
        root.GetProperty("role").GetString().ShouldBe("Viewer");
    }

    [Fact]
    public async Task CurrentUserContext_WhenJwtMissing_Returns401WithProblemDetails()
    {
        // AnonymousClient has no auth headers — TestAuthHandler returns NoResult → 401
        var response = await AnonymousClient.GetAsync("/api/auth/probe");

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

        // AC 5: Verify ProblemDetails body with custom type
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("type").GetString().ShouldBe("urn:sdac:unauthenticated");
        root.GetProperty("status").GetInt32().ShouldBe(401);
        root.GetProperty("title").GetString().ShouldBe("Unauthorized");
    }

    [Fact]
    public async Task RateLimiting_WhenMoreThan5RequestsPerMinute_Returns429WithRetryAfter()
    {
        // Arrange — send 6 POST requests; 6th should be rate-limited (5 req/min per IP)
        var responses = new List<HttpResponseMessage>();
        for (int i = 0; i < 6; i++)
        {
            responses.Add(await AnonymousClient.PostAsync("/api/auth/login", null));
        }

        // Assert — first 5 requests should succeed (501 Not Implemented, not rate-limited)
        for (int i = 0; i < 5; i++)
        {
            responses[i].StatusCode.ShouldBe(HttpStatusCode.NotImplemented,
                $"Request {i + 1} should not be rate-limited");
        }

        // 6th request should be rate-limited
        responses[5].StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
        responses[5].Headers.Contains("Retry-After").ShouldBeTrue();
    }
}
