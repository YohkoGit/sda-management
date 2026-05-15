using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
    public DbSet<SubMinistry> SubMinistries => Set<SubMinistry>();
    public DbSet<ChurchConfig> ChurchConfigs => Set<ChurchConfig>();
    public DbSet<ActivityTemplate> ActivityTemplates => Set<ActivityTemplate>();
    public DbSet<TemplateRole> TemplateRoles => Set<TemplateRole>();
    public DbSet<ProgramSchedule> ProgramSchedules => Set<ProgramSchedule>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<ActivityRole> ActivityRoles => Set<ActivityRole>();
    public DbSet<RoleAssignment> RoleAssignments => Set<RoleAssignment>();

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
            e.HasQueryFilter(u => u.DeletedAt == null);
        });

        // RefreshToken — FK cascade on hard-delete; soft-delete path cleans tokens in UserService.DeleteAsync
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

        // PasswordResetToken — FK cascade on hard-delete; soft-delete path cleans tokens in UserService.DeleteAsync
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
            e.HasIndex(d => d.Abbreviation).IsUnique();
            e.HasIndex(d => d.Color).IsUnique();
            e.Property(d => d.Name).HasMaxLength(100);
            e.Property(d => d.Abbreviation).HasMaxLength(10);
            e.Property(d => d.Color).HasMaxLength(9);  // "#" + 6 hex chars
            e.Property(d => d.Description).HasMaxLength(500);
            e.Property(d => d.CreatedAt).HasDefaultValueSql("now()");
            e.Property(d => d.UpdatedAt).HasDefaultValueSql("now()");
        });

        // SubMinistry
        modelBuilder.Entity<SubMinistry>(e =>
        {
            e.HasKey(s => s.Id);
            e.Property(s => s.Name).HasMaxLength(100);
            e.Property(s => s.CreatedAt).HasDefaultValueSql("now()");
            e.Property(s => s.UpdatedAt).HasDefaultValueSql("now()");
            e.HasOne(s => s.Department)
             .WithMany(d => d.SubMinistries)
             .HasForeignKey(s => s.DepartmentId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(s => s.Lead)
             .WithMany()
             .HasForeignKey(s => s.LeadUserId)
             .IsRequired(false)
             .OnDelete(DeleteBehavior.SetNull);
            e.HasIndex(s => new { s.DepartmentId, s.Name }).IsUnique();
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

        // ActivityTemplate
        modelBuilder.Entity<ActivityTemplate>(e =>
        {
            e.HasKey(t => t.Id);
            e.HasIndex(t => t.Name).IsUnique();
            e.Property(t => t.Name).HasMaxLength(100);
            e.Property(t => t.Description).HasMaxLength(500);
            e.Property(t => t.CreatedAt).HasDefaultValueSql("now()");
            e.Property(t => t.UpdatedAt).HasDefaultValueSql("now()");
        });

        // TemplateRole
        modelBuilder.Entity<TemplateRole>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.RoleName).HasMaxLength(100);
            e.Property(r => r.IsCritical).HasDefaultValue(false);
            e.Property(r => r.IsPredicateur).HasDefaultValue(false);
            e.Property(r => r.CreatedAt).HasDefaultValueSql("now()");
            e.Property(r => r.UpdatedAt).HasDefaultValueSql("now()");
            e.HasOne(r => r.ActivityTemplate)
             .WithMany(t => t.Roles)
             .HasForeignKey(r => r.ActivityTemplateId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => new { r.ActivityTemplateId, r.RoleName }).IsUnique();
        });

        // ProgramSchedule
        modelBuilder.Entity<ProgramSchedule>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => new { p.Title, p.DayOfWeek }).IsUnique();
            e.Property(p => p.Title).HasMaxLength(100);
            e.Property(p => p.HostName).HasMaxLength(100);
            e.Property(p => p.CreatedAt).HasDefaultValueSql("now()");
            e.Property(p => p.UpdatedAt).HasDefaultValueSql("now()");
            e.HasOne(p => p.Department)
             .WithMany()
             .HasForeignKey(p => p.DepartmentId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // Activity
        modelBuilder.Entity<Activity>(e =>
        {
            e.HasKey(a => a.Id);
            e.Property(a => a.Version).IsRowVersion();
            e.Property(a => a.Title).HasMaxLength(150);
            e.Property(a => a.Description).HasMaxLength(1000);
            e.Property(a => a.Visibility).HasConversion<int>();
            e.Property(a => a.IsMeeting).HasDefaultValue(false);
            // Persist enum as lowercase string ("physical" / "zoom") to match existing DB rows
            // and keep the column shape (text/varchar) unchanged — no migration needed.
            // EF wraps the converter with NullableConverter for nullable properties at runtime.
            e.Property(a => a.MeetingType)
             .HasMaxLength(20)
             .HasConversion(new ValueConverter<MeetingType, string>(
                 v => v.ToString().ToLowerInvariant(),
                 v => Enum.Parse<MeetingType>(v, ignoreCase: true)));
            e.Property(a => a.ZoomLink).HasMaxLength(500);
            e.Property(a => a.LocationName).HasMaxLength(150);
            e.Property(a => a.LocationAddress).HasMaxLength(300);
            e.Property(a => a.CreatedAt).HasDefaultValueSql("now()");
            e.Property(a => a.UpdatedAt).HasDefaultValueSql("now()");
            e.HasOne(a => a.Department)
             .WithMany()
             .HasForeignKey(a => a.DepartmentId)
             .OnDelete(DeleteBehavior.SetNull);
        });

        // ActivityRole
        modelBuilder.Entity<ActivityRole>(e =>
        {
            e.HasKey(r => r.Id);
            e.Property(r => r.RoleName).HasMaxLength(100);
            e.Property(r => r.IsCritical).HasDefaultValue(false);
            e.Property(r => r.IsPredicateur).HasDefaultValue(false);
            e.Property(r => r.CreatedAt).HasDefaultValueSql("now()");
            e.Property(r => r.UpdatedAt).HasDefaultValueSql("now()");
            e.HasOne(r => r.Activity)
             .WithMany(a => a.Roles)
             .HasForeignKey(r => r.ActivityId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(r => new { r.ActivityId, r.RoleName }).IsUnique();
        });

        // RoleAssignment
        modelBuilder.Entity<RoleAssignment>(e =>
        {
            e.HasKey(ra => ra.Id);
            e.Property(ra => ra.CreatedAt).HasDefaultValueSql("now()");
            e.HasOne(ra => ra.ActivityRole)
             .WithMany(r => r.Assignments)
             .HasForeignKey(ra => ra.ActivityRoleId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne(ra => ra.User)
             .WithMany()
             .HasForeignKey(ra => ra.UserId)
             .OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(ra => new { ra.ActivityRoleId, ra.UserId }).IsUnique();
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
