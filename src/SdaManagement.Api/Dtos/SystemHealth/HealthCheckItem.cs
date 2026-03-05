namespace SdaManagement.Api.Dtos.SystemHealth;

public class HealthCheckItem
{
    public string Name { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? Description { get; init; }
    public string Duration { get; init; } = string.Empty;
}
