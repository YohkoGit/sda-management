using SdaManagement.Api.Dtos.Setup;

namespace SdaManagement.Api.Services;

public interface ISetupProgressService
{
    Task<SetupProgressResponse> GetSetupProgressAsync(CancellationToken cancellationToken);
}
