using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.ActivityTemplate;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class CreateActivityTemplateRequestValidatorTests
{
    private readonly CreateActivityTemplateRequestValidator _validator = new();

    private static CreateActivityTemplateRequest ValidRequest() => new()
    {
        Name = "Culte du Sabbat",
        Description = "Service principal du samedi",
        Roles = [new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 1 }]
    };

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_name_fails()
    {
        var request = ValidRequest() with { Name = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_exceeding_100_chars_fails()
    {
        var request = ValidRequest() with { Name = new string('A', 101) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Name_with_control_characters_fails()
    {
        var request = ValidRequest() with { Name = "Template\u0000Name" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Name);
    }

    [Fact]
    public void Description_exceeding_500_chars_fails()
    {
        var request = ValidRequest() with { Description = new string('A', 501) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public void Null_description_passes()
    {
        var request = ValidRequest() with { Description = null };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.Description);
    }

    [Fact]
    public void Empty_roles_fails()
    {
        var request = ValidRequest() with { Roles = [] };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Roles);
    }

    [Fact]
    public void Role_with_empty_name_fails()
    {
        var request = ValidRequest() with
        {
            Roles = [new TemplateRoleRequest { RoleName = "", DefaultHeadcount = 1 }]
        };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("RoleName"));
    }

    [Fact]
    public void Role_with_headcount_zero_fails()
    {
        var request = ValidRequest() with
        {
            Roles = [new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 0 }]
        };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("DefaultHeadcount"));
    }

    [Fact]
    public void Role_with_headcount_100_fails()
    {
        var request = ValidRequest() with
        {
            Roles = [new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 100 }]
        };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("DefaultHeadcount"));
    }

    [Fact]
    public void Multiple_valid_roles_pass()
    {
        var request = ValidRequest() with
        {
            Roles =
            [
                new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 1 },
                new TemplateRoleRequest { RoleName = "Ancien", DefaultHeadcount = 1 },
                new TemplateRoleRequest { RoleName = "Diacres", DefaultHeadcount = 2 }
            ]
        };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Duplicate_role_names_fails()
    {
        var request = ValidRequest() with
        {
            Roles =
            [
                new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 1 },
                new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 2 }
            ]
        };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Roles)
            .WithErrorMessage("Role names must be unique within a template.");
    }

    [Fact]
    public void Duplicate_role_names_case_insensitive_fails()
    {
        var request = ValidRequest() with
        {
            Roles =
            [
                new TemplateRoleRequest { RoleName = "Predicateur", DefaultHeadcount = 1 },
                new TemplateRoleRequest { RoleName = "predicateur", DefaultHeadcount = 2 }
            ]
        };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Roles);
    }
}
