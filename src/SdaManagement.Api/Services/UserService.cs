using System.Text;
using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Common;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.Services;

public class UserService(AppDbContext db, ISanitizationService sanitizer) : IUserService
{
    public async Task<PagedResponse<UserListItem>> GetUsersAsync(
        string? cursor, int limit, IReadOnlyList<int>? departmentFilter)
    {
        var query = db.Users
            .Where(u => !u.IsGuest)
            .OrderBy(u => u.LastName).ThenBy(u => u.Id)
            .AsQueryable();

        if (departmentFilter is { Count: > 0 })
            query = query.Where(u => u.UserDepartments.Any(ud => departmentFilter.Contains(ud.DepartmentId)));

        if (cursor is not null)
        {
            var (cursorLastName, cursorId) = DecodeCursor(cursor);
            query = query.Where(u =>
                u.LastName.CompareTo(cursorLastName) > 0
                || (u.LastName == cursorLastName && u.Id > cursorId));
        }

        var items = await query
            .Take(limit + 1)
            .Select(u => new UserListItem
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Role = u.Role.ToString(),
                Departments = u.UserDepartments
                    .Select(ud => new UserDepartmentBadge
                    {
                        Id = ud.Department.Id,
                        Name = ud.Department.Name,
                        Abbreviation = ud.Department.Abbreviation,
                        Color = ud.Department.Color,
                    })
                    .ToList(),
                CreatedAt = u.CreatedAt,
            })
            .ToListAsync();

        string? nextCursor = items.Count > limit
            ? EncodeCursor(items[limit - 1].LastName, items[limit - 1].Id)
            : null;

