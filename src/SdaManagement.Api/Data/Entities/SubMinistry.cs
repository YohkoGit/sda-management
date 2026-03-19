namespace SdaManagement.Api.Data.Entities;

public class SubMinistry
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
    public int? LeadUserId { get; set; }
    public User? Lead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
