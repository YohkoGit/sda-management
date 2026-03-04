using FluentValidation;
using SdaManagement.Api.Dtos.Department;

namespace SdaManagement.Api.Validators;

public class UpdateSubMinistryRequestValidator : AbstractValidator<UpdateSubMinistryRequest>
{
    public UpdateSubMinistryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
    }
}
