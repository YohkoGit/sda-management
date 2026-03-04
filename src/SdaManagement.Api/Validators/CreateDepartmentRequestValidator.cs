using FluentValidation;
using SdaManagement.Api.Dtos.Department;

namespace SdaManagement.Api.Validators;

public class CreateDepartmentRequestValidator : AbstractValidator<CreateDepartmentRequest>
{
    public CreateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        RuleFor(x => x.Abbreviation)
            .MaximumLength(10).MustNotContainControlCharacters()
            .Matches("^[A-Za-z0-9]+$").WithMessage("Abbreviation must contain only letters and numbers.")
            .When(x => !string.IsNullOrEmpty(x.Abbreviation));
        RuleFor(x => x.Color)
            .NotEmpty().MaximumLength(9)
            .Matches("^#[0-9A-Fa-f]{6}$").WithMessage("Color must be a valid hex color (e.g., #4F46E5).");
        RuleFor(x => x.Description)
            .MaximumLength(500).MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.Description));
        RuleForEach(x => x.SubMinistryNames)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters()
            .When(x => x.SubMinistryNames is { Count: > 0 });
    }
}
