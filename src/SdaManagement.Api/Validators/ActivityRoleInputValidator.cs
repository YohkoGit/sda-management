using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

public class ActivityRoleInputValidator : AbstractValidator<ActivityRoleInput>
{
    public ActivityRoleInputValidator()
    {
        RuleFor(x => x.RoleName)
            .NotEmpty()
            .MaximumLength(100)
            .MustNotContainControlCharacters();
        RuleFor(x => x.Headcount)
            .InclusiveBetween(1, 99)
            .WithMessage("Headcount must be between 1 and 99.");
        RuleFor(x => x.Id)
            .GreaterThan(0)
            .When(x => x.Id.HasValue)
            .WithMessage("Role ID must be positive when provided.");
    }
}
