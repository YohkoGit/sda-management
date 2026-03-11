using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Shouldly;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.IntegrationTests.Activities;

public class ActivityStaffingEndpointTests : IntegrationTestBase
{
    private int _deptId;
    private int _userId1;
    private int _userId2;
    private int _userId3;

    public ActivityStaffingEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var user1 = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        var user2 = await CreateTestUser("staffing-user2@test.local", UserRole.Viewer);
        var user3 = await CreateTestUser("staffing-user3@test.local", UserRole.Viewer);

        _userId1 = user1.Id;
        _userId2 = user2.Id;
        _userId3 = user3.Id;

        using var scope = Factory.Services.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var dept = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        dbContext.Departments.Add(dept);
        await dbContext.SaveChangesAsync();
        _deptId = dept.Id;
    }

    [Fact]
    public async Task GetAll_ReturnsStaffingFields()
    {
        await CreateTestActivity(_deptId, title: "Staffing Fields Test", roles:
        [
            ("Predicateur", 1, [_userId1]),
            ("Diacres", 2, [_userId2]),
        ]);

        var response = await OwnerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement.EnumerateArray()
            .First(i => i.GetProperty("title").GetString() == "Staffing Fields Test");

        item.GetProperty("totalHeadcount").GetInt32().ShouldBe(3);
        item.GetProperty("assignedCount").GetInt32().ShouldBe(2);
        item.GetProperty("staffingStatus").GetString().ShouldNotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetAll_FullyStaffed_ReturnsCorrectStatus()
    {
        await CreateTestActivity(_deptId, title: "Fully Staffed", roles:
        [
            ("Predicateur", 1, [_userId1]),
            ("Ancien de Service", 1, [_userId2]),
        ]);

        var response = await OwnerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement.EnumerateArray()
            .First(i => i.GetProperty("title").GetString() == "Fully Staffed");

        item.GetProperty("staffingStatus").GetString().ShouldBe("FullyStaffed");
        item.GetProperty("totalHeadcount").GetInt32().ShouldBe(2);
        item.GetProperty("assignedCount").GetInt32().ShouldBe(2);
    }

    [Fact]
    public async Task GetAll_ZeroRoles_ReturnsNoRolesStatus()
    {
        await CreateTestActivity(_deptId, title: "No Roles");

        var response = await OwnerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement.EnumerateArray()
            .First(i => i.GetProperty("title").GetString() == "No Roles");

        item.GetProperty("staffingStatus").GetString().ShouldBe("NoRoles");
        item.GetProperty("totalHeadcount").GetInt32().ShouldBe(0);
        item.GetProperty("assignedCount").GetInt32().ShouldBe(0);
    }

    [Fact]
    public async Task GetAll_CriticalGapPredicateur_ReturnsCorrectStatus()
    {
        await CreateTestActivity(_deptId, title: "Critical Gap", roles:
        [
            ("Predicateur", 1, null),
            ("Diacres", 2, [_userId1, _userId2]),
        ]);

        var response = await OwnerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement.EnumerateArray()
            .First(i => i.GetProperty("title").GetString() == "Critical Gap");

        item.GetProperty("staffingStatus").GetString().ShouldBe("CriticalGap");
    }

    [Fact]
    public async Task GetAll_PartiallyStaffed_ReturnsCorrectStatus()
    {
        await CreateTestActivity(_deptId, title: "Partial", roles:
        [
            ("Predicateur", 1, [_userId1]),
            ("Diacres", 3, [_userId2]),
        ]);

        var response = await OwnerClient.GetAsync("/api/activities");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var item = doc.RootElement.EnumerateArray()
            .First(i => i.GetProperty("title").GetString() == "Partial");

        item.GetProperty("staffingStatus").GetString().ShouldBe("PartiallyStaffed");
    }
}
