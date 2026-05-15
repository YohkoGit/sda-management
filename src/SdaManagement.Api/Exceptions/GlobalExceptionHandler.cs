using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace SdaManagement.Api.Exceptions;

public class GlobalExceptionHandler : IExceptionHandler
{
    // Maps EF-generated, snake_case unique-index names to friendly conflict messages.
    // Names come from migrations (e.g. ix_users_email, ix_departments_abbreviation).
    // Keep in sync with AppDbContext.HasIndex(...).IsUnique() declarations.
    private static readonly Dictionary<string, string> ConstraintMessages = new(StringComparer.Ordinal)
    {
        ["ix_users_email"] = "A user with this email already exists.",
        ["ix_departments_abbreviation"] = "A department with this abbreviation or color already exists.",
        ["ix_departments_color"] = "A department with this abbreviation or color already exists.",
        ["ix_sub_ministries_department_id_name"] = "A sub-ministry with this name already exists in this department.",
        ["ix_activity_templates_name"] = "An activity template with this name already exists.",
        ["ix_program_schedules_title_day_of_week"] = "A program schedule with this title and day already exists.",
    };

    private const string UsersEmailConstraint = "ix_users_email";

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is BadRequestException badRequestException)
        {
            httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Type = "urn:sdac:validation-error",
                Title = "Validation Error",
                Status = 400,
                Detail = badRequestException.Message,
            }, cancellationToken);
            return true;
        }

        if (exception is DbUpdateException dbEx &&
            dbEx.InnerException is PostgresException { SqlState: "23505" } pgEx)
        {
            var problem = BuildConflictProblem(pgEx);
            httpContext.Response.StatusCode = StatusCodes.Status409Conflict;
            await httpContext.Response.WriteAsJsonAsync(problem, cancellationToken);
            return true;
        }

        return false;
    }

    internal static ProblemDetails BuildConflictProblem(PostgresException pgEx) =>
        BuildConflictProblem(pgEx.ConstraintName, pgEx.Detail);

    /// <summary>
    /// Pure mapping from a PostgreSQL unique-violation constraint name (+ optional detail
    /// string) to a 409 ProblemDetails. Exposed for unit testing — no PostgresException
    /// is required to validate the mapping.
    /// </summary>
    internal static ProblemDetails BuildConflictProblem(string? constraintName, string? pgDetail)
    {
        var detail = constraintName is not null && ConstraintMessages.TryGetValue(constraintName, out var mapped)
            ? mapped
            : "A resource with these values already exists.";

        var problem = new ProblemDetails
        {
            Type = "urn:sdac:conflict",
            Title = "Resource Conflict",
            Status = 409,
            Detail = detail,
        };

        if (constraintName == UsersEmailConstraint)
        {
            var conflictingEmail = ExtractConflictingEmail(pgDetail);
            // Always set the extension (even when null) so FE can read it uniformly.
            problem.Extensions["conflictingEmail"] = conflictingEmail;
            if (conflictingEmail is not null)
            {
                problem.Detail = $"A user with email '{conflictingEmail}' already exists.";
            }
        }

        return problem;
    }

    internal static string? ExtractConflictingEmail(string? detail)
    {
        if (detail is null) return null;
        var match = Regex.Match(detail, @"\(email\)=\((.+?)\)");
        return match.Success ? match.Groups[1].Value : null;
    }
}
