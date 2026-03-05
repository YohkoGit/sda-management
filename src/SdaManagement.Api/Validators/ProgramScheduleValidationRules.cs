using FluentValidation;
using SdaManagement.Api.Dtos.ProgramSchedule;

namespace SdaManagement.Api.Validators;

internal static class ProgramScheduleValidationRules
{
    internal static void Apply<T>(AbstractValidator<T> validator)
        where T : IProgramScheduleRequest
    {
        validator.RuleFor(x => x.Title)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();

        validator.RuleFor(x => x.DayOfWeek)
            .InclusiveBetween(0, 6);

        validator.RuleFor(x => x.StartTime)
            .NotEmpty()
            .Matches(@"^\d{2}:\d{2}$")
            .Must(BeValidTime).WithMessage("Start time must be a valid time (HH:mm).");

        validator.RuleFor(x => x.EndTime)
            .NotEmpty()
            .Matches(@"^\d{2}:\d{2}$")
            .Must(BeValidTime).WithMessage("End time must be a valid time (HH:mm).");

        validator.RuleFor(x => x)
            .Must(x => TimeOnly.TryParseExact(x.EndTime, "HH:mm", out var end)
                     && TimeOnly.TryParseExact(x.StartTime, "HH:mm", out var start)
                     && end > start)
            .WithMessage("End time must be after start time.")
            .WithName("EndTime");

        validator.RuleFor(x => x.HostName!)
            .MaximumLength(100).MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.HostName));

        validator.RuleFor(x => x.DepartmentId!.Value)
            .GreaterThan(0)
            .When(x => x.DepartmentId.HasValue);
    }

    private static bool BeValidTime(string? time)
        => time is not null && TimeOnly.TryParseExact(time, "HH:mm", out _);
}
