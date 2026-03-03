using System.Net.Http.Headers;
using Npgsql;
using Respawn;
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
        // Initialize Respawn AFTER database schema exists (EnsureCreatedAsync already ran in factory)
        await using var connection = new NpgsqlConnection(_factory.ConnectionString);
        await connection.OpenAsync();

        // Explicitly check for tables instead of catching InvalidOperationException broadly.
        // A broad catch would swallow real connection errors if they happen to be InvalidOperationException.
        // AppDbContext has no entities until Story 1.3, so the schema is initially empty.
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
            });
        }
        // _respawner remains null until Story 1.3 adds the first entity

        await SeedTestData();
    }

    public async Task DisposeAsync()
    {
        // Reset database after each test method to ensure test isolation.
        // Guard avoids opening a connection when no tables exist (Story 1.2 — empty schema).
        if (_respawner is not null)
        {
            await using var connection = new NpgsqlConnection(_factory.ConnectionString);
            await connection.OpenAsync();
            await _respawner.ResetAsync(connection);
        }

        // Dispose role clients. WebApplicationFactory also tracks and disposes its created clients,
        // but explicit disposal here is cleaner and avoids relying on factory cleanup order.
        AnonymousClient.Dispose();
        ViewerClient.Dispose();
        AdminClient.Dispose();
        OwnerClient.Dispose();
    }

    /// <summary>
    /// Override to seed initial test data after the database is reset.
    /// Called at the end of InitializeAsync() after Respawn is configured.
    /// Implement in Story 1.3+ when entities exist.
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
    /// Placeholder — requires User entity (Story 1.3).
    /// </summary>
    protected Task CreateTestUser(string email, string role)
    {
        throw new NotImplementedException("Requires Story 1.3 — User entity does not exist yet");
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
