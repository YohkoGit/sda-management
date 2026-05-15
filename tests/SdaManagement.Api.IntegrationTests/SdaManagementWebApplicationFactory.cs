using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using SdaManagement.Api.Data;
using SdaManagement.Api.IntegrationTests.Auth;
using SdaManagement.Api.Services;
using Testcontainers.PostgreSql;

namespace SdaManagement.Api.IntegrationTests;

public class SdaManagementWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder("postgres:17")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    private readonly string _avatarTestPath = Path.Combine(
        Path.GetTempPath(), $"sdac-test-avatars-{Guid.NewGuid()}");

    public string ConnectionString => _postgresContainer.GetConnectionString();

    /// <summary>
    /// Exposed for tests that need to manipulate avatar files on disk (e.g. setting
    /// last-write-time to deterministically vary ETag/cache-bust between uploads).
    /// </summary>
    public string AvatarTestPath => _avatarTestPath;

    public async Task InitializeAsync()
    {
        await _postgresContainer.StartAsync();

        // Apply database schema using the factory's own service provider.
        // Accessing Services here triggers ConfigureWebHost (container is running, so
        // GetConnectionString() is valid). Avoids the BuildServiceProvider() anti-pattern
        // which creates an undisposed second IServiceProvider.
        using var scope = Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // Story 1.3: use MigrateAsync() so all migration code runs
        await dbContext.Database.MigrateAsync();

        // Story 1.3: run OWNER seeder (gracefully skips if OWNER_EMAIL not configured)
        var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
        await seeder.SeedAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // Provide required config values for the test host
        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // JWT Bearer requires a secret — use a fixed test secret (min 32 chars)
                ["Jwt:Secret"] = "test-jwt-secret-key-for-integration-tests-only-32chars",
                // Story 1.4: Google OAuth requires these at startup (fake values for tests)
                ["Google:ClientId"] = "fake-test-client-id.apps.googleusercontent.com",
                ["Google:ClientSecret"] = "fake-test-client-secret",
                // Story 1.4: Higher rate limit for tests so functional tests don't
                // interfere with each other via shared rate limit budget
                ["RateLimiting:AuthPermitLimit"] = "10000",
                ["RateLimiting:PublicPermitLimit"] = "10000",
                // Prevent Program.cs seeder from querying DB before migrations are applied
                ["OwnerEmail"] = "",
                // Skip SeedDevDataAsync — tables don't exist until InitializeAsync runs migrations
                ["SeedDevData"] = "false",
                // Story 3.5: Avatar storage in isolated temp directory
                ["AvatarStorage:Path"] = _avatarTestPath,
            });
        });

        builder.ConfigureServices(services =>
        {
            var connectionString = _postgresContainer.GetConnectionString();

            // Remove the existing AppDbContext and its options registration
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<AppDbContext>();

            // Re-register AppDbContext with Testcontainers PostgreSQL connection string
            // MUST include UseSnakeCaseNamingConvention() to match production configuration
            services.AddDbContext<AppDbContext>(options =>
                options.UseNpgsql(connectionString)
                       .UseSnakeCaseNamingConvention());

            // Remove the NpgSql health check registered with the original (null) connection string
            // and re-register with the Testcontainers connection string
            services.RemoveAll<IConfigureOptions<HealthCheckServiceOptions>>();
            services.AddHealthChecks()
                    .AddNpgSql(connectionString);

            // Replace authentication with test scheme
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            })
            .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                TestAuthHandler.SchemeName, null);

            // Replace YouTube service with fake (avoids real API calls in tests)
            services.RemoveAll<IYouTubeService>();
            services.AddSingleton<IYouTubeService>(
                new Helpers.FakeYouTubeService(isLive: false));
        });
    }

    // Explicit IAsyncLifetime implementation avoids hiding the base class's ValueTask DisposeAsync()
    // (IAsyncDisposable). xUnit calls IAsyncLifetime.DisposeAsync() explicitly, so this is always
    // the path used for fixture cleanup.
    async Task IAsyncLifetime.DisposeAsync()
    {
        // Clean up avatar test directory
        if (Directory.Exists(_avatarTestPath))
            Directory.Delete(_avatarTestPath, true);

        // DisposeAsync() already stops and removes the container — StopAsync() beforehand is redundant
        await _postgresContainer.DisposeAsync();
        await base.DisposeAsync();
    }
}
