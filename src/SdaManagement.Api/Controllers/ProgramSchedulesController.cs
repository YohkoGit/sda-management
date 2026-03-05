using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SdaManagement.Api.Dtos.ProgramSchedule;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/program-schedules")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class ProgramSchedulesController(
    IProgramScheduleService scheduleService,
    SdacAuth.IAuthorizationService auth) : ControllerBase
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
    public async Task<IActionResult> Create(
        [FromBody] CreateProgramScheduleRequest request,
        [FromServices] IValidator<CreateProgramScheduleRequest> validator)
    {
        if (!auth.IsOwner())
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
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
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "A program schedule with this title and day already exists.",
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateProgramScheduleRequest request,
        [FromServices] IValidator<UpdateProgramScheduleRequest> validator)
    {
        if (!auth.IsOwner())
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        if (await scheduleService.GetByIdAsync(id) is null)
            return NotFound();

        try
        {
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
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "A program schedule with this title and day already exists.",
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!auth.IsOwner())
            return Forbid();

        var deleted = await scheduleService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    private BadRequestObjectResult ValidationError(FluentValidation.Results.ValidationResult validation) =>
        BadRequest(new ValidationProblemDetails(validation.ToDictionary())
        {
            Type = "urn:sdac:validation-error",
            Title = "Validation Error",
            Status = 400,
        });
}
