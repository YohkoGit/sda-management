using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SdaManagement.Api.Exceptions;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Exceptions;

public class GlobalExceptionHandlerTests
{
    // --- Pure mapping unit tests (no PostgresException needed) ---

    [Fact]
    public void BuildConflictProblem_UsersEmailConstraint_WithEmailInDetail_ReturnsPersonalisedDetail()
    {
        var problem = GlobalExceptionHandler.BuildConflictProblem(
            constraintName: "ix_users_email",
            pgDetail: "Key (email)=(foo@bar.com) already exists.");

        problem.Type.ShouldBe("urn:sdac:conflict");
        problem.Title.ShouldBe("Resource Conflict");
        problem.Status.ShouldBe(409);
        problem.Detail.ShouldBe("A user with email 'foo@bar.com' already exists.");
        problem.Extensions.ShouldContainKey("conflictingEmail");
        problem.Extensions["conflictingEmail"].ShouldBe("foo@bar.com");
    }

    [Fact]
    public void BuildConflictProblem_UsersEmailConstraint_WithoutEmailInDetail_ReturnsFallbackUserMessage()
    {
        var problem = GlobalExceptionHandler.BuildConflictProblem(
            constraintName: "ix_users_email",
            pgDetail: null);

        problem.Detail.ShouldBe("A user with this email already exists.");
        problem.Extensions.ShouldContainKey("conflictingEmail");
        problem.Extensions["conflictingEmail"].ShouldBeNull();
    }

    [Theory]
    [InlineData("ix_departments_abbreviation", "A department with this abbreviation or color already exists.")]
    [InlineData("ix_departments_color", "A department with this abbreviation or color already exists.")]
    [InlineData("ix_sub_ministries_department_id_name", "A sub-ministry with this name already exists in this department.")]
    [InlineData("ix_activity_templates_name", "An activity template with this name already exists.")]
    [InlineData("ix_program_schedules_title_day_of_week", "A program schedule with this title and day already exists.")]
    public void BuildConflictProblem_KnownConstraints_ReturnsFriendlyMessage(string constraintName, string expectedDetail)
    {
        var problem = GlobalExceptionHandler.BuildConflictProblem(constraintName, pgDetail: null);

        problem.Type.ShouldBe("urn:sdac:conflict");
        problem.Status.ShouldBe(409);
        problem.Detail.ShouldBe(expectedDetail);
        problem.Extensions.ShouldNotContainKey("conflictingEmail");
    }

    [Fact]
    public void BuildConflictProblem_UnknownConstraint_ReturnsGenericFallback()
    {
        var problem = GlobalExceptionHandler.BuildConflictProblem(
            constraintName: "ix_unknown_thing",
            pgDetail: null);

        problem.Detail.ShouldBe("A resource with these values already exists.");
    }

    [Fact]
    public void BuildConflictProblem_NullConstraint_ReturnsGenericFallback()
    {
        var problem = GlobalExceptionHandler.BuildConflictProblem(
            constraintName: null,
            pgDetail: null);

        problem.Detail.ShouldBe("A resource with these values already exists.");
    }

    [Fact]
    public void ExtractConflictingEmail_ReturnsEmail_WhenDetailMatchesPostgresFormat()
    {
        var email = GlobalExceptionHandler.ExtractConflictingEmail(
            "Key (email)=(jane.doe@example.com) already exists.");

        email.ShouldBe("jane.doe@example.com");
    }

    [Fact]
    public void ExtractConflictingEmail_ReturnsNull_WhenDetailIsNull()
    {
        GlobalExceptionHandler.ExtractConflictingEmail(null).ShouldBeNull();
    }

    [Fact]
    public void ExtractConflictingEmail_ReturnsNull_WhenDetailHasNoEmailPattern()
    {
        GlobalExceptionHandler.ExtractConflictingEmail("Some unrelated message.").ShouldBeNull();
    }

    // --- End-to-end TryHandleAsync test using a real DbUpdateException + PostgresException ---

    [Fact]
    public async Task TryHandleAsync_DbUpdateExceptionWith23505_WritesConflictProblemDetails()
    {
        var pgEx = CreatePostgresUniqueViolation(
            constraintName: "ix_activity_templates_name",
            detailMessage: "Key (name)=(Sabbath Service) already exists.");
        var dbEx = new DbUpdateException("update failed", pgEx);

        var handler = new GlobalExceptionHandler();
        var ctx = new DefaultHttpContext();
        ctx.Response.Body = new MemoryStream();

        var handled = await handler.TryHandleAsync(ctx, dbEx, CancellationToken.None);

        handled.ShouldBeTrue();
        ctx.Response.StatusCode.ShouldBe(StatusCodes.Status409Conflict);

        ctx.Response.Body.Position = 0;
        using var doc = await JsonDocument.ParseAsync(ctx.Response.Body);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:conflict");
        doc.RootElement.GetProperty("title").GetString().ShouldBe("Resource Conflict");
        doc.RootElement.GetProperty("status").GetInt32().ShouldBe(409);
        doc.RootElement.GetProperty("detail").GetString()
            .ShouldBe("An activity template with this name already exists.");
    }

    [Fact]
    public async Task TryHandleAsync_UnrelatedException_ReturnsFalse()
    {
        var handler = new GlobalExceptionHandler();
        var ctx = new DefaultHttpContext();

        var handled = await handler.TryHandleAsync(ctx, new InvalidOperationException("boom"), CancellationToken.None);

        handled.ShouldBeFalse();
    }

    // --- Helpers ---

    /// <summary>
    /// Builds a PostgresException with SqlState=23505 and a constraint name set. We can't
    /// invoke Npgsql's protocol-level constructor from user code, so we use the public
    /// .NET 10 constructor (messageText, severity, invariantSeverity, sqlState) and reflect
    /// to set ConstraintName + Detail, which are otherwise wire-supplied.
    /// </summary>
    private static PostgresException CreatePostgresUniqueViolation(string constraintName, string detailMessage)
    {
        var pg = new PostgresException(
            messageText: "duplicate key value violates unique constraint",
            severity: "ERROR",
            invariantSeverity: "ERROR",
            sqlState: "23505");

        SetProperty(pg, nameof(PostgresException.ConstraintName), constraintName);
        SetProperty(pg, nameof(PostgresException.Detail), detailMessage);
        return pg;
    }

    private static void SetProperty(PostgresException pg, string propertyName, object? value)
    {
        var prop = typeof(PostgresException).GetProperty(propertyName)
            ?? throw new InvalidOperationException($"Property {propertyName} not found");
        if (prop.CanWrite)
        {
            prop.SetValue(pg, value);
            return;
        }
        // Property has init-only or no setter — try the backing field.
        var backingFieldNames = new[]
        {
            $"<{propertyName}>k__BackingField",
            $"_{char.ToLowerInvariant(propertyName[0])}{propertyName[1..]}",
            char.ToLowerInvariant(propertyName[0]) + propertyName[1..],
        };
        foreach (var name in backingFieldNames)
        {
            var field = typeof(PostgresException).GetField(name,
                System.Reflection.BindingFlags.Instance |
                System.Reflection.BindingFlags.Public |
                System.Reflection.BindingFlags.NonPublic);
            if (field is not null)
            {
                field.SetValue(pg, value);
                return;
            }
        }
        throw new InvalidOperationException($"Cannot set {propertyName} on PostgresException");
    }
}
