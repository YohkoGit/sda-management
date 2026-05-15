using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Storage;

namespace SdaManagement.Api.Services;

public class AvatarService(
    AppDbContext db,
    IBlobStore blobStore,
    IConfiguration configuration) : IAvatarService
{
    private readonly int _maxDimension = configuration.GetValue("AvatarStorage:MaxDimension", 256);

    private static string Key(int userId) => $"avatars/{userId}.webp";

    public async Task SaveAvatarAsync(int userId, Stream imageStream, CancellationToken cancellationToken = default)
    {
        // Buffer the normalized image so the blob store gets a forward-readable stream
        // (R2/S3 require Position=0 at upload; ImageSharp's output stream isn't seekable).
        await using var normalized = new MemoryStream();
        await ImageProcessor.NormalizeToWebpAsync(
            imageStream, normalized, _maxDimension, cancellationToken: cancellationToken);
        normalized.Position = 0;

        await blobStore.PutAsync(Key(userId), normalized, "image/webp", cancellationToken);

        // Bumping the version is what invalidates cached avatar URLs on the client side
        // (every URL embeds the version as a cache-bust query parameter).
        await db.Users
            .Where(u => u.Id == userId)
            .ExecuteUpdateAsync(
                s => s.SetProperty(u => u.AvatarVersion, u => u.AvatarVersion + 1),
                cancellationToken);
    }

    public async Task<AvatarReadResult?> GetAvatarAsync(int userId, CancellationToken cancellationToken = default)
    {
        var version = await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.AvatarVersion)
            .FirstOrDefaultAsync(cancellationToken);

        if (version == 0)
            return null;

        var blob = await blobStore.GetAsync(Key(userId), cancellationToken);
        if (blob is null)
            return null;

        return new AvatarReadResult(blob.Content, version);
    }

    public async Task<bool> HasAvatarAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.AvatarVersion)
            .FirstOrDefaultAsync(cancellationToken) > 0;
    }

    public string? GetAvatarUrl(int userId, int avatarVersion)
        => avatarVersion == 0 ? null : $"/api/avatars/{userId}?v={avatarVersion}";
}
