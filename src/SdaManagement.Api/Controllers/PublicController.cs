using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/public")]
[ApiController]
public class PublicController(IPublicService publicService, IYouTubeService youTubeService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("next-activity")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetNextActivity()
    {
        var result = await publicService.GetNextActivityAsync();
        return result is not null ? Ok(result) : NoContent();
    }

    [AllowAnonymous]
    [HttpGet("live-status")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetLiveStatus()
    {
        var result = await youTubeService.GetLiveStatusAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("upcoming-activities")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetUpcomingActivities()
    {
        var result = await publicService.GetUpcomingActivitiesAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("program-schedules")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetProgramSchedules()
    {
        var result = await publicService.GetProgramSchedulesAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("departments")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetPublicDepartments()
    {
        var result = await publicService.GetPublicDepartmentsAsync();
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("calendar")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetCalendarActivities(
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end)
    {
        var result = await publicService.GetCalendarActivitiesAsync(start, end);
        return Ok(result);
    }
}
