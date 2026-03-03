using Shouldly;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.UnitTests.Services;

public class PasswordServiceTests
{
    private readonly PasswordService _service = new();

    [Fact]
    public void HashPassword_ReturnsValidBcryptHash()
    {
        var hash = _service.HashPassword("TestPassword1");

        hash.ShouldNotBeNullOrEmpty();
        hash.ShouldStartWith("$2a$12$"); // bcrypt cost factor 12
    }

    [Fact]
    public void VerifyPassword_WithCorrectPassword_ReturnsTrue()
    {
        var hash = _service.HashPassword("TestPassword1");
        var result = _service.VerifyPassword("TestPassword1", hash);

        result.ShouldBeTrue();
    }

    [Fact]
    public void VerifyPassword_WithWrongPassword_ReturnsFalse()
    {
        var hash = _service.HashPassword("TestPassword1");
        var result = _service.VerifyPassword("WrongPassword1", hash);

        result.ShouldBeFalse();
    }

    [Fact]
    public void GenerateResetToken_ReturnsBase64String()
    {
        var token = _service.GenerateResetToken();

        token.ShouldNotBeNullOrEmpty();
        // 32 bytes → 44 chars base64 (with padding)
        Convert.FromBase64String(token).Length.ShouldBe(32);
    }

    [Fact]
    public void GenerateResetToken_ReturnsUniqueTokens()
    {
        var token1 = _service.GenerateResetToken();
        var token2 = _service.GenerateResetToken();

        token1.ShouldNotBe(token2);
    }

    [Fact]
    public void HashResetToken_ReturnsSha256HexString()
    {
        var rawToken = _service.GenerateResetToken();
        var hash = _service.HashResetToken(rawToken);

        hash.ShouldNotBeNullOrEmpty();
        // SHA-256 produces 64-char lowercase hex string
        hash.Length.ShouldBe(64);
        hash.ShouldBe(hash.ToLowerInvariant());
    }

    [Fact]
    public void HashResetToken_SameInput_ReturnsSameHash()
    {
        var rawToken = _service.GenerateResetToken();
        var hash1 = _service.HashResetToken(rawToken);
        var hash2 = _service.HashResetToken(rawToken);

        hash1.ShouldBe(hash2);
    }

    [Fact]
    public void VerifyResetToken_Roundtrip()
    {
        var rawToken = _service.GenerateResetToken();
        var hash = _service.HashResetToken(rawToken);

        _service.VerifyResetToken(rawToken, hash).ShouldBeTrue();
        _service.VerifyResetToken("wrong-token", hash).ShouldBeFalse();
    }
}
