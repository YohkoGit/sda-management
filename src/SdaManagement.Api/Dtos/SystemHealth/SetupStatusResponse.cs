namespace SdaManagement.Api.Dtos.SystemHealth;

public class SetupStatusResponse
{
    public bool ChurchConfigExists { get; init; }
    public int DepartmentCount { get; init; }
    public int TemplateCount { get; init; }
    public int ScheduleCount { get; init; }
    public int UserCount { get; init; }
}
