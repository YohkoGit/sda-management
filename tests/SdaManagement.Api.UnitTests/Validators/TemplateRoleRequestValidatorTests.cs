using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.ActivityTemplate;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class TemplateRoleRequestValidatorTests
{
    private readonly TemplateRoleRequestValidator _validator = new();

    [Fact]
    public void Valid_role_passes()
    {
        var result = _validator.TestValidate(new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 1 });
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_role_name_fails()
    {
        var result = _validator.TestValidate(new TemplateRoleRequest { RoleName = "", DefaultHeadcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.RoleName);
    }

    [Fact]
    public void Role_name_exceeding_100_chars_fails()
    {
        var result = _validator.TestValidate(new TemplateRoleRequest { RoleName = new string('A', 101), DefaultHeadcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.RoleName);
    }

    [Fact]
    public void Role_name_with_control_characters_fails()
    {
        var result = _validator.TestValidate(new TemplateRoleRequest { RoleName = "Role\u0007Name", DefaultHeadcount = 1 });
        result.ShouldHaveValidationErrorFor(x => x.RoleName);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(50)]
    [InlineData(99)]
    public void Valid_headcount_passes(int headcount)
    {
        var result = _validator.TestValidate(new TemplateRoleRequest { RoleName = "Role", DefaultHeadcount = headcount });
        result.ShouldNotHaveValidationErrorFor(x => x.DefaultHeadcount);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(100)]
    [InlineData(999)]
    public void Invalid_headcount_fails(int headcount)
    {
        var result = _validator.TestValidate(new TemplateRoleRequest { RoleName = "Role", DefaultHeadcount = headcount });
        result.ShouldHaveValidationErrorFor(x => x.DefaultHeadcount);
    }
}
