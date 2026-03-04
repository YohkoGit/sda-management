namespace SdaManagement.Api.Data.Entities;

public class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Abbreviation { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;   // #hex format, e.g. "#4F46E5"
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<SubMinistry> SubMinistries { get; } = [];
    public ICollection<UserDepartment> UserDepartments { get; } = [];
}
