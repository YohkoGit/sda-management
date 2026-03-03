using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace SdaManagement.Api.IntegrationTests.Auth;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string SchemeName = "TestScheme";
    public const string RoleHeader = "X-Test-Role";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    // AC 5: Return ProblemDetails with custom type on auth challenge (mirrors JWT Bearer OnChallenge)
    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        Response.StatusCode = 401;
        Response.ContentType = "application/problem+json";
        await Response.WriteAsJsonAsync(new
        {
            type = "urn:sdac:unauthenticated",
            title = "Unauthorized",
            status = 401,
            detail = "Authentication is required to access this resource."
        });
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(RoleHeader, out var roleValues))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var role = roleValues.ToString();
        if (string.IsNullOrWhiteSpace(role))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var testUserId = $"test-{role.ToLowerInvariant()}-1";

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, testUserId),
            new Claim(ClaimTypes.Role, role),
            new Claim(ClaimTypes.Name, $"Test {role} User"),
            // Email is the unique identifier per architecture. Story 1.3's ICurrentUserContext
            // will use this claim to look up the authenticated user.
            new Claim(ClaimTypes.Email, $"test-{role.ToLowerInvariant()}@test.local"),
        };

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
