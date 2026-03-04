namespace SdaManagement.Api.Services;

public interface ISanitizationService
{
    string Sanitize(string? input);
    string? SanitizeNullable(string? input);
}
