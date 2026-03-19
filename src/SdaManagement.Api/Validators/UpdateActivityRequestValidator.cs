using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

public class UpdateActivityRequestValidator : AbstractValidator<UpdateActivityRequest>
{
    public UpdateActivityRequestValidator()
    {
        ActivityValidationRules.Apply(this);
        RuleFor(x => x.ConcurrencyToken)
            .GreaterThan(0u).WithMessage("Concurrency token is required.");

        When(x => x.Roles != null, () =>
        {
            RuleFor(x => x.Roles)
                .Must(roles => roles!.Count <= 20)
                .WithMessage("Maximum 20 roles per activity.");
            RuleFor(x => x.Roles)
                .Must(roles => roles!.Select(r => r.RoleName.Trim().ToLowerInvariant()).Distinct().Count() == roles!.Count)
                .WithMessage("Role names must be unique within an activity.");
            RuleForEach(x => x.Roles).SetValidator(new ActivityRoleInputValidator());
        });

        MeetingValidationRules.Apply(this);
    }
}
