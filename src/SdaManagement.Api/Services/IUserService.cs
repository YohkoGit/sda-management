using SdaManagement.Api.Dtos.Common;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.Services;

public interface IUserService
{
    Task<PagedResponse<UserListItem>> GetUsersAsync(string? cursor, int limit, IReadOnlyList<int>? departmentFilter);
    Task<UserResponse?> GetByIdAsync(int id);
    Task<UserResponse> CreateAsync(CreateUserRequest request);
    Task<List<UserResponse>> BulkCreateAsync(List<CreateUserRequest> requests);
    Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request);
    Task<bool> DeleteAsync(int userId);
    Task<List<AssignableOfficerResponse>> GetAssignableOfficersAsync(string? search);
    Task<GuestCreatedResponse> CreateGuestAsync(CreateGuestRequest request);
}
