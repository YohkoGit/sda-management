using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Activity;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class DashboardActivitiesEndpointTests : IntegrationTestBase
{
    private int _viewerUserId;
    private int _adminUserId;
    private int _ownerUserId;
    private int _otherUserId;
    private int _deptMifemId;
    private int _deptJaId;
    private int _deptDiaconatId;

    public DashboardActivitiesEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        var viewer = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);

        _viewerUserId = viewer.Id;
        _adminUserId = admin.Id;
        _ownerUserId = owner.Id;

        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var otherUser = new User
        {
            Email = "other@test.local",
            FirstName = "Pasteur",
            LastName = "Vicuna",
            Role = UserRole.Viewer,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Users.Add(otherUser);
        await dbContext.SaveChangesAsync();
        _otherUserId = otherUser.Id;

        // Create departments with abbreviations and colors
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
        var diaconat = new Department
        {
            Name = "Diaconat",
            Abbreviation = "DIA",
            Color = "#F59E0B",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Departments.Add(mifem);
        dbContext.Departments.Add(ja);
        dbContext.Departments.Add(diaconat);
        await dbContext.SaveChangesAsync();

        _deptMifemId = mifem.Id;
        _deptJaId = ja.Id;
        _deptDiaconatId = diaconat.Id;

        // Assign admin to MIFEM and Diaconat (scoped access)
        await AssignDepartmentToUser(_adminUserId, _deptMifemId);
        await AssignDepartmentToUser(_adminUserId, _deptDiaconatId);
    }

    [Fact]
    public async Task GetDashboard_AsViewer_ReturnsAllUpcomingActivities()
    {
        await CreateTestActivity(_deptMifemId, "MIFEM Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)));
        await CreateTestActivity(_deptJaId, "JA Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)));
        await CreateTestActivity(_deptDiaconatId, "Diaconat Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)));

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(3);
    }

    [Fact]
    public async Task GetDashboard_AsAdmin_ReturnsOnlyAssignedDepartmentActivities()
    {
        // Admin assigned to MIFEM and Diaconat — should NOT see JA
        await CreateTestActivity(_deptMifemId, "MIFEM Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)));
        await CreateTestActivity(_deptDiaconatId, "Diaconat Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)));
        await CreateTestActivity(_deptJaId, "JA Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)));

        var response = await AdminClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(2);
        items.ShouldContain(i => i.Title == "MIFEM Activity");
        items.ShouldContain(i => i.Title == "Diaconat Activity");
        items.ShouldNotContain(i => i.Title == "JA Activity");
    }

    [Fact]
    public async Task GetDashboard_AsOwner_ReturnsAllActivities()
    {
        await CreateTestActivity(_deptMifemId, "MIFEM Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)));
        await CreateTestActivity(_deptJaId, "JA Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)));
        await CreateTestActivity(_deptDiaconatId, "Diaconat Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(21)));

        var response = await OwnerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(3);
    }

    [Fact]
    public async Task GetDashboard_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetDashboard_ExcludesPastActivities()
    {
        await CreateTestActivity(_deptMifemId, "Past Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)));
        await CreateTestActivity(_deptMifemId, "Future Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)));

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].Title.ShouldBe("Future Activity");
    }

    [Fact]
    public async Task GetDashboard_SortedChronologically()
    {
        await CreateTestActivity(_deptMifemId, "Third",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)));
        await CreateTestActivity(_deptJaId, "First",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(3)));
        await CreateTestActivity(_deptDiaconatId, "Second",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)));

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(3);
        items[0].Title.ShouldBe("First");
        items[1].Title.ShouldBe("Second");
        items[2].Title.ShouldBe("Third");
    }

    [Fact]
    public async Task GetDashboard_LimitedTo20()
    {
        for (var i = 0; i < 25; i++)
        {
            await CreateTestActivity(_deptMifemId, $"Activity {i}",
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(i + 1)));
        }

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(20);
    }

    [Fact]
    public async Task GetDashboard_TodayIsIncluded()
    {
        await CreateTestActivity(_deptMifemId, "Today Activity",
            DateOnly.FromDateTime(DateTime.UtcNow));

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.ShouldContain(i => i.Title == "Today Activity");
    }

    [Fact]
    public async Task GetDashboard_IncludesPredicateurInfo()
    {
        await CreateTestActivity(_deptMifemId, "Activity With Predicateur",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Prédicateur", 1, [_otherUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].PredicateurName.ShouldBe("Pasteur Vicuna");
        // Avatar URL is null in test env (no file on disk) — documents the limitation
        items[0].PredicateurAvatarUrl.ShouldBeNull();
    }

    [Fact]
    public async Task GetDashboard_NoPredicateurRole_ReturnsNullPredicateur()
    {
        await CreateTestActivity(_deptMifemId, "Activity Without Predicateur",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Diacre", 1, [_otherUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].PredicateurName.ShouldBeNull();
        items[0].PredicateurAvatarUrl.ShouldBeNull();
    }

    [Fact]
    public async Task GetDashboard_IncludesStaffingStatus()
    {
        // Fully staffed: 2 slots, 2 assigned
        await CreateTestActivity(_deptMifemId, "Fully Staffed",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            roles: [("Diacre", 2, [_viewerUserId, _otherUserId])]);

        // Partially staffed: 3 slots, 1 assigned
        await CreateTestActivity(_deptJaId, "Partially Staffed",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            roles: [("Annonces", 3, [_viewerUserId])]);

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(2);
        items[0].StaffingStatus.ShouldBe("FullyStaffed");
        items[1].StaffingStatus.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public async Task GetDashboard_IncludesBothVisibilities()
    {
        await CreateTestActivity(_deptMifemId, "Public Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
            ActivityVisibility.Public);
        await CreateTestActivity(_deptMifemId, "Authenticated Activity",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14)),
            ActivityVisibility.Authenticated);

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(2);
    }

    [Fact]
    public async Task GetDashboard_NullDepartment_HandledGracefully()
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

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.ShouldContain(i => i.Title == "No Department Activity");
        var item = items.First(i => i.Title == "No Department Activity");
        item.DepartmentName.ShouldBe(string.Empty);
        item.DepartmentAbbreviation.ShouldBe(string.Empty);
        item.DepartmentColor.ShouldBe(string.Empty);
    }

    [Fact]
    public async Task GetDashboard_IncludesDepartmentAbbreviation()
    {
        await CreateTestActivity(_deptJaId, "JA Event",
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)));

        var response = await ViewerClient.GetAsync("/api/activities/dashboard");

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var items = await response.Content.ReadFromJsonAsync<List<DashboardActivityItem>>();
        items.ShouldNotBeNull();
        items.Count.ShouldBe(1);
        items[0].DepartmentAbbreviation.ShouldBe("JA");
        items[0].DepartmentColor.ShouldBe("#10B981");
    }
}
