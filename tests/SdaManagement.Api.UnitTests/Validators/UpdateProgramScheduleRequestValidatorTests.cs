using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.ProgramSchedule;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class UpdateProgramScheduleRequestValidatorTests
{
    private readonly UpdateProgramScheduleRequestValidator _validator = new();

    private static UpdateProgramScheduleRequest ValidRequest() => new()
    {
        Title = "Culte Divin",
        DayOfWeek = 6,
        StartTime = "11:00",
        EndTime = "12:30",
        HostName = null,
        DepartmentId = null,
    };

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Empty_title_fails()
    {
        var request = ValidRequest() with { Title = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void EndTime_before_startTime_fails()
    {
        var request = ValidRequest() with { StartTime = "14:00", EndTime = "10:00" };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.ErrorMessage.Contains("End time must be after start time"));
    }

    [Fact]
    public void Invalid_time_format_fails()
    {
        var request = ValidRequest() with { StartTime = "abc" };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("StartTime") || e.PropertyName.Contains("EndTime"));
    }
}
