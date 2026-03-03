using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Data;

public class DatabaseSeeder(AppDbContext dbContext, IConfiguration configuration, ILogger<DatabaseSeeder> logger)
{
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
}
