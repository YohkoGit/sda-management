using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.UnitTests.Services;

public class TokenServiceTests : IDisposable
{
    private const string TestJwtSecret = "test-jwt-secret-key-for-unit-tests-only-32chars!!";
    private readonly AppDbContext _dbContext;
    private readonly TokenService _tokenService;

    public TokenServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _dbContext = new AppDbContext(options);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtSecret,
            })
            .Build();

        _tokenService = new TokenService(_dbContext, config);
    }

    [Fact]
    public async Task GenerateAccessToken_ReturnsValidJwt_WithCorrectClaims()
    {
        var user = await SeedUser("test@example.com", UserRole.Viewer);

        var (accessToken, _) = await _tokenService.GenerateTokenPairAsync(user);

        accessToken.ShouldNotBeNullOrEmpty();

        // Validate token
        var handler = new JwtSecurityTokenHandler();
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestJwtSecret));
        var principal = handler.ValidateToken(accessToken, new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.FromSeconds(5),
        }, out var validatedToken);

        // Verify claims
        principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value.ShouldBe(user.Id.ToString());
        principal.FindFirst(JwtRegisteredClaimNames.Email)?.Value.ShouldBe("test@example.com");
        principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value.ShouldNotBeNullOrEmpty();
        principal.FindFirst(ClaimTypes.Role)?.Value.ShouldBe("VIEWER");

        // Verify expiry is ~15 minutes from now
        var jwt = validatedToken as JwtSecurityToken;
        jwt.ShouldNotBeNull();
        var expiryDiff = jwt.ValidTo - DateTime.UtcNow;
        expiryDiff.TotalMinutes.ShouldBeInRange(14, 16);
    }

    [Fact]
    public async Task GenerateRefreshToken_ReturnsUniqueBase64String()
    {
        var user = await SeedUser("test@example.com", UserRole.Viewer);

        var (_, refreshToken1) = await _tokenService.GenerateTokenPairAsync(user);
        var (_, refreshToken2) = await _tokenService.GenerateTokenPairAsync(user);

        refreshToken1.ShouldNotBeNullOrEmpty();
        refreshToken2.ShouldNotBeNullOrEmpty();
        refreshToken1.ShouldNotBe(refreshToken2);

        // Verify it's valid base64
        Should.NotThrow(() => Convert.FromBase64String(refreshToken1));
        Convert.FromBase64String(refreshToken1).Length.ShouldBe(64);
    }

    [Fact]
    public async Task RefreshTokens_WhenValid_RotatesAndReturnsNewPair()
    {
        var user = await SeedUser("test@example.com", UserRole.Admin);
        var (_, originalRefreshToken) = await _tokenService.GenerateTokenPairAsync(user);

        var result = await _tokenService.RefreshTokensAsync(originalRefreshToken);

        result.ShouldNotBeNull();
        var (newAccessToken, newRefreshToken) = result.Value;
        newAccessToken.ShouldNotBeNullOrEmpty();
        newRefreshToken.ShouldNotBeNullOrEmpty();
        newRefreshToken.ShouldNotBe(originalRefreshToken);

        // Old token should be revoked
        var oldTokenEntity = await _dbContext.RefreshTokens.FirstAsync(rt => rt.Token == originalRefreshToken);
        oldTokenEntity.IsRevoked.ShouldBeTrue();
    }

    [Fact]
    public async Task RefreshTokens_WhenExpired_ReturnsNull()
    {
        var user = await SeedUser("test@example.com", UserRole.Viewer);

        // Seed an expired token directly
        var expiredToken = new RefreshToken
        {
            UserId = user.Id,
            Token = "expired-token-value",
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            IsRevoked = false,
            CreatedAt = DateTime.UtcNow.AddDays(-8),
        };
        _dbContext.RefreshTokens.Add(expiredToken);
        await _dbContext.SaveChangesAsync();

        var result = await _tokenService.RefreshTokensAsync("expired-token-value");

        result.ShouldBeNull();
    }

    [Fact]
    public async Task RefreshTokens_WhenRevoked_ReturnsNull()
    {
        var user = await SeedUser("test@example.com", UserRole.Viewer);

        var revokedToken = new RefreshToken
        {
            UserId = user.Id,
            Token = "revoked-token-value",
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsRevoked = true,
            CreatedAt = DateTime.UtcNow,
        };
        _dbContext.RefreshTokens.Add(revokedToken);
        await _dbContext.SaveChangesAsync();

        var result = await _tokenService.RefreshTokensAsync("revoked-token-value");

        result.ShouldBeNull();
    }

    [Fact]
    public async Task RevokeRefreshToken_MarksAsRevoked()
    {
        var user = await SeedUser("test@example.com", UserRole.Viewer);
        var (_, refreshToken) = await _tokenService.GenerateTokenPairAsync(user);

        await _tokenService.RevokeRefreshTokenAsync(refreshToken);

        var tokenEntity = await _dbContext.RefreshTokens.FirstAsync(rt => rt.Token == refreshToken);
        tokenEntity.IsRevoked.ShouldBeTrue();
    }

    private async Task<User> SeedUser(string email, UserRole role)
    {
        var user = new User
        {
            Email = email,
            FirstName = "Test",
            LastName = role.ToString(),
            Role = role,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync();
        return user;
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }
}
