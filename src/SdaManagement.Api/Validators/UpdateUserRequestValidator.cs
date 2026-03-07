using FluentValidation;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.Validators;

public class UpdateUserRequestValidator : AbstractValidator<UpdateUserRequest>
{
    private static readonly string[] AllowedRoles = ["Viewer", "Admin", "Owner"];

    public UpdateUserRequestValidator()
    {
        RuleFor(x => x.FirstName)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        RuleFor(x => x.LastName)
            .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        RuleFor(x => x.Role)
            .NotEmpty()
            .Must(r => AllowedRoles.Any(a => a.Equals(r, StringComparison.OrdinalIgnoreCase)))
            .WithMessage("Role must be one of: Viewer, Admin, Owner.");
        RuleFor(x => x.DepartmentIds)
            .NotNull()
            .Must(ids => ids.Count > 0).WithMessage("At least one department must be assigned.");
        RuleForEach(x => x.DepartmentIds)
            .GreaterThan(0).WithMessage("Department ID must be greater than 0.");
    }
}
