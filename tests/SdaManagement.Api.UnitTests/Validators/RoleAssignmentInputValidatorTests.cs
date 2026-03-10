using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.UnitTests.Validators;

public class RoleAssignmentInputValidatorTests
{
    private readonly RoleAssignmentInputValidator _validator = new();

    [Fact]
    public void Valid_userId_passes()
    {
        var result = _validator.TestValidate(new RoleAssignmentInput { UserId = 1 });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void UserId_zero_fails()
    {
        var result = _validator.TestValidate(new RoleAssignmentInput { UserId = 0 });
        result.ShouldHaveValidationErrorFor(x => x.UserId);
    }

    [Fact]
    public void UserId_negative_fails()
    {
        var result = _validator.TestValidate(new RoleAssignmentInput { UserId = -1 });
        result.ShouldHaveValidationErrorFor(x => x.UserId);
    }

    [Fact]
    public void UserId_large_positive_passes()
    {
        var result = _validator.TestValidate(new RoleAssignmentInput { UserId = 99999 });
        result.ShouldNotHaveAnyValidationErrors();
    }
}
