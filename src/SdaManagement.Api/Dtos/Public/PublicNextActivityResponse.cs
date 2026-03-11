namespace SdaManagement.Api.Dtos.Public;

public record PublicNextActivityResponse(
    int Id,
    string Title,
    DateOnly Date,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string? DepartmentName,
    string? DepartmentAbbreviation,
    string? DepartmentColor,
    string? PredicateurName,
    string? PredicateurAvatarUrl,
    string? SpecialType);
