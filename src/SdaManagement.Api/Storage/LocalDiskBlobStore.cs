using System.Globalization;

namespace SdaManagement.Api.Storage;

public sealed class LocalDiskBlobStore(IConfiguration configuration) : IBlobStore
{
    private readonly string _basePath = configuration["BlobStorage:LocalDisk:BasePath"] ?? "data/blobs";

    public async Task PutAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        var path = ResolvePath(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);

        await using var file = File.Create(path);
        await content.CopyToAsync(file, cancellationToken);
    }

    public Task<BlobReadResult?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        var path = ResolvePath(key);
        if (!File.Exists(path))
            return Task.FromResult<BlobReadResult?>(null);

        var lastModified = File.GetLastWriteTimeUtc(path);
        var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        var etag = $"\"{lastModified.Ticks.ToString(CultureInfo.InvariantCulture)}\"";
        return Task.FromResult<BlobReadResult?>(new BlobReadResult(stream, lastModified, etag));
    }

    // Reject absolute paths and parent-traversal so a poisoned key cannot escape _basePath.
    private string ResolvePath(string key)
    {
        if (string.IsNullOrEmpty(key) || Path.IsPathRooted(key) || key.Contains(".."))
            throw new ArgumentException("Blob key must be a relative path without parent traversal.", nameof(key));
        return Path.Combine(_basePath, key);
    }
}
