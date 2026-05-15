using SdaManagement.Api.Data.Entities;

namespace SdaManagement.Api.Dtos.Activity;

public interface IMeetingRequest
{
    bool? IsMeeting { get; }
    MeetingType? MeetingType { get; }
    string? ZoomLink { get; }
    string? LocationName { get; }
    string? LocationAddress { get; }
    List<ActivityRoleInput>? Roles { get; }
}
