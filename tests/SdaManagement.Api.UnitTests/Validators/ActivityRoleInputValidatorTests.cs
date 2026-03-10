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

    // --- Assignment validation ---

    [Fact]
    public void Null_assignments_passes()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = 2, Assignments = null });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_assignments_passes()
    {
        var result = _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = 2, Assignments = [] });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Assignments_within_headcount_passes()
    {
        var result = _validator.TestValidate(new ActivityRoleInput
        {
            RoleName = "Test",
            Headcount = 2,
            Assignments = [new() { UserId = 1 }, new() { UserId = 2 }],
        });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Assignments_exceeding_headcount_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput
        {
            RoleName = "Test",
            Headcount = 1,
            Assignments = [new() { UserId = 1 }, new() { UserId = 2 }],
        });
        result.ShouldHaveValidationErrorFor(x => x.Assignments)
            .WithErrorMessage("Number of assignments cannot exceed headcount.");
    }

    [Fact]
    public void Duplicate_userId_in_assignments_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput
        {
            RoleName = "Test",
            Headcount = 3,
            Assignments = [new() { UserId = 1 }, new() { UserId = 1 }],
        });
        result.ShouldHaveValidationErrorFor(x => x.Assignments)
            .WithErrorMessage("Duplicate userId within same role is not allowed.");
    }

    [Fact]
    public void Assignment_with_invalid_userId_fails()
    {
        var result = _validator.TestValidate(new ActivityRoleInput
        {
            RoleName = "Test",
            Headcount = 2,
            Assignments = [new() { UserId = 0 }],
        });
        result.ShouldHaveValidationErrorFor("Assignments[0].UserId");
    }
}
