using System.Net;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Public;

public class LiveStatusEndpointTests : IntegrationTestBase
{
    public LiveStatusEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
    }

    [Fact]
    public async Task GetLiveStatus_AnonymousAccess_Returns200()
    {
        // Act — use AnonymousClient (no auth headers)
        var response = await AnonymousClient.GetAsync("/api/public/live-status");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetLiveStatus_WhenNotLive_ReturnsOkWithIsLiveFalse()
    {
        // Act — default fake returns isLive: false
        var response = await AnonymousClient.GetAsync("/api/public/live-status");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("isLive").GetBoolean().ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_ResponseDoesNotContainApiKey()
    {
        // Act
        var response = await AnonymousClient.GetAsync("/api/public/live-status");

        // Assert
        var json = await response.Content.ReadAsStringAsync();
        json.ShouldNotContain("apiKey");
        json.ShouldNotContain("ApiKey");
        json.ShouldNotContain("channelId");
        json.ShouldNotContain("ChannelId");

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;
        root.TryGetProperty("apiKey", out _).ShouldBeFalse();
        root.TryGetProperty("channelId", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_ReturnsOkWithLiveData()
    {
        // Arrange — override the default fake with a live-returning one
        using var client = Factory
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.RemoveAll<IYouTubeService>();
                    services.AddSingleton<IYouTubeService>(
                        new Helpers.FakeYouTubeService(isLive: true, videoId: "test123", title: "Test Stream"));
                });
            })
            .CreateClient();

        // Act
        var response = await client.GetAsync("/api/public/live-status");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("isLive").GetBoolean().ShouldBeTrue();
        root.GetProperty("liveVideoId").GetString().ShouldBe("test123");
        root.GetProperty("liveTitle").GetString().ShouldBe("Test Stream");
    }

    [Fact]
    public async Task GetLiveStatus_ResponseContainsExpectedFields()
    {
        // Act
        var response = await AnonymousClient.GetAsync("/api/public/live-status");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // isLive is always present (non-null boolean)
        root.TryGetProperty("isLive", out _).ShouldBeTrue();
        // liveVideoId and liveTitle are nullable — omitted from JSON when null
        // (WhenWritingNull serializer option). Verify they're absent when not live.
        root.TryGetProperty("liveVideoId", out _).ShouldBeFalse();
        root.TryGetProperty("liveTitle", out _).ShouldBeFalse();
    }
}
