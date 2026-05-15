using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Activities;

/// <summary>
/// Regression coverage for project_guest_inline_creation_bug (2026-05-12):
/// when an ADMIN creates a guest user inline during role assignment, the guest is created
/// at the API but is reportedly never attached to the activity role. This test exercises the
/// full contract end-to-end: create activity -> POST /api/users/guests -> PUT activity with
/// the new guest in roles[].assignments[], and asserts the RoleAssignment row exists.
///
/// If this test fails on the PUT-with-guest path, the bug is reproducible on the backend.
/// If it passes, the bug lives only in the frontend form state (the FE never sends the
/// guest id in the role assignment list).
/// </summary>
public class InlineGuestAssignmentTests : IntegrationTestBase
{
    private int _adminUserId;
    private int _deptMifemId;

    public InlineGuestAssignmentTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    protected override async Task SeedTestData()
    {
        await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        _adminUserId = admin.Id;

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var mifem = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Departments.Add(mifem);
        await db.SaveChangesAsync();
        _deptMifemId = mifem.Id;

        await AssignDepartmentToUser(_adminUserId, _deptMifemId);
    }

    [Fact]
    public async Task CreateGuestInline_ThenPutActivity_AssignmentLanded()
    {
        // 1) Create the activity first (mirrors the FE flow: user opens an existing activity
        // editor, then uses the inline guest form to add a new person to a role).
        var createPayload = new
        {
            title = "Culte du Sabbat",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            roles = new[]
            {
                new { roleName = "Predicateur", headcount = 1, assignments = Array.Empty<object>() },
            },
        };
        var createResponse = await AdminClient.PostAsJsonAsync("/api/activities", createPayload);
        createResponse.StatusCode.ShouldBe(HttpStatusCode.Created);

        var createJson = await createResponse.Content.ReadAsStringAsync();
        using var createDoc = JsonDocument.Parse(createJson);
        var activityId = createDoc.RootElement.GetProperty("id").GetInt32();
        var concurrencyToken = createDoc.RootElement.GetProperty("concurrencyToken").GetUInt32();
        var roleId = createDoc.RootElement.GetProperty("roles")[0].GetProperty("id").GetInt32();

        // 2) Inline guest creation: POST /api/users/guests
        var guestResponse = await AdminClient.PostAsJsonAsync(
            "/api/users/guests", new { name = "Pasteur Damien" });
        guestResponse.StatusCode.ShouldBe(HttpStatusCode.Created);

        var guestJson = await guestResponse.Content.ReadAsStringAsync();
        using var guestDoc = JsonDocument.Parse(guestJson);
        var guestUserId = guestDoc.RootElement.GetProperty("userId").GetInt32();
        guestUserId.ShouldBeGreaterThan(0);

        // 3) Guest user exists in the database (basic precondition).
        using (var verifyScope = Factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var guest = await db.Users.FirstOrDefaultAsync(u => u.Id == guestUserId);
            guest.ShouldNotBeNull();
            guest.IsGuest.ShouldBeTrue();
        }

        // 4) PUT the activity with the new guest attached to the existing role.
        // This is the exact backend contract the inline form is supposed to drive.
        var updatePayload = new
        {
            title = "Culte du Sabbat",
            date = FutureDate(),
            startTime = "10:00:00",
            endTime = "12:00:00",
            departmentId = _deptMifemId,
            visibility = "public",
            concurrencyToken,
            roles = new[]
            {
                new
                {
                    id = roleId,
                    roleName = "Predicateur",
                    headcount = 1,
                    assignments = new[] { new { userId = guestUserId } },
                },
            },
        };
        var updateResponse = await AdminClient.PutAsJsonAsync(
            $"/api/activities/{activityId}", updatePayload);
        updateResponse.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updateJson = await updateResponse.Content.ReadAsStringAsync();
        using var updateDoc = JsonDocument.Parse(updateJson);
        var responseAssignments = updateDoc.RootElement
            .GetProperty("roles")[0]
            .GetProperty("assignments");
        responseAssignments.GetArrayLength().ShouldBe(1, "PUT response must report the guest assignment");
        responseAssignments[0].GetProperty("userId").GetInt32().ShouldBe(guestUserId);
        responseAssignments[0].GetProperty("isGuest").GetBoolean().ShouldBeTrue();

        // 5) Final ground-truth: the RoleAssignment row exists in the database for this guest.
        // This is the assertion that catches the reported bug — if the PUT response says the
        // assignment landed but the DB row is missing, the contract is broken.
        using (var verifyScope = Factory.Services.CreateScope())
        {
            var db = verifyScope.ServiceProvider.GetRequiredService<AppDbContext>();
            var assignment = await db.RoleAssignments
                .FirstOrDefaultAsync(ra => ra.ActivityRoleId == roleId && ra.UserId == guestUserId);
            assignment.ShouldNotBeNull(
                "RoleAssignment for the inline-created guest must be persisted (regression for "
                + "project_guest_inline_creation_bug). If this fails, the bug is backend; if it "
                + "passes, the bug is FE form-state only.");
        }
    }
}
