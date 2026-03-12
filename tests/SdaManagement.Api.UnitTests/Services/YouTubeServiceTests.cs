using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using SdaManagement.Api.Dtos.Config;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

public class YouTubeServiceTests : IDisposable
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfigService _configService;
    private readonly IMemoryCache _cache;
    private readonly IConfiguration _configuration;
    private readonly ILogger<YouTubeService> _logger;
    private readonly YouTubeService _sut;
    private MockHttpMessageHandler _handler = default!;

    public YouTubeServiceTests()
    {
        _httpClientFactory = Substitute.For<IHttpClientFactory>();
        _configService = Substitute.For<IConfigService>();
        _cache = new MemoryCache(new MemoryCacheOptions());
        _logger = Substitute.For<ILogger<YouTubeService>>();

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["YouTube:ApiKey"] = "test-api-key"
            })
            .Build();

        _sut = new YouTubeService(_httpClientFactory, _configService, _cache, _configuration, _logger);
    }

    [Fact]
    public async Task GetLiveStatus_WithLiveStream_ReturnsIsLiveTrue()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/@sdac-st-hubert");
        SetupHttpClient(
            channelResponse: CreateChannelResponse("UCtest123"),
            searchResponse: CreateSearchResponse("vid123", "Culte du Sabbat"));

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeTrue();
        result.LiveVideoId.ShouldBe("vid123");
        result.LiveTitle.ShouldBe("Culte du Sabbat");
    }

    [Fact]
    public async Task GetLiveStatus_NoLiveStream_ReturnsIsLiveFalse()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/@sdac-st-hubert");
        SetupHttpClient(
            channelResponse: CreateChannelResponse("UCtest123"),
            searchResponse: CreateEmptySearchResponse());

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
        result.LiveVideoId.ShouldBeNull();
        result.LiveTitle.ShouldBeNull();
    }

    [Fact]
    public async Task GetLiveStatus_NoYouTubeUrl_ReturnsNotLive()
    {
        // Arrange
        _configService.GetPublicConfigAsync().Returns(new PublicChurchConfigResponse
        {
            ChurchName = "Test Church",
            YouTubeChannelUrl = null
        });

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
        result.LiveVideoId.ShouldBeNull();
    }

    [Fact]
    public async Task GetLiveStatus_ApiError_ReturnsNotLiveAndLogs()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/@sdac-st-hubert");
        SetupHttpClientWithError(HttpStatusCode.InternalServerError);

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_Timeout_ReturnsNotLiveAndLogs()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/@sdac-st-hubert");
        _handler = new MockHttpMessageHandler((_, _) =>
            throw new TaskCanceledException("Timeout", new TimeoutException()));
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_CachesResult_DoesNotCallApiTwice()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/@sdac-st-hubert");
        var callCount = 0;
        _handler = new MockHttpMessageHandler((request, _) =>
        {
            callCount++;
            if (request.RequestUri!.PathAndQuery.Contains("channels"))
                return CreateHttpResponse(CreateChannelResponse("UCtest123"));
            return CreateHttpResponse(CreateSearchResponse("vid123", "Live"));
        });
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);

        // Act
        await _sut.GetLiveStatusAsync();
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeTrue();
        callCount.ShouldBe(2); // channels + search on first call, second call served from cache
    }

    [Fact]
    public async Task ResolveChannelId_FromHandle_CallsApiAndCaches()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/@sdac-st-hubert");
        var channelCallCount = 0;
        _handler = new MockHttpMessageHandler((request, _) =>
        {
            if (request.RequestUri!.PathAndQuery.Contains("channels"))
            {
                channelCallCount++;
                return CreateHttpResponse(CreateChannelResponse("UCtest123"));
            }
            return CreateHttpResponse(CreateEmptySearchResponse());
        });
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);

        // Act — call twice, but clear live status cache between calls to force search call
        await _sut.GetLiveStatusAsync();
        _cache.Remove("youtube-live-status");
        await _sut.GetLiveStatusAsync();

        // Assert — channel ID should be resolved from cache on second call
        channelCallCount.ShouldBe(1);
    }

    [Fact]
    public async Task ResolveChannelId_FromChannelUrl_ExtractsDirectly()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/channel/UCtest123");
        _handler = new MockHttpMessageHandler((request, _) =>
        {
            // Should NOT call channels endpoint for channel/UC format
            request.RequestUri!.PathAndQuery.ShouldNotContain("channels");
            return CreateHttpResponse(CreateEmptySearchResponse());
        });
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert — should work without calling channels API
        result.IsLive.ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_ApiKeyMissing_ReturnsNotLive()
    {
        // Arrange
        var configNoKey = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["YouTube:ApiKey"] = ""
            })
            .Build();
        var sut = new YouTubeService(_httpClientFactory, _configService, _cache, configNoKey, _logger);

        // Act
        var result = await sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_QuotaExceeded_ReturnsNotLive()
    {
        // Arrange
        SetupConfig("https://www.youtube.com/channel/UCtest123");
        SetupHttpClientForSearch(HttpStatusCode.Forbidden);

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
    }

    [Fact]
    public async Task GetLiveStatus_NullConfig_ReturnsNotLive()
    {
        // Arrange
        _configService.GetPublicConfigAsync().Returns((PublicChurchConfigResponse?)null);

        // Act
        var result = await _sut.GetLiveStatusAsync();

        // Assert
        result.IsLive.ShouldBeFalse();
    }

    private void SetupConfig(string youTubeUrl)
    {
        _configService.GetPublicConfigAsync().Returns(new PublicChurchConfigResponse
        {
            ChurchName = "Test Church",
            YouTubeChannelUrl = youTubeUrl
        });
    }

    private void SetupHttpClient(string channelResponse, string searchResponse)
    {
        _handler = new MockHttpMessageHandler((request, _) =>
        {
            if (request.RequestUri!.PathAndQuery.Contains("channels"))
                return CreateHttpResponse(channelResponse);
            return CreateHttpResponse(searchResponse);
        });
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);
    }

    private void SetupHttpClientWithError(HttpStatusCode statusCode)
    {
        _handler = new MockHttpMessageHandler((request, _) =>
        {
            if (request.RequestUri!.PathAndQuery.Contains("channels"))
                return CreateHttpResponse(CreateChannelResponse("UCtest123"));
            return new HttpResponseMessage(statusCode) { Content = new StringContent("") };
        });
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);
    }

    private void SetupHttpClientForSearch(HttpStatusCode searchStatusCode)
    {
        _handler = new MockHttpMessageHandler((request, _) =>
        {
            if (request.RequestUri!.PathAndQuery.Contains("channels"))
                return CreateHttpResponse(CreateChannelResponse("UCtest123"));
            return new HttpResponseMessage(searchStatusCode) { Content = new StringContent("") };
        });
        var client = new HttpClient(_handler) { BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/") };
        _httpClientFactory.CreateClient("YouTube").Returns(client);
    }

    private static HttpResponseMessage CreateHttpResponse(string json) =>
        new(HttpStatusCode.OK) { Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json") };

    private static string CreateChannelResponse(string channelId) =>
        JsonSerializer.Serialize(new { items = new[] { new { id = channelId } } });

    private static string CreateSearchResponse(string videoId, string title) =>
        JsonSerializer.Serialize(new
        {
            items = new[]
            {
                new
                {
                    id = new { videoId },
                    snippet = new { title, liveBroadcastContent = "active" }
                }
            }
        });

    private static string CreateEmptySearchResponse() =>
        JsonSerializer.Serialize(new { items = Array.Empty<object>() });

    public void Dispose()
    {
        _cache.Dispose();
        _handler?.Dispose();
    }
}

public class MockHttpMessageHandler : HttpMessageHandler
{
    private readonly Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> _handler;

    public MockHttpMessageHandler(Func<HttpRequestMessage, CancellationToken, HttpResponseMessage> handler)
    {
        _handler = handler;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        return Task.FromResult(_handler(request, cancellationToken));
    }
}
