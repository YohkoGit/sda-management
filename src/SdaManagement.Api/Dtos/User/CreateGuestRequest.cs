namespace SdaManagement.Api.Dtos.User;

public record CreateGuestRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Phone { get; init; }
}
