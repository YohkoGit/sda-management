namespace SdaManagement.Api.Data.Entities;

public class ActivityTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<TemplateRole> Roles { get; } = [];
}
