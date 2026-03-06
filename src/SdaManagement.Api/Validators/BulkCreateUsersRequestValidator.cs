using FluentValidation;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.Validators;

public class BulkCreateUsersRequestValidator : AbstractValidator<BulkCreateUsersRequest>
{
    public BulkCreateUsersRequestValidator()
    {
        RuleFor(x => x.Users)
            .Cascade(CascadeMode.Stop)
            .NotNull()
            .Must(u => u.Count > 0).WithMessage("At least one user is required.")
            .Must(u => u.Count <= 30).WithMessage("Maximum 30 users per batch.");

        RuleFor(x => x.Users)
            .Must(users => users.Select(u => u.Email.ToLowerInvariant()).Distinct().Count() == users.Count)
            .WithMessage("Duplicate emails found within the batch.")
            .When(x => x.Users is { Count: > 0 });

        RuleForEach(x => x.Users).SetValidator(new CreateUserRequestValidator());
    }
}
