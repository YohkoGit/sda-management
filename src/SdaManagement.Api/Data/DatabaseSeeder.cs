using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Png;
using SixLabors.ImageSharp.PixelFormats;

namespace SdaManagement.Api.Data;

public class DatabaseSeeder(
    AppDbContext dbContext,
    IConfiguration configuration,
    IPasswordService passwordService,
    IAvatarService avatarService,
    ILogger<DatabaseSeeder> logger)
{
    /// <summary>
    /// Dev-only test password for admin/viewer users. NOT used in production.
    /// </summary>
    public const string DevTestPassword = "Test1234!";

    public async Task SeedAsync()
    {
        var ownerEmail = configuration["OwnerEmail"];
        if (string.IsNullOrWhiteSpace(ownerEmail))
        {
            logger.LogWarning("OWNER_EMAIL not set — skipping OWNER seed");
            return;
        }

        var exists = await dbContext.Users.AnyAsync(u => u.Email == ownerEmail);
        if (!exists)
        {
            dbContext.Users.Add(new User
            {
                Email = ownerEmail,
                FirstName = "Owner",
                LastName = "Account",
                Role = UserRole.Owner,
                IsGuest = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await dbContext.SaveChangesAsync();
            logger.LogInformation("OWNER user seeded: {Email}", ownerEmail);
        }
    }

    /// <summary>
    /// Seeds additional test data for Development environment only.
    /// Enables UI validation for stories that require alternate-role logins,
    /// activities with specialType, and uploaded avatars.
    /// Idempotent — safe to run on every startup.
    /// </summary>
    public async Task SeedDevDataAsync()
    {
        logger.LogInformation("Seeding development test data...");

        await SeedDevUsersAsync();
        await SeedDevActivitiesAsync();
        await SeedDevAvatarAsync();

        logger.LogInformation("Development test data seeded");
    }

    private async Task SeedDevUsersAsync()
    {
        var passwordHash = passwordService.HashPassword(DevTestPassword);

        // Ensure OWNER user also has a password for dev UI validation captures
        var ownerEmail = configuration["OwnerEmail"];
        if (!string.IsNullOrWhiteSpace(ownerEmail))
        {
            var ownerUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == ownerEmail);
            if (ownerUser != null)
            {
                ownerUser.PasswordHash = passwordHash;
                ownerUser.UpdatedAt = DateTime.UtcNow;
                await dbContext.SaveChangesAsync();
                logger.LogInformation("Dev owner user password set: {Email}", ownerEmail);
            }
        }

        // Admin user with password — for alt-role UI validation (stories 3-3, 3-4)
        var adminEmail = "admin.test@sdac.local";
        var adminUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == adminEmail);
        if (adminUser == null)
        {
            adminUser = new User
            {
                Email = adminEmail,
                FirstName = "Jean",
                LastName = "BAPTISTE",
                Role = UserRole.Admin,
                IsGuest = false,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            dbContext.Users.Add(adminUser);
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Dev admin user seeded: {Email}", adminEmail);
        }
        else if (adminUser.PasswordHash == null)
        {
            adminUser.PasswordHash = passwordHash;
            adminUser.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Dev admin user password set: {Email}", adminEmail);
        }

        // Assign admin to first department if not already assigned
        if (adminUser.Id > 0)
        {
            var firstDept = await dbContext.Departments.FirstOrDefaultAsync();
            if (firstDept != null)
            {
                var hasAssignment = await dbContext.Set<UserDepartment>()
                    .AnyAsync(ud => ud.UserId == adminUser.Id && ud.DepartmentId == firstDept.Id);
                if (!hasAssignment)
                {
                    dbContext.Set<UserDepartment>().Add(new UserDepartment
                    {
                        UserId = adminUser.Id,
                        DepartmentId = firstDept.Id,
                    });
                    await dbContext.SaveChangesAsync();
                    logger.LogInformation("Dev admin assigned to department: {Dept}", firstDept.Name);
                }
            }
        }

        // Viewer user with password — for alt-role UI validation (stories 3-4)
        var viewerEmail = "viewer.test@sdac.local";
        var viewerUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == viewerEmail);
        if (viewerUser == null)
        {
            viewerUser = new User
            {
                Email = viewerEmail,
                FirstName = "Marie",
                LastName = "CLAIRE",
                Role = UserRole.Viewer,
                IsGuest = false,
                PasswordHash = passwordHash,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            dbContext.Users.Add(viewerUser);
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Dev viewer user seeded: {Email}", viewerEmail);
        }
        else if (viewerUser.PasswordHash == null)
        {
            viewerUser.PasswordHash = passwordHash;
            viewerUser.UpdatedAt = DateTime.UtcNow;
            await dbContext.SaveChangesAsync();
            logger.LogInformation("Dev viewer user password set: {Email}", viewerEmail);
        }
    }

    /// <summary>
    /// Valid specialType keys matching frontend SPECIAL_TYPES and backend AllowedSpecialTypes.
    /// </summary>
    private static readonly Dictionary<string, string> InvalidSpecialTypeMap = new()
    {
        ["Sainte-Cène"] = "sainte-cene",
        ["Journée de la Jeunesse"] = "youth-day",
        ["Semaine de prière"] = "week-of-prayer",
        ["Camp Meeting"] = "camp-meeting",
        ["Journée de la famille"] = "family-day",
        ["Journée de la femme"] = "womens-day",
        ["Évangélisation"] = "evangelism",
    };

    private async Task SeedDevActivitiesAsync()
    {
        // Fix any activities with invalid specialType values (e.g. French display names from earlier seeder bug)
        var activitiesWithInvalidSpecial = await dbContext.Activities
            .Where(a => a.SpecialType != null)
            .ToListAsync();

        foreach (var activity in activitiesWithInvalidSpecial)
        {
            if (InvalidSpecialTypeMap.TryGetValue(activity.SpecialType!, out var correctKey))
            {
                logger.LogInformation("Fixing invalid specialType: {Title} '{Old}' → '{New}'",
                    activity.Title, activity.SpecialType, correctKey);
                activity.SpecialType = correctKey;
                activity.UpdatedAt = DateTime.UtcNow;
            }
        }

        if (activitiesWithInvalidSpecial.Count > 0)
            await dbContext.SaveChangesAsync();

        // Ensure at least one activity has specialType set (for story 4-5)
        var activitiesWithoutSpecial = await dbContext.Activities
            .Where(a => a.SpecialType == null)
            .Take(2)
            .ToListAsync();

        var specialTypes = new[] { "sainte-cene", "youth-day" };
        for (var i = 0; i < Math.Min(activitiesWithoutSpecial.Count, specialTypes.Length); i++)
        {
            activitiesWithoutSpecial[i].SpecialType = specialTypes[i];
            activitiesWithoutSpecial[i].UpdatedAt = DateTime.UtcNow;
            logger.LogInformation("Dev activity specialType set: {Title} → {Type}",
                activitiesWithoutSpecial[i].Title, specialTypes[i]);
        }

        if (activitiesWithoutSpecial.Count > 0)
            await dbContext.SaveChangesAsync();
    }

    private async Task SeedDevAvatarAsync()
    {
        // Upload a test avatar for the admin user (for story 3-5)
        var adminUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == "admin.test@sdac.local");
        if (adminUser == null) return;

        if (avatarService.HasAvatarFile(adminUser.Id))
        {
            logger.LogDebug("Dev avatar already exists for user {Id}", adminUser.Id);
            return;
        }

        // Generate a minimal 64x64 PNG with a solid indigo background
        // This is enough to test the avatar display pipeline
        var png = GenerateTestPng(64, 64, 79, 70, 229); // indigo-500 (RGB)
        using var stream = new MemoryStream(png);
        await avatarService.SaveAvatarAsync(adminUser.Id, stream);
        logger.LogInformation("Dev avatar seeded for user {Id} ({Name})", adminUser.Id, adminUser.FirstName);
    }

    /// <summary>
    /// Generates a minimal valid PNG file with a single solid color.
    /// No external drawing library needed.
    /// </summary>
    private static byte[] GenerateTestPng(int width, int height, byte r, byte g, byte b)
    {
        // Use ImageSharp to create a solid-color image (already a project dependency)
        using var image = new Image<Rgb24>(width, height);
        var color = new Rgb24(r, g, b);
        for (var y = 0; y < height; y++)
        {
            var row = image.Frames.RootFrame.PixelBuffer.DangerousGetRowSpan(y);
            row.Fill(color);
        }

        using var ms = new MemoryStream();
        image.SaveAsPng(ms);
        return ms.ToArray();
    }
}
