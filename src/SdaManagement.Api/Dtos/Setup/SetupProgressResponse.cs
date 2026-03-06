namespace SdaManagement.Api.Dtos.Setup;

public class SetupProgressResponse
{
    public List<SetupStepItem> Steps { get; init; } = [];
    public bool IsSetupComplete { get; init; }
}
