using System.Text.Json.Serialization;

namespace SdaManagement.Api.Data.Entities;

/// <summary>
/// Meeting medium for activities flagged as meetings (IsMeeting == true).
/// Persisted to the database as a lowercase string via .HasConversion&lt;string&gt;()
/// and serialized over the wire as lowercase ("physical" / "zoom") to preserve
/// the JSON contract that pre-dated this enum.
/// </summary>
[JsonConverter(typeof(JsonStringEnumConverter<MeetingType>))]
public enum MeetingType
{
    [JsonStringEnumMemberName("physical")]
    Physical,

    [JsonStringEnumMemberName("zoom")]
    Zoom,
}
