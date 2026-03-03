using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class PasswordResetEndpointTests : IntegrationTestBase
{
    public PasswordResetEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task RequestReset_ExistingEmail_Returns200WithToken()
    {
        var user = await CreateTestUser("reset-user@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "OldPassword1");

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/request",
            new { email = "reset-user@test.local" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("token").GetString().ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task RequestReset_NonExistentEmail_Returns200WithToken_AntiEnumeration()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/request",
            new { email = "nonexistent@test.local" });

        // Anti-enumeration: returns 200 with same response shape (includes token)
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        // Response must have "token" field — identical shape to existing-email response
        doc.RootElement.GetProperty("token").GetString().ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task ConfirmReset_ValidToken_ResetsPassword()
    {
        var user = await CreateTestUser("confirm-reset@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "OldPassword1");

        // Request a reset token
        var requestResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/request",
            new { email = "confirm-reset@test.local" });
        var requestJson = await requestResponse.Content.ReadAsStringAsync();
        using var requestDoc = JsonDocument.Parse(requestJson);
        var token = requestDoc.RootElement.GetProperty("token").GetString()!;

        // Confirm reset with new password
        var confirmResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/confirm",
            new { token, newPassword = "NewPassword1" });

        confirmResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Verify can login with new password
        var loginResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "confirm-reset@test.local", password = "NewPassword1" });
        loginResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ConfirmReset_ExpiredToken_Returns400()
    {
        var user = await CreateTestUser("expired-token@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "OldPassword1");

        // Seed an expired token directly (SHA-256 hash)
        var rawToken = "expired-test-token-value";
        var tokenHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken))).ToLowerInvariant();
        using (var scope = Factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.PasswordResetTokens.Add(new PasswordResetToken
            {
                UserId = user.Id,
                TokenHash = tokenHash,
                ExpiresAt = DateTime.UtcNow.AddMinutes(-1), // Expired
                CreatedAt = DateTime.UtcNow.AddMinutes(-31),
            });
            await dbContext.SaveChangesAsync();
        }

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/confirm",
            new { token = rawToken, newPassword = "NewPassword1" });

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:invalid-reset-token");
    }

    [Fact]
    public async Task ConfirmReset_UsedToken_Returns400()
    {
        var user = await CreateTestUser("used-token@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "OldPassword1");

        // Request a reset token
        var requestResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/request",
            new { email = "used-token@test.local" });
        var requestJson = await requestResponse.Content.ReadAsStringAsync();
        using var requestDoc = JsonDocument.Parse(requestJson);
        var token = requestDoc.RootElement.GetProperty("token").GetString()!;

        // Use the token once
        var firstResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/confirm",
            new { token, newPassword = "NewPassword1" });
        firstResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Try using the same token again
        var secondResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/password-reset/confirm",
            new { token, newPassword = "AnotherPassword1" });
        secondResponse.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
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
