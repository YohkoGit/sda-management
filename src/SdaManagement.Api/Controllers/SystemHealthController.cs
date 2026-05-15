using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/system-health")]
[ApiController]
[Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
[EnableRateLimiting("auth")]
public class SystemHealthController(ISystemHealthService systemHealthService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSystemHealth(CancellationToken cancellationToken)
    {
        var result = await systemHealthService.GetSystemHealthAsync(cancellationToken);
        return Ok(result);
    }
}
