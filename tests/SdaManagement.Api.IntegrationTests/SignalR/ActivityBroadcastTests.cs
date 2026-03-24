using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Http.Connections;
using Microsoft.AspNetCore.SignalR.Client;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Notifications;
using SdaManagement.Api.IntegrationTests.Auth;

namespace SdaManagement.Api.IntegrationTests.SignalR;

public class ActivityBroadcastTests : IntegrationTestBase
{
    private int _dept1Id;
    private int _existingActivityId;

    public ActivityBroadcastTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

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

        await AssignDepartmentToUser(admin.Id, _dept1Id);

        // Create a public activity for update/delete tests
        var activity = await CreateTestActivity(_dept1Id, "Existing Activity",
            FutureDateOnly(), ActivityVisibility.Public);
        _existingActivityId = activity.Id;
    }

    [Fact]
    public async Task PublicActivityCreated_BroadcastsToPublicGroup()
    {
        var tcs = new TaskCompletionSource<ActivityNotification>();
        await using var connection = CreateHubConnection();
        connection.On<ActivityNotification>("ActivityCreated", notification => tcs.TrySetResult(notification));
        await connection.StartAsync();

        var response = await AdminClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Sabbath Morning Worship",
            date = FutureDate(35),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _dept1Id,
            visibility = "public",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var notification = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        notification.ActivityId.ShouldBeGreaterThan(0);
        notification.Title.ShouldBe("Sabbath Morning Worship");
        notification.DepartmentId.ShouldBe(_dept1Id);
        notification.UpdatedFields.ShouldBeNull();

        await connection.StopAsync();
    }

    [Fact]
    public async Task AuthenticatedActivityCreated_NotReceivedByAnonymous()
    {
        // Anonymous client should NOT receive the event for an authenticated activity
        var anonymousTcs = new TaskCompletionSource<ActivityNotification>();
        await using var anonymousConn = CreateHubConnection();
        anonymousConn.On<ActivityNotification>("ActivityCreated", n => anonymousTcs.TrySetResult(n));
        await anonymousConn.StartAsync();

        // Admin client in dept1 group SHOULD receive the event
        var adminTcs = new TaskCompletionSource<ActivityNotification>();
        await using var adminConn = CreateHubConnection("Admin");
        adminConn.On<ActivityNotification>("ActivityCreated", n => adminTcs.TrySetResult(n));
        await adminConn.StartAsync();

        // Create authenticated activity in dept1 (goes to "dept:{dept1Id}" group)
        var response = await AdminClient.PostAsJsonAsync("/api/activities", new
        {
            title = "Department Committee Meeting",
            date = FutureDate(35),
            startTime = "14:00:00",
            endTime = "15:00:00",
            departmentId = _dept1Id,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/123456",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        // Admin in dept1 should receive the event (in "dept:{dept1Id}" group)
        var notification = await adminTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        notification.Title.ShouldBe("Department Committee Meeting");

        // Anonymous should NOT receive the event — use a short timeout
        var anonymousReceived = await Task.WhenAny(
            anonymousTcs.Task, Task.Delay(TimeSpan.FromSeconds(1)));
        anonymousReceived.ShouldNotBe(anonymousTcs.Task, "Anonymous client should not receive authenticated activity event");

        await anonymousConn.StopAsync();
        await adminConn.StopAsync();
    }

    [Fact]
    public async Task DepartmentActivityUpdated_BroadcastsToDeptGroup()
    {
        // Admin is in dept1 group — should receive dept-scoped event
        var adminTcs = new TaskCompletionSource<ActivityNotification>();
        await using var adminConn = CreateHubConnection("Admin");
        adminConn.On<ActivityNotification>("ActivityUpdated", n => adminTcs.TrySetResult(n));
        await adminConn.StartAsync();

        // Anonymous is only in public group — should NOT receive dept-scoped event
        var anonTcs = new TaskCompletionSource<ActivityNotification>();
        await using var anonConn = CreateHubConnection();
        anonConn.On<ActivityNotification>("ActivityUpdated", n => anonTcs.TrySetResult(n));
        await anonConn.StartAsync();

        // Update existing activity to authenticated visibility → broadcasts to "dept:{dept1Id}" group
        var response = await AdminClient.PutAsJsonAsync($"/api/activities/{_existingActivityId}?force=true", new
        {
            title = "Updated Department Activity",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _dept1Id,
            visibility = "authenticated",
            concurrencyToken = 1u,
        });
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // Admin in dept1 should receive the event (in "dept:{dept1Id}" group)
        var notification = await adminTcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        notification.ActivityId.ShouldBe(_existingActivityId);
        notification.Title.ShouldBe("Updated Department Activity");
        notification.UpdatedFields.ShouldNotBeNullOrEmpty();

        // Anonymous should NOT receive the event — dept-scoped broadcast
        var anonReceived = await Task.WhenAny(anonTcs.Task, Task.Delay(TimeSpan.FromSeconds(1)));
        anonReceived.ShouldNotBe(anonTcs.Task, "Anonymous client should not receive dept-scoped activity update");

        await adminConn.StopAsync();
        await anonConn.StopAsync();
    }

    [Fact]
    public async Task ActivityDeleted_BroadcastsToCorrectGroup()
    {
        var tcs = new TaskCompletionSource<ActivityDeletedNotification>();
        await using var connection = CreateHubConnection();
        connection.On<ActivityDeletedNotification>("ActivityDeleted", n => tcs.TrySetResult(n));
        await connection.StartAsync();

        var response = await OwnerClient.DeleteAsync($"/api/activities/{_existingActivityId}");
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var notification = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
        notification.ActivityId.ShouldBe(_existingActivityId);
        notification.DepartmentId.ShouldBe(_dept1Id);

        await connection.StopAsync();
    }

    [Fact]
    public async Task NoListeners_RestApiStillSucceeds()
    {
        // With no SignalR clients connected, broadcasting to an empty group is a no-op — REST should succeed
        var response = await AdminClient.PostAsJsonAsync("/api/activities", new
        {
            title = "No Listeners Activity",
            date = FutureDate(40),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _dept1Id,
            visibility = "public",
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
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
