using System.Text.Json.Nodes;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using SdaManagement.Api.Dtos.Common;
using SdaManagement.Api.Dtos.User;

namespace SdaManagement.Api.OpenApi;

/// <summary>
/// ASP.NET's <c>AddOpenApi()</c> only emits schemas reachable through typed
/// action signatures. Our controllers return <c>IActionResult</c>, so response
/// DTOs never make it into <c>components.schemas</c> — that breaks the
/// `openapi-typescript`-generated FE client.
///
/// This transformer sweeps every public class in <c>SdaManagement.Api.Dtos</c>
/// and registers it as a schema. Subsequent FE codegen (`npm run generate:api`)
/// then sees the full type universe.
/// </summary>
public sealed class DtoSchemaTransformer : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(
        OpenApiDocument document,
        OpenApiDocumentTransformerContext context,
        CancellationToken cancellationToken)
    {
        var dtoTypes = typeof(Program).Assembly.GetTypes()
            .Where(t => t.IsClass
                && t.IsPublic
                && !t.IsAbstract
                && !t.ContainsGenericParameters
                && t.Namespace is not null
                && t.Namespace.StartsWith("SdaManagement.Api.Dtos", StringComparison.Ordinal));

        document.Components ??= new OpenApiComponents();
        document.Components.Schemas ??= new Dictionary<string, IOpenApiSchema>();

        foreach (var type in dtoTypes)
        {
            if (document.Components.Schemas.ContainsKey(type.Name))
                continue;

            var schema = await context.GetOrCreateSchemaAsync(type, cancellationToken: cancellationToken);
            document.Components.Schemas[type.Name] = schema;
        }

        // Register the closed generic uses we actually want emitted. Open
        // generics (e.g. PagedResponse<T>) can't be serialized so they're
        // skipped by the loop above; we name the closed-over instantiations here.
        var closedGenerics = new[] { typeof(PagedResponse<UserListItem>) };
        foreach (var type in closedGenerics)
        {
            // openapi-typescript emits a friendlier name when we strip the backtick suffix.
            var name = "PagedUserListItem";
            if (document.Components.Schemas.ContainsKey(name))
                continue;
            var schema = await context.GetOrCreateSchemaAsync(type, cancellationToken: cancellationToken);
            document.Components.Schemas[name] = schema;
        }
    }
}
