using FluentValidation;
using SdaManagement.Api.Dtos.ActivityTemplate;

namespace SdaManagement.Api.Validators;

public class UpdateActivityTemplateRequestValidator : AbstractValidator<UpdateActivityTemplateRequest>
{
    public UpdateActivityTemplateRequestValidator()
    {
        ActivityTemplateValidationRules.Apply(this);
    }
}
