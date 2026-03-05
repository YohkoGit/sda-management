using FluentValidation;
using SdaManagement.Api.Dtos.ProgramSchedule;

namespace SdaManagement.Api.Validators;

public class CreateProgramScheduleRequestValidator : AbstractValidator<CreateProgramScheduleRequest>
{
    public CreateProgramScheduleRequestValidator()
    {
        ProgramScheduleValidationRules.Apply(this);
    }
}
