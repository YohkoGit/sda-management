namespace SdaManagement.Api.Dtos.Config;

public class ChurchConfigResponse
{
    public int Id { get; init; }
    public string ChurchName { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string? YouTubeChannelUrl { get; init; }
    public string? PhoneNumber { get; init; }
    public string? WelcomeMessage { get; init; }
    public string DefaultLocale { get; init; } = string.Empty;
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
