using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.Services;

public class AuthService(
    AppDbContext dbContext,
    IPasswordService passwordService,
    IAvatarService avatarService) : IAuthService
{
    public async Task<string> DetermineFlowAsync(string email)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Anti-enumeration: non-existent emails return "password" (same as users with passwords).
        // Only "set-password" when user exists with no password set (first login).
        return user is not null && user.PasswordHash is null
            ? "set-password"
            : "password";
    }

    public async Task<User?> AuthenticateAsync(string email, string password)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Anti-enumeration: same null return for "email not found" and "wrong password".
        if (user is null || user.PasswordHash is null ||
            !passwordService.VerifyPassword(password, user.PasswordHash))
        {
            return null;
        }
        return user;
    }

    public async Task<SetPasswordOutcome> SetInitialPasswordAsync(string email, string newPassword)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var user = await dbContext.Users
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        if (user is null)
            return new SetPasswordOutcome(SetPasswordResultCode.UserNotFound, null);

        if (user.PasswordHash is not null)
            return new SetPasswordOutcome(SetPasswordResultCode.PasswordAlreadySet, null);

        user.PasswordHash = passwordService.HashPassword(newPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        return new SetPasswordOutcome(SetPasswordResultCode.Success, user);
    }

    public async Task<string> RequestPasswordResetAsync(string email)
    {
        var normalizedEmail = email.ToLowerInvariant();
        var user = await dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail);

        // Anti-enumeration: always return a token. For non-existent emails,
        // generate a fake (never stored).
        if (user is null)
            return passwordService.GenerateResetToken();

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
        return rawToken;
    }

    public async Task<bool> ConfirmPasswordResetAsync(string rawToken, string newPassword)
    {
        // SHA-256 enables direct DB lookup — no table scan needed.
        var tokenHash = passwordService.HashResetToken(rawToken);
        var matchingToken = await dbContext.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash
                && t.UsedAt == null
                && t.ExpiresAt > DateTime.UtcNow);

        if (matchingToken is null)
            return false;

        matchingToken.User.PasswordHash = passwordService.HashPassword(newPassword);
        matchingToken.User.UpdatedAt = DateTime.UtcNow;
        matchingToken.UsedAt = DateTime.UtcNow;
        await dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<User?> ResolveGoogleUserAsync(string email, string? googleFirstName, string? googleLastName)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null)
            return null;

        // First owner login still has the seeded placeholder name — overwrite once with Google's.
        if (!string.IsNullOrEmpty(googleFirstName) && user.FirstName == "Owner")
        {
            user.FirstName = googleFirstName;
            user.LastName = googleLastName ?? user.LastName;
            user.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
        }
        return user;
    }

    public async Task<AuthMeResponse?> GetMeAsync(int userId)
    {
        var row = await dbContext.Users
            .Where(u => u.Id == userId)
            .Select(u => new
            {
                Response = new AuthMeResponse
                {
                    UserId = u.Id,
                    Email = u.Email,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Role = u.Role.ToString().ToUpper(),
                    DepartmentIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList(),
                    Departments = u.UserDepartments
                        .Select(ud => new UserDepartmentBadge
                        {
                            Id = ud.Department.Id,
                            Name = ud.Department.Name,
                            Abbreviation = ud.Department.Abbreviation,
                            Color = ud.Department.Color,
                        })
                        .ToList(),
                },
                AvatarVersion = u.AvatarVersion,
            })
            .FirstOrDefaultAsync();

        if (row is null)
            return null;

        row.Response.AvatarUrl = avatarService.GetAvatarUrl(row.Response.UserId, row.AvatarVersion);
        return row.Response;
    }
}
