using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Services;

public class TokenService(AppDbContext dbContext, IConfiguration configuration) : ITokenService
{
    private readonly JsonWebTokenHandler _tokenHandler = new();

    public async Task<(string AccessToken, string RefreshToken)> GenerateTokenPairAsync(User user)
    {
        var accessToken = GenerateAccessToken(user);
        var refreshToken = CreateRefreshToken(user.Id);
        await dbContext.SaveChangesAsync();
        return (accessToken, refreshToken);
    }

    public async Task<(string AccessToken, string RefreshToken)?> RefreshTokensAsync(string refreshTokenValue)
    {
        var storedToken = await dbContext.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshTokenValue);

        if (storedToken is null || storedToken.IsRevoked || storedToken.ExpiresAt < DateTime.UtcNow)
            return null;

        if (storedToken.User is null)
            return null;

        // Revoke old token (rotation)
        storedToken.IsRevoked = true;

        // Generate new pair
        var accessToken = GenerateAccessToken(storedToken.User);
        var newRefreshToken = CreateRefreshToken(storedToken.UserId);

        await dbContext.SaveChangesAsync();
        return (accessToken, newRefreshToken);
    }

    public async Task RevokeRefreshTokenAsync(string refreshTokenValue)
    {
        var token = await dbContext.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.Token == refreshTokenValue);

        if (token is not null && !token.IsRevoked)
        {
            token.IsRevoked = true;
            await dbContext.SaveChangesAsync();
        }
    }

    public void SetTokenCookies(HttpContext context, string accessToken, string refreshToken)
    {
        context.Response.Cookies.Append("access_token", accessToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddMinutes(15),
            IsEssential = true,
            Path = "/api",
        });

        context.Response.Cookies.Append("refresh_token", refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7),
            IsEssential = true,
            Path = "/api/auth",
        });
    }

    public void ClearTokenCookies(HttpContext context)
    {
        context.Response.Cookies.Delete("access_token", new CookieOptions { Path = "/api" });
        context.Response.Cookies.Delete("refresh_token", new CookieOptions { Path = "/api/auth" });
    }

    private string GenerateAccessToken(User user)
    {
        var jwtSecret = configuration["Jwt:Secret"]!;
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
            ]),
            Expires = DateTime.UtcNow.AddMinutes(15),
            SigningCredentials = credentials,
            IssuedAt = DateTime.UtcNow,
            NotBefore = DateTime.UtcNow,
        };

        return _tokenHandler.CreateToken(descriptor);
    }

    private string CreateRefreshToken(int userId)
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        var tokenValue = Convert.ToBase64String(randomBytes);

        dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            Token = tokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = false,
            CreatedAt = DateTime.UtcNow,
        });

        return tokenValue;
    }
}
