namespace SdaManagement.Api.Data.Entities;

public class UserDepartment
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
}
