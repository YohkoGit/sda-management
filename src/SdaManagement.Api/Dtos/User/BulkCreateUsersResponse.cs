namespace SdaManagement.Api.Dtos.User;

public class BulkCreateUsersResponse
{
    public List<UserResponse> Created { get; init; } = [];
    public int Count { get; init; }
}
