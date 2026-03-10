using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

public class RoleAssignmentInputValidator : AbstractValidator<RoleAssignmentInput>
{
    public RoleAssignmentInputValidator()
    {
        RuleFor(x => x.UserId)
            .GreaterThan(0)
            .WithMessage("UserId must be a positive integer.");
    }
}
