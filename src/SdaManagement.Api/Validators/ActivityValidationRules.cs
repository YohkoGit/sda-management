using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

internal static class ActivityValidationRules
{
    internal static void Apply<T>(AbstractValidator<T> validator)
        where T : IActivityRequest
    {
        validator.RuleFor(x => x.Title)
            .NotEmpty().MaximumLength(150).MustNotContainControlCharacters();
        validator.RuleFor(x => x.Description)
            .MaximumLength(1000).MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.Description));
        validator.RuleFor(x => x.Date)
            .NotEmpty();
        validator.RuleFor(x => x.StartTime)
            .NotEmpty();
        validator.RuleFor(x => x.EndTime)
            .NotEmpty()
            .Must((req, endTime) => endTime > req.StartTime)
            .WithMessage("End time must be after start time.");
        validator.RuleFor(x => x.DepartmentId)
            .GreaterThan(0);
        validator.RuleFor(x => x.Visibility)
            .NotEmpty()
            .Must(v => v is "public" or "authenticated")
            .WithMessage("Visibility must be 'public' or 'authenticated'.");
    }
}
