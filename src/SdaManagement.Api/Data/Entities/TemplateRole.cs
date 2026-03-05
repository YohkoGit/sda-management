namespace SdaManagement.Api.Data.Entities;

public class TemplateRole
{
    public int Id { get; set; }
    public int ActivityTemplateId { get; set; }
    public ActivityTemplate ActivityTemplate { get; set; } = null!;
    public string RoleName { get; set; } = string.Empty;
    public int DefaultHeadcount { get; set; }
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
