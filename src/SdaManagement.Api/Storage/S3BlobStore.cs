using Amazon.S3;
using Amazon.S3.Model;

namespace SdaManagement.Api.Storage;

public sealed class S3BlobStore : IBlobStore, IDisposable
{
    private readonly IAmazonS3 _client;
    private readonly string _bucket;

    public S3BlobStore(IConfiguration configuration)
    {
        var endpoint = Require(configuration, "BlobStorage:S3:Endpoint");
        _bucket = Require(configuration, "BlobStorage:S3:Bucket");
        var accessKey = Require(configuration, "BlobStorage:S3:AccessKeyId");
        var secretKey = Require(configuration, "BlobStorage:S3:SecretAccessKey");

        // Cloudflare R2 (and most non-AWS S3-compatibles) require path-style addressing
        // because the endpoint hostname is fixed per account, not per bucket.
        var config = new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = true,
        };

        _client = new AmazonS3Client(accessKey, secretKey, config);
    }

    public async Task PutAsync(string key, Stream content, string contentType, CancellationToken cancellationToken = default)
    {
        await _client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = _bucket,
            Key = key,
            InputStream = content,
            ContentType = contentType,
            AutoCloseStream = false,
        }, cancellationToken);
    }

    public async Task<BlobReadResult?> GetAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _client.GetObjectAsync(_bucket, key, cancellationToken);
            var lastModified = response.LastModified?.ToUniversalTime() ?? DateTime.UtcNow;
            return new BlobReadResult(
                response.ResponseStream,
                lastModified,
                response.ETag);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public void Dispose() => _client.Dispose();

    private static string Require(IConfiguration configuration, string key)
        => configuration[key]
           ?? throw new InvalidOperationException($"Configuration '{key}' is required when BlobStorage:Provider is 'S3'.");
}
