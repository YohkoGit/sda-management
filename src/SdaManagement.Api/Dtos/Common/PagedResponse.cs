namespace SdaManagement.Api.Dtos.Common;

public class PagedResponse<T>
{
    public List<T> Items { get; init; } = [];
    public string? NextCursor { get; init; }
}
