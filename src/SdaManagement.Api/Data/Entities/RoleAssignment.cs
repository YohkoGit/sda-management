namespace SdaManagement.Api.Data.Entities;

public class RoleAssignment
{
    public int Id { get; set; }
    public int ActivityRoleId { get; set; }
    public ActivityRole ActivityRole { get; set; } = null!;
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
