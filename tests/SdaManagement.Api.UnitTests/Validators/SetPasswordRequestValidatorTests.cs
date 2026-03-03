using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.UnitTests.Validators;

public class SetPasswordRequestValidatorTests
{
    private readonly SetPasswordRequestValidator _validator = new();

    [Fact]
    public async Task ValidRequest_ShouldPassValidation()
    {
        var request = new SetPasswordRequest { Email = "user@example.com", NewPassword = "Password1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-email")]
    public async Task InvalidEmail_ShouldFailValidation(string email)
    {
        var request = new SetPasswordRequest { Email = email, NewPassword = "Password1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public async Task PasswordTooShort_ShouldFail()
    {
        var request = new SetPasswordRequest { Email = "user@example.com", NewPassword = "Pass1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordWithoutUppercase_ShouldFail()
    {
        var request = new SetPasswordRequest { Email = "user@example.com", NewPassword = "password1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordWithoutLowercase_ShouldFail()
    {
        var request = new SetPasswordRequest { Email = "user@example.com", NewPassword = "PASSWORD1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordWithoutDigit_ShouldFail()
    {
        var request = new SetPasswordRequest { Email = "user@example.com", NewPassword = "Password" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordExceeding256Chars_ShouldFail()
    {
        var longPassword = "A" + new string('a', 254) + "1"; // 256 chars — at limit, should pass
        var request = new SetPasswordRequest { Email = "user@example.com", NewPassword = longPassword };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldNotHaveValidationErrorFor(x => x.NewPassword);

        var tooLong = "A" + new string('a', 255) + "1"; // 257 chars
        var request2 = new SetPasswordRequest { Email = "user@example.com", NewPassword = tooLong };
        var result2 = await _validator.TestValidateAsync(request2);
        result2.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }
}
