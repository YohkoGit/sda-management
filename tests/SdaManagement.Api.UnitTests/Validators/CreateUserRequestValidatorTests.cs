using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.User;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class CreateUserRequestValidatorTests
{
    private readonly CreateUserRequestValidator _validator = new();

    private static CreateUserRequest ValidRequest() => new()
    {
        FirstName = "Marie-Claire",
        LastName = "Legault",
        Email = "mc.legault@gmail.com",
        Role = "Viewer",
        DepartmentIds = [1],
    };

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_firstName_fails()
    {
        var request = ValidRequest() with { FirstName = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.FirstName);
    }

    [Fact]
    public void Empty_lastName_fails()
    {
        var request = ValidRequest() with { LastName = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.LastName);
    }

    [Fact]
    public void Empty_email_fails()
    {
        var request = ValidRequest() with { Email = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Invalid_email_fails()
    {
        var request = ValidRequest() with { Email = "not-an-email" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void Invalid_role_fails()
    {
        var request = ValidRequest() with { Role = "SuperAdmin" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Role);
    }

    [Theory]
    [InlineData("Viewer")]
    [InlineData("Admin")]
    [InlineData("Owner")]
    [InlineData("viewer")]
    [InlineData("ADMIN")]
    public void Valid_role_passes(string role)
    {
        var request = ValidRequest() with { Role = role };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.Role);
    }

    [Fact]
    public void Empty_departmentIds_fails()
    {
        var request = ValidRequest() with { DepartmentIds = [] };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DepartmentIds);
    }

    [Fact]
    public void DepartmentId_zero_fails()
    {
        var request = ValidRequest() with { DepartmentIds = [0] };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("DepartmentIds"));
    }

    [Fact]
    public void DepartmentId_negative_fails()
    {
        var request = ValidRequest() with { DepartmentIds = [-1] };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("DepartmentIds"));
    }

    [Fact]
    public void FirstName_exceeding_100_chars_fails()
    {
        var request = ValidRequest() with { FirstName = new string('A', 101) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.FirstName);
    }

    [Fact]
    public void LastName_exceeding_100_chars_fails()
    {
        var request = ValidRequest() with { LastName = new string('A', 101) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.LastName);
    }

    [Fact]
    public void Email_exceeding_255_chars_fails()
    {
        var request = ValidRequest() with { Email = new string('a', 247) + "@test.com" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Email);
    }

    [Fact]
    public void FirstName_with_control_characters_fails()
    {
        var request = ValidRequest() with { FirstName = "Marie\u0000Claire" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.FirstName);
    }
}
