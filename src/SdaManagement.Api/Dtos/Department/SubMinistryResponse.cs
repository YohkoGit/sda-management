namespace SdaManagement.Api.Dtos.Department;

public class SubMinistryResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int? LeadUserId { get; set; }
    public string? LeadFirstName { get; set; }
    public string? LeadLastName { get; set; }
    public string? LeadAvatarUrl { get; set; }
}
