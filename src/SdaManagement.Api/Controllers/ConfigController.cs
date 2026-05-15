using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Dtos.Config;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/config")]
[ApiController]
public class ConfigController(
    IConfigService configService,
    ISanitizationService sanitizer) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetPublicConfig()
    {
        var config = await configService.GetPublicConfigAsync();
        return config is not null ? Ok(config) : NotFound();
    }

    [HttpGet("admin")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> GetAdminConfig()
    {
        var config = await configService.GetConfigAsync();
        return config is not null ? Ok(config) : NotFound();
    }

    [HttpPut]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> UpdateConfig(
        [FromBody] UpdateChurchConfigRequest request,
        [FromServices] IValidator<UpdateChurchConfigRequest> validator)
    {
        var sanitized = request with
        {
            ChurchName = sanitizer.Sanitize(request.ChurchName),
            Address = sanitizer.Sanitize(request.Address),
            YouTubeChannelUrl = sanitizer.SanitizeNullable(request.YouTubeChannelUrl),
            PhoneNumber = sanitizer.SanitizeNullable(request.PhoneNumber),
            WelcomeMessage = sanitizer.SanitizeNullable(request.WelcomeMessage),
        };

        var validation = await validator.ValidateAsync(sanitized);
        if (!validation.IsValid)
            return ValidationError(validation);

        var result = await configService.UpsertConfigAsync(sanitized);
        return Ok(result);
    }
}
