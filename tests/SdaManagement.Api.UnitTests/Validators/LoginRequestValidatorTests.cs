using FluentValidation.TestHelper;
using Shouldly;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.UnitTests.Validators;

public class LoginRequestValidatorTests
{
    private readonly LoginRequestValidator _validator = new();

    [Fact]
    public async Task ValidRequest_ShouldPassValidation()
    {
        var request = new LoginRequest { Email = "user@example.com", Password = "Password1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("", "Password1")]
    [InlineData("user@example.com", "")]
    public async Task EmptyFields_ShouldFailValidation(string email, string password)
    {
        var request = new LoginRequest { Email = email, Password = password };
        var result = await _validator.TestValidateAsync(request);
        result.Errors.Count.ShouldBeGreaterThan(0);
    }

    [Fact]
    public async Task InvalidEmail_ShouldFailValidation()
    {
        var request = new LoginRequest { Email = "not-email", Password = "Password1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public async Task PasswordTooShort_ShouldFailValidation()
    {
        var request = new LoginRequest { Email = "user@example.com", Password = "Short1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public async Task PasswordExceeding256Chars_ShouldFailValidation()
    {
        var longPassword = new string('A', 257);
        var request = new LoginRequest { Email = "user@example.com", Password = longPassword };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }

    [Fact]
    public async Task EmailWithControlChars_ShouldFailValidation()
    {
        var request = new LoginRequest { Email = "user\0@example.com", Password = "Password1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public async Task PasswordWithControlChars_ShouldFailValidation()
    {
        var request = new LoginRequest { Email = "user@example.com", Password = "Pass\0word1" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Password);
    }
}
