namespace SdaManagement.Api.Services;

public interface IAvatarService
{
    Task SaveAvatarAsync(int userId, Stream imageStream, CancellationToken cancellationToken = default);

    Task<AvatarReadResult?> GetAvatarAsync(int userId, CancellationToken cancellationToken = default);

    Task<bool> HasAvatarAsync(int userId, CancellationToken cancellationToken = default);

    string? GetAvatarUrl(int userId, int avatarVersion);
}

public sealed record AvatarReadResult(Stream Content, int Version);
