using FluentValidation;
using SdaManagement.Api.Dtos.ActivityTemplate;

namespace SdaManagement.Api.Validators;

public class CreateActivityTemplateRequestValidator : AbstractValidator<CreateActivityTemplateRequest>
{
    public CreateActivityTemplateRequestValidator()
    {
        ActivityTemplateValidationRules.Apply(this);
    }
}
