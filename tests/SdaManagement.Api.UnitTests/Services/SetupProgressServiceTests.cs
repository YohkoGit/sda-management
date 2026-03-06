using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Services;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Services;

public class SetupProgressServiceTests : IDisposable
{
    private readonly AppDbContext _db;
    private readonly SetupProgressService _sut;

    public SetupProgressServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _db = new AppDbContext(options);

        _sut = new SetupProgressService(_db);
    }

    [Fact]
    public async Task GetSetupProgressAsync_EmptyDb_Step1CurrentRestPending()
    {
        var result = await _sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps.Count.ShouldBe(4);
        result.Steps[0].Id.ShouldBe("church-config");
        result.Steps[0].Status.ShouldBe("current");
        result.Steps[1].Id.ShouldBe("departments");
        result.Steps[1].Status.ShouldBe("pending");
        result.Steps[2].Id.ShouldBe("templates");
        result.Steps[2].Status.ShouldBe("pending");
        result.Steps[3].Id.ShouldBe("schedules");
        result.Steps[3].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_ConfigExists_Step1CompleteStep2Current()
    {
        _db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("current");
        result.Steps[2].Status.ShouldBe("pending");
        result.Steps[3].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_ConfigAndDepartments_Steps12CompleteStep3Current()
    {
        _db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Departments.Add(new Department
        {
            Name = "Youth",
            Abbreviation = "YO",
            Color = "#FF0000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("complete");
        result.Steps[2].Status.ShouldBe("current");
        result.Steps[3].Status.ShouldBe("pending");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_ConfigDepartmentsTemplates_Steps123CompleteStep4Current()
    {
        _db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Departments.Add(new Department
        {
            Name = "Youth",
            Abbreviation = "YO",
            Color = "#FF0000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.ActivityTemplates.Add(new ActivityTemplate
        {
            Name = "Sabbath Service",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("complete");
        result.Steps[2].Status.ShouldBe("complete");
        result.Steps[3].Status.ShouldBe("current");
        result.IsSetupComplete.ShouldBeFalse();
    }

    [Fact]
    public async Task GetSetupProgressAsync_AllComplete_IsSetupCompleteTrue()
    {
        _db.ChurchConfigs.Add(new ChurchConfig
        {
            ChurchName = "Test Church",
            DefaultLocale = "fr",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.Departments.Add(new Department
        {
            Name = "Youth",
            Abbreviation = "YO",
            Color = "#FF0000",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.ActivityTemplates.Add(new ActivityTemplate
        {
            Name = "Sabbath Service",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        _db.ProgramSchedules.Add(new ProgramSchedule
        {
            Title = "Divine Service",
            DayOfWeek = DayOfWeek.Saturday,
            StartTime = new TimeOnly(10, 0),
            EndTime = new TimeOnly(12, 0),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        });
        await _db.SaveChangesAsync();

        var result = await _sut.GetSetupProgressAsync(CancellationToken.None);

        result.Steps[0].Status.ShouldBe("complete");
        result.Steps[1].Status.ShouldBe("complete");
        result.Steps[2].Status.ShouldBe("complete");
        result.Steps[3].Status.ShouldBe("complete");
        result.IsSetupComplete.ShouldBeTrue();
    }

    public void Dispose()
    {
        _db.Dispose();
    }
}
