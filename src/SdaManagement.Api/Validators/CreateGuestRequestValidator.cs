using FluentValidation;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.Validators;

public class CreateGuestRequestValidator : AbstractValidator<CreateGuestRequest>
{
    public CreateGuestRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(100)
            .MustNotContainControlCharacters();

        RuleFor(x => x.Phone)
            .MaximumLength(20)
            .MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.Phone));
    }
}
