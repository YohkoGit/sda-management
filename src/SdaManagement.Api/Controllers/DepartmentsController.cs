using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Dtos.Department;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/departments")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class DepartmentsController(
    IDepartmentService departmentService,
    Microsoft.AspNetCore.Authorization.IAuthorizationService authz) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var departments = await departmentService.GetAllAsync();
        return Ok(departments);
    }

    [HttpGet("with-staffing")]
    public async Task<IActionResult> GetAllWithStaffing()
    {
        var departments = await departmentService.GetAllWithStaffingAsync();
        return Ok(departments);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var department = await departmentService.GetByIdAsync(id);
        return department is not null ? Ok(department) : NotFound();
    }

    [HttpPost]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Create(
        [FromBody] CreateDepartmentRequest request,
        [FromServices] IValidator<CreateDepartmentRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var department = await departmentService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = department.Id }, department);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateDepartmentRequest request,
        [FromServices] IValidator<UpdateDepartmentRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var department = await departmentService.UpdateAsync(id, request);
        return department is not null ? Ok(department) : NotFound();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = AuthorizationPolicies.OwnerOnly)]
    public async Task<IActionResult> Delete(int id)
    {
        var deleted = await departmentService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("{departmentId:int}/sub-ministries")]
    public async Task<IActionResult> AddSubMinistry(
        int departmentId,
        [FromBody] CreateSubMinistryRequest request,
        [FromServices] IValidator<CreateSubMinistryRequest> validator)
    {
        var deptCheck = await authz.AuthorizeAsync(User, departmentId, AuthorizationPolicies.CanManageDepartment);
        if (!deptCheck.Succeeded)
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var subMinistry = await departmentService.AddSubMinistryAsync(departmentId, request);
        return subMinistry is not null
            ? CreatedAtAction(nameof(GetById), new { id = departmentId }, subMinistry)
            : NotFound();
    }

    [HttpPut("{departmentId:int}/sub-ministries/{id:int}")]
    public async Task<IActionResult> UpdateSubMinistry(
        int departmentId,
        int id,
        [FromBody] UpdateSubMinistryRequest request,
        [FromServices] IValidator<UpdateSubMinistryRequest> validator)
    {
        var deptCheck = await authz.AuthorizeAsync(User, departmentId, AuthorizationPolicies.CanManageDepartment);
        if (!deptCheck.Succeeded)
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var subMinistry = await departmentService.UpdateSubMinistryAsync(departmentId, id, request);
        return subMinistry is not null ? Ok(subMinistry) : NotFound();
    }

    [HttpDelete("{departmentId:int}/sub-ministries/{id:int}")]
    public async Task<IActionResult> DeleteSubMinistry(int departmentId, int id)
    {
        var deptCheck = await authz.AuthorizeAsync(User, departmentId, AuthorizationPolicies.CanManageDepartment);
        if (!deptCheck.Succeeded)
            return Forbid();

        var deleted = await departmentService.DeleteSubMinistryAsync(departmentId, id);
        return deleted ? NoContent() : NotFound();
    }
}
