using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Dtos.ActivityTemplate;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/activity-templates")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class ActivityTemplatesController(IActivityTemplateService templateService) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var templates = await templateService.GetAllAsync();
        return Ok(templates);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var template = await templateService.GetByIdAsync(id);
        return template is not null ? Ok(template) : NotFound();
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Create(
        [FromBody] CreateActivityTemplateRequest request,
        [FromServices] IValidator<CreateActivityTemplateRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var template = await templateService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateActivityTemplateRequest request,
        [FromServices] IValidator<UpdateActivityTemplateRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var template = await templateService.UpdateAsync(id, request);
        return template is not null ? Ok(template) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await templateService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
