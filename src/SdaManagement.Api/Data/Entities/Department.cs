namespace SdaManagement.Api.Data.Entities;

// Minimal entity for FK target — Epic 2 adds more columns
public class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public ICollection<UserDepartment> UserDepartments { get; } = [];
}
