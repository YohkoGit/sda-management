using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.UnitTests.Validators;

public class ConfirmPasswordResetRequestValidatorTests
{
    private readonly ConfirmPasswordResetRequestValidator _validator = new();

    [Fact]
    public async Task ValidRequest_ShouldPassValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = "StrongPass1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task EmptyOrNullToken_ShouldFailValidation(string? token)
    {
        var request = new ConfirmPasswordResetRequest { Token = token!, NewPassword = "StrongPass1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Token);
    }

    [Fact]
    public async Task TokenExceeding128Chars_ShouldFailValidation()
    {
        var longToken = new string('a', 129);
        var request = new ConfirmPasswordResetRequest { Token = longToken, NewPassword = "StrongPass1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Token);
    }

    [Fact]
    public async Task TokenWithControlCharacters_ShouldFailValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "token\0value", NewPassword = "StrongPass1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Token);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task EmptyOrNullPassword_ShouldFailValidation(string? password)
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = password! };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordTooShort_ShouldFailValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = "Short1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordMissingUppercase_ShouldFailValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = "alllowercase1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordMissingLowercase_ShouldFailValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = "ALLUPPERCASE1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordMissingDigit_ShouldFailValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = "NoDigitsHere" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }

    [Fact]
    public async Task PasswordWithControlCharacters_ShouldFailValidation()
    {
        var request = new ConfirmPasswordResetRequest { Token = "valid-token", NewPassword = "Pass\0word1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.NewPassword);
    }
}
