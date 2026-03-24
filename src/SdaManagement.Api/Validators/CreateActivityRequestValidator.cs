using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

public class CreateActivityRequestValidator : AbstractValidator<CreateActivityRequest>
{
    public CreateActivityRequestValidator()
    {
        ActivityValidationRules.Apply(this);
        RuleFor(x => x.TemplateId).GreaterThan(0).When(x => x.TemplateId.HasValue);

        RuleFor(x => x.Date)
            .Must(date =>
            {
                var quebecZone = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");
                var todayInQuebec = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, quebecZone));
                return date >= todayInQuebec;
            })
            .WithMessage("Date must be today or in the future.");

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
