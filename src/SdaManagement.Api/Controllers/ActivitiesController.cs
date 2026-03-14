using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/activities")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class ActivitiesController(
    IActivityService activityService,
    SdacAuth.IAuthorizationService auth,
    SdacAuth.ICurrentUserContext currentUser) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? departmentId, [FromQuery] string? visibility = null)
    {
        if (departmentId.HasValue)
        {
            if (!auth.CanManage(departmentId.Value))
                return Forbid();
        }
        else
        {
            if (!auth.IsOwner())
                return Forbid();
        }

        if (!string.IsNullOrEmpty(visibility) &&
            !Enum.TryParse<ActivityVisibility>(visibility, ignoreCase: true, out _))
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Invalid Visibility Filter",
                Status = 400,
                Detail = "Visibility must be 'public' or 'authenticated'.",
            });

        var activities = await activityService.GetAllAsync(departmentId, visibility);
        return Ok(activities);
    }

    [HttpGet("my-assignments")]
    public async Task<IActionResult> GetMyAssignments()
    {
        if (!auth.CanView())
            return Forbid();

        var assignments = await activityService.GetMyAssignmentsAsync(currentUser.UserId);
        return Ok(assignments);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var activity = await activityService.GetByIdAsync(id);
        if (activity is null)
            return NotFound();

        if (!HasActivityAccess(activity))
            return Forbid();

        return Ok(activity);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateActivityRequest request,
        [FromServices] IValidator<CreateActivityRequest> validator)
    {
        if (!auth.CanManage(request.DepartmentId))
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var activity = await activityService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
        }
        catch (KeyNotFoundException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Invalid Template",
                Status = 400,
                Detail = "Activity template not found.",
            });
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Assignment Validation Error",
                Status = 422,
                Detail = ex.Message,
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateActivityRequest request,
        [FromServices] IValidator<UpdateActivityRequest> validator,
        [FromQuery] bool force = false)
    {
        // Verify the existing activity exists and check auth on its current department
        var existing = await activityService.GetByIdAsync(id);
        if (existing is null)
            return NotFound();

        if (!HasActivityAccess(existing))
            return Forbid();

        // Also verify auth on the target department (may differ if reassigning)
        if (!auth.CanManage(request.DepartmentId))
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var activity = await activityService.UpdateAsync(id, request, force);
            return activity is not null ? Ok(activity) : NotFound();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Concurrency Conflict",
                Status = 409,
                Detail = "This activity was modified by another user. Please reload and try again.",
            });
        }
        catch (InvalidOperationException ex)
        {
            return UnprocessableEntity(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Assignment Validation Error",
                Status = 422,
                Detail = ex.Message,
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var activity = await activityService.GetByIdAsync(id);
        if (activity is null)
            return NotFound();

        if (!HasActivityAccess(activity))
            return Forbid();

        await activityService.DeleteAsync(id);
        return NoContent();
    }

    private bool HasActivityAccess(ActivityResponse activity) =>
        activity.DepartmentId.HasValue
            ? auth.CanManage(activity.DepartmentId.Value)
            : auth.IsOwner();

    private BadRequestObjectResult ValidationError(FluentValidation.Results.ValidationResult validation) =>
        BadRequest(new ValidationProblemDetails(validation.ToDictionary())
        {
            Type = "urn:sdac:validation-error",
            Title = "Validation Error",
            Status = 400,
        });
}
