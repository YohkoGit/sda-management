namespace SdaManagement.Api.Dtos.Config;

public class PublicChurchConfigResponse
{
    public string ChurchName { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string? PhoneNumber { get; init; }
    public string? WelcomeMessage { get; init; }
    public string? YouTubeChannelUrl { get; init; }
}
