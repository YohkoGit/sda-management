namespace SdaManagement.Api.Data.Entities;

public class ChurchConfig
{
    public int Id { get; set; }
    public string ChurchName { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? YouTubeChannelUrl { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WelcomeMessage { get; set; }
    public string DefaultLocale { get; set; } = "fr";
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
