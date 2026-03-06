using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.User;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class BulkCreateUsersRequestValidatorTests
{
    private readonly BulkCreateUsersRequestValidator _validator = new();

    private static CreateUserRequest ValidUser(string email = "user@test.com") => new()
    {
        FirstName = "Marie",
        LastName = "Legault",
        Email = email,
        Role = "Viewer",
        DepartmentIds = [1],
    };

    private static BulkCreateUsersRequest ValidBatch(int count = 3)
    {
        var users = Enumerable.Range(1, count)
            .Select(i => ValidUser($"user{i}@test.com"))
            .ToList();
        return new BulkCreateUsersRequest { Users = users };
    }

    [Fact]
    public void Valid_batch_passes()
    {
        var result = _validator.TestValidate(ValidBatch());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_users_list_fails()
    {
        var request = new BulkCreateUsersRequest { Users = [] };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Users);
    }

    [Fact]
    public void More_than_30_users_fails()
    {
        var request = ValidBatch(31);
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Users);
    }

    [Fact]
    public void Exactly_30_users_passes()
    {
        var request = ValidBatch(30);
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.Users);
    }

    [Fact]
    public void Per_row_validation_delegated_invalid_email_in_row()
    {
        var request = new BulkCreateUsersRequest
        {
            Users =
            [
                ValidUser("valid@test.com"),
                ValidUser("not-an-email"),
                ValidUser("also-valid@test.com"),
            ],
        };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("Users[1].Email"));
    }

    [Fact]
    public void Per_row_validation_delegated_empty_firstName()
    {
        var request = new BulkCreateUsersRequest
        {
            Users =
            [
                ValidUser("a@test.com"),
                ValidUser("b@test.com") with { FirstName = "" },
            ],
        };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("Users[1].FirstName"));
    }

    [Fact]
    public void Duplicate_emails_within_batch_fails()
    {
        var request = new BulkCreateUsersRequest
        {
            Users =
            [
                ValidUser("same@test.com"),
                ValidUser("different@test.com"),
                ValidUser("SAME@test.com"),
            ],
        };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Users)
            .WithErrorMessage("Duplicate emails found within the batch.");
    }

    [Fact]
    public void Single_user_batch_passes()
    {
        var request = new BulkCreateUsersRequest { Users = [ValidUser()] };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveAnyValidationErrors();
    }
}
