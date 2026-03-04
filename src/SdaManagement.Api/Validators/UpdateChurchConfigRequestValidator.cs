using FluentValidation;
using SdaManagement.Api.Dtos.Config;

namespace SdaManagement.Api.Validators;

public class UpdateChurchConfigRequestValidator : AbstractValidator<UpdateChurchConfigRequest>
{
    public UpdateChurchConfigRequestValidator()
    {
        RuleFor(x => x.ChurchName)
            .NotEmpty()
            .MaximumLength(150)
            .MustNotContainControlCharacters();

        RuleFor(x => x.Address)
            .NotEmpty()
            .MaximumLength(300)
            .MustNotContainControlCharacters();

        RuleFor(x => x.YouTubeChannelUrl)
            .MaximumLength(500)
            .Must(url => Uri.TryCreate(url, UriKind.Absolute, out _))
            .WithMessage("YouTube URL must be a valid absolute URL.")
            .When(x => !string.IsNullOrEmpty(x.YouTubeChannelUrl));

        RuleFor(x => x.PhoneNumber)
            .MaximumLength(30)
            .MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.PhoneNumber));

        RuleFor(x => x.WelcomeMessage)
            .MaximumLength(1000)
            .MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.WelcomeMessage));

        RuleFor(x => x.DefaultLocale)
            .NotEmpty()
            .Must(locale => locale is "fr" or "en")
            .WithMessage("Default locale must be 'fr' or 'en'.");
    }
}
