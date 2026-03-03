using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.Auth;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.UnitTests.Validators;

public class RequestPasswordResetRequestValidatorTests
{
    private readonly RequestPasswordResetRequestValidator _validator = new();

    [Fact]
    public async Task ValidEmail_ShouldPassValidation()
    {
        var request = new RequestPasswordResetRequest { Email = "user@example.com" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public async Task EmptyOrNullEmail_ShouldFailValidation(string? email)
    {
        var request = new RequestPasswordResetRequest { Email = email! };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("@missing-local")]
    [InlineData("missing-domain@")]
    public async Task InvalidEmailFormat_ShouldFailValidation(string email)
    {
        var request = new RequestPasswordResetRequest { Email = email };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public async Task EmailExceeding255Chars_ShouldFailValidation()
    {
        var longEmail = new string('a', 244) + "@test.local"; // 255 chars
        var request = new RequestPasswordResetRequest { Email = longEmail };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldNotHaveValidationErrorFor(x => x.Email);

        var tooLongEmail = new string('a', 245) + "@test.local"; // 256 chars
        var request2 = new RequestPasswordResetRequest { Email = tooLongEmail };
        var result2 = await _validator.TestValidateAsync(request2);
        result2.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public async Task EmailWithControlCharacters_ShouldFailValidation()
    {
        var request = new RequestPasswordResetRequest { Email = "user\0@example.com" };
        var result = await _validator.TestValidateAsync(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }
}
