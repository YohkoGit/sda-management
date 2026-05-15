namespace SdaManagement.Api.Services;

/// <summary>
/// Helper for queries that ask "does the current user share a department
/// scope with a target user?" — used by visibility/permission checks where
/// the standard policy-based <c>CanManageDepartment</c> doesn't fit (e.g.
/// avatar uploads, which are gated by department overlap, not management).
/// </summary>
public interface IUserDepartmentService
{
    /// <summary>
    /// Returns true when the current user belongs to at least one department
    /// that the target user is also a member of.
    /// </summary>
    Task<bool> SharesDepartmentWithCurrentUserAsync(int targetUserId);
}
