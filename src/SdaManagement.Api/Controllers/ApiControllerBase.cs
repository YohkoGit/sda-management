using FluentValidation.Results;
using Microsoft.AspNetCore.Mvc;

namespace SdaManagement.Api.Controllers;

public abstract class ApiControllerBase : ControllerBase
{
    protected BadRequestObjectResult ValidationError(ValidationResult validation) =>
        BadRequest(new ValidationProblemDetails(validation.ToDictionary())
        {
            Type = "urn:sdac:validation-error",
            Title = "Validation Error",
            Status = 400,
        });
}
