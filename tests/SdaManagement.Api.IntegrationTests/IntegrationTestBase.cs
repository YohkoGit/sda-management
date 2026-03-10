using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using Respawn;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.IntegrationTests.Auth;
using Dtos = SdaManagement.Api.Dtos;

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

    protected SdaManagementWebApplicationFactory Factory => _factory;
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
    /// Sets a BCrypt password hash for the given user. Used by auth tests (login, logout, password reset).
    /// </summary>
    protected async Task SetUserPassword(int userId, string password)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await dbContext.Users.FindAsync(userId);
        user!.PasswordHash = BCrypt.Net.BCrypt.EnhancedHashPassword(password, 12);
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Assigns a user to a department via UserDepartment junction record.
    /// Reusable across all Epic 3+ tests.
    /// </summary>
    protected async Task AssignDepartmentToUser(int userId, int departmentId)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        dbContext.Set<UserDepartment>().Add(new UserDepartment
        {
            UserId = userId,
            DepartmentId = departmentId,
        });
        await dbContext.SaveChangesAsync();
    }

    /// <summary>
    /// Creates an Activity record directly via AppDbContext for test setup.
    /// Optionally creates ActivityRoles and RoleAssignments for cascade tests.
    /// </summary>
    protected async Task<Activity> CreateTestActivity(
        int departmentId,
        string? title = null,
        DateOnly? date = null,
        ActivityVisibility visibility = ActivityVisibility.Public,
        List<(string RoleName, int Headcount, List<int>? UserIds)>? roles = null,
        string? specialType = null)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        var activity = new Activity
        {
            Title = title ?? "Test Activity",
            DepartmentId = departmentId,
            Date = date ?? new DateOnly(2026, 3, 15),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            Visibility = visibility,
            SpecialType = specialType,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        if (roles is not null)
        {
            for (var i = 0; i < roles.Count; i++)
            {
                var (roleName, headcount, userIds) = roles[i];
                var activityRole = new ActivityRole
                {
                    ActivityId = activity.Id,
                    RoleName = roleName,
                    Headcount = headcount,
                    SortOrder = i,
                    CreatedAt = now,
                    UpdatedAt = now,
                };
                dbContext.ActivityRoles.Add(activityRole);
                await dbContext.SaveChangesAsync();

                if (userIds is not null)
                {
                    foreach (var userId in userIds)
                    {
                        dbContext.RoleAssignments.Add(new RoleAssignment
                        {
                            ActivityRoleId = activityRole.Id,
                            UserId = userId,
                            CreatedAt = now,
                        });
                    }
                    await dbContext.SaveChangesAsync();
                }
            }
        }

        return activity;
    }

    /// <summary>
    /// Creates an ActivityTemplate with optional roles directly via AppDbContext for test setup.
    /// </summary>
    protected async Task<ActivityTemplate> CreateTestActivityTemplate(
        string? name = null,
        List<(string RoleName, int DefaultHeadcount)>? roles = null)
    {
        using var scope = _factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        roles ??= [("Predicateur", 1), ("Ancien de Service", 1)];

        var template = new ActivityTemplate
        {
            Name = name ?? "Test Template",
            Description = "Template for testing",
            CreatedAt = now,
            UpdatedAt = now,
        };

        for (var i = 0; i < roles.Count; i++)
        {
            var (roleName, defaultHeadcount) = roles[i];
            template.Roles.Add(new TemplateRole
            {
                RoleName = roleName,
                DefaultHeadcount = defaultHeadcount,
                SortOrder = i,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }

        dbContext.Set<ActivityTemplate>().Add(template);
        await dbContext.SaveChangesAsync();
        return template;
    }

    /// <summary>
    /// Creates a guest user via the POST /api/users/guests endpoint.
    /// Returns the deserialized GuestCreatedResponse.
    /// </summary>
    protected async Task<Dtos.User.GuestCreatedResponse> CreateTestGuest(string name, string? phone = null)
    {
        var response = await AdminClient.PostAsJsonAsync("/api/users/guests", new { name, phone });
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<Dtos.User.GuestCreatedResponse>())!;
    }

    private HttpClient CreateClientWithRole(string role)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.RoleHeader, role);
        return client;
    }
}
