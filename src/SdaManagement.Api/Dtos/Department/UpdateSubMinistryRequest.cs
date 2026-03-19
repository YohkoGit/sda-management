namespace SdaManagement.Api.Dtos.Department;

public record UpdateSubMinistryRequest
{
    public string Name { get; init; } = string.Empty;
    public int? LeadUserId { get; init; }
}
