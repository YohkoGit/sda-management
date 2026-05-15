using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NSubstitute;
using SdaManagement.Api.Data;
using SdaManagement.Api.Services;
using SdaManagement.Api.Storage;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

public class AvatarServiceTests
{
    [Fact]
    public void GetAvatarUrl_VersionZero_ReturnsNull()
    {
        var sut = CreateSut();

        sut.GetAvatarUrl(userId: 42, avatarVersion: 0).ShouldBeNull();
    }

    [Theory]
    [InlineData(1, 1, "/api/avatars/1?v=1")]
    [InlineData(42, 7, "/api/avatars/42?v=7")]
    [InlineData(99999, 1234, "/api/avatars/99999?v=1234")]
    public void GetAvatarUrl_VersionPositive_ReturnsVersionedUrl(int userId, int version, string expected)
    {
        var sut = CreateSut();

        sut.GetAvatarUrl(userId, version).ShouldBe(expected);
    }

    private static AvatarService CreateSut()
    {
        // GetAvatarUrl is pure (no DB, no blob I/O). The fakes below satisfy the constructor
        // but are never touched by the URL-only tests below; SaveAvatarAsync / GetAvatarAsync
        // / HasAvatarAsync are exercised end-to-end by AvatarEndpointTests.
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new AppDbContext(options);
        var blobStore = Substitute.For<IBlobStore>();
        var config = new ConfigurationBuilder().Build();
        return new AvatarService(db, blobStore, config);
    }
}
