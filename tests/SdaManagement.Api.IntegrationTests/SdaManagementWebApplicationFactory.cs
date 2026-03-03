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
using Testcontainers.PostgreSql;

namespace SdaManagement.Api.IntegrationTests;

public class SdaManagementWebApplicationFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgresContainer = new PostgreSqlBuilder("postgres:17")
        .WithDatabase("testdb")
        .WithUsername("testuser")
        .WithPassword("testpass")
        .Build();

    public string ConnectionString => _postgresContainer.GetConnectionString();

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
        });
    }

    // Explicit IAsyncLifetime implementation avoids hiding the base class's ValueTask DisposeAsync()
    // (IAsyncDisposable). xUnit calls IAsyncLifetime.DisposeAsync() explicitly, so this is always
    // the path used for fixture cleanup.
    async Task IAsyncLifetime.DisposeAsync()
    {
        // DisposeAsync() already stops and removes the container — StopAsync() beforehand is redundant
        await _postgresContainer.DisposeAsync();
        await base.DisposeAsync();
    }
}
