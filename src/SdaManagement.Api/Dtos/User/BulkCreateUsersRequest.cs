namespace SdaManagement.Api.Dtos.User;

public record BulkCreateUsersRequest
{
    public List<CreateUserRequest> Users { get; init; } = [];
}
