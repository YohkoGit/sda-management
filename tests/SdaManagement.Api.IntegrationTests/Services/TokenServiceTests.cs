using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Services;

/// <summary>
/// Service-level tests for TokenService. Moved from the unit-test project so refresh-token
/// persistence, rotation, and revocation run against real Postgres — covers EF identity-map
/// + tracking semantics that InMemoryDatabase doesn't exercise faithfully.
/// </summary>
public class TokenServiceTests : IntegrationTestBase
{
    private const string TestJwtSecret = "test-jwt-secret-key-for-unit-tests-only-32chars!!";

    public TokenServiceTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    private TokenService CreateService(AppDbContext db)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Secret"] = TestJwtSecret,
            })
            .Build();
        return new TokenService(db, config);
    }

    private async Task<int> SeedUser(string email, UserRole role)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
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
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user.Id;
    }

    [Fact]
    public async Task GenerateAccessToken_ReturnsValidJwt_WithCorrectClaims()
    {
        var userId = await SeedUser("test@example.com", UserRole.Viewer);

        string accessToken;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            var tokenService = CreateService(db);
            (accessToken, _) = await tokenService.GenerateTokenPairAsync(user);
        }

        accessToken.ShouldNotBeNullOrEmpty();

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

        principal.FindFirst(JwtRegisteredClaimNames.Sub)?.Value.ShouldBe(userId.ToString());
        principal.FindFirst(JwtRegisteredClaimNames.Email)?.Value.ShouldBe("test@example.com");
        principal.FindFirst(JwtRegisteredClaimNames.Jti)?.Value.ShouldNotBeNullOrEmpty();
        principal.FindFirst(ClaimTypes.Role)?.Value.ShouldBe("VIEWER");

        var jwt = validatedToken as JwtSecurityToken;
        jwt.ShouldNotBeNull();
        var expiryDiff = jwt.ValidTo - DateTime.UtcNow;
        expiryDiff.TotalMinutes.ShouldBeInRange(14, 16);
    }

    [Fact]
    public async Task GenerateRefreshToken_ReturnsUniqueBase64String()
    {
        var userId = await SeedUser("test@example.com", UserRole.Viewer);

        string refreshToken1, refreshToken2;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            var tokenService = CreateService(db);
            (_, refreshToken1) = await tokenService.GenerateTokenPairAsync(user);
        }
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            var tokenService = CreateService(db);
            (_, refreshToken2) = await tokenService.GenerateTokenPairAsync(user);
        }

        refreshToken1.ShouldNotBeNullOrEmpty();
        refreshToken2.ShouldNotBeNullOrEmpty();
        refreshToken1.ShouldNotBe(refreshToken2);

        Should.NotThrow(() => Convert.FromBase64String(refreshToken1));
        Convert.FromBase64String(refreshToken1).Length.ShouldBe(64);
    }

    [Fact]
    public async Task RefreshTokens_WhenValid_RotatesAndReturnsNewPair()
    {
        var userId = await SeedUser("test@example.com", UserRole.Admin);

        string originalRefreshToken;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            var tokenService = CreateService(db);
            (_, originalRefreshToken) = await tokenService.GenerateTokenPairAsync(user);
        }

        (string AccessToken, string RefreshToken)? result;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tokenService = CreateService(db);
            result = await tokenService.RefreshTokensAsync(originalRefreshToken);
        }

        result.ShouldNotBeNull();
        var (newAccessToken, newRefreshToken) = result.Value;
        newAccessToken.ShouldNotBeNullOrEmpty();
        newRefreshToken.ShouldNotBeNullOrEmpty();
        newRefreshToken.ShouldNotBe(originalRefreshToken);

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var oldTokenEntity = await verifyDb.RefreshTokens.FirstAsync(rt => rt.Token == originalRefreshToken);
        oldTokenEntity.IsRevoked.ShouldBeTrue();
    }

    [Fact]
    public async Task RefreshTokens_WhenExpired_ReturnsNull()
    {
        var userId = await SeedUser("test@example.com", UserRole.Viewer);

        using (var seedScope = Factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
            seedDb.RefreshTokens.Add(new RefreshToken
            {
                UserId = userId,
                Token = "expired-token-value",
                ExpiresAt = DateTime.UtcNow.AddDays(-1),
                IsRevoked = false,
                CreatedAt = DateTime.UtcNow.AddDays(-8),
            });
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tokenService = CreateService(db);

        var result = await tokenService.RefreshTokensAsync("expired-token-value");

        result.ShouldBeNull();
    }

    [Fact]
    public async Task RefreshTokens_WhenRevoked_ReturnsNull()
    {
        var userId = await SeedUser("test@example.com", UserRole.Viewer);

        using (var seedScope = Factory.Services.CreateScope())
        {
            var seedDb = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
            seedDb.RefreshTokens.Add(new RefreshToken
            {
                UserId = userId,
                Token = "revoked-token-value",
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsRevoked = true,
                CreatedAt = DateTime.UtcNow,
            });
            await seedDb.SaveChangesAsync();
        }

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tokenService = CreateService(db);

        var result = await tokenService.RefreshTokensAsync("revoked-token-value");

        result.ShouldBeNull();
    }

    [Fact]
    public async Task RevokeRefreshToken_MarksAsRevoked()
    {
        var userId = await SeedUser("test@example.com", UserRole.Viewer);

        string refreshToken;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            var tokenService = CreateService(db);
            (_, refreshToken) = await tokenService.GenerateTokenPairAsync(user);
        }

        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var tokenService = CreateService(db);
            await tokenService.RevokeRefreshTokenAsync(refreshToken);
        }

        using var verifyScope = Factory.Services.CreateScope();
        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var tokenEntity = await verifyDb.RefreshTokens.FirstAsync(rt => rt.Token == refreshToken);
        tokenEntity.IsRevoked.ShouldBeTrue();
    }
}
