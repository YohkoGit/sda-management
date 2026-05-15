using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Auth;

namespace SdaManagement.Api.Services;

public interface IAuthService
{
    /// <summary>
    /// Determines the login flow ("password" vs "set-password") for an email.
    /// Anti-enumeration: non-existent emails return "password" (same as users
    /// with a password set).
    /// </summary>
    Task<string> DetermineFlowAsync(string email);

    /// <summary>
    /// Verifies email + password. Returns the user on success; null on any
    /// failure (anti-enumeration: same response for unknown email and wrong password).
    /// </summary>
    Task<User?> AuthenticateAsync(string email, string password);

    /// <summary>
    /// Sets the initial password for a user that has none. Use only when the
    /// flow is "set-password" — for established users, use the password-reset
    /// flow instead.
    /// </summary>
    Task<SetPasswordOutcome> SetInitialPasswordAsync(string email, string newPassword);

    /// <summary>
    /// Generates a reset token (real for existing users, fake for non-existent emails)
    /// and persists the real hash. Always returns a token to prevent enumeration.
    /// </summary>
    Task<string> RequestPasswordResetAsync(string email);

    /// <summary>
    /// Validates the reset token + applies the new password. Returns true on
    /// success, false if the token is invalid/expired/used.
    /// </summary>
    Task<bool> ConfirmPasswordResetAsync(string rawToken, string newPassword);

    /// <summary>
    /// Looks up a user by Google email. Updates first/last name on the first
    /// owner login if the OWNER account still has the seeded placeholder name.
    /// Returns null when no user exists with that email.
    /// </summary>
    Task<User?> ResolveGoogleUserAsync(string email, string? googleFirstName, string? googleLastName);

    /// <summary>
    /// Loads the response shape for GET /api/auth/me — projects the user into
    /// AuthMeResponse and populates AvatarUrl from the avatar service.
    /// </summary>
    Task<AuthMeResponse?> GetMeAsync(int userId);
}

public enum SetPasswordResultCode
{
    Success,
    UserNotFound,
    PasswordAlreadySet,
}

public readonly record struct SetPasswordOutcome(SetPasswordResultCode Code, User? User);
