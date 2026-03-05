using FluentValidation;
using SdaManagement.Api.Dtos.ActivityTemplate;

namespace SdaManagement.Api.Validators;

public class TemplateRoleRequestValidator : AbstractValidator<TemplateRoleRequest>
{
    public TemplateRoleRequestValidator()
    {
        RuleFor(x => x.RoleName)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        RuleFor(x => x.DefaultHeadcount)
            .InclusiveBetween(1, 99);
    }
}
