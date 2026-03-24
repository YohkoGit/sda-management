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

// Seed database on startup (OWNER account)
using (var scope = app.Services.CreateScope())
{
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

app.Run();

// Required for WebApplicationFactory<Program> in integration tests (Story 1.2+)
public partial class Program { }
