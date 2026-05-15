using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SdaManagement.Api.Dtos.Department;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/departments")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class DepartmentsController(
    IDepartmentService departmentService,
    SdacAuth.IAuthorizationService auth) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        var departments = await departmentService.GetAllAsync();
        return Ok(departments);
    }

    [HttpGet("with-staffing")]
    public async Task<IActionResult> GetAllWithStaffing()
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        var departments = await departmentService.GetAllWithStaffingAsync();
        return Ok(departments);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        var department = await departmentService.GetByIdAsync(id);
        return department is not null ? Ok(department) : NotFound();
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateDepartmentRequest request,
        [FromServices] IValidator<CreateDepartmentRequest> validator)
    {
        if (!auth.IsOwner())
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var department = await departmentService.CreateAsync(request);
            return CreatedAtAction(nameof(GetById), new { id = department.Id }, department);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "A department with this abbreviation or color already exists.",
            });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateDepartmentRequest request,
        [FromServices] IValidator<UpdateDepartmentRequest> validator)
    {
        if (!auth.IsOwner())
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var department = await departmentService.UpdateAsync(id, request);
            return department is not null ? Ok(department) : NotFound();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "A department with this abbreviation or color already exists.",
            });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!auth.IsOwner())
            return Forbid();

        var deleted = await departmentService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{departmentId:int}/sub-ministries")]
    public async Task<IActionResult> AddSubMinistry(
        int departmentId,
        [FromBody] CreateSubMinistryRequest request,
        [FromServices] IValidator<CreateSubMinistryRequest> validator)
    {
        if (!auth.CanManage(departmentId))
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var subMinistry = await departmentService.AddSubMinistryAsync(departmentId, request);
            return subMinistry is not null
                ? CreatedAtAction(nameof(GetById), new { id = departmentId }, subMinistry)
                : NotFound();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "A sub-ministry with this name already exists in this department.",
            });
        }
    }

    [HttpPut("{departmentId:int}/sub-ministries/{id:int}")]
    public async Task<IActionResult> UpdateSubMinistry(
        int departmentId,
        int id,
        [FromBody] UpdateSubMinistryRequest request,
        [FromServices] IValidator<UpdateSubMinistryRequest> validator)
    {
        if (!auth.CanManage(departmentId))
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        try
        {
            var subMinistry = await departmentService.UpdateSubMinistryAsync(departmentId, id, request);
            return subMinistry is not null ? Ok(subMinistry) : NotFound();
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
        {
            return Conflict(new ProblemDetails
            {
                Type = "urn:sdac:conflict",
                Title = "Resource Conflict",
                Status = 409,
                Detail = "A sub-ministry with this name already exists in this department.",
            });
        }
    }

    [HttpDelete("{departmentId:int}/sub-ministries/{id:int}")]
    public async Task<IActionResult> DeleteSubMinistry(int departmentId, int id)
    {
        if (!auth.CanManage(departmentId))
            return Forbid();

        var deleted = await departmentService.DeleteSubMinistryAsync(departmentId, id);
        return deleted ? NoContent() : NotFound();
    }

}
