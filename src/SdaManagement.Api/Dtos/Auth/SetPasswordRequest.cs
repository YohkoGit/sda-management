namespace SdaManagement.Api.Dtos.Auth;

public class SetPasswordRequest
{
    public string Email { get; init; } = string.Empty;
    public string NewPassword { get; init; } = string.Empty;
}
