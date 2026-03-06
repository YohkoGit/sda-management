using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/auth")]
[ApiController]
[EnableRateLimiting("auth")]
public class AuthController(
    AppDbContext dbContext,
    ITokenService tokenService,
    IPasswordService passwordService,
    ICurrentUserContext currentUserContext,
    IConfiguration configuration) : ControllerBase
{
    [HttpPost("initiate")]
    public async Task<IActionResult> Initiate(
        [FromBody] InitiateAuthRequest request,
        [FromServices] IValidator<InitiateAuthRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var normalizedEmail = request.Email.ToLowerInvariant();
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Anti-enumeration: non-existent emails return "password" (same as users with passwords)
        // Only "set-password" when user exists with no password set (first login)
        var flow = user is not null && user.PasswordHash is null
            ? "set-password"
            : "password";

        return Ok(new InitiateAuthResponse { Flow = flow });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginRequest request,
        [FromServices] IValidator<LoginRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var normalizedEmail = request.Email.ToLowerInvariant();
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Anti-enumeration: same 401 for "email not found" and "wrong password"
        if (user is null || user.PasswordHash is null ||
            !passwordService.VerifyPassword(request.Password, user.PasswordHash))
        {
            return Unauthorized(new ProblemDetails
            {
                Type = "urn:sdac:invalid-credentials",
                Title = "Invalid Credentials",
                Status = 401,
                Detail = "Identifiants invalides.",
            });
        }

        var (accessToken, refreshToken) = await tokenService.GenerateTokenPairAsync(user);
        tokenService.SetTokenCookies(HttpContext, accessToken, refreshToken);

        return Ok(ToAuthMeResponse(user));
    }

    [HttpPost("set-password")]
    public async Task<IActionResult> SetPassword(
        [FromBody] SetPasswordRequest request,
        [FromServices] IValidator<SetPasswordRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var normalizedEmail = request.Email.ToLowerInvariant();
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null)
            return NotFound(new ProblemDetails
            {
                Type = "urn:sdac:not-found",
                Title = "Not Found",
                Status = 404,
                Detail = "User not found.",
            });

        if (user.PasswordHash is not null)
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:password-already-set",
                Title = "Bad Request",
                Status = 400,
                Detail = "Password has already been set. Use login instead.",
            });

        user.PasswordHash = passwordService.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        var (accessToken, refreshToken) = await tokenService.GenerateTokenPairAsync(user);
        tokenService.SetTokenCookies(HttpContext, accessToken, refreshToken);

        return Ok(ToAuthMeResponse(user));
    }

    [HttpPost("password-reset/request")]
    public async Task<IActionResult> RequestPasswordReset(
        [FromBody] RequestPasswordResetRequest request,
        [FromServices] IValidator<RequestPasswordResetRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var normalizedEmail = request.Email.ToLowerInvariant();
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Anti-enumeration: always return 200 with identical response shape.
        // For non-existent emails, generate a fake token (never stored) so the
        // response body is indistinguishable from a real reset.
        if (user is null)
            return Ok(new { token = passwordService.GenerateResetToken() });

        var rawToken = passwordService.GenerateResetToken();
        var tokenHash = passwordService.HashResetToken(rawToken);

        dbContext.PasswordResetTokens.Add(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
            CreatedAt = DateTime.UtcNow,
        });
        await dbContext.SaveChangesAsync();

        // MVP: return token directly (no email delivery)
        return Ok(new { token = rawToken });
    }

    [HttpPost("password-reset/confirm")]
    public async Task<IActionResult> ConfirmPasswordReset(
        [FromBody] ConfirmPasswordResetRequest request,
        [FromServices] IValidator<ConfirmPasswordResetRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        // SHA-256 enables direct DB lookup — no table scan needed
        var tokenHash = passwordService.HashResetToken(request.Token);
        var matchingToken = await dbContext.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash
                && t.UsedAt == null
                && t.ExpiresAt > DateTime.UtcNow);

        if (matchingToken is null)
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:invalid-reset-token",
                Title = "Bad Request",
                Status = 400,
                Detail = "Reset token is invalid, expired, or has already been used.",
            });

        // Update password and mark token as used
        matchingToken.User.PasswordHash = passwordService.HashPassword(request.NewPassword);
        matchingToken.User.UpdatedAt = DateTime.UtcNow;
        matchingToken.UsedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();

        return Ok(new { message = "Password has been reset successfully." });
    }

    [HttpGet("google-login")]
    public IActionResult GoogleLogin([FromQuery] string? returnUrl)
    {
        var callbackUrl = Url.Action(nameof(GoogleCallback), new { returnUrl = returnUrl ?? "/" });
        var properties = new AuthenticationProperties { RedirectUri = callbackUrl };
        return Challenge(properties, GoogleDefaults.AuthenticationScheme);
    }

    [HttpGet("google-callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl)
    {
        var authResult = await HttpContext.AuthenticateAsync("GoogleOAuthTemp");
        if (!authResult.Succeeded || authResult.Principal is null)
            return RedirectToFrontend("/?error=auth_failed");

        var email = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return RedirectToFrontend("/?error=auth_failed");

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            await HttpContext.SignOutAsync("GoogleOAuthTemp");
            return RedirectToFrontend("/?error=user_not_found");
        }

        var googleFirstName = authResult.Principal.FindFirstValue(ClaimTypes.GivenName);
        var googleLastName = authResult.Principal.FindFirstValue(ClaimTypes.Surname);
        if (!string.IsNullOrEmpty(googleFirstName) && user.FirstName == "Owner")
        {
            user.FirstName = googleFirstName;
            user.LastName = googleLastName ?? user.LastName;
            user.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }

        var (accessToken, refreshToken) = await tokenService.GenerateTokenPairAsync(user);
        tokenService.SetTokenCookies(HttpContext, accessToken, refreshToken);

        await HttpContext.SignOutAsync("GoogleOAuthTemp");

        return RedirectToFrontend(Url.IsLocalUrl(returnUrl) ? returnUrl : "/");
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh()
    {
        var refreshTokenValue = Request.Cookies["refresh_token"];
        if (string.IsNullOrEmpty(refreshTokenValue))
            return Unauthorized(new { type = "urn:sdac:unauthenticated", title = "Unauthorized", status = 401, detail = "Refresh token is missing." });

        var result = await tokenService.RefreshTokensAsync(refreshTokenValue);
        if (result is null)
            return Unauthorized(new { type = "urn:sdac:unauthenticated", title = "Unauthorized", status = 401, detail = "Refresh token is invalid or expired." });

        var (accessToken, newRefreshToken) = result.Value;
        tokenService.SetTokenCookies(HttpContext, accessToken, newRefreshToken);
        return Ok();
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var refreshTokenValue = Request.Cookies["refresh_token"];
        if (!string.IsNullOrEmpty(refreshTokenValue))
            await tokenService.RevokeRefreshTokenAsync(refreshTokenValue);

        tokenService.ClearTokenCookies(HttpContext);
        return Ok();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me()
    {
        if (!currentUserContext.IsAuthenticated)
            return Unauthorized();

        var user = await dbContext.Users
            .Where(u => u.Id == currentUserContext.UserId)
            .Select(u => new AuthMeResponse
            {
                UserId = u.Id,
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Role = u.Role.ToString().ToUpper(),
                DepartmentIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList(),
            })
            .FirstOrDefaultAsync();

        return user is not null ? Ok(user) : Unauthorized();
    }

    private static AuthMeResponse ToAuthMeResponse(User user) => new()
    {
        UserId = user.Id,
        Email = user.Email,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Role = user.Role.ToString().ToUpperInvariant(),
    };

    private IActionResult RedirectToFrontend(string path)
    {
        var frontendUrl = configuration["FrontendUrl"];
        return !string.IsNullOrEmpty(frontendUrl)
            ? Redirect($"{frontendUrl}{path}")
            : Redirect(path);
    }

    private BadRequestObjectResult ValidationError(FluentValidation.Results.ValidationResult validation) =>
        BadRequest(new ValidationProblemDetails(validation.ToDictionary())
        {
            Type = "urn:sdac:validation-error",
            Title = "Validation Error",
            Status = 400,
        });
}
