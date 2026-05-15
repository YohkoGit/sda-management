using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Shouldly;
using SdaManagement.Api.Services;
using SixLabors.ImageSharp.Formats.Png;

namespace SdaManagement.Api.UnitTests.Services;

/// <summary>
/// Validates that GetAvatarUrl memoizes filesystem lookups so list-projection
/// callers (GetUsersAsync, GetAssignableOfficersAsync) don't pay N syscalls per request.
/// </summary>
public class AvatarServiceTests : IDisposable
{
    private readonly string _avatarDir;
    private readonly IConfiguration _config;
    private readonly MemoryCache _cache;

    public AvatarServiceTests()
    {
        // Isolated temp dir per test class to avoid cross-test pollution.
        _avatarDir = Path.Combine(Path.GetTempPath(), $"sdac-avatar-tests-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_avatarDir);

        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AvatarStorage:Path"] = _avatarDir,
            })
            .Build();

        _cache = new MemoryCache(new MemoryCacheOptions());
    }

    public void Dispose()
    {
        _cache.Dispose();
        if (Directory.Exists(_avatarDir))
            Directory.Delete(_avatarDir, recursive: true);
    }

    [Fact]
    public void GetAvatarUrl_MissingFile_ReturnsNull()
    {
        var sut = new AvatarService(_config, _cache);

        var url = sut.GetAvatarUrl(42);

        url.ShouldBeNull();
    }

    [Fact]
    public void GetAvatarUrl_ExistingFile_ReturnsVersionedUrl()
    {
        File.WriteAllText(Path.Combine(_avatarDir, "7.webp"), "fake-webp-bytes");
        var sut = new AvatarService(_config, _cache);

        var url = sut.GetAvatarUrl(7);

        url.ShouldNotBeNull();
        url.ShouldStartWith("/api/avatars/7?v=");
    }

    [Fact]
    public void GetAvatarUrl_CacheHit_DoesNotPerformSecondFilesystemCall()
    {
        // Arrange: create the avatar, prime the cache with the first call.
        var filePath = Path.Combine(_avatarDir, "13.webp");
        File.WriteAllText(filePath, "v1");
        var sut = new AvatarService(_config, _cache);

        var first = sut.GetAvatarUrl(13);
        first.ShouldNotBeNull();

        // Act: delete the file. If GetAvatarUrl re-checked the filesystem, it would
        // now return null. Cache hit means the prior URL is returned unchanged.
        File.Delete(filePath);
        var second = sut.GetAvatarUrl(13);

        // Assert: second call served from cache (proves File.Exists was skipped).
        second.ShouldBe(first);
    }

    [Fact]
    public void GetAvatarUrl_CacheMiss_AlsoMemoizedSoSecondCallSkipsFilesystem()
    {
        // Arrange: no file on disk. First call returns null AND caches that miss.
        var sut = new AvatarService(_config, _cache);
        sut.GetAvatarUrl(99).ShouldBeNull();

        // Act: create the file after the miss was cached. Second call should still
        // return null because the cache entry is held — proving the second call
        // didn't hit the filesystem (which would otherwise see the new file).
        File.WriteAllText(Path.Combine(_avatarDir, "99.webp"), "bytes");
        var second = sut.GetAvatarUrl(99);

        // Assert: cached null served, no fresh File.Exists call.
        second.ShouldBeNull();
    }

    [Fact]
    public async Task SaveAvatarAsync_InvalidatesCachedUrl()
    {
        // Arrange: prime the cache with a "missing" entry for user 21.
        var sut = new AvatarService(_config, _cache);
        sut.GetAvatarUrl(21).ShouldBeNull();

        // Act: save a real avatar (uses ImageSharp). This must invalidate the cache.
        using var img = new SixLabors.ImageSharp.Image<SixLabors.ImageSharp.PixelFormats.Rgba32>(8, 8);
        using var ms = new MemoryStream();
        await img.SaveAsync(ms, new PngEncoder());
        ms.Position = 0;
        await sut.SaveAvatarAsync(21, ms);

        // Assert: subsequent GetAvatarUrl returns the new URL (cache was invalidated).
        var url = sut.GetAvatarUrl(21);
        url.ShouldNotBeNull();
        url.ShouldStartWith("/api/avatars/21?v=");
    }
}
