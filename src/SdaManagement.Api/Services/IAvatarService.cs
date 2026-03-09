namespace SdaManagement.Api.Services;

public interface IAvatarService
{
    Task SaveAvatarAsync(int userId, Stream imageStream);
    Task<(Stream Stream, DateTime LastModifiedUtc)?> GetAvatarStreamAsync(int userId);
    bool HasAvatarFile(int userId);
    string? GetAvatarUrl(int userId);
}
