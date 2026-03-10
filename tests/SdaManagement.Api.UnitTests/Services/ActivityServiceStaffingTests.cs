using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

public class ActivityServiceStaffingTests
{
    [Fact]
    public void ComputeStaffingStatus_AllRolesFilled_ReturnsFullyStaffed()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Predicateur", 1),
            ("Ancien de Service", 1),
            ("Diacres", 2),
        };

        var result = ActivityService.ComputeStaffingStatus(4, 4, roles);

        result.ShouldBe("FullyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_SomeGaps_ReturnsPartiallyStaffed()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Predicateur", 1),
            ("Diacres", 1),    // 1 of 2
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_PredicateurEmpty_ReturnsCriticalGap()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Predicateur", 0),
            ("Diacres", 2),
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("CriticalGap");
    }

    [Fact]
    public void ComputeStaffingStatus_AncienDeServiceEmpty_ReturnsCriticalGap()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Ancien de Service", 0),
            ("Diacres", 2),
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("CriticalGap");
    }

    [Fact]
    public void ComputeStaffingStatus_AncienDuSabbatEmpty_ReturnsCriticalGap()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Ancien du Sabbat", 0),
            ("Diacres", 2),
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("CriticalGap");
    }

    [Fact]
    public void ComputeStaffingStatus_NonCriticalRolesEmpty_ReturnsPartiallyStaffed()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Predicateur", 1),
            ("Ancien de Service", 1),
            ("Diacres", 0),
        };

        var result = ActivityService.ComputeStaffingStatus(4, 2, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_CaseInsensitive_PredicateurLowercase_ReturnsCriticalGap()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("predicateur", 0),
        };

        var result = ActivityService.ComputeStaffingStatus(1, 0, roles);

        result.ShouldBe("CriticalGap");
    }

    [Fact]
    public void ComputeStaffingStatus_CaseInsensitive_PredicateurUppercase_ReturnsCriticalGap()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("PREDICATEUR", 0),
        };

        var result = ActivityService.ComputeStaffingStatus(1, 0, roles);

        result.ShouldBe("CriticalGap");
    }

    [Fact]
    public void ComputeStaffingStatus_NoRoles_ReturnsNoRoles()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>();

        var result = ActivityService.ComputeStaffingStatus(0, 0, roles);

        result.ShouldBe("NoRoles");
    }

    [Fact]
    public void ComputeStaffingStatus_MultipleRoles_CorrectAggregation()
    {
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Predicateur", 1),
            ("Ancien de Service", 1),
            ("Diacres", 2),
            ("Musique", 3),
        };

        var result = ActivityService.ComputeStaffingStatus(7, 7, roles);

        result.ShouldBe("FullyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_CriticalRolePartiallyFilled_NotCriticalGap()
    {
        // CriticalGap only fires when assignment count is 0
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Predicateur", 1),   // filled (1 of 1)
            ("Diacres", 1),       // partial (1 of 2)
        };

        var result = ActivityService.ComputeStaffingStatus(3, 2, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_AncienneMusique_NotFalsePositive()
    {
        // "Ancienne Musique" starts with "ancien" but is NOT the worship "Ancien" role
        // Must NOT trigger CriticalGap — only "Ancien" or "Ancien ..." patterns should match
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Ancienne Musique", 0),
            ("Predicateur", 1),
        };

        var result = ActivityService.ComputeStaffingStatus(2, 1, roles);

        result.ShouldBe("PartiallyStaffed");
    }

    [Fact]
    public void ComputeStaffingStatus_ExactAncien_ReturnsCriticalGap()
    {
        // Standalone "Ancien" role with 0 assignments should still match
        var roles = new List<(string RoleName, int AssignmentCount)>
        {
            ("Ancien", 0),
        };

        var result = ActivityService.ComputeStaffingStatus(1, 0, roles);

        result.ShouldBe("CriticalGap");
    }
}
