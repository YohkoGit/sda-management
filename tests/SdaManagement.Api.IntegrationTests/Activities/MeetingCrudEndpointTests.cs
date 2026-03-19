using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class MeetingCrudEndpointTests : IntegrationTestBase
{
    private int _deptMifemId;
    private int _deptJaId;

    public MeetingCrudEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

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

        // Admin assigned to MIFEM only
        await AssignDepartmentToUser(admin.Id, _deptMifemId);
    }

    private object ZoomMeetingPayload(int? departmentId = null) => new
    {
        title = "Réunion du comité",
        date = "2026-03-25",
        startTime = "19:00:00",
        endTime = "20:30:00",
        departmentId = departmentId ?? _deptMifemId,
        visibility = "authenticated",
        isMeeting = true,
        meetingType = "zoom",
        zoomLink = "https://zoom.us/j/123456789",
    };

    private object PhysicalMeetingPayload(int? departmentId = null) => new
    {
        title = "Réunion de planification",
        date = "2026-03-27",
        startTime = "18:30:00",
        endTime = "20:00:00",
        departmentId = departmentId ?? _deptMifemId,
        visibility = "authenticated",
        isMeeting = true,
        meetingType = "physical",
        locationName = "Salle communautaire",
        locationAddress = "123 rue Principale",
    };

    [Fact]
    public async Task CreateZoomMeeting_AsOwner_ReturnsCreatedWithMeetingFields()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("isMeeting").GetBoolean().ShouldBeTrue();
        root.GetProperty("meetingType").GetString().ShouldBe("zoom");
        root.GetProperty("zoomLink").GetString().ShouldBe("https://zoom.us/j/123456789");
        root.GetProperty("roles").GetArrayLength().ShouldBe(0);
        root.GetProperty("visibility").GetString().ShouldBe("authenticated");
    }

    [Fact]
    public async Task CreatePhysicalMeeting_AsOwner_ReturnsCreatedWithLocationFields()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", PhysicalMeetingPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("isMeeting").GetBoolean().ShouldBeTrue();
        root.GetProperty("meetingType").GetString().ShouldBe("physical");
        root.GetProperty("locationName").GetString().ShouldBe("Salle communautaire");
        root.GetProperty("locationAddress").GetString().ShouldBe("123 rue Principale");
        root.GetProperty("roles").GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task CreateMeeting_AsAdmin_WithScope_ReturnsCreated()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload(_deptMifemId));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateMeeting_AsAdmin_WithoutScope_Returns403()
    {
        // Admin is assigned to MIFEM only, trying JA
        var response = await AdminClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload(_deptJaId));
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateMeeting_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateMeeting_AsOwner_InAnyDepartment_ReturnsCreated()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload(_deptJaId));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateMeeting_WithPublicVisibility_Returns400()
    {
        var payload = new
        {
            title = "Public Meeting (invalid)",
            date = "2026-03-25",
            startTime = "19:00:00",
            endTime = "20:30:00",
            departmentId = _deptMifemId,
            visibility = "public",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/123456789",
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task UpdateMeeting_ZoomToPhysical_AsOwner_ReturnsOk()
    {
        // Create a Zoom meeting first
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload());
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("id").GetInt32();
        var token = createDoc.RootElement.GetProperty("concurrencyToken").GetUInt32();

        // Update to physical
        var updatePayload = new
        {
            title = "Réunion physique",
            date = "2026-03-25",
            startTime = "19:00:00",
            endTime = "20:30:00",
            departmentId = _deptMifemId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "physical",
            locationName = "Grande salle",
            concurrencyToken = token,
        };

        var updateResponse = await OwnerClient.PutAsJsonAsync($"/api/activities/{id}", updatePayload);
        updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updateJson = await updateResponse.Content.ReadAsStringAsync();
        using var updateDoc = JsonDocument.Parse(updateJson);
        var root = updateDoc.RootElement;

        root.GetProperty("meetingType").GetString().ShouldBe("physical");
        root.GetProperty("locationName").GetString().ShouldBe("Grande salle");
        root.TryGetProperty("zoomLink", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task DeleteMeeting_AsOwner_ReturnsNoContent()
    {
        var createResponse = await OwnerClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload());
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);
        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var id = createDoc.RootElement.GetProperty("id").GetInt32();

        var deleteResponse = await OwnerClient.DeleteAsync($"/api/activities/{id}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        // Verify it's gone
        var getResponse = await OwnerClient.GetAsync($"/api/activities/{id}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task MeetingsHaveNoRoles_EvenWhenRolesProvided()
    {
        // Send roles with a meeting — they should be ignored
        var payload = new
        {
            title = "Meeting with roles (should be ignored)",
            date = "2026-03-25",
            startTime = "19:00:00",
            endTime = "20:30:00",
            departmentId = _deptMifemId,
            visibility = "authenticated",
            isMeeting = true,
            meetingType = "zoom",
            zoomLink = "https://zoom.us/j/123456789",
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("roles").GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task RegularActivity_RemainsUnaffected_ByMeetingChanges()
    {
        // Create a regular activity
        var activityPayload = new
        {
            title = "Culte du Sabbat",
            date = "2026-03-07",
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
        };

        var response = await OwnerClient.PostAsJsonAsync("/api/activities", activityPayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("isMeeting").GetBoolean().ShouldBeFalse();
        root.TryGetProperty("meetingType", out _).ShouldBeFalse();
        root.TryGetProperty("zoomLink", out _).ShouldBeFalse();
        root.TryGetProperty("locationName", out _).ShouldBeFalse();
        root.TryGetProperty("locationAddress", out _).ShouldBeFalse();
    }

    [Fact]
    public async Task GetActivitiesList_IncludesMeetingFields()
    {
        // Create a Zoom meeting
        await OwnerClient.PostAsJsonAsync("/api/activities", ZoomMeetingPayload());

        var response = await OwnerClient.GetAsync($"/api/activities?departmentId={_deptMifemId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.EnumerateArray().ToList();
        items.Count.ShouldBeGreaterThanOrEqualTo(1);

        var meeting = items.First(i => i.GetProperty("isMeeting").GetBoolean());
        meeting.GetProperty("meetingType").GetString().ShouldBe("zoom");
    }
}
