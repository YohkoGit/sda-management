using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class InitiateAuthEndpointTests : IntegrationTestBase
{
    public InitiateAuthEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task Initiate_ExistingUserWithPassword_ReturnsPasswordFlow()
    {
        var user = await CreateTestUser("has-password@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "TestPassword1");

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email = "has-password@test.local" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("flow").GetString().ShouldBe("password");
    }

    [Fact]
    public async Task Initiate_ExistingUserWithoutPassword_ReturnsSetPasswordFlow()
    {
        await CreateTestUser("no-password@test.local", UserRole.Viewer);

        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email = "no-password@test.local" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("flow").GetString().ShouldBe("set-password");
    }

    [Fact]
    public async Task Initiate_NonExistentEmail_ReturnsPasswordFlow_AntiEnumeration()
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email = "does-not-exist@test.local" });

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        // Anti-enumeration: same response as "has password"
        doc.RootElement.GetProperty("flow").GetString().ShouldBe("password");
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public async Task Initiate_InvalidEmail_Returns400(string email)
    {
        var response = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email });

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
