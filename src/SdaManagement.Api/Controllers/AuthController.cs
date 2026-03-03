using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public IActionResult Login() =>
        Problem(statusCode: 501, title: "Not Implemented", detail: "Implemented in Story 1.4/1.5");

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
    public IActionResult Refresh() =>
        Problem(statusCode: 501, title: "Not Implemented", detail: "Implemented in Story 1.4/1.5");

    [HttpPost("logout")]
    [EnableRateLimiting("auth")]
    public IActionResult Logout() =>
        Problem(statusCode: 501, title: "Not Implemented", detail: "Implemented in Story 1.4/1.5");

    // Probe endpoint for integration test infrastructure — remove or convert in Story 1.4
    [HttpGet("probe")]
    [Authorize]
    public IActionResult Probe([FromServices] ICurrentUserContext ctx) =>
        Ok(new { ctx.IsAuthenticated, ctx.UserId, Role = ctx.Role.ToString() });
}
