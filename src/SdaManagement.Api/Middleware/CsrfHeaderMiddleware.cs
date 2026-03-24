using Microsoft.AspNetCore.Http;

namespace SdaManagement.Api.Middleware;

/// <summary>
/// Rejects mutating requests (POST, PUT, DELETE, PATCH) that lack the
/// <c>X-Requested-With: XMLHttpRequest</c> header. This is a lightweight
/// CSRF guard: browsers will not attach custom headers on cross-origin
/// form submissions or navigations, so their absence proves the request
/// did not originate from our SPA.
///
/// GET/HEAD/OPTIONS are always exempt (safe methods).
/// Certain paths are also exempt (OAuth callbacks, health checks, SignalR negotiation).
/// </summary>
public class CsrfHeaderMiddleware(RequestDelegate next)
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST", "PUT", "DELETE", "PATCH"
    };

    private static readonly string[] ExemptPathPrefixes =
    [
        "/api/auth/google-callback",
        "/signin-google",
        "/health",
        "/hubs/",
    ];

    public async Task InvokeAsync(HttpContext context)
    {
        if (MutatingMethods.Contains(context.Request.Method) && !IsExemptPath(context.Request.Path))
        {
            if (!context.Request.Headers.TryGetValue("X-Requested-With", out var value)
                || !string.Equals(value, "XMLHttpRequest", StringComparison.Ordinal))
            {
                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new
                {
                    type = "urn:sdac:csrf-rejected",
                    title = "Forbidden",
                    status = 403,
                    detail = "Missing or invalid X-Requested-With header."
                });
                return;
            }
        }

        await next(context);
    }

    private static bool IsExemptPath(PathString path)
    {
        var pathValue = path.Value ?? string.Empty;
        foreach (var prefix in ExemptPathPrefixes)
        {
            if (pathValue.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }
}
