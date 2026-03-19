namespace SdaManagement.Api.Dtos.Activity;

public interface IMeetingRequest
{
    bool? IsMeeting { get; }
    string? MeetingType { get; }
    string? ZoomLink { get; }
    string? LocationName { get; }
    string? LocationAddress { get; }
    List<ActivityRoleInput>? Roles { get; }
}
