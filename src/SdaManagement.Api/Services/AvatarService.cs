using Microsoft.Extensions.Caching.Memory;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace SdaManagement.Api.Services;

public class AvatarService(IConfiguration configuration, IMemoryCache cache) : IAvatarService
{
    private readonly string _avatarPath = configuration["AvatarStorage:Path"] ?? "data/avatars";
    private readonly int _maxDimension = configuration.GetValue("AvatarStorage:MaxDimension", 256);
    private static readonly TimeSpan CacheTtl = TimeSpan.FromSeconds(60);

    private static string CacheKey(int userId) => $"avatar-url:{userId}";

    public async Task SaveAvatarAsync(int userId, Stream imageStream)
    {
        Directory.CreateDirectory(_avatarPath);

        using var image = await Image.LoadAsync(imageStream);

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(_maxDimension, _maxDimension),
            Mode = ResizeMode.Max,
        }));

        var filePath = Path.Combine(_avatarPath, $"{userId}.webp");
        await image.SaveAsWebpAsync(filePath, new WebpEncoder { Quality = 80 });

        // Invalidate the cached URL — file mtime ticks change on save, so the cached
        // versioned URL is stale and would point to the previous bytes via CDN/browser cache.
        cache.Remove(CacheKey(userId));
    }

    public Task<(Stream Stream, DateTime LastModifiedUtc)?> GetAvatarStreamAsync(int userId)
    {
        var filePath = Path.Combine(_avatarPath, $"{userId}.webp");
        if (!File.Exists(filePath))
            return Task.FromResult<(Stream, DateTime)?>(null);

        var lastModified = File.GetLastWriteTimeUtc(filePath);
        var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
        return Task.FromResult<(Stream, DateTime)?>((stream, lastModified));
    }

    public bool HasAvatarFile(int userId)
    {
        var filePath = Path.Combine(_avatarPath, $"{userId}.webp");
        return File.Exists(filePath);
    }

    public string? GetAvatarUrl(int userId)
    {
        // List-projection callers (GetUsersAsync, GetAssignableOfficersAsync) invoke this
        // once per row — cache for 60s to collapse N filesystem syscalls per request.
        // Sentinel: store an empty string to represent "no file exists" so we cache misses
        // too (otherwise we'd hit the filesystem on every list refresh of nonexistent avatars).
        return cache.GetOrCreate(CacheKey(userId), entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheTtl;

            var filePath = Path.Combine(_avatarPath, $"{userId}.webp");
            if (!File.Exists(filePath))
                return null;

            var ticks = File.GetLastWriteTimeUtc(filePath).Ticks;
            return $"/api/avatars/{userId}?v={ticks}";
        });
    }
}
