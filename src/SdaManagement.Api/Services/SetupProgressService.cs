using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Dtos.Setup;

namespace SdaManagement.Api.Services;

// TODO(story-3.1): Add "members" step — see Story 2.6 setup checklist
// TODO(story-4.1): Add "first-activity" step
public class SetupProgressService(AppDbContext db) : ISetupProgressService
{
    public async Task<SetupProgressResponse> GetSetupProgressAsync(CancellationToken cancellationToken)
    {
        var churchConfigExists = await db.ChurchConfigs.AnyAsync(cancellationToken);
        var departmentCount = await db.Departments.CountAsync(cancellationToken);
        var templateCount = await db.ActivityTemplates.CountAsync(cancellationToken);
        var scheduleCount = await db.ProgramSchedules.CountAsync(cancellationToken);

        var completions = new[]
        {
            churchConfigExists,
            departmentCount > 0,
            templateCount > 0,
            scheduleCount > 0,
        };

        var stepIds = new[] { "church-config", "departments", "templates", "schedules" };

        var steps = new List<SetupStepItem>();
        var foundCurrent = false;

        for (var i = 0; i < stepIds.Length; i++)
        {
            string status;
            if (completions[i])
            {
                status = "complete";
            }
            else if (!foundCurrent)
            {
                status = "current";
                foundCurrent = true;
            }
            else
            {
                status = "pending";
            }

            steps.Add(new SetupStepItem { Id = stepIds[i], Status = status });
        }

        return new SetupProgressResponse
        {
            Steps = steps,
            IsSetupComplete = completions.All(c => c),
        };
    }
}
