using FluentValidation;
using SdaManagement.Api.Dtos.Department;

namespace SdaManagement.Api.Validators;

public class CreateSubMinistryRequestValidator : AbstractValidator<CreateSubMinistryRequest>
{
    public CreateSubMinistryRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
    }
}
