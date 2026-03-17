using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class ActivityDetailEndpointTests : IntegrationTestBase
{
    private int _deptId;
    private int _viewerUserId;
    private int _guestUserId;
    private int _adminUserId;

    public ActivityDetailEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        _adminUserId = admin.Id;
        var viewer = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        _viewerUserId = viewer.Id;

        // Create a guest user
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var guest = new User
        {
            Email = "guest@test.local",
            FirstName = "Pasteur",
            LastName = "Invité",
            Role = UserRole.Viewer,
            IsGuest = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Users.Add(guest);
        await dbContext.SaveChangesAsync();
        _guestUserId = guest.Id;

        var dept = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#14B8A6",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Departments.Add(dept);
        await dbContext.SaveChangesAsync();
        _deptId = dept.Id;

        await AssignDepartmentToUser(_adminUserId, _deptId);
    }

    [Fact]
    public async Task GetById_AsViewer_ReturnsActivity()
    {
        var activity = await CreateTestActivity(
            _deptId,
            "Culte Divin",
            roles: [
                ("Predicateur", 1, new List<int> { _viewerUserId }),
                ("Ancien de Service", 1, null),
                ("Diacres", 3, new List<int> { _viewerUserId }),
            ]);

        var response = await ViewerClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBe(activity.Id);
        root.GetProperty("title").GetString().ShouldBe("Culte Divin");
        root.GetProperty("staffingStatus").GetString().ShouldBe("CriticalGap");
    }

    [Fact]
    public async Task GetById_AsViewer_IncludesDepartmentAbbreviationAndColor()
    {
        var activity = await CreateTestActivity(_deptId, "Dept Fields Test");

        var response = await ViewerClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("departmentAbbreviation").GetString().ShouldBe("JA");
        root.GetProperty("departmentColor").GetString().ShouldBe("#14B8A6");
        root.GetProperty("departmentName").GetString().ShouldBe("Jeunesse Adventiste");
    }

    [Fact]
    public async Task GetById_AsAnonymous_Returns401()
    {
        var activity = await CreateTestActivity(_deptId, "Anonymous Test");

        var response = await AnonymousClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetById_AsViewer_ReturnsFullRosterWithAssignees()
    {
        var activity = await CreateTestActivity(
            _deptId,
            "Roster Test",
            roles: [
                ("Predicateur", 1, new List<int> { _viewerUserId }),
                ("Diacres", 2, new List<int> { _viewerUserId }),
            ]);

        var response = await ViewerClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var roles = doc.RootElement.GetProperty("roles");

        roles.GetArrayLength().ShouldBe(2);
        roles[0].GetProperty("roleName").GetString().ShouldBe("Predicateur");
        roles[0].GetProperty("headcount").GetInt32().ShouldBe(1);
        roles[0].GetProperty("assignments").GetArrayLength().ShouldBe(1);
        roles[0].GetProperty("assignments")[0].GetProperty("firstName").GetString().ShouldBe("Test");
        roles[0].GetProperty("assignments")[0].GetProperty("lastName").GetString().ShouldBe("Viewer");
    }

    [Fact]
    public async Task GetById_NonExistentActivity_Returns404()
    {
        var response = await ViewerClient.GetAsync("/api/activities/99999");
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetById_ActivityWithGuestAssignee_IncludesIsGuestFlag()
    {
        var activity = await CreateTestActivity(
            _deptId,
            "Guest Test",
            roles: [("Predicateur", 1, new List<int> { _guestUserId })]);

        var response = await ViewerClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var assignments = doc.RootElement.GetProperty("roles")[0].GetProperty("assignments");

        assignments[0].GetProperty("isGuest").GetBoolean().ShouldBeTrue();
        assignments[0].GetProperty("firstName").GetString().ShouldBe("Pasteur");
        assignments[0].GetProperty("lastName").GetString().ShouldBe("Invité");
    }

    [Fact]
    public async Task GetById_StaffingStatus_ReturnsCorrectValue()
    {
        // Fully staffed: 1/1 predicateur, 1/1 ancien
        var activity = await CreateTestActivity(
            _deptId,
            "Staffing Test",
            roles: [
                ("Predicateur", 1, new List<int> { _viewerUserId }),
                ("Ancien de Service", 1, new List<int> { _viewerUserId }),
            ]);

        var response = await ViewerClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("staffingStatus").GetString().ShouldBe("FullyStaffed");
    }

    [Fact]
    public async Task GetById_ActivityWithNullDepartment_ReturnsGracefully()
    {
        // Create activity directly with null department (bypassing helper which requires departmentId)
        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var now = DateTime.UtcNow;

        var activity = new Activity
        {
            Title = "No Department Activity",
            DepartmentId = null,
            Date = DateOnly.FromDateTime(now.AddDays(7)),
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            Visibility = ActivityVisibility.Public,
            CreatedAt = now,
            UpdatedAt = now,
        };
        dbContext.Activities.Add(activity);
        await dbContext.SaveChangesAsync();

        var response = await ViewerClient.GetAsync($"/api/activities/{activity.Id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("departmentName").GetString().ShouldBe(string.Empty);
        root.GetProperty("departmentAbbreviation").GetString().ShouldBe(string.Empty);
        root.GetProperty("departmentColor").GetString().ShouldBe(string.Empty);
        // departmentId is omitted from JSON when null (WhenWritingNull serialization policy)
        root.TryGetProperty("departmentId", out _).ShouldBeFalse();
    }
}
