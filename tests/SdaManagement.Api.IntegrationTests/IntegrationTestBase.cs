using System.Net.Http.Headers;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Respawn;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.IntegrationTests.Auth;

namespace SdaManagement.Api.IntegrationTests;

[Collection("Integration")]
public abstract class IntegrationTestBase : IAsyncLifetime
{
    private readonly SdaManagementWebApplicationFactory _factory;
    private Respawner? _respawner;

    protected HttpClient AnonymousClient { get; }
    protected HttpClient ViewerClient { get; }
    protected HttpClient AdminClient { get; }
    protected HttpClient OwnerClient { get; }

    protected string ConnectionString => _factory.ConnectionString;

    protected IntegrationTestBase(SdaManagementWebApplicationFactory factory)
    {
        _factory = factory;

        AnonymousClient = _factory.CreateClient();

        ViewerClient = CreateClientWithRole("Viewer");
        AdminClient = CreateClientWithRole("Admin");
        OwnerClient = CreateClientWithRole("Owner");
    }

    public async Task InitializeAsync()
    {
        // Initialize Respawn AFTER database schema exists (MigrateAsync already ran in factory)
        await using var connection = new NpgsqlConnection(_factory.ConnectionString);
        await connection.OpenAsync();

        // Check for tables; if schema has tables (it does from Story 1.3), initialize Respawn
        await using var countCmd = connection.CreateCommand();
        countCmd.CommandText =
            "SELECT COUNT(*) FROM information_schema.tables " +
            "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'";
        var tableCount = (long)(await countCmd.ExecuteScalarAsync())!;

        if (tableCount > 0)
        {
            _respawner = await Respawner.CreateAsync(connection, new RespawnerOptions
            {
                SchemasToInclude = ["public"],
                DbAdapter = DbAdapter.Postgres,
                TablesToIgnore = [new Respawn.Graph.Table("__EFMigrationsHistory")],
            });
        }

        await SeedTestData();
    }

    public async Task DisposeAsync()
    {
        // Reset database after each test method to ensure test isolation.
        if (_respawner is not null)
        {
            await using var connection = new NpgsqlConnection(_factory.ConnectionString);
            await connection.OpenAsync();
            await _respawner.ResetAsync(connection);
        }

        // Dispose role clients.
        AnonymousClient.Dispose();
        ViewerClient.Dispose();
        AdminClient.Dispose();
        OwnerClient.Dispose();
    }

    /// <summary>
    /// Override to seed initial test data after the database is reset.
    /// Called at the end of InitializeAsync() after Respawn is configured.
    /// </summary>
    protected virtual Task SeedTestData() => Task.CompletedTask;

    /// <summary>
    /// Returns an HttpClient configured with the specified role header.
    /// Caller is responsible for disposing the returned client.
    /// </summary>
    protected HttpClient AuthenticateAs(string role)
    {
        return CreateClientWithRole(role);
    }

    /// <summary>
    /// Inserts a User record directly via AppDbContext for test setup.
    /// The email should match the TestAuthHandler email pattern: test-{role}@test.local
    /// </summary>
    protected async Task<User> CreateTestUser(string email, UserRole role)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User
        {
            Email = email,
            FirstName = "Test",
            LastName = role.ToString(),
            Role = role,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Placeholder — requires Activity entity (Epic 4).
    /// </summary>
    protected Task CreateTestActivity()
    {
        throw new NotImplementedException("Requires Epic 4 — Activity entity does not exist yet");
    }

    private HttpClient CreateClientWithRole(string role)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        return client;
    }
}
