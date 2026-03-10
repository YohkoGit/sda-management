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

        RuleFor(x => x.Assignments)
            .Must((role, assignments) => assignments == null || assignments.Count <= role.Headcount)
            .When(x => x.Assignments is not null)
            .WithMessage("Number of assignments cannot exceed headcount.");

        RuleFor(x => x.Assignments)
            .Must(assignments => assignments == null ||
                assignments.Select(a => a.UserId).Distinct().Count() == assignments.Count)
            .When(x => x.Assignments is { Count: > 0 })
            .WithMessage("Duplicate userId within same role is not allowed.");

        RuleForEach(x => x.Assignments)
            .SetValidator(new RoleAssignmentInputValidator())
            .When(x => x.Assignments is not null);
    }
}
