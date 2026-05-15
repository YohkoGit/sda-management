using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.User;
using SdaManagement.Api.Services;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/users")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class UsersController(
    IUserService userService,
    SdacAuth.IAuthorizationService auth,
    ICurrentUserContext currentUser,
    AppDbContext db) : ApiControllerBase
{
    [HttpGet("assignable-officers")]
    [DisableRateLimiting]
    public async Task<IActionResult> GetAssignableOfficers([FromQuery] string? search = null)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        var items = await userService.GetAssignableOfficersAsync(search);
        return Ok(new { items, nextCursor = (string?)null });
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = 20)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        limit = Math.Clamp(limit, 1, 100);

        // Validate cursor format before passing to service (H1 fix)
        if (cursor is not null && !UserService.IsValidCursor(cursor))
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Invalid Cursor",
                Status = 400,
                Detail = "The cursor parameter is malformed.",
            });

        IReadOnlyList<int>? departmentFilter = currentUser.Role switch
        {
            UserRole.Owner => null,
            UserRole.Admin => currentUser.DepartmentIds,
            _ => null, // VIEWER sees all users (read-only)
        };

        var result = await userService.GetUsersAsync(cursor, limit, departmentFilter);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        var user = await userService.GetByIdAsync(id);
        if (user is null)
            return NotFound();

        // ADMIN: verify user shares at least one department
        if (currentUser.Role == UserRole.Admin)
        {
            var sharesDepartment = user.Departments.Any(d => currentUser.DepartmentIds.Contains(d.Id));
            if (!sharesDepartment)
                return Forbid();
        }

        return Ok(user);
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate(
        [FromBody] BulkCreateUsersRequest request,
        [FromServices] IValidator<BulkCreateUsersRequest> validator)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        if (currentUser.Role < UserRole.Admin)
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        // ADMIN-specific restrictions applied to ALL rows
        if (!auth.IsOwner())
        {
            if (request.Users.Any(u => u.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase)))
                return Forbid();
            if (request.Users.Any(u => u.DepartmentIds.Any(dId => !currentUser.DepartmentIds.Contains(dId))))
                return Forbid();
        }

        var created = await userService.BulkCreateAsync(request.Users);
        return StatusCode(201, new BulkCreateUsersResponse { Created = created, Count = created.Count });
    }

    [HttpPost("guests")]
    public async Task<IActionResult> CreateGuest(
        [FromBody] CreateGuestRequest request,
        [FromServices] IValidator<CreateGuestRequest> validator)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        if (currentUser.Role < UserRole.Admin)
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var guest = await userService.CreateGuestAsync(request);
        return StatusCode(201, guest);
    }

    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateUserRequest request,
        [FromServices] IValidator<CreateUserRequest> validator)
    {
        if (!auth.IsAuthenticated())
            return Forbid();

        if (currentUser.Role < UserRole.Admin)
            return Forbid();

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        // ADMIN-specific restrictions
        if (!auth.IsOwner())
        {
            // Cannot assign OWNER role
            if (request.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
                return Forbid();
            // Can only assign departments they manage
            if (request.DepartmentIds.Any(dId => !currentUser.DepartmentIds.Contains(dId)))
                return Forbid();
        }

        var user = await userService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateUserRequest request,
        [FromServices] IValidator<UpdateUserRequest> validator)
    {
        if (!auth.IsAuthenticated())
            return Unauthorized();

        if (currentUser.Role < UserRole.Admin)
            return Forbid();

        // Self-role-change guard (ALL roles) — before validation per spec
        if (id == currentUser.UserId &&
            !request.Role.Equals(currentUser.Role.ToString(), StringComparison.OrdinalIgnoreCase))
            return Forbid();

        // ADMIN-specific restrictions (skip for OWNER) — before validation per spec
        if (!auth.IsOwner())
        {
            // Load target user's current departments for visibility check
            var targetDeptIds = await db.Set<UserDepartment>()
                .Where(ud => ud.UserId == id)
                .Select(ud => ud.DepartmentId)
                .ToListAsync();

            // Target user must share at least one department with current ADMIN
            if (!targetDeptIds.Any(d => currentUser.DepartmentIds.Contains(d)))
                return Forbid();

            // Cannot assign OWNER role
            if (request.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
                return Forbid();

            // All new departmentIds must be in current ADMIN's scope
            if (request.DepartmentIds.Any(d => !currentUser.DepartmentIds.Contains(d)))
                return Forbid();
        }

        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var result = await userService.UpdateAsync(id, request);
        if (result is null)
            return NotFound();

        return Ok(result);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        if (!auth.IsAuthenticated())
            return Unauthorized();

        if (!auth.IsOwner())
            return Forbid();

        if (id == currentUser.UserId)
            return Forbid();

        var targetUser = await db.Users.FindAsync(id);
        if (targetUser is null)
            return NotFound();

        if (targetUser.Role == UserRole.Owner)
        {
            var ownerCount = await db.Users.CountAsync(u => u.Role == UserRole.Owner);
            if (ownerCount <= 1)
                return Conflict(new ProblemDetails
                {
                    Type = "urn:sdac:conflict",
                    Title = "Resource Conflict",
                    Status = 409,
                    Detail = "Cannot delete the last owner account",
                });
        }

        var deleted = await userService.DeleteAsync(id);
        return deleted ? NoContent() : NotFound();
    }
}
