namespace SdaManagement.Api.Dtos.Public;

public record PublicLiveStatusResponse(
    bool IsLive,
    string? LiveVideoId,
    string? LiveTitle);
