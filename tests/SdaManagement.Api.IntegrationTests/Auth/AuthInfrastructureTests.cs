using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Shouldly;
using SdaManagement.Api.Data;
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
    public async Task Me_WhenAuthenticated_ReturnsUserInfo()
    {
        var user = await CreateTestUser("test-owner@test.local", UserRole.Owner);

        var response = await OwnerClient.GetAsync("/api/auth/me");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("userId").GetInt32().ShouldBe(user.Id);
        root.GetProperty("email").GetString().ShouldBe("test-owner@test.local");
        root.GetProperty("firstName").GetString().ShouldBe("Test");
        root.GetProperty("lastName").GetString().ShouldBe("Owner");
        root.GetProperty("role").GetString().ShouldBe("OWNER");
    }

    [Fact]
    public async Task Me_WhenAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/auth/me");

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.GetProperty("type").GetString().ShouldBe("urn:sdac:unauthenticated");
        root.GetProperty("status").GetInt32().ShouldBe(401);
    }

    [Fact]
    public async Task Refresh_WhenValidRefreshToken_ReturnsNewTokens()
    {
        var user = await CreateTestUser("test-owner@test.local", UserRole.Owner);

        // Seed a valid refresh token directly in the DB
        var refreshTokenValue = "valid-test-refresh-token-base64-value";
        await SeedRefreshToken(user.Id, refreshTokenValue, DateTime.UtcNow.AddDays(7), isRevoked: false);

        // Send refresh request with cookie (AnonymousClient: refresh doesn't require auth)
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", $"refresh_token={refreshTokenValue}");
        var response = await AnonymousClient.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Verify Set-Cookie headers contain new tokens
        response.Headers.TryGetValues("Set-Cookie", out var setCookieHeaders).ShouldBeTrue(
            "Expected Set-Cookie headers with new tokens");
        var cookieHeaders = setCookieHeaders!.ToList();
        cookieHeaders.ShouldContain(h => h.StartsWith("access_token="), "Expected new access_token cookie");
        cookieHeaders.ShouldContain(h => h.StartsWith("refresh_token="), "Expected new refresh_token cookie");

        // Verify old token is revoked and new token exists in DB
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var oldToken = await dbContext.RefreshTokens
            .FirstAsync(rt => rt.Token == refreshTokenValue);
        oldToken.IsRevoked.ShouldBeTrue();

        var newTokenExists = await dbContext.RefreshTokens
            .AnyAsync(rt => rt.UserId == user.Id && rt.Token != refreshTokenValue && !rt.IsRevoked);
        newTokenExists.ShouldBeTrue("Expected a new non-revoked refresh token in DB");
    }

    [Fact]
    public async Task Refresh_WhenInvalidToken_Returns401()
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", "refresh_token=this-token-does-not-exist");
        var response = await AnonymousClient.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Refresh_WhenRevokedToken_Returns401()
    {
        var user = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var refreshTokenValue = "revoked-test-refresh-token";
        await SeedRefreshToken(user.Id, refreshTokenValue, DateTime.UtcNow.AddDays(7), isRevoked: true);

        // AnonymousClient: refresh doesn't require auth
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh");
        request.Headers.Add("Cookie", $"refresh_token={refreshTokenValue}");
        var response = await AnonymousClient.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Logout_WhenAuthenticated_RevokesTokenAndClearsCookies()
    {
        var user = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var refreshTokenValue = "logout-test-refresh-token";
        await SeedRefreshToken(user.Id, refreshTokenValue, DateTime.UtcNow.AddDays(7), isRevoked: false);

        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
        request.Headers.Add("Cookie", $"refresh_token={refreshTokenValue}");
        var response = await OwnerClient.SendAsync(request);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Verify cookies are cleared via Set-Cookie headers
        response.Headers.TryGetValues("Set-Cookie", out var setCookieHeaders).ShouldBeTrue(
            "Expected Set-Cookie headers for clearing cookies");
        var cookieHeaders = setCookieHeaders!.ToList();
        cookieHeaders.ShouldContain(h => h.StartsWith("access_token="), "Expected access_token cookie to be cleared");
        cookieHeaders.ShouldContain(h => h.StartsWith("refresh_token="), "Expected refresh_token cookie to be cleared");

        // Verify token revoked in DB
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var token = await dbContext.RefreshTokens
            .FirstAsync(rt => rt.Token == refreshTokenValue);
        token.IsRevoked.ShouldBeTrue();
    }

    private async Task SeedRefreshToken(int userId, string tokenValue, DateTime expiresAt, bool isRevoked)
    {
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            Token = tokenValue,
            ExpiresAt = expiresAt,
            IsRevoked = isRevoked,
            CreatedAt = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync();
    }
}
