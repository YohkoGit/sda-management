using System.Security.Cryptography;
using System.Text;

namespace SdaManagement.Api.Services;

public class PasswordService : IPasswordService
{
    public string HashPassword(string password) =>
        BCrypt.Net.BCrypt.EnhancedHashPassword(password, 12);

    public bool VerifyPassword(string password, string hash) =>
        BCrypt.Net.BCrypt.EnhancedVerify(password, hash);

    public string GenerateResetToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    /// <summary>
    /// SHA-256 hash for high-entropy random tokens.
    /// Unlike bcrypt (designed for low-entropy passwords), SHA-256 is appropriate
    /// for 256-bit random tokens and enables indexed DB lookup.
    /// </summary>
    public string HashResetToken(string token)
    {
        var tokenBytes = Encoding.UTF8.GetBytes(token);
        var hashBytes = SHA256.HashData(tokenBytes);
        return Convert.ToHexString(hashBytes).ToLowerInvariant();
    }

    public bool VerifyResetToken(string token, string storedHash)
    {
        var computedHash = HashResetToken(token);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(computedHash),
            Encoding.UTF8.GetBytes(storedHash));
    }
}
