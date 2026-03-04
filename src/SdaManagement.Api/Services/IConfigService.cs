using SdaManagement.Api.Dtos.Config;

namespace SdaManagement.Api.Services;

public interface IConfigService
{
    Task<PublicChurchConfigResponse?> GetPublicConfigAsync();
    Task<ChurchConfigResponse?> GetConfigAsync();
    Task<ChurchConfigResponse> UpsertConfigAsync(UpdateChurchConfigRequest request);
}
