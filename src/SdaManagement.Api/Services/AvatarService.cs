using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace SdaManagement.Api.Services;

public class AvatarService(IConfiguration configuration) : IAvatarService
{
    private readonly string _avatarPath = configuration["AvatarStorage:Path"] ?? "data/avatars";
    private readonly int _maxDimension = configuration.GetValue("AvatarStorage:MaxDimension", 256);

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
        var filePath = Path.Combine(_avatarPath, $"{userId}.webp");
        if (!File.Exists(filePath))
            return null;

        var ticks = File.GetLastWriteTimeUtc(filePath).Ticks;
        return $"/api/avatars/{userId}?v={ticks}";
    }
}
