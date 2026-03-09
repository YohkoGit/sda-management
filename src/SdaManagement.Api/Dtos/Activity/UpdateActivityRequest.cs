namespace SdaManagement.Api.Dtos.Activity;

public record UpdateActivityRequest : IActivityRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int DepartmentId { get; init; }
    public string Visibility { get; init; } = "public";
    public uint ConcurrencyToken { get; init; }
}
