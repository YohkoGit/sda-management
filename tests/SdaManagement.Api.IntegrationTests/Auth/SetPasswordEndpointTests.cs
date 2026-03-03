using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class SetPasswordEndpointTests : IntegrationTestBase
{
    public SetPasswordEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task SetPassword_FirstLogin_Returns200WithCookies()
    {
        await CreateTestUser("first-login@test.local", UserRole.Viewer);

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/set-password",
            new { email = "first-login@test.local", newPassword = "NewPassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("email").GetString().ShouldBe("first-login@test.local");

        // Verify JWT cookies
        response.Headers.TryGetValues("Set-Cookie", out var cookies).ShouldBeTrue();
        var cookieList = cookies!.ToList();
        cookieList.ShouldContain(c => c.StartsWith("access_token="));
        cookieList.ShouldContain(c => c.StartsWith("refresh_token="));
    }

    [Fact]
    public async Task SetPassword_AlreadyHasPassword_Returns400()
    {
        var user = await CreateTestUser("has-pw@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "ExistingPassword1");

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/set-password",
            new { email = "has-pw@test.local", newPassword = "NewPassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:password-already-set");
    }

    [Fact]
    public async Task SetPassword_UnknownEmail_Returns404()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/set-password",
            new { email = "unknown@test.local", newPassword = "NewPassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:not-found");
    }

    [Fact]
    public async Task SetPassword_WeakPassword_Returns400()
    {
        await CreateTestUser("weak-pw@test.local", UserRole.Viewer);

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/set-password",
            new { email = "weak-pw@test.local", newPassword = "short" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    private async Task SetUserPassword(int userId, string password)
    {
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await dbContext.Users.FindAsync(userId);
        user!.PasswordHash = BCrypt.Net.BCrypt.EnhancedHashPassword(password, 12);
        await dbContext.SaveChangesAsync();
    }
}
