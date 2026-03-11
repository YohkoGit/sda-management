using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/public")]
[ApiController]
public class PublicController(IPublicService publicService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("next-activity")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetNextActivity()
    {
        var result = await publicService.GetNextActivityAsync();
        return result is not null ? Ok(result) : NoContent();
    }
}
