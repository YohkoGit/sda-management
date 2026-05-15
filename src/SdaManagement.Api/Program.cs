using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Extensions;
using SdaManagement.Api.Hubs;
using SdaManagement.Api.Middleware;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Load optional local overrides (gitignored) for secrets like Google OAuth credentials
builder.Configuration.AddJsonFile(
    $"appsettings.{builder.Environment.EnvironmentName}.local.json",
    optional: true, reloadOnChange: true);

// Serilog
builder.Host.UseSerilog((context, loggerConfig) =>
    loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console());

// All service registrations via single extension method
builder.Services.AddApplicationServices(builder.Configuration);

var app = builder.Build();

// Apply EF migrations + seed OWNER. Integration tests skip this block by running
// MigrateAsync() against the test container's own scope before requests land.
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await dbContext.Database.MigrateAsync();

    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    await seeder.SeedAsync();

    // Dev-only: seed test users with passwords, activities with specialType
    // Enables UI validation for stories requiring alt-role logins and enriched data
    // SeedDevData defaults to true; integration tests set it to false so the seeder
    // doesn't query tables before migrations are applied.
    if (app.Environment.IsDevelopment() && app.Configuration.GetValue("SeedDevData", true))
    {
        await seeder.SeedDevDataAsync();
    }
}

// OpenAPI in development
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// ===== 9-step middleware pipeline (MANDATORY order) =====

// 1. Serilog request logging
app.UseSerilogRequestLogging();

// 2. Global exception handler → ProblemDetails
app.UseExceptionHandler();

// 2b. Serve SPA static assets (Vite-built bundle copied to wwwroot/ in the runtime image)
app.UseDefaultFiles();
app.UseStaticFiles();

// 3. CORS
app.UseCors();

// 3b. CSRF header guard — reject mutating requests without X-Requested-With
app.UseMiddleware<CsrfHeaderMiddleware>();

// 4. Rate Limiter
app.UseRateLimiter();

// 5. Authentication
app.UseAuthentication();

// Populate ICurrentUserContext from JWT claims + DB lookup
app.UseMiddleware<CurrentUserContextMiddleware>();

// 6. Authorization
app.UseAuthorization();

// 7. Controllers
app.MapControllers();

// 8. SignalR hub
app.MapHub<NotificationHub>("/hubs/notifications");

// 9. Health checks
app.MapHealthChecks("/health");

// 10. SPA fallback — unmatched routes return index.html so React Router can
// handle client-side navigation. Must be last so all API/hub/health routes win first.
// /api/* gets a JSON 404 instead of HTML so typo'd API paths don't silently look like the SPA.
app.MapFallback("/api/{**path}", () => Results.Problem(
    type: "urn:sdac:not-found",
    title: "Not Found",
    statusCode: StatusCodes.Status404NotFound));
app.MapFallbackToFile("index.html");

app.Run();

// Required for WebApplicationFactory<Program> in integration tests (Story 1.2+)
public partial class Program { }
