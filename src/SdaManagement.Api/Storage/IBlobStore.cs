namespace SdaManagement.Api.Storage;

public interface IBlobStore
{
    Task PutAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default);

    Task<BlobReadResult?> GetAsync(string key, CancellationToken cancellationToken = default);
}

public sealed record BlobReadResult(Stream Content, DateTime LastModifiedUtc, string ETag);
