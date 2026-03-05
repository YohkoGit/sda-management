using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class LoginEndpointTests : IntegrationTestBase
{
    public LoginEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Login_ValidCredentials_Returns200WithCookies()
    {
        var user = await CreateTestUser("login-user@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "ValidPassword1");

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "login-user@test.local", password = "ValidPassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Verify response body
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("email").GetString().ShouldBe("login-user@test.local");
        doc.RootElement.GetProperty("role").GetString().ShouldBe("VIEWER");

        // Verify JWT cookies set
        response.Headers.TryGetValues("Set-Cookie", out var cookies).ShouldBeTrue();
        var cookieList = cookies!.ToList();
        cookieList.ShouldContain(c => c.StartsWith("access_token="));
        cookieList.ShouldContain(c => c.StartsWith("refresh_token="));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var user = await CreateTestUser("wrong-pw@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "CorrectPassword1");

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "wrong-pw@test.local", password = "WrongPassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:invalid-credentials");
    }

    [Fact]
    public async Task Login_UnknownEmail_Returns401_SameErrorAsWrongPassword()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "unknown@test.local", password = "Password123" });

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        // Anti-enumeration: same error type as wrong password
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:invalid-credentials");
    }

    [Fact]
    public async Task Login_InvalidEmailFormat_Returns400()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "not-email", password = "Password123" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    [Fact]
    public async Task Login_UserWithoutPassword_Returns401()
    {
        // User exists but has no password (OAuth-only user trying email/password login)
        await CreateTestUser("no-pw-login@test.local", UserRole.Viewer);

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "no-pw-login@test.local", password = "SomePassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }
}
