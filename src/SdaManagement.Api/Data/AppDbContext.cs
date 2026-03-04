using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<ChurchConfig> ChurchConfigs => Set<ChurchConfig>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.Id);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasConversion<int>();
            e.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
            e.Property(u => u.UpdatedAt).HasDefaultValueSql("now()");
        });

        // RefreshToken — cascade delete when user deleted
        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.Token).IsUnique();
            e.Property(r => r.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(r => r.User)
             .WithMany(u => u.RefreshTokens)
             .HasForeignKey(r => r.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // PasswordResetToken — cascade delete when user deleted
        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.TokenHash);
            e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(p => p.User)
             .WithMany()
             .HasForeignKey(p => p.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        // Department
        modelBuilder.Entity<Department>(e =>
        {
            e.HasKey(d => d.Id);
            e.Property(d => d.CreatedAt).HasDefaultValueSql("now()");
        });

        // ChurchConfig — singleton settings entity
        modelBuilder.Entity<ChurchConfig>(e =>
        {
            e.HasKey(c => c.Id);
            e.Property(c => c.ChurchName).HasMaxLength(150);
            e.Property(c => c.Address).HasMaxLength(300);
            e.Property(c => c.YouTubeChannelUrl).HasMaxLength(500);
            e.Property(c => c.PhoneNumber).HasMaxLength(30);
            e.Property(c => c.WelcomeMessage).HasMaxLength(1000);
            e.Property(c => c.DefaultLocale).HasMaxLength(5);
            e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
            e.Property(c => c.UpdatedAt).HasDefaultValueSql("now()");
        });

        // UserDepartment — composite PK, cascade delete on user/dept removal
        modelBuilder.Entity<UserDepartment>(e =>
        {
            e.ToTable("user_departments");
            e.HasKey(ud => new { ud.UserId, ud.DepartmentId });
            e.HasOne(ud => ud.User)
             .WithMany(u => u.UserDepartments)
             .HasForeignKey(ud => ud.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ud => ud.Department)
             .WithMany(d => d.UserDepartments)
             .HasForeignKey(ud => ud.DepartmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
