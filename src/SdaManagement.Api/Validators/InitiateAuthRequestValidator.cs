using FluentValidation;
using SdaManagement.Api.Dtos.Auth;

namespace SdaManagement.Api.Validators;

public class InitiateAuthRequestValidator : AbstractValidator<InitiateAuthRequest>
{
    public InitiateAuthRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(255)
            .MustNotContainControlCharacters();
    }
}
