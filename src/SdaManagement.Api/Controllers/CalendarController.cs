using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using SdaManagement.Api.Services;

namespace SdaManagement.Api.Controllers;

[Route("api/calendar")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class CalendarController(ICalendarService calendarService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetCalendarActivities(
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end,
        [FromQuery] List<int>? departmentIds = null)
    {
        var result = await calendarService.GetCalendarActivitiesAsync(
            start, end, departmentIds);
        return Ok(result);
    }
}
