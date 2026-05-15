using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

/// <summary>
/// Unit tests for the helpers extracted out of <c>ActivityService.UpdateAsync</c>
/// during audit follow-up #3. The async helpers (ReconcileRolesAsync,
/// ApplyScalarFieldUpdates) remain DbContext/sanitizer-bound and are covered by
/// the integration suite; this file pins the pure-function pieces.
/// </summary>
public class ActivityServiceUpdateAsyncSplitTests
{
    private static Activity BuildActivity(
        string title = "Culte",
        DateOnly? date = null,
        TimeOnly? startTime = null,
        TimeOnly? endTime = null,
        int? departmentId = 1,
        ActivityVisibility visibility = ActivityVisibility.Public,
        string? description = null) => new()
    {
        Title = title,
        Date = date ?? new DateOnly(2026, 5, 16),
        StartTime = startTime ?? new TimeOnly(10, 0),
        EndTime = endTime ?? new TimeOnly(12, 0),
        DepartmentId = departmentId,
        Visibility = visibility,
        Description = description,
    };

    [Fact]
    public void ActivitySnapshot_Capture_StoresPreUpdateFieldValues()
    {
        var activity = BuildActivity(
            title: "Original",
            departmentId: 7,
            visibility: ActivityVisibility.Authenticated,
            description: "before");

        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);

        snapshot.Title.ShouldBe("Original");
        snapshot.Date.ShouldBe(new DateOnly(2026, 5, 16));
        snapshot.StartTime.ShouldBe(new TimeOnly(10, 0));
        snapshot.EndTime.ShouldBe(new TimeOnly(12, 0));
        snapshot.DepartmentId.ShouldBe(7);
        snapshot.Visibility.ShouldBe(ActivityVisibility.Authenticated);
        snapshot.Description.ShouldBe("before");
    }

    [Fact]
    public void ActivitySnapshot_Capture_PreservesNullDepartmentId()
    {
        var activity = BuildActivity(departmentId: null);
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        snapshot.DepartmentId.ShouldBeNull();
    }

    [Fact]
    public void ActivitySnapshot_DoesNotMutateWhenActivityChangesLater()
    {
        // The snapshot is a value type (record struct). Mutating the
        // activity after capture must not leak into the snapshot.
        var activity = BuildActivity(title: "Before");
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.Title = "After";
        snapshot.Title.ShouldBe("Before");
    }

    [Fact]
    public void ComputeChangedFields_NoChanges_NoRoleChanges_ReturnsNull()
    {
        var activity = BuildActivity();
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBeNull();
    }

    [Fact]
    public void ComputeChangedFields_TitleChanged_ReturnsTitle()
    {
        var activity = BuildActivity(title: "Before");
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.Title = "After";

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("title");
    }

    [Fact]
    public void ComputeChangedFields_DateChanged_ReturnsDate()
    {
        var activity = BuildActivity();
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.Date = new DateOnly(2026, 6, 1);

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("date");
    }

    [Fact]
    public void ComputeChangedFields_StartTimeChanged_ReturnsDate()
    {
        // Both date and time changes collapse to the "date" category.
        var activity = BuildActivity();
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.StartTime = new TimeOnly(9, 30);

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("date");
    }

    [Fact]
    public void ComputeChangedFields_EndTimeChanged_ReturnsDate()
    {
        var activity = BuildActivity();
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.EndTime = new TimeOnly(13, 0);

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("date");
    }

    [Fact]
    public void ComputeChangedFields_DepartmentChanged_ReturnsDepartment()
    {
        var activity = BuildActivity(departmentId: 1);
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.DepartmentId = 2;

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("department");
    }

    [Fact]
    public void ComputeChangedFields_VisibilityChanged_ReturnsVisibility()
    {
        var activity = BuildActivity(visibility: ActivityVisibility.Public);
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.Visibility = ActivityVisibility.Authenticated;

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("visibility");
    }

    [Fact]
    public void ComputeChangedFields_DescriptionChanged_ReturnsDescription()
    {
        var activity = BuildActivity(description: null);
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        activity.Description = "now set";

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBe("description");
    }

    [Fact]
    public void ComputeChangedFields_HasRoleChangesFlag_AppendsRoles()
    {
        var activity = BuildActivity();
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: true);

        result.ShouldBe("roles");
    }

    [Fact]
    public void ComputeChangedFields_MultipleChanges_JoinsAllInCanonicalOrder()
    {
        var activity = BuildActivity(
            title: "Before",
            departmentId: 1,
            visibility: ActivityVisibility.Public,
            description: "before");
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);

        activity.Title = "After";
        activity.Date = new DateOnly(2026, 6, 1);
        activity.DepartmentId = 2;
        activity.Visibility = ActivityVisibility.Authenticated;
        activity.Description = "after";

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: true);

        // Canonical emit order: title, date, department, visibility, description, roles.
        result.ShouldBe("title,date,department,visibility,description,roles");
    }

    [Fact]
    public void ComputeChangedFields_DescriptionNullToNull_NotReported()
    {
        var activity = BuildActivity(description: null);
        var snapshot = ActivityService.ActivitySnapshot.Capture(activity);
        // No mutation; description remains null.

        var result = ActivityService.ComputeChangedFields(snapshot, activity, hasRoleChanges: false);

        result.ShouldBeNull();
    }
}
