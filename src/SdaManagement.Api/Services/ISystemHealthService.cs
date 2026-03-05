using SdaManagement.Api.Dtos.SystemHealth;

namespace SdaManagement.Api.Services;

public interface ISystemHealthService
{
    Task<SystemHealthResponse> GetSystemHealthAsync(CancellationToken cancellationToken);
}
