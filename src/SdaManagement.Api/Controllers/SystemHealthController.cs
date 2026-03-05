using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/system-health")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class SystemHealthController(
    ISystemHealthService systemHealthService,
    SdacAuth.IAuthorizationService auth) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSystemHealth(CancellationToken cancellationToken)
    {
        if (!auth.IsOwner())
            return Forbid();

        var result = await systemHealthService.GetSystemHealthAsync(cancellationToken);
        return Ok(result);
    }
}
