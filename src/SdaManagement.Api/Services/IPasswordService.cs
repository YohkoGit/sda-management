namespace SdaManagement.Api.Services;

public interface IPasswordService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string hash);
    string GenerateResetToken();
    /// <summary>SHA-256 hash for high-entropy random tokens (indexable, fast).</summary>
    string HashResetToken(string token);
    /// <summary>Timing-safe comparison of SHA-256 hashes.</summary>
    bool VerifyResetToken(string token, string storedHash);
}
