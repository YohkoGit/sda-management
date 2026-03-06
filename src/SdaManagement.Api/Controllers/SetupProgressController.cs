using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/setup-progress")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class SetupProgressController(
    ISetupProgressService setupProgressService,
    SdacAuth.IAuthorizationService auth) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSetupProgress(CancellationToken cancellationToken)
    {
        if (!auth.IsOwner())
            return Forbid();

        var result = await setupProgressService.GetSetupProgressAsync(cancellationToken);
        return Ok(result);
    }
}
