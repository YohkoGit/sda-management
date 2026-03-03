using NSubstitute;
using Shouldly;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.UnitTests.Auth;

public class AuthorizationServiceTests
{
    private static ICurrentUserContext MakeContext(
        bool isAuthenticated = false,
        UserRole role = UserRole.Anonymous,
        int[]? departmentIds = null)
    {
        var ctx = Substitute.For<ICurrentUserContext>();
        ctx.IsAuthenticated.Returns(isAuthenticated);
        ctx.Role.Returns(role);
        ctx.DepartmentIds.Returns((departmentIds ?? []).ToList().AsReadOnly());
        return ctx;
    }

    [Fact]
    public void CanView_WhenAnonymous_ReturnsFalse()
    {
        var sut = new AuthorizationService(MakeContext());
        sut.CanView().ShouldBeFalse();
    }

    [Fact]
    public void CanView_WhenViewer_ReturnsTrue()
    {
        var sut = new AuthorizationService(MakeContext(isAuthenticated: true, role: UserRole.Viewer));
        sut.CanView().ShouldBeTrue();
    }

    [Fact]
    public void CanManage_WhenAdmin_WithOwnDept_ReturnsTrue()
    {
        var sut = new AuthorizationService(
            MakeContext(isAuthenticated: true, role: UserRole.Admin, departmentIds: [1, 2]));
        sut.CanManage(1).ShouldBeTrue();
    }

    [Fact]
    public void CanManage_WhenAdmin_WithOtherDept_ReturnsFalse()
    {
        var sut = new AuthorizationService(
            MakeContext(isAuthenticated: true, role: UserRole.Admin, departmentIds: [1, 2]));
        sut.CanManage(99).ShouldBeFalse();
    }

    [Fact]
    public void CanManage_WhenOwner_AnyDept_ReturnsTrue()
    {
        var sut = new AuthorizationService(
            MakeContext(isAuthenticated: true, role: UserRole.Owner, departmentIds: []));
        sut.CanManage(999).ShouldBeTrue();
    }

    [Fact]
    public void IsOwner_WhenOwner_ReturnsTrue()
    {
        var sut = new AuthorizationService(
            MakeContext(isAuthenticated: true, role: UserRole.Owner));
        sut.IsOwner().ShouldBeTrue();
    }

    [Fact]
    public void IsOwner_WhenAdmin_ReturnsFalse()
    {
        var sut = new AuthorizationService(
            MakeContext(isAuthenticated: true, role: UserRole.Admin));
        sut.IsOwner().ShouldBeFalse();
    }
}
