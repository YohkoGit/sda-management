namespace SdaManagement.Api.Dtos.Department;

public record CreateDepartmentRequest
{
    public string Name { get; init; } = string.Empty;
    public string? Abbreviation { get; init; }
    public string Color { get; init; } = string.Empty;
    public string? Description { get; init; }
    public List<string>? SubMinistryNames { get; init; }
}
