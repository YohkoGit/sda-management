using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using SdaManagement.Api.Dtos.Public;

namespace SdaManagement.Api.Services;

public class YouTubeService(
    IHttpClientFactory httpClientFactory,
    IConfigService configService,
    IMemoryCache cache,
    IConfiguration configuration,
    ILogger<YouTubeService> logger) : IYouTubeService
{
    private const string LiveStatusCacheKey = "youtube-live-status";
    private const string ChannelIdCacheKeyPrefix = "youtube-channel-id-";
    private static readonly PublicLiveStatusResponse NotLive = new(false, null, null);

    public async Task<PublicLiveStatusResponse> GetLiveStatusAsync()
    {
        try
        {
            if (cache.TryGetValue(LiveStatusCacheKey, out PublicLiveStatusResponse? cached) && cached is not null)
                return cached;

            var apiKey = configuration["YouTube:ApiKey"];
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                logger.LogWarning("YouTube API key is not configured — live status unavailable");
                return NotLive;
            }

            var config = await configService.GetPublicConfigAsync();
            if (config is null || string.IsNullOrWhiteSpace(config.YouTubeChannelUrl))
                return NotLive;

            var channelId = await ResolveChannelIdAsync(config.YouTubeChannelUrl, apiKey);
            if (channelId is null)
            {
                logger.LogWarning("Failed to resolve YouTube channel ID from URL: {Url}", config.YouTubeChannelUrl);
                return NotLive;
            }

            var result = await CheckLiveStatusAsync(channelId, apiKey);
            cache.Set(LiveStatusCacheKey, result, TimeSpan.FromMinutes(2));
            return result;
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            logger.LogWarning("YouTube API request timed out");
            return cache.TryGetValue(LiveStatusCacheKey, out PublicLiveStatusResponse? cached) && cached is not null
                ? cached : NotLive;
        }
        catch (HttpRequestException ex)
        {
            logger.LogWarning(ex, "YouTube API HTTP error");
            return cache.TryGetValue(LiveStatusCacheKey, out PublicLiveStatusResponse? cached) && cached is not null
                ? cached : NotLive;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected error checking YouTube live status");
            return cache.TryGetValue(LiveStatusCacheKey, out PublicLiveStatusResponse? cached) && cached is not null
                ? cached : NotLive;
        }
    }

    private async Task<string?> ResolveChannelIdAsync(string channelUrl, string apiKey)
    {
        // Extract handle or channel ID from URL
        var uri = channelUrl.TrimEnd('/');

        // channel/UCxxx format — return directly
        var channelMatch = System.Text.RegularExpressions.Regex.Match(uri, @"youtube\.com/channel/(UC[\w-]+)");
        if (channelMatch.Success)
            return channelMatch.Groups[1].Value;

        // @handle format — resolve via API
        var handleMatch = System.Text.RegularExpressions.Regex.Match(uri, @"youtube\.com/@?([\w-]+)$");
        if (!handleMatch.Success)
        {
            logger.LogWarning("Cannot parse YouTube URL format: {Url}", channelUrl);
            return null;
        }

        var handle = handleMatch.Groups[1].Value;
        var cacheKey = $"{ChannelIdCacheKeyPrefix}{handle}";

        if (cache.TryGetValue(cacheKey, out string? cachedId) && cachedId is not null)
            return cachedId;

        var client = httpClientFactory.CreateClient("YouTube");
        var response = await client.GetAsync($"channels?part=id&forHandle={handle}&key={apiKey}");

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("YouTube channels API returned {StatusCode} for handle {Handle}",
                (int)response.StatusCode, handle);
            return null;
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("items");

        if (items.GetArrayLength() == 0)
        {
            logger.LogWarning("YouTube channel not found for handle: {Handle}", handle);
            return null;
        }

        var channelId = items[0].GetProperty("id").GetString();
        if (channelId is not null)
            cache.Set(cacheKey, channelId); // No expiration — channel IDs don't change

        return channelId;
    }

    private async Task<PublicLiveStatusResponse> CheckLiveStatusAsync(string channelId, string apiKey)
    {
        var client = httpClientFactory.CreateClient("YouTube");
        var response = await client.GetAsync(
            $"search?part=id,snippet&channelId={channelId}&eventType=live&type=video&maxResults=1&key={apiKey}");

        if (response.StatusCode == System.Net.HttpStatusCode.Forbidden)
        {
            logger.LogWarning("YouTube API quota exceeded (403)");
            return NotLive;
        }

        if (response.StatusCode == (System.Net.HttpStatusCode)429)
        {
            logger.LogWarning("YouTube API rate limited (429)");
            return cache.TryGetValue(LiveStatusCacheKey, out PublicLiveStatusResponse? cached) && cached is not null
                ? cached : NotLive;
        }

        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("YouTube search API returned {StatusCode}", (int)response.StatusCode);
            return NotLive;
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = json.GetProperty("items");

        if (items.GetArrayLength() == 0)
            return NotLive;

        var item = items[0];
        var videoId = item.GetProperty("id").GetProperty("videoId").GetString();
        var title = item.GetProperty("snippet").GetProperty("title").GetString();

        return new PublicLiveStatusResponse(true, videoId, title);
    }
}
