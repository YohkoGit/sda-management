using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/auth")]
[ApiController]
[EnableRateLimiting("auth")]
public class AuthController(
    IAuthService authService,
    ITokenService tokenService,
    ICurrentUserContext currentUserContext,
    IConfiguration configuration,
    IAvatarService avatarService) : ApiControllerBase
{
    [HttpPost("initiate")]
    public async Task<IActionResult> Initiate(
        [FromBody] InitiateAuthRequest request,
        [FromServices] IValidator<InitiateAuthRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var flow = await authService.DetermineFlowAsync(request.Email);
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

        var user = await authService.AuthenticateAsync(request.Email, request.Password);
        if (user is null)
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

        var outcome = await authService.SetInitialPasswordAsync(request.Email, request.NewPassword);
        switch (outcome.Code)
        {
            case SetPasswordResultCode.UserNotFound:
                return NotFound(new ProblemDetails
                {
                    Type = "urn:sdac:not-found",
                    Title = "Not Found",
                    Status = 404,
                    Detail = "User not found.",
                });
            case SetPasswordResultCode.PasswordAlreadySet:
                return BadRequest(new ProblemDetails
                {
                    Type = "urn:sdac:password-already-set",
                    Title = "Bad Request",
                    Status = 400,
                    Detail = "Password has already been set. Use login instead.",
                });
        }

        var user = outcome.User!;
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

        var token = await authService.RequestPasswordResetAsync(request.Email);
        // MVP: return token directly (no email delivery)
        return Ok(new { token });
    }

    [HttpPost("password-reset/confirm")]
    public async Task<IActionResult> ConfirmPasswordReset(
        [FromBody] ConfirmPasswordResetRequest request,
        [FromServices] IValidator<ConfirmPasswordResetRequest> validator)
    {
        var validation = await validator.ValidateAsync(request);
        if (!validation.IsValid)
            return ValidationError(validation);

        var success = await authService.ConfirmPasswordResetAsync(request.Token, request.NewPassword);
        if (!success)
            return BadRequest(new ProblemDetails
            {
                Type = "urn:sdac:invalid-reset-token",
                Title = "Bad Request",
                Status = 400,
                Detail = "Reset token is invalid, expired, or has already been used.",
            });

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

        var googleFirstName = authResult.Principal.FindFirstValue(ClaimTypes.GivenName);
        var googleLastName = authResult.Principal.FindFirstValue(ClaimTypes.Surname);

        var user = await authService.ResolveGoogleUserAsync(email, googleFirstName, googleLastName);
        if (user is null)
        {
            await HttpContext.SignOutAsync("GoogleOAuthTemp");
            return RedirectToFrontend("/?error=user_not_found");
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

        var response = await authService.GetMeAsync(currentUserContext.UserId);
        return response is null ? Unauthorized() : Ok(response);
    }

    private AuthMeResponse ToAuthMeResponse(User user) => new()
    {
        UserId = user.Id,
        Email = user.Email,
        FirstName = user.FirstName,
        LastName = user.LastName,
        Role = user.Role.ToString().ToUpperInvariant(),
        AvatarUrl = avatarService.GetAvatarUrl(user.Id, user.AvatarVersion),
    };

    private IActionResult RedirectToFrontend(string path)
    {
        var frontendUrl = configuration["FrontendUrl"];
        return !string.IsNullOrEmpty(frontendUrl)
            ? Redirect($"{frontendUrl}{path}")
            : Redirect(path);
    }
}
