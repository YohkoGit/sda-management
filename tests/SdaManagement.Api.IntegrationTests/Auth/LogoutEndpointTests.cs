using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class LogoutEndpointTests : IntegrationTestBase
{
    // Login sets Secure cookies — the test client must use HTTPS so the
    // CookieContainer stores and re-sends them on subsequent requests.
    private static readonly WebApplicationFactoryClientOptions HttpsClientOptions = new()
    {
        BaseAddress = new Uri("https://localhost"),
    };

    public LogoutEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    private HttpClient CreateHttpsClientWithCsrfHeader()
    {
        var client = Factory.CreateClient(HttpsClientOptions);
        client.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");
        return client;
    }

    [Fact]
    public async Task Logout_WithValidRefreshToken_RevokesTokenAndClearsCookies()
    {
        // Arrange: create user, set password, login to get cookies
        var user = await CreateTestUser("logout-valid@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "LogoutTest1");

        using var client = CreateHttpsClientWithCsrfHeader();
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "logout-valid@test.local", password = "LogoutTest1" });
        loginResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Act: logout
        var logoutResponse = await client.PostAsync("/api/auth/logout", null);

        // Assert: (a) response 200
        logoutResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Assert: (b) Set-Cookie headers clear both cookies (empty value, max-age=0, correct paths)
        logoutResponse.Headers.TryGetValues("Set-Cookie", out var cookies).ShouldBeTrue();
        var cookieList = cookies!.ToList();
        cookieList.ShouldContain(c =>
            c.StartsWith("access_token=;") &&
            c.Contains("max-age=0") &&
            c.Contains("path=/api;"));
        cookieList.ShouldContain(c =>
            c.StartsWith("refresh_token=;") &&
            c.Contains("max-age=0") &&
            c.Contains("path=/api/auth"));

        // Assert: (c) refresh token is revoked in DB
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var refreshTokens = await dbContext.RefreshTokens
            .Where(rt => rt.UserId == user.Id)
            .ToListAsync();
        refreshTokens.ShouldNotBeEmpty();
        refreshTokens.ShouldAllBe(rt => rt.IsRevoked);
    }

    [Fact]
    public async Task Logout_WithoutRefreshToken_Returns200()
    {
        // Act: logout without any cookies (fresh anonymous client)
        using var client = CreateHttpsClientWithCsrfHeader();
        var response = await client.PostAsync("/api/auth/logout", null);

        // Assert: idempotent — 200 even without cookies
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Logout_WithRevokedRefreshToken_Returns200()
    {
        // Arrange: login to get cookies, then manually revoke the refresh token
        var user = await CreateTestUser("logout-revoked@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "LogoutTest1");

        using var client = CreateHttpsClientWithCsrfHeader();
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "logout-revoked@test.local", password = "LogoutTest1" });
        loginResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Manually revoke the refresh token in DB
        using (var scope = Factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tokens = await dbContext.RefreshTokens
                .Where(rt => rt.UserId == user.Id)
                .ToListAsync();
            foreach (var token in tokens)
                token.IsRevoked = true;
            await dbContext.SaveChangesAsync();
        }

        // Act: logout with already-revoked token
        var logoutResponse = await client.PostAsync("/api/auth/logout", null);

        // Assert: still 200 (double-click / already-revoked scenario)
        logoutResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Logout_ThenRefresh_ReturnsUnauthorized()
    {
        // Arrange: login to get cookies
        var user = await CreateTestUser("logout-refresh@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "LogoutTest1");

        using var client = CreateHttpsClientWithCsrfHeader();
        var loginResponse = await client.PostAsJsonAsync("/api/auth/login",
            new { email = "logout-refresh@test.local", password = "LogoutTest1" });
        loginResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Act: logout (revokes refresh token)
        var logoutResponse = await client.PostAsync("/api/auth/logout", null);
        logoutResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Act: attempt to refresh with the same client
        var refreshResponse = await client.PostAsync("/api/auth/refresh", null);

        // Assert: 401 — proves the refresh token was actually revoked
        refreshResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }
}
