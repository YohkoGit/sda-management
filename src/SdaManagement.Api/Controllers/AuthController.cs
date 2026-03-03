using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/auth")]
[ApiController]
public class AuthController(
    AppDbContext dbContext,
    ITokenService tokenService,
    ICurrentUserContext currentUserContext) : ControllerBase
{
    [HttpPost("login")]
    [EnableRateLimiting("auth")]
    public IActionResult Login() =>
        Problem(statusCode: 501, title: "Not Implemented", detail: "Implemented in Story 1.5");

    [HttpGet("google-login")]
    [EnableRateLimiting("auth")]
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
            return Redirect("/?error=auth_failed");

        var email = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        if (string.IsNullOrEmpty(email))
            return Redirect("/?error=auth_failed");

        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
        {
            await HttpContext.SignOutAsync("GoogleOAuthTemp");
            return Redirect("/?error=user_not_found");
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

        return Url.IsLocalUrl(returnUrl) ? Redirect(returnUrl) : Redirect("/");
    }

    [HttpPost("refresh")]
    [EnableRateLimiting("auth")]
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
    [EnableRateLimiting("auth")]
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
                Role = u.Role.ToString(),
            })
            .FirstOrDefaultAsync();

        return user is not null ? Ok(user) : Unauthorized();
    }
}
