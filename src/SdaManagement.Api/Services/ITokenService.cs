namespace SdaManagement.Api.Services;

using SdaManagement.Api.Data.Entities;

public interface ITokenService
{
    Task<(string AccessToken, string RefreshToken)> GenerateTokenPairAsync(User user);
    Task<(string AccessToken, string RefreshToken)?> RefreshTokensAsync(string refreshTokenValue);
    Task RevokeRefreshTokenAsync(string refreshTokenValue);
    void SetTokenCookies(HttpContext context, string accessToken, string refreshToken);
    void ClearTokenCookies(HttpContext context);
}
