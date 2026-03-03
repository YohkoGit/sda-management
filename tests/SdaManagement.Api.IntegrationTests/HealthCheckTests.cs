using System.Net;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests;

public class HealthCheckTests : IntegrationTestBase
{
    public HealthCheckTests(SdaManagementWebApplicationFactory factory) : base(factory)
    {
    }

    [Fact]
    public async Task HealthCheck_WhenDatabaseIsRunning_ReturnsHealthy()
    {
        // Act
        var response = await AnonymousClient.GetAsync("/health");

        // Assert
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var content = await response.Content.ReadAsStringAsync();
        content.Trim().ShouldBe("Healthy");
    }
}
