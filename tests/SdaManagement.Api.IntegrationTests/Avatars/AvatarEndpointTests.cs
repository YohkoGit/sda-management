using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using Shouldly;

namespace SdaManagement.Api.IntegrationTests.Avatars;

public class AvatarEndpointTests : IntegrationTestBase
{
    public AvatarEndpointTests(SdaManagementWebApplicationFactory factory) : base(factory) { }

    private int _ownerUserId;
    private int _adminUserId;
    private int _viewerUserId;
    private int _targetUserId;
    private int _crossDeptUserId;
    private int _deptJaId;
    private int _deptMifemId;

    protected override async Task SeedTestData()
    {
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        var viewer = await CreateTestUser("test-viewer@test.local", UserRole.Viewer);

        _ownerUserId = owner.Id;
        _adminUserId = admin.Id;
        _viewerUserId = viewer.Id;

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var ja = new Department
        {
            Name = "Jeunesse Adventiste",
            Abbreviation = "JA",
            Color = "#4F46E5",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        var mifem = new Department
        {
            Name = "MIFEM",
            Abbreviation = "MIFEM",
            Color = "#10B981",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Departments.AddRange(ja, mifem);
        await db.SaveChangesAsync();

        _deptJaId = ja.Id;
        _deptMifemId = mifem.Id;

        // Admin assigned to JA
        await AssignDepartmentToUser(_adminUserId, _deptJaId);

        // Create target user in JA (same dept as admin)
        var target = new User
        {
            Email = "target@test.local",
            FirstName = "Target",
            LastName = "User",
            Role = UserRole.Viewer,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(target);
        await db.SaveChangesAsync();
        _targetUserId = target.Id;
        await AssignDepartmentToUser(_targetUserId, _deptJaId);

        // Create cross-dept user in MIFEM only
        var crossDept = new User
        {
            Email = "crossdept@test.local",
            FirstName = "Cross",
            LastName = "Dept",
            Role = UserRole.Viewer,
            IsGuest = false,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Users.Add(crossDept);
        await db.SaveChangesAsync();
        _crossDeptUserId = crossDept.Id;
        await AssignDepartmentToUser(_crossDeptUserId, _deptMifemId);
    }

    private static MultipartFormDataContent CreateTestImageContent(
        string contentType = "image/jpeg",
        int width = 64,
        int height = 64)
    {
        using var image = new Image<Rgb24>(width, height);
        using var ms = new MemoryStream();
        if (contentType == "image/png")
            image.SaveAsPng(ms);
        else
            image.SaveAsJpeg(ms);
        var bytes = ms.ToArray();

        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(fileContent, "file", "avatar.jpg");
        return content;
    }

    private static MultipartFormDataContent CreateRawContent(
        string contentType,
        int sizeBytes)
    {
        var bytes = new byte[sizeBytes];
        Array.Fill<byte>(bytes, 0xFF);
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(bytes);
        fileContent.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        content.Add(fileContent, "file", "avatar.jpg");
        return content;
    }

    // --- POST /api/avatars/{userId} ---

    [Fact]
    public async Task UploadAvatar_AsOwner_Returns204()
    {
        using var content = CreateTestImageContent();
        var response = await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UploadAvatar_AsAdmin_SameDepartment_Returns204()
    {
        using var content = CreateTestImageContent();
        var response = await AdminClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UploadAvatar_AsAdmin_CrossDepartment_Returns403()
    {
        using var content = CreateTestImageContent();
        var response = await AdminClient.PostAsync($"/api/avatars/{_crossDeptUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UploadAvatar_AsViewer_Returns403()
    {
        using var content = CreateTestImageContent();
        var response = await ViewerClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UploadAvatar_AsAnonymous_Returns401()
    {
        using var content = CreateTestImageContent();
        var response = await AnonymousClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UploadAvatar_OversizedFile_Returns400()
    {
        // Size must exceed MaxFileSizeBytes (512000) but stay under MultipartBodyLengthLimit (524288)
        using var content = CreateRawContent("image/jpeg", 513_000);
        var response = await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    [Fact]
    public async Task UploadAvatar_InvalidContentType_Returns400()
    {
        using var content = CreateRawContent("application/pdf", 1024);
        var response = await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    [Fact]
    public async Task UploadAvatar_InvalidImageContent_Returns400()
    {
        // Valid Content-Type but garbage bytes — ImageSharp can't decode
        using var content = CreateRawContent("image/jpeg", 1024);
        var response = await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", content);
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        doc.RootElement.GetProperty("type").GetString().ShouldBe("urn:sdac:validation-error");
    }

    [Fact]
    public async Task UploadAvatar_NonexistentUser_Returns404()
    {
        using var content = CreateTestImageContent();
        var response = await OwnerClient.PostAsync("/api/avatars/99999", content);
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // --- GET /api/avatars/{userId} ---

    [Fact]
    public async Task GetAvatar_WithAvatar_Returns200WithHeaders()
    {
        // First upload an avatar
        using var uploadContent = CreateTestImageContent();
        await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", uploadContent);

        // Then GET it
        var response = await AnonymousClient.GetAsync($"/api/avatars/{_targetUserId}");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.ShouldBe("image/webp");
        response.Headers.ETag.ShouldNotBeNull();
        response.Headers.CacheControl!.Public.ShouldBeTrue();
        response.Headers.CacheControl.MaxAge.ShouldBe(TimeSpan.FromSeconds(86400));
        response.Headers.TryGetValues("X-Content-Type-Options", out var xctValues).ShouldBeTrue();
        xctValues!.ShouldContain("nosniff");
    }

    [Fact]
    public async Task GetAvatar_MatchingIfNoneMatch_Returns304()
    {
        // Upload avatar
        using var uploadContent = CreateTestImageContent();
        await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", uploadContent);

        // GET to obtain ETag
        var response1 = await AnonymousClient.GetAsync($"/api/avatars/{_targetUserId}");
        var etag = response1.Headers.ETag!.Tag;

        // GET with If-None-Match
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/avatars/{_targetUserId}");
        request.Headers.IfNoneMatch.Add(new EntityTagHeaderValue(etag));
        var response2 = await AnonymousClient.SendAsync(request);
        response2.StatusCode.ShouldBe(HttpStatusCode.NotModified);
    }

    [Fact]
    public async Task GetAvatar_WithoutAvatar_Returns404()
    {
        var response = await AnonymousClient.GetAsync($"/api/avatars/{_targetUserId}");
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // --- Avatar URL in user list ---

    [Fact]
    public async Task GetUsers_IncludesAvatarUrl_ForUsersWithAvatars()
    {
        // Upload avatar for target user
        using var uploadContent = CreateTestImageContent();
        await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", uploadContent);

        // Get users list
        var response = await OwnerClient.GetAsync("/api/users");
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var items = doc.RootElement.GetProperty("items");

        var hasAvatarUrl = false;
        var hasNullAvatarUrl = false;

        for (int i = 0; i < items.GetArrayLength(); i++)
        {
            var item = items[i];
            var userId = item.GetProperty("id").GetInt32();

            if (userId == _targetUserId)
            {
                item.TryGetProperty("avatarUrl", out var avatarUrlProp).ShouldBeTrue();
                avatarUrlProp.ValueKind.ShouldBe(JsonValueKind.String);
                avatarUrlProp.GetString().ShouldContain($"/api/avatars/{_targetUserId}?v=");
                hasAvatarUrl = true;
            }
            else if (item.TryGetProperty("avatarUrl", out var nullProp))
            {
                if (nullProp.ValueKind == JsonValueKind.Null || nullProp.ValueKind == JsonValueKind.Undefined)
                    hasNullAvatarUrl = true;
            }
            else
            {
                // avatarUrl omitted (null) — WhenWritingNull config
                hasNullAvatarUrl = true;
            }
        }

        hasAvatarUrl.ShouldBeTrue("Target user should have avatarUrl");
        hasNullAvatarUrl.ShouldBeTrue("Users without avatar should have null/omitted avatarUrl");
    }

    // --- Re-upload ---

    [Fact]
    public async Task ReUploadAvatar_ChangesETagAndAvatarUrl()
    {
        // First upload
        using var content1 = CreateTestImageContent();
        await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", content1);

        var response1 = await AnonymousClient.GetAsync($"/api/avatars/{_targetUserId}");
        var etag1 = response1.Headers.ETag!.Tag;

        // Get avatarUrl from user list after first upload
        var usersResponse1 = await OwnerClient.GetAsync("/api/users");
        var usersJson1 = await usersResponse1.Content.ReadAsStringAsync();
        using var usersDoc1 = JsonDocument.Parse(usersJson1);
        var avatarUrl1 = usersDoc1.RootElement.GetProperty("items")
            .EnumerateArray()
            .First(u => u.GetProperty("id").GetInt32() == _targetUserId)
            .GetProperty("avatarUrl").GetString();

        // Re-upload with different image
        using var content2 = CreateTestImageContent(width: 32, height: 32);
        await OwnerClient.PostAsync($"/api/avatars/{_targetUserId}", content2);

        // Deterministically advance the file's last-write-time so the ETag and cache-bust
        // querystring (both derived from File.GetLastWriteTimeUtc().Ticks in AvatarService)
        // differ from the first upload. Avoids a flaky Task.Delay on fast filesystems.
        var avatarFilePath = Path.Combine(Factory.AvatarTestPath, $"{_targetUserId}.webp");
        File.SetLastWriteTimeUtc(avatarFilePath, DateTime.UtcNow.AddSeconds(1));

        var response2 = await AnonymousClient.GetAsync($"/api/avatars/{_targetUserId}");
        var etag2 = response2.Headers.ETag!.Tag;

        // Get avatarUrl from user list after re-upload
        var usersResponse2 = await OwnerClient.GetAsync("/api/users");
        var usersJson2 = await usersResponse2.Content.ReadAsStringAsync();
        using var usersDoc2 = JsonDocument.Parse(usersJson2);
        var avatarUrl2 = usersDoc2.RootElement.GetProperty("items")
            .EnumerateArray()
            .First(u => u.GetProperty("id").GetInt32() == _targetUserId)
            .GetProperty("avatarUrl").GetString();

        etag2.ShouldNotBe(etag1, "Re-upload should produce a different ETag");
        avatarUrl2.ShouldNotBe(avatarUrl1, "Re-upload should produce a different avatarUrl (cache-bust param)");
    }
}
