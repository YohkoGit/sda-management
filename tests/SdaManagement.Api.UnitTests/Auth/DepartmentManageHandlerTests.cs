using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using NSubstitute;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data.Entities;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Auth;

public class DepartmentManageHandlerTests
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

    private static async Task<bool> Authorize(ICurrentUserContext ctx, int departmentId)
    {
        var handler = new DepartmentManageHandler(ctx);
        var requirement = new DepartmentManageRequirement();
        var authContext = new AuthorizationHandlerContext(
            [requirement],
            new ClaimsPrincipal(new ClaimsIdentity()),
            departmentId);

        await handler.HandleAsync(authContext);
        return authContext.HasSucceeded;
    }

    [Fact]
    public async Task Anonymous_Fails()
    {
        var ctx = MakeContext();
        (await Authorize(ctx, 1)).ShouldBeFalse();
    }

    [Fact]
    public async Task Viewer_Fails()
    {
        var ctx = MakeContext(isAuthenticated: true, role: UserRole.Viewer);
        (await Authorize(ctx, 1)).ShouldBeFalse();
    }

    [Fact]
    public async Task Admin_WithManagedDepartment_Succeeds()
    {
        var ctx = MakeContext(isAuthenticated: true, role: UserRole.Admin, departmentIds: [1, 2]);
        (await Authorize(ctx, 1)).ShouldBeTrue();
    }

    [Fact]
    public async Task Admin_WithUnmanagedDepartment_Fails()
    {
        var ctx = MakeContext(isAuthenticated: true, role: UserRole.Admin, departmentIds: [1, 2]);
        (await Authorize(ctx, 99)).ShouldBeFalse();
    }

    [Fact]
    public async Task Owner_WithEmptyDepartments_SucceedsForAny()
    {
        var ctx = MakeContext(isAuthenticated: true, role: UserRole.Owner, departmentIds: []);
        (await Authorize(ctx, 999)).ShouldBeTrue();
    }

    [Fact]
    public async Task Admin_WithNoDepartments_Fails()
    {
        var ctx = MakeContext(isAuthenticated: true, role: UserRole.Admin, departmentIds: []);
        (await Authorize(ctx, 1)).ShouldBeFalse();
    }
}
