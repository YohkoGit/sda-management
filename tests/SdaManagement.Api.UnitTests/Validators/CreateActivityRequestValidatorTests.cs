using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class CreateActivityRequestValidatorTests
{
    private readonly CreateActivityRequestValidator _validator = new();

    private static CreateActivityRequest ValidRequest() => new()
    {
        Title = "Culte du Sabbat",
        Description = "Service principal du samedi",
        Date = new DateOnly(2026, 4, 1),
        StartTime = new TimeOnly(9, 30),
        EndTime = new TimeOnly(12, 0),
        DepartmentId = 1,
        Visibility = "public"
    };

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Theory]
    [InlineData("sainte-cene")]
    [InlineData("week-of-prayer")]
    [InlineData("camp-meeting")]
    [InlineData("youth-day")]
    [InlineData("family-day")]
    [InlineData("womens-day")]
    [InlineData("evangelism")]
    public void Valid_specialType_passes(string specialType)
    {
        var request = ValidRequest() with { SpecialType = specialType };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.SpecialType);
    }

    [Fact]
    public void Null_specialType_passes()
    {
        var request = ValidRequest() with { SpecialType = null };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.SpecialType);
    }

    [Fact]
    public void Empty_specialType_passes()
    {
        var request = ValidRequest() with { SpecialType = "" };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.SpecialType);
    }

    [Fact]
    public void Whitespace_specialType_passes()
    {
        var request = ValidRequest() with { SpecialType = "   " };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.SpecialType);
    }

    [Fact]
    public void Invalid_specialType_fails()
    {
        var request = ValidRequest() with { SpecialType = "invalid-tag" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.SpecialType);
    }

    [Fact]
    public void SpecialType_with_control_characters_fails()
    {
        var request = ValidRequest() with { SpecialType = "youth-day\u0000" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.SpecialType);
    }

    [Fact]
    public void SpecialType_exceeding_max_length_fails()
    {
        var request = ValidRequest() with { SpecialType = new string('a', 51) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.SpecialType);
    }
}
