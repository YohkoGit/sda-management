using FluentValidation;
using SdaManagement.Api.Dtos.Auth;

namespace SdaManagement.Api.Validators;

public class ConfirmPasswordResetRequestValidator : AbstractValidator<ConfirmPasswordResetRequest>
{
    public ConfirmPasswordResetRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty()
            .MaximumLength(128)
            .MustNotContainControlCharacters();

        RuleFor(x => x.NewPassword)
            .Cascade(CascadeMode.Stop)
            .NotEmpty()
            .MinimumLength(8)
            .MaximumLength(256)
            .MustNotContainControlCharacters()
            .Must(p => p.Any(char.IsUpper))
                .WithMessage("Password must contain at least one uppercase letter.")
            .Must(p => p.Any(char.IsLower))
                .WithMessage("Password must contain at least one lowercase letter.")
            .Must(p => p.Any(char.IsDigit))
                .WithMessage("Password must contain at least one digit.");
    }
}
