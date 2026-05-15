using NSubstitute;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data.Entities;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Auth;

public class AuthorizationServiceTests
{
    private static ICurrentUserContext MakeContext(UserRole role = UserRole.Anonymous)
    {
        var ctx = Substitute.For<ICurrentUserContext>();
        ctx.IsAuthenticated.Returns(role != UserRole.Anonymous);
        ctx.Role.Returns(role);
        return ctx;
    }

    [Fact]
    public void IsOwner_WhenOwner_ReturnsTrue()
    {
        var sut = new AuthorizationService(MakeContext(UserRole.Owner));
        sut.IsOwner().ShouldBeTrue();
    }

    [Fact]
    public void IsOwner_WhenAdmin_ReturnsFalse()
    {
        var sut = new AuthorizationService(MakeContext(UserRole.Admin));
        sut.IsOwner().ShouldBeFalse();
    }

    [Fact]
    public void IsOwner_WhenAnonymous_ReturnsFalse()
    {
        var sut = new AuthorizationService(MakeContext());
        sut.IsOwner().ShouldBeFalse();
    }
}
