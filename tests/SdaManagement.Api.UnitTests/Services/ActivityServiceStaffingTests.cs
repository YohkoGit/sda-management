using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

public class ActivityServiceStaffingTests
{
    [Fact]
    public void ComputeStaffingStatus_AllRolesFilled_ReturnsFullyStaffed()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 1),   // Predicateur
            (true, 1),   // Ancien de Service
            (false, 2),  // Diacres
        };

        var result = ActivityService.ComputeStaffingStatus(4, 4, roles);

        result.ShouldBe("FullyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_SomeGaps_ReturnsPartiallyStaffed()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 1),   // Predicateur filled
            (false, 1),  // Diacres partial (1 of 2)
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_CriticalRoleEmpty_ReturnsCriticalGap()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 0),   // Critical role with 0 assignments
            (false, 2),  // Non-critical role filled
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("CriticalGap");
    }

    [Fact]
    public void ComputeStaffingStatus_NonCriticalRolesEmpty_ReturnsPartiallyStaffed()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 1),   // Critical role filled
            (true, 1),   // Critical role filled
            (false, 0),  // Non-critical role empty
        };

        var result = ActivityService.ComputeStaffingStatus(4, 2, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_NoRoles_ReturnsNoRoles()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>();

        var result = ActivityService.ComputeStaffingStatus(0, 0, roles);

        result.ShouldBe("NoRoles");
    }

    [Fact]
    public void ComputeStaffingStatus_MultipleRoles_CorrectAggregation()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 1),   // Predicateur
            (true, 1),   // Ancien de Service
            (false, 2),  // Diacres
            (false, 3),  // Musique
        };

        var result = ActivityService.ComputeStaffingStatus(7, 7, roles);

        result.ShouldBe("FullyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_CriticalRolePartiallyFilled_NotCriticalGap()
    {
        // CriticalGap only fires when assignment count is 0
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 1),   // Critical role filled (1 of 1)
            (false, 1),  // Non-critical partial (1 of 2)
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_NonCriticalEmpty_NoCriticalGap()
    {
        // A non-critical role with 0 assignments should NOT trigger CriticalGap
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (false, 0),  // Non-critical role empty
            (true, 1),   // Critical role filled
        };

        var result = ActivityService.ComputeStaffingStatus(2, 1, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_MultipleCriticalOneEmpty_ReturnsCriticalGap()
    {
        var roles = new List<(bool IsCritical, int AssignmentCount)>
        {
            (true, 1),   // First critical role filled
            (true, 0),   // Second critical role empty
            (false, 2),  // Non-critical filled
        };

        var result = ActivityService.ComputeStaffingStatus(4, 3, roles);

        result.ShouldBe("CriticalGap");
    }
}
