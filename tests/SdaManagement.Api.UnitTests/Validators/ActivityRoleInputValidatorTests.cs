using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.UnitTests.Validators;

public class ActivityRoleInputValidatorTests
{
    private readonly ActivityRoleInputValidator _validator = new();

    [Fact]
    public void Valid_input_passes()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Predicateur", Headcount = 1 });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_role_name_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "", Headcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.RoleName);
    }

    [Fact]
    public void Role_name_too_long_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = new string('a', 101), Headcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.RoleName);
    }

    [Fact]
    public void Role_name_with_control_chars_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Test\u0007", Headcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.RoleName);
    }

    [Fact]
    public void Headcount_zero_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = 0 });
        result.ShouldHaveValidationErrorFor(x => x.Headcount);
    }

    [Fact]
    public void Headcount_negative_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = -1 });
        result.ShouldHaveValidationErrorFor(x => x.Headcount);
    }

    [Fact]
    public void Headcount_over_99_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = 100 });
        result.ShouldHaveValidationErrorFor(x => x.Headcount);
    }

    [Fact]
    public void Id_zero_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { Id = 0, RoleName = "Test", Headcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.Id);
    }

    [Fact]
    public void Id_null_passes()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { Id = null, RoleName = "Test", Headcount = 1 });
        result.ShouldNotHaveValidationErrorFor(x => x.Id);
    }

    [Fact]
    public void Id_positive_passes()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { Id = 5, RoleName = "Test", Headcount = 1 });
        result.ShouldNotHaveValidationErrorFor(x => x.Id);
    }
}
