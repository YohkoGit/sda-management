using FluentValidation;

namespace SdaManagement.Api.Validators;

public static class ValidationExtensions
{
    public static IRuleBuilderOptions<T, string> MustNotContainControlCharacters<T>(
        this IRuleBuilder<T, string> ruleBuilder)
    {
        return ruleBuilder.Must(value =>
            string.IsNullOrEmpty(value) || !value.Any(char.IsControl))
            .WithMessage("{PropertyName} must not contain control characters.");
    }
}
