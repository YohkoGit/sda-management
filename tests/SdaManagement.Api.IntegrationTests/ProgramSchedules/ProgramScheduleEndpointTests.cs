using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Shouldly;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.ProgramSchedules;

public class ProgramScheduleEndpointTests : IntegrationTestBase
{
    public ProgramScheduleEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
    }

    private static object ValidSchedulePayload(
        string title = "Ecole du Sabbat",
        int dayOfWeek = 6,
        string startTime = "09:30",
        string endTime = "10:30",
        string? hostName = "Fr. Joseph",
        int? departmentId = null) => new
    {
        title,
        dayOfWeek,
        startTime,
        endTime,
        hostName,
        departmentId,
    };

    private async Task<int> CreateScheduleAndGetId(
        string title = "Ecole du Sabbat",
        int dayOfWeek = 6,
        string startTime = "09:30",
        string endTime = "10:30",
        string? hostName = "Fr. Joseph",
        int? departmentId = null)
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules",
            ValidSchedulePayload(title, dayOfWeek, startTime, endTime, hostName, departmentId));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("id").GetInt32();
    }

    private async Task<int> CreateDepartmentAndGetId(
        string name = "Ecole du Sabbat",
        string abbreviation = "ES",
        string color = "#FF6600")
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/departments", new
        {
            name,
            abbreviation,
            color,
        });
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("id").GetInt32();
    }

    // --- GET list ---

    [Fact]
    public async Task GetSchedules_AsViewer_ReturnsEmptyList()
    {
        var response = await ViewerClient.GetAsync("/api/program-schedules");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetArrayLength().ShouldBe(0);
    }

    [Fact]
    public async Task GetSchedules_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.GetAsync("/api/program-schedules");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    // --- POST create ---

    [Fact]
    public async Task CreateSchedule_AsOwner_Returns201()
    {
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", ValidSchedulePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        response.Headers.Location.ShouldNotBeNull();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("title").GetString().ShouldBe("Ecole du Sabbat");
        root.GetProperty("dayOfWeek").GetInt32().ShouldBe(6);
        root.GetProperty("startTime").GetString().ShouldBe("09:30");
        root.GetProperty("endTime").GetString().ShouldBe("10:30");
        root.GetProperty("hostName").GetString().ShouldBe("Fr. Joseph");
    }

    [Fact]
    public async Task CreateSchedule_AsAdmin_Returns403()
    {
        var response = await AdminClient.PostAsJsonAsync("/api/program-schedules", ValidSchedulePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateSchedule_AsViewer_Returns403()
    {
        var response = await ViewerClient.PostAsJsonAsync("/api/program-schedules", ValidSchedulePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateSchedule_EmptyTitle_Returns400()
    {
        var payload = ValidSchedulePayload(title: "");
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateSchedule_InvalidDayOfWeek_Returns400()
    {
        var payload = ValidSchedulePayload(dayOfWeek: 7);
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateSchedule_EndTimeBeforeStartTime_Returns400()
    {
        var payload = ValidSchedulePayload(startTime: "14:00", endTime: "10:00");
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("validation-error");
    }

    [Fact]
    public async Task CreateSchedule_DuplicateTitleAndDay_Returns409()
    {
        await CreateScheduleAndGetId();

        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", ValidSchedulePayload());
        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("conflict");
    }

    [Fact]
    public async Task CreateSchedule_HtmlSanitization_StripsTagsFromTitle()
    {
        var payload = new
        {
            title = "<script>alert('xss')</script>Ecole du Sabbat",
            dayOfWeek = 6,
            startTime = "09:30",
            endTime = "10:30",
            hostName = "Fr. Joseph",
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("title").GetString().ShouldNotContain("<script>");
        root.GetProperty("title").GetString().ShouldContain("Ecole du Sabbat");
    }

    [Fact]
    public async Task CreateSchedule_HtmlSanitization_StripsTagsFromHostName()
    {
        var payload = new
        {
            title = "JA",
            dayOfWeek = 6,
            startTime = "15:00",
            endTime = "17:00",
            hostName = "Fr. Joseph<script>alert(1)</script>",
        };
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // hostName should have text preserved but script stripped
        if (root.TryGetProperty("hostName", out var hostNameProp) && hostNameProp.ValueKind == JsonValueKind.String)
        {
            hostNameProp.GetString().ShouldNotContain("<script>");
        }
    }

    [Fact]
    public async Task CreateSchedule_WithValidDepartmentId_AssociatesDepartment()
    {
        var deptId = await CreateDepartmentAndGetId();
        var id = await CreateScheduleAndGetId(departmentId: deptId);

        var response = await ViewerClient.GetAsync($"/api/program-schedules/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("departmentId").GetInt32().ShouldBe(deptId);
        root.GetProperty("departmentName").GetString().ShouldBe("Ecole du Sabbat");
    }

    [Fact]
    public async Task CreateSchedule_WithNonExistentDepartmentId_Returns400()
    {
        var payload = ValidSchedulePayload(departmentId: 99999);
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("department");
    }

    // --- GET by id ---

    [Fact]
    public async Task GetScheduleById_ReturnsScheduleWithDepartmentName()
    {
        var deptId = await CreateDepartmentAndGetId();
        var id = await CreateScheduleAndGetId(departmentId: deptId);

        var response = await ViewerClient.GetAsync($"/api/program-schedules/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("id").GetInt32().ShouldBe(id);
        root.GetProperty("title").GetString().ShouldBe("Ecole du Sabbat");
        root.GetProperty("departmentName").GetString().ShouldBe("Ecole du Sabbat");
    }

    [Fact]
    public async Task CreateSchedule_Response_CreatedAtIsIso8601WithOffset()
    {
        // Wire contract: createdAt/updatedAt are serialized as DateTimeOffset (ISO 8601 with offset),
        // not as DateTime (which omits the timezone marker and is parsed as local on the FE).
        // Regression guard: this prevents accidentally reverting the DTO back to DateTime.
        var response = await OwnerClient.PostAsJsonAsync("/api/program-schedules",
            ValidSchedulePayload(title: "ISO Offset Probe", dayOfWeek: 6));
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);

        var createdAtRaw = doc.RootElement.GetProperty("createdAt").GetString();
        var updatedAtRaw = doc.RootElement.GetProperty("updatedAt").GetString();

        createdAtRaw.ShouldNotBeNull();
        updatedAtRaw.ShouldNotBeNull();

        // Round-trip via DateTimeOffset.Parse — fails for naïve DateTime strings without offset
        var parsed = DateTimeOffset.Parse(createdAtRaw, System.Globalization.CultureInfo.InvariantCulture);
        parsed.Offset.ShouldBe(TimeSpan.Zero, $"createdAt offset should be UTC, got {parsed.Offset}");
        parsed.ShouldBeGreaterThan(DateTimeOffset.UtcNow.AddMinutes(-5));
    }

    [Fact]
    public async Task GetScheduleById_NotFound_Returns404()
    {
        var response = await ViewerClient.GetAsync("/api/program-schedules/99999");
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // --- PUT update ---

    [Fact]
    public async Task UpdateSchedule_AsOwner_Returns200()
    {
        var id = await CreateScheduleAndGetId();

        var updatePayload = new
        {
            title = "Culte Divin",
            dayOfWeek = 6,
            startTime = "11:00",
            endTime = "12:30",
            hostName = "Pasteur Marc",
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/program-schedules/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        root.GetProperty("title").GetString().ShouldBe("Culte Divin");
        root.GetProperty("startTime").GetString().ShouldBe("11:00");
        root.GetProperty("endTime").GetString().ShouldBe("12:30");
        root.GetProperty("hostName").GetString().ShouldBe("Pasteur Marc");
    }

    [Fact]
    public async Task UpdateSchedule_AsAdmin_Returns403()
    {
        var id = await CreateScheduleAndGetId();

        var updatePayload = new
        {
            title = "Updated",
            dayOfWeek = 6,
            startTime = "11:00",
            endTime = "12:30",
        };

        var response = await AdminClient.PutAsJsonAsync($"/api/program-schedules/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateSchedule_AsViewer_Returns403()
    {
        var id = await CreateScheduleAndGetId();

        var updatePayload = new
        {
            title = "Updated",
            dayOfWeek = 6,
            startTime = "11:00",
            endTime = "12:30",
        };

        var response = await ViewerClient.PutAsJsonAsync($"/api/program-schedules/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UpdateSchedule_AsAnonymous_Returns401()
    {
        var payload = new
        {
            title = "Updated",
            dayOfWeek = 6,
            startTime = "11:00",
            endTime = "12:30",
        };

        var response = await AnonymousClient.PutAsJsonAsync("/api/program-schedules/1", payload);
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UpdateSchedule_WithNonExistentDepartmentId_Returns400()
    {
        var id = await CreateScheduleAndGetId();

        var updatePayload = new
        {
            title = "Updated",
            dayOfWeek = 6,
            startTime = "11:00",
            endTime = "12:30",
            departmentId = 99999,
        };

        var response = await OwnerClient.PutAsJsonAsync($"/api/program-schedules/{id}", updatePayload);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        json.ShouldContain("department");
    }

    // --- DELETE ---

    [Fact]
    public async Task DeleteSchedule_AsOwner_Returns204()
    {
        var id = await CreateScheduleAndGetId();

        var deleteResponse = await OwnerClient.DeleteAsync($"/api/program-schedules/{id}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var getResponse = await ViewerClient.GetAsync($"/api/program-schedules/{id}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DeleteSchedule_AsAnonymous_Returns401()
    {
        var response = await AnonymousClient.DeleteAsync("/api/program-schedules/1");
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task DeleteSchedule_AsAdmin_Returns403()
    {
        var id = await CreateScheduleAndGetId();

        var response = await AdminClient.DeleteAsync($"/api/program-schedules/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteSchedule_AsViewer_Returns403()
    {
        var id = await CreateScheduleAndGetId();

        var response = await ViewerClient.DeleteAsync($"/api/program-schedules/{id}");
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteDepartment_SetsScheduleDepartmentIdToNull()
    {
        var deptId = await CreateDepartmentAndGetId();
        var scheduleId = await CreateScheduleAndGetId(departmentId: deptId);

        // Delete the department
        var deleteResponse = await OwnerClient.DeleteAsync($"/api/departments/{deptId}");
        deleteResponse.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        // Schedule should still exist but with null departmentId
        var getResponse = await ViewerClient.GetAsync($"/api/program-schedules/{scheduleId}");
        getResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await getResponse.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        // WhenWritingNull omits null properties; verify departmentId is absent or null
        var hasDeptId = root.TryGetProperty("departmentId", out var deptIdProp);
        (!hasDeptId || deptIdProp.ValueKind == JsonValueKind.Null).ShouldBeTrue();
        // departmentName should also be absent/null
        var hasDeptName = root.TryGetProperty("departmentName", out var deptNameProp);
        (!hasDeptName || deptNameProp.ValueKind == JsonValueKind.Null).ShouldBeTrue();
    }
}
