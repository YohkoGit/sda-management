namespace SdaManagement.Api.Dtos.User;

public class GuestCreatedResponse
{
    public int UserId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public bool IsGuest { get; init; }
}
