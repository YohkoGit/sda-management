using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public interface IPublicService
{
    Task<PublicNextActivityResponse?> GetNextActivityAsync();
}
