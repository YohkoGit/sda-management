using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class FullAuthFlowTests : IntegrationTestBase
{
    public FullAuthFlowTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    [Fact]
    public async Task FullFlow_InitiateToLogin_HappyPath()
    {
        var user = await CreateTestUser("flow-login@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "FlowPassword1");

        // Step 1: Initiate
        var initiateResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email = "flow-login@test.local" });
        initiateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
        var initiateJson = await initiateResponse.Content.ReadAsStringAsync();
        using var initiateDoc = JsonDocument.Parse(initiateJson);
        initiateDoc.RootElement.GetProperty("flow").GetString().ShouldBe("password");

        // Step 2: Login
        var loginResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "flow-login@test.local", password = "FlowPassword1" });
        loginResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var loginJson = await loginResponse.Content.ReadAsStringAsync();
        using var loginDoc = JsonDocument.Parse(loginJson);
        loginDoc.RootElement.GetProperty("email").GetString().ShouldBe("flow-login@test.local");
    }

    [Fact]
    public async Task FullFlow_InitiateToSetPassword_FirstLogin()
    {
        await CreateTestUser("flow-setpw@test.local", UserRole.Viewer);

        // Step 1: Initiate
        var initiateResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email = "flow-setpw@test.local" });
        initiateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);
        var initiateJson = await initiateResponse.Content.ReadAsStringAsync();
        using var initiateDoc = JsonDocument.Parse(initiateJson);
        initiateDoc.RootElement.GetProperty("flow").GetString().ShouldBe("set-password");

        // Step 2: Set password
        var setResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/set-password",
            new { email = "flow-setpw@test.local", newPassword = "FirstPassword1" });
        setResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Verify cookies set (auto-login)
        setResponse.Headers.TryGetValues("Set-Cookie", out var cookies).ShouldBeTrue();
        cookies!.ShouldContain(c => c.StartsWith("access_token="));
    }

    [Fact]
    public async Task FullFlow_InitiateLoginWrongPassword_ErrorPath()
    {
        var user = await CreateTestUser("flow-error@test.local", UserRole.Viewer);
        await SetUserPassword(user.Id, "CorrectPassword1");

        // Step 1: Initiate
        var initiateResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/initiate",
            new { email = "flow-error@test.local" });
        initiateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Step 2: Login with wrong password
        var loginResponse = await AnonymousClient.PostAsJsonAsync("/api/auth/login",
            new { email = "flow-error@test.local", password = "WrongPassword1" });
        loginResponse.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);

        var json = await loginResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:invalid-credentials");
    }
}
