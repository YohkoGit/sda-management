namespace SdaManagement.Api.Data.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsGuest { get; set; }
    public string? PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public ICollection<UserDepartment> UserDepartments { get; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; } = [];
}
