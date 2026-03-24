using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Auth;

/// <summary>
/// Rate limiting tests in a separate xUnit collection to avoid consuming shared
/// rate limit budget that interferes with functional tests.
/// Uses its own factory instance with a low rate limit (5 req/min) for fast testing.
/// </summary>
[Collection("RateLimit")]
public class RateLimitingTests : IAsyncLifetime
{
    private readonly RateLimitTestFactory _factory;
    private HttpClient _client = null!;

    public RateLimitingTests(RateLimitTestFactory factory)
    {
        _factory = factory;
    }

    public Task InitializeAsync()
    {
        _client = _factory.CreateClient();
        _client.DefaultRequestHeaders.Add("X-Requested-With", "XMLHttpRequest");
        return Task.CompletedTask;
    }

    public Task DisposeAsync()
    {
        _client.Dispose();
        return Task.CompletedTask;
    }

    [Fact]
    public async Task RateLimiting_WhenExceedingLimit_Returns429WithRetryAfter()
    {
        // RateLimitTestFactory sets rate limit to 2 req/min.
        // Send enough requests to reliably exceed that limit even across window boundaries.
        HttpResponseMessage? rateLimitedResponse = null;
        for (int i = 0; i < 10; i++)
        {
            var response = await _client.PostAsync("/api/auth/login", null);
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                rateLimitedResponse = response;
                break;
            }
        }

        rateLimitedResponse.ShouldNotBeNull("Expected at least one 429 response within 10 requests (limit=2/min)");
        rateLimitedResponse.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
        rateLimitedResponse.Headers.Contains("Retry-After").ShouldBeTrue();
    }
}

/// <summary>
/// Factory for rate limit tests with a very low permit limit (2 req/min)
/// so the test reliably triggers 429 even across window boundaries.
/// With limit=2 and 10 requests, worst case (boundary reset) still yields 4 allowed + 6 rejected.
/// </summary>
public class RateLimitTestFactory : SdaManagementWebApplicationFactory
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimiting:AuthPermitLimit"] = "2",
            });
        });
    }
}

[CollectionDefinition("RateLimit")]
public class RateLimitCollection : ICollectionFixture<RateLimitTestFactory>
{
}
