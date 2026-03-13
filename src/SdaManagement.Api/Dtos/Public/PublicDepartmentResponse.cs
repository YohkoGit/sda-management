namespace SdaManagement.Api.Dtos.Public;

public record PublicDepartmentResponse(
    int Id,
    string Name,
    string Abbreviation,
    string Color,
    string? Description,
    string? NextActivityTitle,
    DateOnly? NextActivityDate,
    TimeOnly? NextActivityStartTime);
