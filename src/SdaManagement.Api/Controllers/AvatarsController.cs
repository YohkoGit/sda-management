using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using SixLabors.ImageSharp;
using SdacAuth = SdaManagement.Api.Auth;

namespace SdaManagement.Api.Controllers;

[Route("api/avatars")]
[ApiController]
public class AvatarsController(
    IAvatarService avatarService,
    SdacAuth.IAuthorizationService auth,
    ICurrentUserContext currentUser,
    AppDbContext db,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("{userId:int}")]
    [Authorize]
    [RequestFormLimits(MultipartBodyLengthLimit = 524288)]
    public async Task<IActionResult> Upload(int userId, [FromForm] IFormFile file)
    {
        if (!auth.IsAuthenticated())
            return Unauthorized();

        if (currentUser.Role < UserRole.Admin)
            return Forbid();

        // Verify target user exists (exclude guests — avatars are for real accounts only)
        var targetUser = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId && !u.IsGuest);
        if (targetUser is null)
            return NotFound(new ProblemDetails
            {
                Type = "urn:sdac:not-found",
                Title = "Not Found",
                Status = 404,
                Detail = "User not found.",
            });

        // Department scoping: OWNER bypasses, ADMIN must share a department
        if (!auth.IsOwner())
        {
            var targetDeptIds = await db.Set<UserDepartment>()
                .Where(ud => ud.UserId == userId)
                .Select(ud => ud.DepartmentId)
                .ToListAsync();

            if (!targetDeptIds.Any(d => currentUser.DepartmentIds.Contains(d)))
                return Forbid();
        }

        // Validate file
        var maxSize = configuration.GetValue("AvatarStorage:MaxFileSizeBytes", 512000);
        if (file is null || file.Length <= 0 || file.Length > maxSize)
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Validation Error",
                Status = 400,
                Detail = $"File size must be between 1 byte and {maxSize} bytes.",
            });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType))
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Validation Error",
                Status = 400,
                Detail = "File must be JPEG, PNG, or WebP.",
            });

        try
        {
            using var stream = file.OpenReadStream();
            await avatarService.SaveAvatarAsync(userId, stream);
        }
        catch (ImageFormatException)
        {
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Validation Error",
                Status = 400,
                Detail = "The uploaded file is not a valid image.",
            });
        }

        return NoContent();
    }

    [HttpGet("{userId:int}")]
    [AllowAnonymous]
    public async Task<IActionResult> Get(int userId)
    {
        var result = await avatarService.GetAvatarStreamAsync(userId);
        if (result is null)
            return NotFound();

        var (stream, lastModified) = result.Value;
        var etag = $"\"{lastModified.Ticks}\"";

        if (Request.Headers.IfNoneMatch.ToString() == etag)
        {
            stream.Dispose();
            return StatusCode(304);
        }

        Response.Headers.ETag = etag;
        Response.Headers.CacheControl = "public, max-age=86400";
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        return File(stream, "image/webp");
    }
}
