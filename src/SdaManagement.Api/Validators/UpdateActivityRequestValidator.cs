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
    }
}
