using SdaManagement.Api.Dtos.Department;

namespace SdaManagement.Api.Services;

public interface IDepartmentService
{
    Task<List<DepartmentListItem>> GetAllAsync();
    Task<DepartmentResponse?> GetByIdAsync(int id);
    Task<DepartmentResponse> CreateAsync(CreateDepartmentRequest request);
    Task<DepartmentResponse?> UpdateAsync(int id, UpdateDepartmentRequest request);
    Task<bool> DeleteAsync(int id);
    Task<SubMinistryResponse?> AddSubMinistryAsync(int departmentId, CreateSubMinistryRequest request);
    Task<SubMinistryResponse?> UpdateSubMinistryAsync(int departmentId, int subMinistryId, UpdateSubMinistryRequest request);
    Task<bool> DeleteSubMinistryAsync(int departmentId, int subMinistryId);
}
