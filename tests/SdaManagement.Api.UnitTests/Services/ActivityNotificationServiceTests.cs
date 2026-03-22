using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Shouldly;
using SdaManagement.Api.Dtos.Activity;
using SdaManagement.Api.Dtos.Notifications;
using SdaManagement.Api.Hubs;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.UnitTests.Services;

public class ActivityNotificationServiceTests
{
    private readonly IHubContext<NotificationHub> _hubContext;
    private readonly IClientProxy _clientProxy;
    private readonly ILogger<ActivityNotificationService> _logger;
    private readonly ActivityNotificationService _sut;
    private readonly List<(string Method, object[] Args)> _sentMessages = [];

    public ActivityNotificationServiceTests()
    {
        _hubContext = Substitute.For<IHubContext<NotificationHub>>();
        _clientProxy = Substitute.For<IClientProxy>();
        _logger = Substitute.For<ILogger<ActivityNotificationService>>();

        // Capture sent messages for assertion
        _clientProxy
            .SendCoreAsync(Arg.Any<string>(), Arg.Any<object[]>(), Arg.Any<CancellationToken>())
            .Returns(Task.CompletedTask)
            .AndDoes(ci => _sentMessages.Add((ci.ArgAt<string>(0), ci.ArgAt<object[]>(1))));

        var hubClients = Substitute.For<IHubClients>();
        hubClients.Group(Arg.Any<string>()).Returns(_clientProxy);
        _hubContext.Clients.Returns(hubClients);

        _sut = new ActivityNotificationService(_hubContext, _logger);
    }

    [Fact]
    public async Task PublicActivity_BroadcastsToPublicGroup()
    {
        var activity = CreateActivityResponse(visibility: "public", departmentId: 1);

        await _sut.NotifyActivityCreatedAsync(activity);

        _hubContext.Clients.Received(1).Group("public");
        _sentMessages.Count.ShouldBe(1);
        _sentMessages[0].Method.ShouldBe("ActivityCreated");
        var payload = _sentMessages[0].Args[0].ShouldBeOfType<ActivityNotification>();
        payload.UpdatedFields.ShouldBeNull();
    }

    [Fact]
    public async Task AuthenticatedActivityWithDept_BroadcastsToDeptGroup()
    {
        var activity = CreateActivityResponse(visibility: "authenticated", departmentId: 5);

        await _sut.NotifyActivityCreatedAsync(activity);

        _hubContext.Clients.Received(1).Group("dept:5");
    }

    [Fact]
    public async Task AuthenticatedActivityNoDept_BroadcastsToAuthenticatedGroup()
    {
        var activity = CreateActivityResponse(visibility: "authenticated", departmentId: null);

        await _sut.NotifyActivityCreatedAsync(activity);

        _hubContext.Clients.Received(1).Group("authenticated");
    }

    [Fact]
    public async Task UpdatedActivity_IncludesUpdatedFields()
    {
        var activity = CreateActivityResponse(visibility: "public", departmentId: 1);

        await _sut.NotifyActivityUpdatedAsync(activity, "title,visibility");

        _sentMessages.Count.ShouldBe(1);
        _sentMessages[0].Method.ShouldBe("ActivityUpdated");
        var payload = _sentMessages[0].Args[0].ShouldBeOfType<ActivityNotification>();
        payload.UpdatedFields.ShouldBe("title,visibility");
    }

    [Fact]
    public async Task UpdatedActivity_NullUpdatedFields_WhenNoChanges()
    {
        var activity = CreateActivityResponse(visibility: "public", departmentId: 1);

        await _sut.NotifyActivityUpdatedAsync(activity, null);

        _sentMessages.Count.ShouldBe(1);
        var payload = _sentMessages[0].Args[0].ShouldBeOfType<ActivityNotification>();
        payload.UpdatedFields.ShouldBeNull();
    }

    [Fact]
    public async Task DeletedActivity_PublicVisibility_BroadcastsToPublicGroup()
    {
        await _sut.NotifyActivityDeletedAsync(1, 1, "Public");

        _hubContext.Clients.Received(1).Group("public");
        _sentMessages.Count.ShouldBe(1);
        _sentMessages[0].Method.ShouldBe("ActivityDeleted");
        _sentMessages[0].Args[0].ShouldBeOfType<ActivityDeletedNotification>();
    }

    [Fact]
    public async Task DeletedActivity_AuthenticatedWithDept_BroadcastsToDeptGroup()
    {
        await _sut.NotifyActivityDeletedAsync(1, 3, "Authenticated");

        _hubContext.Clients.Received(1).Group("dept:3");
    }

    [Fact]
    public async Task DeletedActivity_AuthenticatedNoDept_BroadcastsToAuthenticatedGroup()
    {
        await _sut.NotifyActivityDeletedAsync(1, null, "Authenticated");

        _hubContext.Clients.Received(1).Group("authenticated");
    }

    [Fact]
    public async Task BroadcastException_DoesNotPropagate()
    {
        _clientProxy
            .SendCoreAsync(Arg.Any<string>(), Arg.Any<object[]>(), Arg.Any<CancellationToken>())
            .ThrowsAsync(new InvalidOperationException("Hub failure"));

        var activity = CreateActivityResponse(visibility: "public", departmentId: 1);

        // Should not throw — error isolation
        await Should.NotThrowAsync(() => _sut.NotifyActivityCreatedAsync(activity));
    }

    [Theory]
    [InlineData("public", "public")]
    [InlineData("Public", "public")]
    [InlineData("PUBLIC", "public")]
    [InlineData("authenticated", "authenticated")]
    [InlineData("Authenticated", "authenticated")]
    public void ResolveGroup_HandlesVisibilityCaseInsensitively(string visibility, string expectedGroup)
    {
        var group = ActivityNotificationService.ResolveGroup(visibility, null);
        group.ShouldBe(expectedGroup);
    }

    private static ActivityResponse CreateActivityResponse(string visibility, int? departmentId)
    {
        return new ActivityResponse
        {
            Id = 1,
            Title = "Test Activity",
            Date = new DateOnly(2026, 3, 22),
            DepartmentId = departmentId,
            Visibility = visibility,
            ConcurrencyToken = 1,
        };
    }
}
