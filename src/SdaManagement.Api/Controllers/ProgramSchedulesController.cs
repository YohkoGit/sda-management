using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Dtos.ProgramSchedule;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/program-schedules")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class ProgramSchedulesController(IProgramScheduleService scheduleService) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var schedules = await scheduleService.GetAllAsync();
        return Ok(schedules);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var schedule = await scheduleService.GetByIdAsync(id);
        return schedule is not null ? Ok(schedule) : NotFound();
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Create(
        [FromBody] CreateProgramScheduleRequest request,
        [FromServices] IValidator<CreateProgramScheduleRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var schedule = await scheduleService.CreateAsync(request);
        if (schedule is null)
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Validation Error",
                Status = 400,
                Detail = "The specified department does not exist.",
            });

        return CreatedAtAction(nameof(GetById), new { id = schedule.Id }, schedule);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateProgramScheduleRequest request,
        [FromServices] IValidator<UpdateProgramScheduleRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        if (await scheduleService.GetByIdAsync(id) is null)
            return NotFound();

        var schedule = await scheduleService.UpdateAsync(id, request);
        if (schedule is null)
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Validation Error",
                Status = 400,
                Detail = "The specified department does not exist.",
            });
        return Ok(schedule);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await scheduleService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
