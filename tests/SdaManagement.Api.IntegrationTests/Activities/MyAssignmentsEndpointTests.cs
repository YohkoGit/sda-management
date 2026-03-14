using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class MyAssignmentsEndpointTests : IntegrationTestBase
{
    private int _viewerUserId;
    private int _adminUserId;
    private int _otherUserId;
    private int _guestUserId;
    private int _deptMifemId;
    private int _deptJaId;
    private int _ownerUserId;

    public MyAssignmentsEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        // Create users matching TestAuthHandler email patterns
        var viewer = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);

        _viewerUserId = viewer.Id;
        _adminUserId = admin.Id;
        _ownerUserId = owner.Id;

        // Create additional users for co-assignee tests
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var otherUser = new User
        {
            Email = "other@test.local",
            FirstName = "Jean",
            LastName = "Dupont",
            Role = UserRole.Viewer,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Users.Add(otherUser);

        var guestUser = new User
        {
            Email = "guest-speaker@test.local",
            FirstName = "Pasteur",
            LastName = "Invité",
            Role = UserRole.Viewer,
            IsGuest = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Users.Add(guestUser);
        await dbContext.SaveChangesAsync();

        _otherUserId = otherUser.Id;
        _guestUserId = guestUser.Id;

        // Create departments
        var mifem = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var ja = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#10B981",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Departments.Add(mifem);
        dbContext.Departments.Add(ja);
        await dbContext.SaveChangesAsync();

        _deptMifemId = mifem.Id;
        _deptJaId = ja.Id;

        // Assign admin to MIFEM for scoped access
        await AssignDepartmentToUser(_adminUserId, _deptMifemId);
    }

    [Fact]
    public async Task GetMyAssignments_AsViewer_ReturnsOnlyAssignedActivities()
    {
        // Seed: viewer assigned to 2 activities, 1 activity without assignment
        await CreateTestActivity(_deptMifemId, "Activity With Assignment 1",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Diacre", 2, [_viewerUserId, _otherUserId])]);

        await CreateTestActivity(_deptJaId, "Activity With Assignment 2",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            roles: [("Annonces", 1, [_viewerUserId])]);

        await CreateTestActivity(_deptMifemId, "Activity Without Assignment",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)),
            roles: [("Predicateur", 1, [_otherUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(2);
        items.ShouldAllBe(i => i.ActivityTitle.StartsWith("Activity With Assignment"));
    }

    [Fact]
    public async Task GetMyAssignments_AsViewer_ExcludesPastActivities()
    {
        // Past activity (yesterday)
        await CreateTestActivity(_deptMifemId, "Past Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
            roles: [("Diacre", 1, [_viewerUserId])]);

        // Future activity
        await CreateTestActivity(_deptMifemId, "Future Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Diacre", 1, [_viewerUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].ActivityTitle.ShouldBe("Future Activity");
    }

    [Fact]
    public async Task GetMyAssignments_AsViewer_SortedChronologically()
    {
        await CreateTestActivity(_deptMifemId, "Third (Latest)",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            roles: [("Diacre", 1, [_viewerUserId])]);

        await CreateTestActivity(_deptJaId, "First (Soonest)",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)),
            roles: [("Annonces", 1, [_viewerUserId])]);

        await CreateTestActivity(_deptMifemId, "Second (Middle)",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            roles: [("Ancien", 1, [_viewerUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(3);
        items[0].ActivityTitle.ShouldBe("First (Soonest)");
        items[1].ActivityTitle.ShouldBe("Second (Middle)");
        items[2].ActivityTitle.ShouldBe("Third (Latest)");
    }

    [Fact]
    public async Task GetMyAssignments_AsViewer_IncludesCoAssigneesButNotSelf()
    {
        await CreateTestActivity(_deptMifemId, "Team Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Diacre", 3, [_viewerUserId, _otherUserId, _guestUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);

        var coAssignees = items[0].CoAssignees;
        coAssignees.Count.ShouldBe(2);
        coAssignees.ShouldNotContain(c => c.UserId == _viewerUserId);
        coAssignees.ShouldContain(c => c.FirstName == "Jean" && c.LastName == "Dupont");
    }

    [Fact]
    public async Task GetMyAssignments_AsViewer_NoAssignments_ReturnsEmptyArray()
    {
        // No activities seeded with viewer assignments
        await CreateTestActivity(_deptMifemId, "Other's Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Diacre", 1, [_otherUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.ShouldBeEmpty();
    }

    [Fact]
    public async Task GetMyAssignments_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetMyAssignments_AsAdmin_ReturnsOnlyPersonalAssignments()
    {
        // Admin is assigned to one activity
        await CreateTestActivity(_deptMifemId, "Admin's Assignment",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Ancien", 1, [_adminUserId])]);

        // Viewer is assigned to another activity in admin's department
        await CreateTestActivity(_deptMifemId, "Viewer's Assignment",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            roles: [("Diacre", 1, [_viewerUserId])]);

        var response = await AdminClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].ActivityTitle.ShouldBe("Admin's Assignment");
    }

    [Fact]
    public async Task GetMyAssignments_MultipleRolesOnSameActivity_ReturnsSeparateEntries()
    {
        await CreateTestActivity(_deptMifemId, "Multi-Role Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles:
            [
                ("Diacre", 2, [_viewerUserId, _otherUserId]),
                ("Offrandes", 1, [_viewerUserId]),
            ]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(2);
        items.ShouldContain(i => i.RoleName == "Diacre");
        items.ShouldContain(i => i.RoleName == "Offrandes");
    }

    [Fact]
    public async Task GetMyAssignments_IncludesGuestCoAssignee()
    {
        await CreateTestActivity(_deptMifemId, "Activity With Guest",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Predicateur", 2, [_viewerUserId, _guestUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);

        var coAssignees = items[0].CoAssignees;
        coAssignees.Count.ShouldBe(1);
        coAssignees[0].IsGuest.ShouldBeTrue();
        coAssignees[0].FirstName.ShouldBe("Pasteur");
    }

    [Fact]
    public async Task GetMyAssignments_IncludesBothPublicAndAuthenticatedActivities()
    {
        await CreateTestActivity(_deptMifemId, "Public Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            ActivityVisibility.Public,
            roles: [("Diacre", 1, [_viewerUserId])]);

        await CreateTestActivity(_deptMifemId, "Authenticated Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            ActivityVisibility.Authenticated,
            roles: [("Ancien", 1, [_viewerUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GetMyAssignments_ActivityWithNullDepartment_ReturnsGracefully()
    {
        // Create activity without department directly via DbContext
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        var activity = new Activity
        {
            Title = "No Department Activity",
            DepartmentId = null,
            Date = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            Visibility = ActivityVisibility.Public,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        var role = new ActivityRole
        {
            ActivityId = activity.Id,
            RoleName = "Diacre",
            Headcount = 1,
            SortOrder = 0,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.ActivityRoles.Add(role);
        await dbContext.SaveChangesAsync();

        dbContext.RoleAssignments.Add(new RoleAssignment
        {
            ActivityRoleId = role.Id,
            UserId = _viewerUserId,
            CreatedAt = now,
        });
        await dbContext.SaveChangesAsync();

        var response = await ViewerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].DepartmentName.ShouldBe(string.Empty);
        items[0].DepartmentAbbreviation.ShouldBe(string.Empty);
        items[0].DepartmentColor.ShouldBe(string.Empty);
    }

    [Fact]
    public async Task GetMyAssignments_AsOwner_ReturnsOnlyPersonalAssignments()
    {
        // Owner is assigned to one activity
        await CreateTestActivity(_deptMifemId, "Owner's Assignment",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Ancien", 1, [_ownerUserId])]);

        // Viewer is assigned to another activity
        await CreateTestActivity(_deptMifemId, "Viewer's Assignment",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            roles: [("Diacre", 1, [_viewerUserId])]);

        var response = await OwnerClient.GetAsync("/api/activities/my-assignments");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<MyAssignmentListItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].ActivityTitle.ShouldBe("Owner's Assignment");
    }
}
