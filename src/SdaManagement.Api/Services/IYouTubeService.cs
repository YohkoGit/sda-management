using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public interface IYouTubeService
{
    Task<PublicLiveStatusResponse> GetLiveStatusAsync();
}
