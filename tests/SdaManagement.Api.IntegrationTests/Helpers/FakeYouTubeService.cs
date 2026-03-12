using SdaManagement.Api.Dtos.Public;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.IntegrationTests.Helpers;

public class FakeYouTubeService(bool isLive = false, string? videoId = null, string? title = null) : IYouTubeService
{
    public Task<PublicLiveStatusResponse> GetLiveStatusAsync()
    {
        return Task.FromResult(new PublicLiveStatusResponse(isLive, videoId, title));
    }
}
