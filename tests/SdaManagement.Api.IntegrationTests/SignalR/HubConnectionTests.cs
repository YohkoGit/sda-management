using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.IntegrationTests.Auth;

namespace SdaManagement.Api.IntegrationTests.SignalR;

public class HubConnectionTests : IntegrationTestBase
{
    private int _dept1Id;

    public HubConnectionTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dept1 = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#3B82F6",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var dept2 = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#8B5CF6",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Departments.AddRange(dept1, dept2);
        await db.SaveChangesAsync();

        _dept1Id = dept1.Id;

        // Assign admin to first department only
        await AssignDepartmentToUser(admin.Id, _dept1Id);
    }

    [Fact]
    public async Task AnonymousConnect_Succeeds()
    {
        await using var connection = CreateHubConnection();
        await connection.StartAsync();

        connection.State.ShouldBe(HubConnectionState.Connected);

        await connection.StopAsync();
    }

    [Fact]
    public async Task ViewerConnect_Succeeds()
    {
        await using var connection = CreateHubConnection("Viewer");
        await connection.StartAsync();

        connection.State.ShouldBe(HubConnectionState.Connected);

        await connection.StopAsync();
    }

    [Fact]
    public async Task AdminConnect_Succeeds()
    {
        await using var connection = CreateHubConnection("Admin");
        await connection.StartAsync();

        connection.State.ShouldBe(HubConnectionState.Connected);

        await connection.StopAsync();
    }

    [Fact]
    public async Task OwnerConnect_Succeeds()
    {
        await using var connection = CreateHubConnection("Owner");
        await connection.StartAsync();

        connection.State.ShouldBe(HubConnectionState.Connected);

        await connection.StopAsync();
    }

    [Fact]
    public async Task Connect_ThenStop_Succeeds()
    {
        await using var connection = CreateHubConnection();
        await connection.StartAsync();

        connection.State.ShouldBe(HubConnectionState.Connected);

        await connection.StopAsync();

        connection.State.ShouldBe(HubConnectionState.Disconnected);
    }

    private HubConnection CreateHubConnection(string? role = null)
    {
        return new HubConnectionBuilder()
            .WithUrl("http://localhost/hubs/notifications", options =>
            {
                options.HttpMessageHandlerFactory = _ => Factory.Server.CreateHandler();
                options.Transports = HttpTransportType.LongPolling;
                if (role != null)
                    options.Headers.Add(TestAuthHandler.RoleHeader, role);
            })
            .Build();
    }
}
