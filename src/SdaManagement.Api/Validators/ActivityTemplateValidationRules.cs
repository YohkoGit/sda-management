using FluentValidation;
using SdaManagement.Api.Dtos.ActivityTemplate;

namespace SdaManagement.Api.Validators;

internal static class ActivityTemplateValidationRules
{
    internal static void Apply<T>(AbstractValidator<T> validator)
        where T : IActivityTemplateRequest
    {
        validator.RuleFor(x => x.Name)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        validator.RuleFor(x => x.Description)
            .MaximumLength(500).MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.Description));
        validator.RuleFor(x => x.Roles)
            .NotEmpty().WithMessage("At least one role is required.")
            .Must(roles => roles
                .Select(r => r.RoleName)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Count() == roles.Count)
            .WithMessage("Role names must be unique within a template.");
        validator.RuleForEach(x => x.Roles)
            .SetValidator(new TemplateRoleRequestValidator());
    }
}
