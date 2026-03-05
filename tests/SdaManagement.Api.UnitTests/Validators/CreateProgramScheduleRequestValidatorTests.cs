using FluentValidation.TestHelper;
using SdaManagement.Api.Dtos.ProgramSchedule;
using SdaManagement.Api.Validators;
using Shouldly;

namespace SdaManagement.Api.UnitTests.Validators;

public class CreateProgramScheduleRequestValidatorTests
{
    private readonly CreateProgramScheduleRequestValidator _validator = new();

    private static CreateProgramScheduleRequest ValidRequest() => new()
    {
        Title = "Ecole du Sabbat",
        DayOfWeek = 6,
        StartTime = "09:30",
        EndTime = "10:30",
        HostName = "Fr. Joseph",
        DepartmentId = 1,
    };

    [Fact]
    public void Valid_request_passes()
    {
        var result = _validator.TestValidate(ValidRequest());
        result.ShouldNotHaveAnyValidationErrors();
    }

    [Fact]
    public void Valid_request_without_optional_fields_passes()
    {
        var request = ValidRequest() with { HostName = null, DepartmentId = null };
        var result = _validator.TestValidate(request);
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
    public void Title_exceeding_100_chars_fails()
    {
        var request = ValidRequest() with { Title = new string('A', 101) };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Fact]
    public void Title_with_control_characters_fails()
    {
        var request = ValidRequest() with { Title = "Title\u0000Name" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.Title);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(7)]
    [InlineData(99)]
    public void Invalid_dayOfWeek_fails(int dayOfWeek)
    {
        var request = ValidRequest() with { DayOfWeek = dayOfWeek };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.DayOfWeek);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [InlineData(6)]
    public void Valid_dayOfWeek_passes(int dayOfWeek)
    {
        var request = ValidRequest() with { DayOfWeek = dayOfWeek };
        var result = _validator.TestValidate(request);
        result.ShouldNotHaveValidationErrorFor(x => x.DayOfWeek);
    }

    [Fact]
    public void Empty_startTime_fails()
    {
        var request = ValidRequest() with { StartTime = "" };
        var result = _validator.TestValidate(request);
        result.ShouldHaveValidationErrorFor(x => x.StartTime);
    }

    [Theory]
    [InlineData("9:30")]
    [InlineData("abc")]
    [InlineData("25:00")]
    [InlineData("12:60")]
    public void Invalid_startTime_format_fails(string startTime)
    {
        var request = ValidRequest() with { StartTime = startTime };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("StartTime") || e.PropertyName.Contains("EndTime"));
    }

    [Fact]
    public void EndTime_before_startTime_fails()
    {
        var request = ValidRequest() with { StartTime = "14:00", EndTime = "10:00" };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.ErrorMessage.Contains("End time must be after start time"));
    }

    [Fact]
    public void EndTime_equals_startTime_fails()
    {
        var request = ValidRequest() with { StartTime = "10:00", EndTime = "10:00" };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.ErrorMessage.Contains("End time must be after start time"));
    }

    [Fact]
    public void HostName_exceeding_100_chars_fails()
    {
        var request = ValidRequest() with { HostName = new string('A', 101) };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("HostName"));
    }

    [Fact]
    public void HostName_with_control_characters_fails()
    {
        var request = ValidRequest() with { HostName = "Host\u0007Name" };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("HostName"));
    }

    [Fact]
    public void DepartmentId_zero_fails()
    {
        var request = ValidRequest() with { DepartmentId = 0 };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("DepartmentId"));
    }

    [Fact]
    public void DepartmentId_negative_fails()
    {
        var request = ValidRequest() with { DepartmentId = -1 };
        var result = _validator.TestValidate(request);
        result.Errors.ShouldContain(e => e.PropertyName.Contains("DepartmentId"));
    }
}
