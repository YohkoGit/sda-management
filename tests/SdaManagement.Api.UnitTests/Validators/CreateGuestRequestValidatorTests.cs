using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.User;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class CreateGuestRequestValidatorTests
{
    private readonly CreateGuestRequestValidator _validator = new();

    private static CreateGuestRequest ValidRequest() => new()
    {
        Name = "Pasteur Damien",
        Phone = null
    };

    [Fact]
    public void Valid_name_no_phone_passes()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Valid_name_with_phone_passes()
    {
        var result = _validator.TestValidate(ValidRequest() with { Phone = "514-555-1234" });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_name_fails()
    {
        var result = _validator.TestValidate(ValidRequest() with { Name = "" });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_less_than_2_chars_fails()
    {
        var result = _validator.TestValidate(ValidRequest() with { Name = "A" });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_exceeding_100_chars_fails()
    {
        var result = _validator.TestValidate(ValidRequest() with { Name = new string('a', 101) });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_with_control_characters_fails()
    {
        var result = _validator.TestValidate(ValidRequest() with { Name = "Pasteur\u0000Damien" });
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Phone_exceeding_20_chars_fails()
    {
        var result = _validator.TestValidate(ValidRequest() with { Phone = new string('1', 21) });
        result.ShouldHaveValidationErrorFor(x => x.Phone);
    }

    [Fact]
    public void Phone_with_control_characters_fails()
    {
        var result = _validator.TestValidate(ValidRequest() with { Phone = "514\u0000555" });
        result.ShouldHaveValidationErrorFor(x => x.Phone);
    }

    [Fact]
    public void Name_exactly_2_chars_passes()
    {
        var result = _validator.TestValidate(ValidRequest() with { Name = "Li" });
        result.ShouldNotHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Phone_exactly_20_chars_passes()
    {
        var result = _validator.TestValidate(ValidRequest() with { Phone = new string('1', 20) });
        result.ShouldNotHaveValidationErrorFor(x => x.Phone);
    }
}
