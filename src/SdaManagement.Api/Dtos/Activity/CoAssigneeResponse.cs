namespace SdaManagement.Api.Dtos.Activity;

public class CoAssigneeResponse
{
    public int UserId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string? AvatarUrl { get; init; }
    public bool IsGuest { get; init; }
}
