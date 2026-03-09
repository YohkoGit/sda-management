namespace SdaManagement.Api.Dtos.Activity;

public interface IActivityRequest
{
    string Title { get; }
    string? Description { get; }
    DateOnly Date { get; }
    TimeOnly StartTime { get; }
    TimeOnly EndTime { get; }
    int DepartmentId { get; }
    string Visibility { get; }
}
