using FluentValidation;
using SdaManagement.Api.Dtos.Auth;

namespace SdaManagement.Api.Validators;

public class RequestPasswordResetRequestValidator : AbstractValidator<RequestPasswordResetRequest>
{
    public RequestPasswordResetRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty()
            .EmailAddress()
            .MaximumLength(255)
            .MustNotContainControlCharacters();
    }
}
