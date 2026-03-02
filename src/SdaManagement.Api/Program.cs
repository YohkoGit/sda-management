using SdaManagement.Api.Extensions;
using SdaManagement.Api.Hubs;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((context, loggerConfig) =>
    loggerConfig
        .ReadFrom.Configuration(context.Configuration)
        .WriteTo.Console());

// All service registrations via single extension method
builder.Services.AddApplicationServices(builder.Configuration);

var app = builder.Build();

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

// 4. Rate Limiter
app.UseRateLimiter();

// 5. Authentication
app.UseAuthentication();

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
