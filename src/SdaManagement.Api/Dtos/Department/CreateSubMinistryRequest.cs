namespace SdaManagement.Api.Dtos.Department;

public record CreateSubMinistryRequest
{
    public string Name { get; init; } = string.Empty;
}
