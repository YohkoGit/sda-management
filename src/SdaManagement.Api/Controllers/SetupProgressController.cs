using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/setup-progress")]
[ApiController]
[Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
[EnableRateLimiting("auth")]
public class SetupProgressController(ISetupProgressService setupProgressService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSetupProgress(CancellationToken cancellationToken)
    {
        var result = await setupProgressService.GetSetupProgressAsync(cancellationToken);
        return Ok(result);
    }
}
