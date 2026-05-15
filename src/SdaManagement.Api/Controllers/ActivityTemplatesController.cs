using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SdaManagement.Api.Dtos.ActivityTemplate;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/activity-templates")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class ActivityTemplatesController(
    IActivityTemplateService templateService,
    SdacAuth.IAuthorizationService auth) : ApiControllerBase
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
    public async Task<IActionResult> Create(
        [FromBody] CreateActivityTemplateRequest request,
        [FromServices] IValidator<CreateActivityTemplateRequest> validator)
    {
        if (!auth.IsOwner())
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var template = await templateService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = template.Id }, template);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "An activity template with this name already exists.",
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateActivityTemplateRequest request,
        [FromServices] IValidator<UpdateActivityTemplateRequest> validator)
    {
        if (!auth.IsOwner())
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var template = await templateService.UpdateAsync(id, request);
            return template is not null ? Ok(template) : NotFound();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "An activity template with this name already exists.",
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!auth.IsOwner())
            return Forbid();

        var deleted = await templateService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

}
