using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.Caching.Memory;
using SdaManagement.Api.Auth;
using SdaManagement.Api.Data;
using SdaManagement.Api.Exceptions;
using SdaManagement.Api.Services;
using SdaManagement.Api.Validators;

namespace SdaManagement.Api.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"))
                   .UseSnakeCaseNamingConvention());

        // Database seeder (OWNER seed)
        services.AddScoped<DatabaseSeeder>();

        // Health checks
        services.AddHealthChecks()
                .AddNpgSql(configuration.GetConnectionString("DefaultConnection")!);

        // SignalR
        services.AddSignalR();

        // CORS — restrictive: specific origins, headers, and methods only
        services.AddCors(options =>
        {
            options.AddDefaultPolicy(policy =>
            {
                policy.WithOrigins(
                        configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
                        ?? ["http://localhost:5173"])
                      .WithMethods("GET", "POST", "PUT", "DELETE", "PATCH")
                      .WithHeaders("Content-Type", "Authorization", "X-Requested-With", "Accept")
                      .AllowCredentials();
            });
        });

        // Rate Limiting — fixed window on auth endpoints, 5 req/min per IP with Retry-After
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = (context, cancellationToken) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)retryAfter.TotalSeconds).ToString();
                return ValueTask.CompletedTask;
            };
            var authRateLimit = configuration.GetValue("RateLimiting:AuthPermitLimit", 5);
            options.AddFixedWindowLimiter("auth", limiterOptions =>
            {
                limiterOptions.PermitLimit = authRateLimit;
                limiterOptions.Window = TimeSpan.FromMinutes(1);
            });
            options.AddFixedWindowLimiter("public", limiterOptions =>
            {
                limiterOptions.PermitLimit = configuration.GetValue("RateLimiting:PublicPermitLimit", 30);
                limiterOptions.Window = TimeSpan.FromMinutes(1);
            });
        });

        // Controllers + JSON
        services.AddControllers()
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNamingPolicy =
                        System.Text.Json.JsonNamingPolicy.CamelCase;
                    options.JsonSerializerOptions.DefaultIgnoreCondition =
                        System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
                });

        // ProblemDetails + global exception handler
        services.AddProblemDetails();
        services.AddExceptionHandler<GlobalExceptionHandler>();

        // OpenAPI
        services.AddOpenApi();

        // JWT Bearer Authentication — reads from access_token httpOnly cookie
        var jwtSecret = configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is required");
        var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = jwtKey,
                    ClockSkew = TimeSpan.Zero,
                };
                // Read JWT from httpOnly cookie (not Authorization header)
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        ctx.Token = ctx.Request.Cookies["access_token"];
                        return Task.CompletedTask;
                    },
                    // AC 5: Return ProblemDetails with custom type on auth challenge
                    OnChallenge = async ctx =>
                    {
                        ctx.HandleResponse();
                        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
                        ctx.Response.ContentType = "application/problem+json";
                        await ctx.Response.WriteAsJsonAsync(new
                        {
                            type = "urn:sdac:unauthenticated",
                            title = "Unauthorized",
                            status = 401,
                            detail = "Authentication is required to access this resource."
                        });
                    },
                };
            })
            .AddCookie("GoogleOAuthTemp", options =>
            {
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
                options.ExpireTimeSpan = TimeSpan.FromMinutes(5);
            })
            .AddGoogle(options =>
            {
                options.SignInScheme = "GoogleOAuthTemp";
                options.ClientId = configuration["Google:ClientId"]
                    ?? throw new InvalidOperationException("Google:ClientId is required");
                options.ClientSecret = configuration["Google:ClientSecret"]
                    ?? throw new InvalidOperationException("Google:ClientSecret is required");
                options.CallbackPath = "/signin-google";
                options.Scope.Add("profile");
                options.Scope.Add("email");
                options.Events.OnRemoteFailure = context =>
                {
                    var frontendUrl = configuration["FrontendUrl"] ?? "";
                    context.Response.Redirect($"{frontendUrl}/?error=auth_failed");
                    context.HandleResponse();
                    return Task.CompletedTask;
                };
            });

        services.AddAuthorization();
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserContext, CurrentUserContext>();
        services.AddScoped<Auth.IAuthorizationService, Auth.AuthorizationService>();
        services.AddScoped<ITokenService, TokenService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddSingleton<ISanitizationService, SanitizationService>();
        services.AddScoped<IConfigService, ConfigService>();
        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IActivityTemplateService, ActivityTemplateService>();
        services.AddScoped<IProgramScheduleService, ProgramScheduleService>();
        services.AddScoped<ISystemHealthService, SystemHealthService>();
        services.AddScoped<ISetupProgressService, SetupProgressService>();
        services.AddScoped<IUserService, UserService>();
        services.AddSingleton<IAvatarService, AvatarService>();
        services.AddScoped<IActivityService, ActivityService>();
        services.AddScoped<IPublicService, PublicService>();
        services.AddScoped<ICalendarService, CalendarService>();
        services.AddMemoryCache();
        services.AddHttpClient("YouTube", client =>
        {
            client.BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/");
            client.Timeout = TimeSpan.FromSeconds(5);
        });
        services.AddScoped<IYouTubeService, YouTubeService>();

        // FluentValidation — auto-register all validators from assembly
        services.AddValidatorsFromAssemblyContaining<InitiateAuthRequestValidator>();

        return services;
    }
}