        return new PagedResponse<UserListItem>
        {
            Items = items.Take(limit).ToList(),
            NextCursor = nextCursor,
        };
    }

    public async Task<UserResponse?> GetByIdAsync(int id)
    {
        return await db.Users
            .Where(u => u.Id == id && !u.IsGuest)
            .Select(u => new UserResponse
            {
                Id = u.Id,
                FirstName = u.FirstName,
                LastName = u.LastName,
                Email = u.Email,
                Role = u.Role.ToString(),
                IsGuest = u.IsGuest,
                Departments = u.UserDepartments
                    .Select(ud => new UserDepartmentBadge
                    {
                        Id = ud.Department.Id,
                        Name = ud.Department.Name,
                        Abbreviation = ud.Department.Abbreviation,
                        Color = ud.Department.Color,
                    })
                    .ToList(),
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<UserResponse> CreateAsync(CreateUserRequest request)
    {
        var now = DateTime.UtcNow;
        var role = Enum.Parse<UserRole>(sanitizer.Sanitize(request.Role), ignoreCase: true);

        var user = new User
        {
            FirstName = sanitizer.Sanitize(request.FirstName),
            LastName = sanitizer.Sanitize(request.LastName),
            Email = sanitizer.Sanitize(request.Email).ToLowerInvariant(),
            Role = role,
            IsGuest = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.Users.Add(user);

        foreach (var deptId in request.DepartmentIds)
        {
            db.Set<UserDepartment>().Add(new UserDepartment
            {
                User = user,
                DepartmentId = deptId,
            });
        }

        await db.SaveChangesAsync();

        // Reload with departments for response
        var departments = await db.Set<UserDepartment>()
            .Where(ud => ud.UserId == user.Id)
            .Select(ud => new UserDepartmentBadge
            {
                Id = ud.Department.Id,
                Name = ud.Department.Name,
                Abbreviation = ud.Department.Abbreviation,
                Color = ud.Department.Color,
            })
            .ToListAsync();

        return new UserResponse
        {
            Id = user.Id,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsGuest = user.IsGuest,
            Departments = departments,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
        };
    }

    public async Task<List<UserResponse>> BulkCreateAsync(List<CreateUserRequest> requests)
    {
        var now = DateTime.UtcNow;
        var users = new List<User>(requests.Count);

        foreach (var request in requests)
        {
            var role = Enum.Parse<UserRole>(sanitizer.Sanitize(request.Role), ignoreCase: true);

            var user = new User
            {
                FirstName = sanitizer.Sanitize(request.FirstName),
                LastName = sanitizer.Sanitize(request.LastName),
                Email = sanitizer.Sanitize(request.Email).ToLowerInvariant(),
                Role = role,
                IsGuest = false,
                CreatedAt = now,
                UpdatedAt = now,
            };

            db.Users.Add(user);

            foreach (var deptId in request.DepartmentIds)
            {
                db.Set<UserDepartment>().Add(new UserDepartment
                {
                    User = user,
                    DepartmentId = deptId,
                });
            }

            users.Add(user);
        }

        await db.SaveChangesAsync();

        // Reload departments for all created users
        var userIds = users.Select(u => u.Id).ToList();
        var departments = await db.Set<UserDepartment>()
            .Where(ud => userIds.Contains(ud.UserId))
            .Select(ud => new
            {
                ud.UserId,
                Badge = new UserDepartmentBadge
                {
                    Id = ud.Department.Id,
                    Name = ud.Department.Name,
                    Abbreviation = ud.Department.Abbreviation,
                    Color = ud.Department.Color,
                },
            })
            .ToListAsync();

        var deptsByUser = departments.GroupBy(d => d.UserId)
            .ToDictionary(g => g.Key, g => g.Select(d => d.Badge).ToList());

        return users.Select(u => new UserResponse
        {
            Id = u.Id,
            FirstName = u.FirstName,
            LastName = u.LastName,
            Email = u.Email,
            Role = u.Role.ToString(),
            IsGuest = u.IsGuest,
            Departments = deptsByUser.GetValueOrDefault(u.Id, []),
            CreatedAt = u.CreatedAt,
            UpdatedAt = u.UpdatedAt,
        }).ToList();
    }

    public async Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request)
    {
        var user = await db.Users
            .Include(u => u.UserDepartments)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsGuest);

        if (user is null) return null;

        user.FirstName = sanitizer.Sanitize(request.FirstName);
        user.LastName = sanitizer.Sanitize(request.LastName);
        user.Role = Enum.Parse<UserRole>(request.Role, ignoreCase: true);
        user.UpdatedAt = DateTime.UtcNow;

        // Replace departments: clear existing, add new
        db.Set<UserDepartment>().RemoveRange(user.UserDepartments);
        foreach (var deptId in request.DepartmentIds)
        {
            db.Set<UserDepartment>().Add(new UserDepartment
            {
                UserId = userId,
                DepartmentId = deptId,
            });
        }

        await db.SaveChangesAsync();

        // Reload with department details for response
        var updated = await db.Users
            .Include(u => u.UserDepartments)
            .ThenInclude(ud => ud.Department)
            .FirstAsync(u => u.Id == userId);

        return new UserResponse
        {
            Id = updated.Id,
            FirstName = updated.FirstName,
            LastName = updated.LastName,
            Email = updated.Email,
            Role = updated.Role.ToString(),
            IsGuest = updated.IsGuest,
            Departments = updated.UserDepartments.Select(ud => new UserDepartmentBadge
            {
                Id = ud.Department.Id,
                Name = ud.Department.Name,
                Abbreviation = ud.Department.Abbreviation,
                Color = ud.Department.Color,
            }).ToList(),
            CreatedAt = updated.CreatedAt,
            UpdatedAt = updated.UpdatedAt,
        };
    }

    internal static bool IsValidCursor(string cursor)
    {
        try
        {
            var bytes = Convert.FromBase64String(cursor);
            var decoded = Encoding.UTF8.GetString(bytes);
            var parts = decoded.Split('|', 2);
            return parts.Length == 2 && int.TryParse(parts[1], out _);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static string EncodeCursor(string lastName, int id) =>
        Convert.ToBase64String(Encoding.UTF8.GetBytes($"{lastName}|{id}"));

    private static (string LastName, int Id) DecodeCursor(string cursor)
    {
        var decoded = Encoding.UTF8.GetString(Convert.FromBase64String(cursor));
        var parts = decoded.Split('|', 2);
        return (parts[0], int.Parse(parts[1]));
    }
}
