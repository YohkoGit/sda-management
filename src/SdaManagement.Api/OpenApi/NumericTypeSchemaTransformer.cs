using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;

namespace SdaManagement.Api.OpenApi;

/// <summary>
/// Two fixes for .NET 10's OpenAPI emission that interact badly with the
/// `openapi-typescript` codegen:
///
/// 1. Numeric properties come out as <c>"type": ["integer", "string"]</c>
///    to permit the stringified-large-number JSON parse mode. The FE always
///    sends/receives numbers, so this transformer strips the "string" bit.
///
/// 2. The emitter never populates the top-level <c>required</c> array,
///    so with <c>--properties-required-by-default</c> the codegen treats
///    every field as required-and-non-nullable, and without that flag it
///    treats every field as optional. Neither matches reality. We
///    rebuild <c>required</c> here: every property whose type does NOT
///    include <c>null</c> is required (matches C# non-nullable annotation);
///    nullable properties stay optional and may be omitted by
///    <c>JsonIgnoreCondition.WhenWritingNull</c>.
/// </summary>
public sealed class NumericTypeSchemaTransformer : IOpenApiSchemaTransformer
{
    public Task TransformAsync(
        OpenApiSchema schema,
        OpenApiSchemaTransformerContext context,
        CancellationToken cancellationToken)
    {
        Narrow(schema);
        BuildRequired(schema);
        return Task.CompletedTask;
    }

    private static void Narrow(OpenApiSchema schema)
    {
        if (schema.Type is { } type && (type & JsonSchemaType.String) != 0)
        {
            if ((type & JsonSchemaType.Integer) != 0)
                schema.Type = type & ~JsonSchemaType.String;
            else if ((type & JsonSchemaType.Number) != 0)
                schema.Type = type & ~JsonSchemaType.String;
        }
    }

    private static void BuildRequired(OpenApiSchema schema)
    {
        if (schema.Properties is null || schema.Properties.Count == 0)
            return;

        var required = new HashSet<string>(schema.Required ?? new HashSet<string>());
        foreach (var (name, prop) in schema.Properties)
        {
            if (prop is OpenApiSchema concreteProp && !IsNullable(concreteProp))
                required.Add(name);
        }
        schema.Required = required;
    }

    private static bool IsNullable(OpenApiSchema schema)
    {
        // Property is nullable if its declared type union includes Null.
        if (schema.Type is { } type && (type & JsonSchemaType.Null) != 0)
            return true;
        // Nullable enums (e.g. `MeetingType?`) emit no `type` and put `null`
        // among the enum values — treat the presence of null there as nullable.
        if (schema.Enum is { } enumValues && enumValues.Any(v => v is null
            || (v is System.Text.Json.Nodes.JsonValue jv && jv.GetValueKind() == System.Text.Json.JsonValueKind.Null)))
        {
            return true;
        }
        return false;
    }
}
