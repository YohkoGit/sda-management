using FluentValidation;
using SdaManagement.Api.Dtos.Auth;

namespace SdaManagement.Api.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(255)
            .MustNotContainControlCharacters();

        RuleFor(x => x.Password)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(256)
            .MustNotContainControlCharacters();
    }
}
