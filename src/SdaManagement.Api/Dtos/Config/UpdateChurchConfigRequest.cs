namespace SdaManagement.Api.Dtos.Config;

public record UpdateChurchConfigRequest
{
    public string ChurchName { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string? YouTubeChannelUrl { get; init; }
    public string? PhoneNumber { get; init; }
    public string? WelcomeMessage { get; init; }
    public string DefaultLocale { get; init; } = "fr";
}
