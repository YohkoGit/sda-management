namespace SdaManagement.Api.Dtos.Public;

public record PublicProgramScheduleResponse(
    string Title,
    DayOfWeek DayOfWeek,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? HostName,
    string? DepartmentName,
    string? DepartmentColor);
