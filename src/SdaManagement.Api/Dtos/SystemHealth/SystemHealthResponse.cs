namespace SdaManagement.Api.Dtos.SystemHealth;

public class SystemHealthResponse
{
    public string Status { get; init; } = string.Empty;
    public List<HealthCheckItem> Checks { get; init; } = [];
    public string Version { get; init; } = string.Empty;
    public long UptimeSeconds { get; init; }
    public string Environment { get; init; } = string.Empty;
    public SetupStatusResponse SetupStatus { get; init; } = new();
}
