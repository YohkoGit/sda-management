namespace SdaManagement.Api.Data.Entities;

public class ActivityRole
{
    public int Id { get; set; }
    public int ActivityId { get; set; }
    public Activity Activity { get; set; } = null!;
    public string RoleName { get; set; } = string.Empty;
    public int Headcount { get; set; }
    public int SortOrder { get; set; }
    public bool IsCritical { get; set; }
    public bool IsPredicateur { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<RoleAssignment> Assignments { get; } = [];
}
