namespace SdaManagement.Api.Dtos.User;

public class AssignableOfficerResponse
{
    public int UserId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public List<OfficerDepartmentBadge> Departments { get; init; } = [];
}

public class OfficerDepartmentBadge
{
    public int Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Abbreviation { get; init; } = string.Empty;
    public string Color { get; init; } = string.Empty;
}
