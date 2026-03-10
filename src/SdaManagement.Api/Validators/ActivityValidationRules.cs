using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

internal static class ActivityValidationRules
{
    private static readonly string[] AllowedSpecialTypes =
    [
        "sainte-cene", "week-of-prayer", "camp-meeting",
        "youth-day", "family-day", "womens-day", "evangelism"
    ];

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
        validator.RuleFor(x => x.SpecialType)
            .MaximumLength(50)
            .Must(st => string.IsNullOrEmpty(st) || AllowedSpecialTypes.Contains(st))
            .WithMessage($"SpecialType must be one of: {string.Join(", ", AllowedSpecialTypes)}")
            .MustNotContainControlCharacters()
            .When(x => !string.IsNullOrWhiteSpace(x.SpecialType));
    }
}
