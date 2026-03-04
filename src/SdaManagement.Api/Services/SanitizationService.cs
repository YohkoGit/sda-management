using Ganss.Xss;

namespace SdaManagement.Api.Services;

public class SanitizationService : ISanitizationService
{
    private readonly HtmlSanitizer _sanitizer;

    public SanitizationService()
    {
        _sanitizer = new HtmlSanitizer();
        _sanitizer.AllowedTags.Clear();
        _sanitizer.AllowedAttributes.Clear();
        _sanitizer.AllowedSchemes.Clear();
    }

    public string Sanitize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;
        return _sanitizer.Sanitize(input).Trim();
    }

    public string? SanitizeNullable(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return null;
        var sanitized = _sanitizer.Sanitize(input).Trim();
        return string.IsNullOrEmpty(sanitized) ? null : sanitized;
    }
}
