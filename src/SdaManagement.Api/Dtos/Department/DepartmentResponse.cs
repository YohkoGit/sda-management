namespace SdaManagement.Api.Dtos.Department;

public class DepartmentResponse
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Abbreviation { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
    public string? Description { get; init; }
    public List<SubMinistryResponse> SubMinistries { get; init; } = [];
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}
