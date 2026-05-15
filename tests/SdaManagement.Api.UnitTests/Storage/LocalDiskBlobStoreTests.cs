using System.Text;
using Microsoft.Extensions.Configuration;
using SdaManagement.Api.Storage;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Storage;

public class LocalDiskBlobStoreTests : IDisposable
{
    private readonly string _basePath;
    private readonly IConfiguration _config;

    public LocalDiskBlobStoreTests()
    {
        _basePath = Path.Combine(Path.GetTempPath(), $"sdac-blob-tests-{Guid.NewGuid():N}");
        _config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["BlobStorage:LocalDisk:BasePath"] = _basePath,
            })
            .Build();
    }

    public void Dispose()
    {
        if (Directory.Exists(_basePath))
            Directory.Delete(_basePath, recursive: true);
        GC.SuppressFinalize(this);
    }

    [Fact]
    public async Task PutAsync_WritesBytesUnderBasePath()
    {
        var sut = new LocalDiskBlobStore(_config);
        var content = new MemoryStream(Encoding.UTF8.GetBytes("hello"));

        await sut.PutAsync("avatars/42.webp", content, "image/webp");

        var written = await File.ReadAllBytesAsync(Path.Combine(_basePath, "avatars", "42.webp"));
        Encoding.UTF8.GetString(written).ShouldBe("hello");
    }

    [Fact]
    public async Task GetAsync_MissingKey_ReturnsNull()
    {
        var sut = new LocalDiskBlobStore(_config);

        var result = await sut.GetAsync("avatars/does-not-exist.webp");

        result.ShouldBeNull();
    }

    [Fact]
    public async Task GetAsync_ExistingKey_ReturnsStreamAndMetadata()
    {
        var sut = new LocalDiskBlobStore(_config);
        await sut.PutAsync("covers/dept-1.webp", new MemoryStream("xyz"u8.ToArray()), "image/webp");

        var result = await sut.GetAsync("covers/dept-1.webp");

        result.ShouldNotBeNull();
        using var reader = new StreamReader(result!.Content);
        (await reader.ReadToEndAsync()).ShouldBe("xyz");
        result.ETag.ShouldStartWith("\"");
        result.LastModifiedUtc.Kind.ShouldBe(DateTimeKind.Utc);
    }

    [Theory]
    [InlineData("../escape.webp")]
    [InlineData("/absolute/path.webp")]
    [InlineData("")]
    public async Task PutAsync_RejectsUnsafeKeys(string key)
    {
        var sut = new LocalDiskBlobStore(_config);

        await Should.ThrowAsync<ArgumentException>(
            () => sut.PutAsync(key, new MemoryStream([1, 2, 3]), "image/webp"));
    }
}
