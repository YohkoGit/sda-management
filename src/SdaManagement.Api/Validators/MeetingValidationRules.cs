using FluentValidation;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.Validators;

internal static class MeetingValidationRules
{
    internal static void Apply<T>(AbstractValidator<T> validator)
        where T : IActivityRequest, IMeetingRequest
    {
        // When IsMeeting == true: common meeting rules
        validator.When(x => x.IsMeeting == true, () =>
        {
            validator.RuleFor(x => x.MeetingType)
                .NotEmpty().WithMessage("MeetingType is required for meetings.")
                .Must(mt => mt is "zoom" or "physical")
                .WithMessage("MeetingType must be 'zoom' or 'physical'.");

            validator.RuleFor(x => x.Visibility)
                .Must(v => v == "authenticated")
                .WithMessage("Meetings must have visibility 'authenticated'.");

            validator.RuleFor(x => x.Roles)
                .Must(roles => roles is null or { Count: 0 })
                .WithMessage("Meetings cannot have roles.");
        });

        // Zoom meeting — explicit AND to avoid nested When() inheritance issue
        validator.When(x => x.IsMeeting == true && x.MeetingType == "zoom", () =>
        {
            validator.RuleFor(x => x.ZoomLink)
                .NotEmpty().WithMessage("ZoomLink is required for Zoom meetings.")
                .MaximumLength(500)
                .Must(link => link != null && link.StartsWith("https://"))
                .WithMessage("ZoomLink must be a valid HTTPS URL.");
            validator.RuleFor(x => x.LocationName)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("LocationName must be null for Zoom meetings.");
            validator.RuleFor(x => x.LocationAddress)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("LocationAddress must be null for Zoom meetings.");
        });

        // Physical meeting — explicit AND
        validator.When(x => x.IsMeeting == true && x.MeetingType == "physical", () =>
        {
            validator.RuleFor(x => x.LocationName)
                .NotEmpty().WithMessage("LocationName is required for physical meetings.")
                .MaximumLength(150);
            validator.RuleFor(x => x.LocationAddress)
                .MaximumLength(300);
            validator.RuleFor(x => x.ZoomLink)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("ZoomLink must be null for physical meetings.");
        });

        // When IsMeeting == false or null
        validator.When(x => x.IsMeeting != true, () =>
        {
            validator.RuleFor(x => x.MeetingType)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("MeetingType must be null for non-meeting activities.");
            validator.RuleFor(x => x.ZoomLink)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("ZoomLink must be null for non-meeting activities.");
            validator.RuleFor(x => x.LocationName)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("LocationName must be null for non-meeting activities.");
            validator.RuleFor(x => x.LocationAddress)
                .Must(v => string.IsNullOrEmpty(v))
                .WithMessage("LocationAddress must be null for non-meeting activities.");
        });
    }
}
