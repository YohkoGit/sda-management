using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
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
    SdacAuth.ICurrentUserContext currentUser,
    Microsoft.AspNetCore.Authorization.IAuthorizationService authz) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? departmentId, [FromQuery] string? visibility = null)
    {
        // GetAll has dual paths: per-department list (any authenticated user)
        // vs full-list (OWNER only). Class-level [Authorize] covers authentication;
        // only the full-list branch needs an extra role check.
        if (!departmentId.HasValue && !auth.IsOwner())
            return Forbid();

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

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardActivities()
    {
        var activities = await activityService.GetDashboardActivitiesAsync(
            currentUser.Role, currentUser.DepartmentIds);
        return Ok(activities);
    }

    [HttpGet("my-assignments")]
    public async Task<IActionResult> GetMyAssignments()
    {
        var assignments = await activityService.GetMyAssignmentsAsync(currentUser.UserId);
        return Ok(assignments);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var activity = await activityService.GetByIdAsync(id);
        if (activity is null)
            return NotFound();

        return Ok(activity);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateActivityRequest request,
        [FromServices] IValidator<CreateActivityRequest> validator)
    {
        var deptCheck = await authz.AuthorizeAsync(User, request.DepartmentId, AuthorizationPolicies.CanManageDepartment);
        if (!deptCheck.Succeeded)
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var activity = await activityService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
        }
        catch (KeyNotFoundException)
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

        if (!await HasActivityAccessAsync(existing))
            return Forbid();

        // Also verify auth on the target department (may differ if reassigning)
        var deptCheck = await authz.AuthorizeAsync(User, request.DepartmentId, AuthorizationPolicies.CanManageDepartment);
        if (!deptCheck.Succeeded)
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

        if (!await HasActivityAccessAsync(activity))
            return Forbid();

        await activityService.DeleteAsync(id);
        return NoContent();
    }

    // Department-scoped activities require CanManageDepartment;
    // department-less (church-wide) activities require OWNER.
    private async Task<bool> HasActivityAccessAsync(ActivityResponse activity)
    {
        if (!activity.DepartmentId.HasValue)
            return auth.IsOwner();

        var result = await authz.AuthorizeAsync(
            User, activity.DepartmentId.Value, AuthorizationPolicies.CanManageDepartment);
        return result.Succeeded;
    }
}
