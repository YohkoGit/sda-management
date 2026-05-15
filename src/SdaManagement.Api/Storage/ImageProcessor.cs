using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace SdaManagement.Api.Storage;

public static class ImageProcessor
{
    public static async Task NormalizeToWebpAsync(
        Stream source,
        Stream destination,
        int maxDimension,
        int quality = 80,
        ResizeMode mode = ResizeMode.Max,
        CancellationToken cancellationToken = default)
    {
        using var image = await Image.LoadAsync(source, cancellationToken);

        image.Mutate(x => x.Resize(new ResizeOptions
        {
            Size = new Size(maxDimension, maxDimension),
            Mode = mode,
        }));

        await image.SaveAsWebpAsync(destination, new WebpEncoder { Quality = quality }, cancellationToken);
    }
}
