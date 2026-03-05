using FluentValidation;
using SdaManagement.Api.Dtos.ProgramSchedule;

namespace SdaManagement.Api.Validators;

public class UpdateProgramScheduleRequestValidator : AbstractValidator<UpdateProgramScheduleRequest>
{
    public UpdateProgramScheduleRequestValidator()
    {
        ProgramScheduleValidationRules.Apply(this);
    }
}
