using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

public class CreateActivityRequestValidator : AbstractValidator<CreateActivityRequest>
{
    public CreateActivityRequestValidator()
    {
        ActivityValidationRules.Apply(this);
        RuleFor(x => x.TemplateId).GreaterThan(0).When(x => x.TemplateId.HasValue);
    }
}
