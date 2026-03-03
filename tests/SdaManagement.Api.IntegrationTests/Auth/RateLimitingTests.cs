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
        // RateLimitTestFactory sets rate limit to 5 req/min.
        // Send enough requests to exceed that limit.
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

        rateLimitedResponse.ShouldNotBeNull("Expected at least one 429 response within 10 requests");
        rateLimitedResponse.StatusCode.ShouldBe(HttpStatusCode.TooManyRequests);
        rateLimitedResponse.Headers.Contains("Retry-After").ShouldBeTrue();
    }
}

/// <summary>
/// Factory for rate limit tests with a low permit limit (5 req/min)
/// so the test only needs ~6 requests instead of ~200.
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
                ["RateLimiting:AuthPermitLimit"] = "5",
            });
        });
    }
}

[CollectionDefinition("RateLimit")]
public class RateLimitCollection : ICollectionFixture<RateLimitTestFactory>
{
}
