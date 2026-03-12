# Story 5.2: YouTube Live Stream Embed

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **anonymous visitor**,
I want to see the YouTube live stream link with service status on the public dashboard,
So that I or my family members can watch the service from anywhere.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5.1 migrations applied (`dotnet ef database update`)
- **YouTube Data API v3 key** — obtain from [Google Cloud Console](https://console.cloud.google.com/apis/credentials), enable "YouTube Data API v3" for the project. Store in `appsettings.Development.local.json` (gitignored by `*.local.json` pattern) or environment variable `YouTube__ApiKey`. **NOTE:** `appsettings.Development.json` is NOT gitignored — never put secrets there.

### Codebase State (Epic 5.1 Complete)

- Church identity settings functional (`GET /api/config` returns `PublicChurchConfigResponse` — already public, no auth)
- `PublicChurchConfigResponse` already includes `youTubeChannelUrl` (nullable string)
- `ChurchConfig` entity has `YouTubeChannelUrl` field (nullable, stores channel handle or video URL)
- `useChurchInfo()` hook already fetches config including YouTube URL (30-min staleTime)
- `HomePage.tsx` has placeholder `<section>` comment for Story 5.2 YouTube embed
- `LivePage.tsx` exists as a stub (heading only, route at `/live`)
- `HeroSection.tsx` fully implemented with church identity + next activity
- MSW config mock already includes `youTubeChannelUrl: "https://www.youtube.com/@sdac-st-hubert"`
- `PublicController` exists with one endpoint (`GET /api/public/next-activity`)
- `IPublicService` / `PublicService` exist — extend or create separate YouTube service
- "public" rate limiting policy exists (30 req/min per IP) in `ServiceCollectionExtensions.cs`
- No YouTube-specific components or services exist yet — needs to be created

## Acceptance Criteria

1. **YouTube section visible**: Given the church config has a YouTube channel URL configured, When the public dashboard renders, Then a YouTube section appears below the hero with the warm label "Suivez le culte en direct", And the YouTube embed or link is displayed at 16:9 aspect ratio.

2. **Live indicator from API**: Given a live stream is currently active on the church's YouTube channel, When the YouTube section renders, Then a pulsing rose/red live indicator shows "EN DIRECT", And the live stream is embedded directly as an iframe player (using the live video ID from the API).

3. **No URL configured**: Given no YouTube URL is configured in church settings, When the public dashboard renders, Then the YouTube section is completely hidden (no broken embed, no empty container).

4. **Live page enhanced**: Given a YouTube URL is configured, When the user navigates to `/live`, Then the LivePage shows the YouTube embed/link with full-width layout, warm label, and live indicator.

5. **Mobile responsive**: Given the public dashboard on mobile (375px), Then the YouTube section is full-width, maintains 16:9 aspect ratio, and is visible without excessive scrolling.

6. **URL format handling**: Given the admin has configured a YouTube URL in any supported format (channel URL, video URL, short URL, live URL), Then the component extracts a video ID when possible to show an iframe embed, Or falls back to a linked card for channel-only URLs when not live.

7. **Graceful degradation**: Given the YouTube API is unavailable (quota exceeded, network error, or API key missing), When the live status check fails, Then the section falls back to showing the channel link card (never a broken embed or error message), And the error is logged server-side for system health visibility.

8. **API security**: Given the YouTube API key is configured on the server, Then the key is NEVER exposed to the frontend (server-side only), And the `/api/public/live-status` response contains only whitelisted public fields.

## Tasks / Subtasks

### Backend — Configuration

- [x] Task 1: YouTube API Key Configuration (AC: #8)
  - [x] 1.1 Add `YouTube` section to `appsettings.json`:
    ```json
    "YouTube": {
      "ApiKey": ""
    }
    ```
  - [x] 1.2 Add populated key to `appsettings.Development.local.json` (gitignored by `*.local.json` pattern — **NOT** `appsettings.Development.json` which is committed):
    ```json
    "YouTube": {
      "ApiKey": "YOUR_DEV_API_KEY_HERE"
    }
    ```
  - [x] 1.3 **DO NOT** store the API key in any committed file or database. Environment variable `YouTube__ApiKey` overrides config file (standard ASP.NET Core config precedence).

### Backend — DTO

- [x] Task 2: Create Live Status DTO (AC: #2, #8)
  - [x] 2.1 Create `Dtos/Public/PublicLiveStatusResponse.cs`:
    ```csharp
    public record PublicLiveStatusResponse(
        bool IsLive,
        string? LiveVideoId,
        string? LiveTitle);
    ```
  - [x] 2.2 Verify NO API key, NO channel ID, NO quota info, NO internal fields in DTO — explicit whitelist only.

### Backend — YouTube Service

- [x] Task 3: Create YouTube Integration Service (AC: #2, #7, #8)
  - [x] 3.1 Create `Services/IYouTubeService.cs`:
    ```csharp
    public interface IYouTubeService
    {
        Task<PublicLiveStatusResponse> GetLiveStatusAsync();
    }
    ```
  - [x] 3.2 Create `Services/YouTubeService.cs`:
    - Constructor injection: `YouTubeService(IHttpClientFactory httpClientFactory, IConfigService configService, IMemoryCache cache, IConfiguration configuration, ILogger<YouTubeService> logger)`
    - Private method `ResolveChannelIdAsync(string channelUrl)`:
      - Parse handle from URL: extract `@handle` from `youtube.com/@handle` or `channel/UCxxx` from channel URL
      - If `channel/UCxxx` format → return channel ID directly (no API call)
      - If `@handle` format → call YouTube Data API v3:
        ```
        GET https://www.googleapis.com/youtube/v3/channels?part=id&forHandle={handle}&key={apiKey}
        ```
        **Note:** `forHandle` accepts both `@handle` and `handle` (without `@`) formats — strip the `@` prefix before passing to the API for consistency.
      - Extract `items[0].id` from response → that's the channel ID
      - Cache channel ID in `IMemoryCache` with **no expiration** (channel IDs don't change)
      - Return channel ID or null if resolution fails
    - Public method `GetLiveStatusAsync()`:
      - Step 1: Get church config via `configService.GetPublicConfigAsync()`
      - **Guard:** If config itself is null (fresh install, no ChurchConfig seeded) → return `new PublicLiveStatusResponse(false, null, null)` — `GetPublicConfigAsync()` returns `PublicChurchConfigResponse?` (nullable)
      - If config's YouTube URL is null/empty → return `new PublicLiveStatusResponse(false, null, null)`
      - Step 2: Resolve channel ID (cached after first call)
      - If channel ID resolution fails → return not-live response + log warning
      - Step 3: Check live status via YouTube Data API v3:
        ```
        GET https://www.googleapis.com/youtube/v3/search?part=id,snippet&channelId={channelId}&eventType=live&type=video&maxResults=1&key={apiKey}
        ```
      - If `items` array is non-empty → live stream found:
        - Optional validation: confirm `items[0].snippet.liveBroadcastContent === "active"` (should always be true since `eventType=live` was requested, but belt-and-suspenders)
        - `IsLive = true`
        - `LiveVideoId = items[0].id.videoId`
        - `LiveTitle = items[0].snippet.title`
      - If `items` is empty → `IsLive = false, LiveVideoId = null, LiveTitle = null`
      - **Cache entire response** in `IMemoryCache` for **2 minutes** (key: `"youtube-live-status"`)
      - Step 4: Handle errors gracefully:
        - HTTP 403 (quota exceeded) → log warning, return not-live
        - HTTP 429 (rate limited) → log warning, return cached value or not-live
        - HTTP timeout (5s) → log warning, return cached value or not-live
        - Any exception → log error, return not-live
        - **NEVER throw to caller** — always return a valid `PublicLiveStatusResponse`
  - [x] 3.3 Register `IMemoryCache` if not already registered: `services.AddMemoryCache()` in `ServiceCollectionExtensions.cs`
  - [x] 3.4 Register named HttpClient for YouTube API (**new pattern in codebase** — `IHttpClientFactory` not used before, but `Microsoft.Extensions.Http` is included in the ASP.NET Core shared framework — no new NuGet package needed):
    ```csharp
    services.AddHttpClient("YouTube", client =>
    {
        client.BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/");
        client.Timeout = TimeSpan.FromSeconds(5);
    });
    ```
  - [x] 3.5 Register DI: `services.AddScoped<IYouTubeService, YouTubeService>()`
  - [x] 3.6 **Quota awareness**: `search.list` costs 100 units/call. Default quota = 10,000 units/day. With 2-min cache: max 720 calls/day (72,000 units) if constant traffic — BUT traffic is only meaningful ~4 hours/week for a small church (Sabbath visitors). Realistic usage: ~60–100 calls/week. Well within free tier.

### Backend — Controller

- [x] Task 4: Add Live Status Endpoint (AC: #2, #7, #8)
  - [x] 4.1 Update `PublicController` primary constructor to include `IYouTubeService`:
    ```csharp
    public class PublicController(IPublicService publicService, IYouTubeService youTubeService) : ControllerBase
    ```
    This follows the existing codebase convention — all controllers use primary constructor injection, NOT `[FromServices]`.
  - [x] 4.2 Add endpoint to `Controllers/PublicController.cs`:
    ```csharp
    [AllowAnonymous]
    [HttpGet("live-status")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetLiveStatus()
    {
        var result = await youTubeService.GetLiveStatusAsync();
        return Ok(result);
    }
    ```
  - [x] 4.3 Note: Always returns 200 (even when not live) — `IsLive: false` is a valid state, not an error. This simplifies frontend handling (no 204 edge case).

### Backend — Tests

- [x] Task 5: YouTube Service Unit Tests (AC: #2, #7)
  - [x] 5.1 Create `tests/SdaManagement.Api.UnitTests/Services/YouTubeServiceTests.cs`:
    - `GetLiveStatus_WithLiveStream_ReturnsIsLiveTrue` — mock HTTP response with live search results
    - `GetLiveStatus_NoLiveStream_ReturnsIsLiveFalse` — mock HTTP response with empty items
    - `GetLiveStatus_NoYouTubeUrl_ReturnsNotLive` — config has null YouTube URL
    - `GetLiveStatus_ApiError_ReturnsNotLiveAndLogs` — mock 403/500 response → graceful fallback
    - `GetLiveStatus_Timeout_ReturnsNotLiveAndLogs` — mock timeout → graceful fallback
    - `GetLiveStatus_CachesResult_DoesNotCallApiTwice` — verify IMemoryCache is hit on second call
    - `ResolveChannelId_FromHandle_CallsApiAndCaches` — mock channels endpoint
    - `ResolveChannelId_FromChannelUrl_ExtractsDirectly` — no API call for `channel/UCxxx` format
  - [x] 5.2 Use `NSubstitute` to mock `IHttpClientFactory`, `IConfigService`, `IConfiguration`. For `IMemoryCache`, use a **real instance** `new MemoryCache(new MemoryCacheOptions())` — NSubstitute cannot easily mock `TryGetValue()` out parameters, and a real in-memory cache is fast, deterministic, and tests the actual caching behavior.
  - [x] 5.3 Use custom `MockHttpMessageHandler` to intercept HTTP calls and return canned responses
  - [x] 5.4 Assertions with `Shouldly`

- [x] Task 6: Live Status Integration Tests (AC: #2, #7, #8)
  - [x] 6.1 Create `tests/SdaManagement.Api.IntegrationTests/Public/LiveStatusEndpointTests.cs`:
    - `GetLiveStatus_ReturnsOkWithLiveData` — register mock `IYouTubeService` returning live status
    - `GetLiveStatus_WhenNotLive_ReturnsOkWithIsLiveFalse`
    - `GetLiveStatus_ResponseDoesNotContainApiKey` — assert no `apiKey` field in JSON response
    - `GetLiveStatus_AnonymousAccess_Returns200` — verify no auth required (use `AnonymousClient`)
  - [x] 6.2 Register fake `IYouTubeService` in test DI to avoid real YouTube API calls:
    ```csharp
    services.RemoveAll<IYouTubeService>();
    services.AddSingleton<IYouTubeService>(new FakeYouTubeService(isLive: true, videoId: "test123", title: "Test Stream"));
    ```
  - [x] 6.3 Create `tests/SdaManagement.Api.IntegrationTests/Helpers/FakeYouTubeService.cs` implementing `IYouTubeService`

### Frontend — Utility

- [x] Task 7: Create YouTube URL Parser (AC: #1, #6)
  - [x] 7.1 Create `lib/youtube.ts` with `parseYouTubeUrl(url: string)` function:
    - Extract video ID from supported URL formats:
      - `https://www.youtube.com/watch?v=VIDEO_ID` → `VIDEO_ID`
      - `https://youtu.be/VIDEO_ID` → `VIDEO_ID`
      - `https://www.youtube.com/embed/VIDEO_ID` → `VIDEO_ID`
      - `https://www.youtube.com/live/VIDEO_ID` → `VIDEO_ID`
    - Return `{ videoId: string | null; embedUrl: string | null; channelUrl: string }`
    - If video ID found → `embedUrl = "https://www.youtube.com/embed/${videoId}"`
    - If no video ID (channel URL like `@handle`) → `embedUrl = null`, `channelUrl = original URL`
  - [x] 7.2 This utility is used as **fallback** when the YouTube API is unavailable. When the API IS available, the live video ID comes from the API response — not from URL parsing.

### Frontend — Types & Service

- [x] Task 8: Create Live Status Types & Service (AC: #2)
  - [x] 8.1 Add `LiveStatus` interface to `types/public.ts`:
    ```typescript
    export interface LiveStatus {
      isLive: boolean;
      liveVideoId: string | null;
      liveTitle: string | null;
    }
    ```
  - [x] 8.2 Add live status method to `services/publicService.ts`:
    ```typescript
    import type { LiveStatus } from "@/types/public";

    getLiveStatus: () =>
      api.get<LiveStatus>("/api/public/live-status")
        .then(res => res.data),
    ```
    Note: Use `import type` (not `import`) for type-only imports — follows TypeScript `isolatedModules` best practice. Always returns 200 with data — no 204 handling needed.

### Frontend — Hook

- [x] Task 9: Create Live Status Hook (AC: #2, #7)
  - [x] 9.1 Add `useLiveStatus()` to `hooks/usePublicDashboard.ts`:
    ```typescript
    export function useLiveStatus(enabled: boolean = true) {
      return useQuery<LiveStatus>({
        queryKey: ["public", "live-status"],
        queryFn: publicService.getLiveStatus,
        staleTime: 2 * 60 * 1000,         // 2 min — matches server cache TTL
        refetchInterval: 2 * 60 * 1000,    // Auto-refresh every 2 min while page is visible
        enabled,                            // Only fetch when YouTube URL is configured
        retry: 1,                           // One retry on failure, then degrade gracefully
      });
    }
    ```
  - [x] 9.2 The `enabled` parameter allows YouTubeSection to only poll when `youTubeChannelUrl` is non-null (no wasted requests when YouTube isn't configured).
  - [x] 9.3 `refetchInterval` ensures the live indicator updates automatically — visitor doesn't need to refresh the page to see when the stream goes live.
  - [x] 9.4 **Intentional omission:** `refetchIntervalInBackground` defaults to `false` (TanStack Query v5) — polling pauses when the browser tab is not visible. This is intentional for quota conservation: no point checking live status if the user isn't looking at the page.

### Frontend — Components

- [x] Task 10: Create LiveIndicator Component (AC: #2)
  - [x] 10.1 Create `components/public/LiveIndicator.tsx`:
    - Props: none (it's purely visual — parent decides when to render)
    - Pulsing 8px `rose-500` dot with "EN DIRECT" text
    - CSS animation: `animate-pulse` on the dot
    - Text: `text-sm font-semibold text-rose-500`
    - Flex layout: dot + text inline
    - Uses i18n key: `pages.home.liveNow`
  - [x] 10.2 **Important:** LiveIndicator does NOT decide whether to render itself. The parent (`YouTubeSection`) renders `<LiveIndicator />` only when `liveStatus.isLive === true`. This keeps the indicator a pure presentational component.

- [x] Task 11: Create YouTubeSection Component (AC: #1, #2, #3, #5, #6, #7)
  - [x] 11.1 Create `components/public/YouTubeSection.tsx`:
    - Get `youTubeChannelUrl` from `useChurchInfo()` hook
    - If `youTubeChannelUrl` is null/empty → return `null` (AC #3: completely hidden)
    - Call `useLiveStatus(enabled: !!youTubeChannelUrl)` to get live status from API
    - Section wrapper: `bg-white` section, constrained `mx-auto max-w-7xl px-4 py-8 sm:py-12`
  - [x] 11.2 **Warm label**: `<h2>` with `text-2xl font-bold text-slate-900` displaying `t('pages.home.liveStreamTitle')` → "Suivez le culte en direct"
  - [x] 11.3 **LiveIndicator**: Render `<LiveIndicator />` inline-flex next to heading **only when** `liveStatus.data?.isLive === true`
  - [x] 11.4 **Live embed mode** (when API returns `isLive: true` with `liveVideoId`):
    - Responsive 16:9 iframe: `<div className="aspect-video w-full overflow-hidden rounded-2xl shadow-lg">` wrapping `<iframe>`
    - iframe `src`: `https://www.youtube.com/embed/${liveVideoId}` (from API response, NOT from URL parsing)
    - iframe attrs: `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`, `allowFullScreen`, `title={liveTitle || t('pages.home.liveStreamTitle')}`, `loading="lazy"`
    - `rounded-2xl` to match card radius design language
  - [x] 11.5 **Static embed mode** (when NOT live but `parseYouTubeUrl()` returns a video ID from the configured URL):
    - Same iframe embed but with the video ID from URL parsing (e.g., admin pasted a specific video link)
    - No live indicator shown
  - [x] 11.6 **Link card mode** (channel URL, no video ID, not live — OR API error fallback):
    - Card with YouTube-inspired design: `rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8`
    - YouTube play icon (SVG: red circle with white triangle) centered in card
    - "Regarder sur YouTube" link text: `<a href={channelUrl} target="_blank" rel="noopener noreferrer">`
    - `aspect-video` wrapper for consistent 16:9-ish sizing
    - `hover:bg-slate-100 hover:shadow-md transition-all` for hover feedback
  - [x] 11.7 **Display priority logic** (decision tree):
    ```
    1. youTubeChannelUrl is null/empty → return null (hidden)
    2. liveStatus.isLive && liveVideoId → LIVE EMBED (iframe with live video + EN DIRECT indicator)
    3. parseYouTubeUrl(url).videoId exists → STATIC EMBED (iframe with video from URL)
    4. else → LINK CARD (channel link with YouTube branding)
    ```
  - [x] 11.8 **Loading state**: While `useLiveStatus` is pending, show the section with a subtle skeleton or the link card (don't delay the entire section for live status check — YouTube URL availability is enough to show the section)
  - [x] 11.9 **Accessibility**: `aria-label` on iframe/link, semantic `<section>` with `aria-labelledby` pointing to the h2
  - [x] 11.10 **Responsive**: Mobile full-width, `sm:` and `lg:` constrain max-width of embed. **NEVER `md:` breakpoint.**

- [x] Task 12: Update HomePage (AC: #1, #5)
  - [x] 12.1 Replace Story 5.2 placeholder comment section in `pages/HomePage.tsx` with `<YouTubeSection />`
  - [x] 12.2 YouTubeSection internally calls `useChurchInfo()` — TanStack Query deduplicates by queryKey `["public", "church-info"]` (HeroSection already fetched it)
  - [x] 12.3 Verify no double config API call: both HeroSection and YouTubeSection use `useChurchInfo()` but TanStack Query serves from cache

- [x] Task 13: Update LivePage (AC: #4)
  - [x] 13.1 Replace stub content in `pages/LivePage.tsx` with:
    - Page title: `<h1>` with `t('pages.live.title')` ("En Direct")
    - `<YouTubeSection />` component (full-width experience)
  - [x] 13.2 Keep own `mx-auto max-w-7xl px-4 py-6` wrapper for page-level content
  - [x] 13.3 LivePage uses same hooks internally — separate TanStack Query instances share the same cache

### Frontend — i18n

- [x] Task 14: i18n Translation Keys (AC: #1, #2, #4)
  - [x] 14.1 Add French keys in `public/locales/fr/common.json` under `pages.home`:
    - `pages.home.liveStreamTitle` → "Suivez le culte en direct"
    - `pages.home.liveNow` → "EN DIRECT"
    - `pages.home.watchOnYouTube` → "Regarder sur YouTube"
    - `pages.home.liveStreamDescription` → "Rejoignez-nous en direct chaque sabbat"
  - [x] 14.2 Add English equivalents in `public/locales/en/common.json`:
    - `pages.home.liveStreamTitle` → "Watch the service live"
    - `pages.home.liveNow` → "LIVE NOW"
    - `pages.home.watchOnYouTube` → "Watch on YouTube"
    - `pages.home.liveStreamDescription` → "Join us live every Sabbath"
  - [x] 14.3 Update `pages.live` keys if LivePage needs additional labels

### Frontend — Tests

- [x] Task 15: YouTube URL Parser Tests (AC: #6)
  - [x] 15.1 Create `lib/youtube.test.ts`:
    - Extracts video ID from `youtube.com/watch?v=ID` format
    - Extracts video ID from `youtu.be/ID` short format
    - Extracts video ID from `youtube.com/embed/ID` format
    - Extracts video ID from `youtube.com/live/ID` format
    - Returns null videoId for channel URLs (`youtube.com/@handle`)
    - Returns null videoId for empty/invalid URLs

- [x] Task 16: Component Tests (AC: #1, #2, #3, #5, #7)
  - [x] 16.1 Create `components/public/YouTubeSection.test.tsx`:
    - **MSW setup:** `setupServer(...authHandlers, ...configHandlers, ...publicHandlers, ...liveStatusHandlers)` — must include `liveStatusHandlers` in the spread (follows HeroSection.test.tsx pattern). Use `server.use()` with `liveStatusHandlersLive` or `liveStatusHandlersError` for per-test overrides.
    - Renders YouTube section with live embed when API returns `isLive: true` + `liveVideoId`
    - Renders YouTube section with static embed when URL has video ID and not live
    - Renders YouTube section as link card when channel URL (no video ID, not live)
    - Renders "Suivez le culte en direct" heading
    - Renders "EN DIRECT" indicator when API `isLive: true`
    - Does NOT render "EN DIRECT" when API `isLive: false`
    - Returns null when `youTubeChannelUrl` is null (AC #3)
    - Returns null when `youTubeChannelUrl` is empty string
    - Falls back to link card when live status API errors (AC #7)
    - Iframe has correct accessibility attributes (`title`, `allow`)
    - Link card opens in new tab (`target="_blank"`)
  - [x] 16.2 Create `components/public/LiveIndicator.test.tsx`:
    - Renders pulsing dot with `animate-pulse` class
    - Renders "EN DIRECT" text
  - [x] 16.3 Update `pages/HomePage.test.tsx`:
    - Verify YouTubeSection renders below HeroSection when URL configured
  - [x] 16.4 Create `pages/LivePage.test.tsx`:
    - LivePage renders YouTubeSection
    - LivePage renders page title

- [x] Task 17: MSW Mock Handler Updates (AC: #2, #3, #7)
  - [x] 17.1 Add live status handlers to `mocks/handlers/public.ts`:
    ```typescript
    export const liveStatusHandlers = [
      http.get("/api/public/live-status", () =>
        HttpResponse.json({ isLive: false, liveVideoId: null, liveTitle: null })
      ),
    ];
    export const liveStatusHandlersLive = [
      http.get("/api/public/live-status", () =>
        HttpResponse.json({ isLive: true, liveVideoId: "dQw4w9WgXcQ", liveTitle: "Culte du Sabbat — En Direct" })
      ),
    ];
    export const liveStatusHandlersError = [
      http.get("/api/public/live-status", () =>
        new HttpResponse(null, { status: 500 })
      ),
    ];
    ```
  - [x] 17.2 Add config variant to `mocks/handlers/config.ts`:
    - Export `configHandlersNoYouTube` → `PublicChurchConfigResponse` with `youTubeChannelUrl: null`
  - [x] 17.3 For per-test overrides: `server.use(...)` with specific handler variants

- [x] Task 18: Update test-utils.tsx (AC: #1, #2)
  - [x] 18.1 Add i18n test keys to `test-utils.tsx` inline translations:
    - `pages.home.liveStreamTitle`, `pages.home.liveNow`, `pages.home.watchOnYouTube`, `pages.home.liveStreamDescription`

## Dev Notes

### Architecture Decision: YouTube Data API v3 Integration

**This story deviates from the original architecture doc** which stated "no API integration — just URL config in ChurchConfig" [Source: architecture.md:862]. After analysis via Architecture Decision Records, First Principles, Red Team/Blue Team, What-If Scenarios, and Cross-Functional War Room:

**Decision: Use YouTube Data API v3 for live status detection.**

**Rationale:** A time-window heuristic ("EN DIRECT" during Saturday 9:00–12:30) produces false positives (shows "LIVE" when no stream exists) and false negatives (misses unexpected streams like Wednesday prayer meetings). A false "EN DIRECT" indicator erodes the trust the public dashboard is designed to build. The YouTube API provides ground truth at minimal cost.

**Impact:** This adds ~150 lines of backend code (service + caching + endpoint) and one secret (API key). The free tier quota (10,000 units/day) is more than sufficient for a single-church app with ~60–100 API calls/week of realistic traffic.

### YouTube Data API v3 — How It Works

**Two API calls, both cached:**

1. **Resolve channel handle → channel ID** (once, cached forever):
   ```
   GET https://www.googleapis.com/youtube/v3/channels
     ?part=id
     &forHandle=sdac-st-hubert
     &key={apiKey}
   ```
   Cost: 1 quota unit. Response: `{ items: [{ id: "UCxxxxxxxxxx" }] }`

2. **Check if channel is live** (cached 2 minutes):
   ```
   GET https://www.googleapis.com/youtube/v3/search
     ?part=id,snippet
     &channelId=UCxxxxxxxxxx
     &eventType=live
     &type=video
     &key={apiKey}
   ```
   Cost: 100 quota units. Response: `{ items: [{ id: { videoId: "abc123" }, snippet: { title: "Culte..." } }] }` (empty `items` = not live)

**Quota math:**
- Default free quota: 10,000 units/day
- `search.list` = 100 units/call
- With 2-min cache: max 720 calls/day IF someone is constantly on the page 24/7
- Realistic: Church visitors come Friday evening + Saturday morning (~4 hours/week) → ~60 cached calls → 6,000 units. Well within free tier.

### Caching Strategy

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Frontend    │     │  Backend     │     │  YouTube API    │
│  (TanStack   │────>│  /api/public │────>│  search.list    │
│   Query)     │     │  /live-status│     │  (if cache miss) │
│  2-min stale │     │  2-min cache │     │                 │
└─────────────┘     └──────────────┘     └─────────────────┘
```

- **Server-side `IMemoryCache`**: 2-min TTL for live status, permanent for channel ID
- **Frontend TanStack Query**: 2-min `staleTime` + 2-min `refetchInterval`
- **Net effect**: YouTube API called at most once every 2 minutes regardless of visitor count
- **Cold start**: First request after app restart triggers one API call (~200ms). All subsequent requests within 2 min use cache.

### Graceful Degradation (All Failure Modes)

| Scenario | Server Response | Frontend Behavior |
|---|---|---|
| YouTube API quota exceeded (403) | `{ isLive: false, ... }` + log warning | Link card mode |
| YouTube API rate limited (429) | Cached value or `{ isLive: false }` + log warning | Link card mode |
| YouTube API timeout (5s) | Cached value or `{ isLive: false }` + log | Link card mode |
| YouTube API error (5xx) | `{ isLive: false }` + log error | Link card mode |
| API key missing/empty | `{ isLive: false }` + log warning | Link card mode |
| Channel ID resolution fails | `{ isLive: false }` + log warning | Link card mode |
| No YouTube URL configured | Section hidden entirely | `return null` |
| Frontend API error | `isError` state | Link card mode |

**Key principle:** The YouTube service NEVER throws to caller. It always returns a valid `PublicLiveStatusResponse`. All errors degrade to "not live" + server-side logging.

### Security Analysis (Red Team Validated)

| Concern | Mitigation |
|---|---|
| API key exposure | Server-side only. Never in frontend code, never in API response. |
| Quota exhaustion via our endpoint | Server-side 2-min cache decouples request rate from API calls. Rate limiting (30 req/min) further limits. |
| SSRF | Outbound URL constructed from channel ID (alphanumeric), not user input. Hardcoded YouTube API base URL. |
| Response data leakage | `PublicLiveStatusResponse` has 3 explicit whitelist fields only. |
| Poisoned cache | Cache populated from YouTube API, not user input. |

### YouTube URL Parsing Strategy (Fallback Utility)

The URL parser remains as a **fallback** for when the YouTube API is unavailable but the admin has pasted a specific video URL. It enables "static embed mode" — embedding a specific video without live detection.

| URL Format | Example | Result |
|---|---|---|
| Watch URL | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | videoId: `dQw4w9WgXcQ` → embed |
| Short URL | `https://youtu.be/dQw4w9WgXcQ` | videoId: `dQw4w9WgXcQ` → embed |
| Embed URL | `https://www.youtube.com/embed/dQw4w9WgXcQ` | videoId: `dQw4w9WgXcQ` → embed |
| Live URL | `https://www.youtube.com/live/dQw4w9WgXcQ` | videoId: `dQw4w9WgXcQ` → embed |
| Channel handle | `https://www.youtube.com/@sdac-st-hubert` | No videoId → link card |
| Channel URL | `https://www.youtube.com/channel/UCxxxxxx` | No videoId → link card |

```typescript
// lib/youtube.ts
export function parseYouTubeUrl(url: string): {
  videoId: string | null;
  embedUrl: string | null;
  channelUrl: string;
} {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/
  );
  if (match) {
    return {
      videoId: match[1],
      embedUrl: `https://www.youtube.com/embed/${match[1]}`,
      channelUrl: url,
    };
  }
  return { videoId: null, embedUrl: null, channelUrl: url };
}
```

### Component Display Priority Logic

```
YouTubeSection decision tree:
│
├─ youTubeChannelUrl is null/empty? → return null (HIDDEN)
│
├─ useLiveStatus().data?.isLive && liveVideoId?
│   → LIVE EMBED MODE: iframe with live videoId + <LiveIndicator />
│
├─ parseYouTubeUrl(url).videoId exists?
│   → STATIC EMBED MODE: iframe with video from URL (no live indicator)
│
└─ else
    → LINK CARD MODE: channel link with YouTube branding
```

### Design Specifications (from UX Spec + frontend-design)

**YouTube Section Layout:**
- Below hero section on HomePage, separate white background section
- Section wrapper: `bg-white` (contrast with dark hero above)
- Inner content: `mx-auto max-w-7xl px-4 py-8 sm:py-12`
- Heading + live indicator on same line: flex layout

**Embed Container:**
- `aspect-video` Tailwind class (16:9 ratio)
- `rounded-2xl` to match card design language
- `overflow-hidden` to clip iframe corners
- `w-full` for responsive scaling
- Shadow: `shadow-lg` for depth on embed

**Link Card (fallback):**
- `rounded-2xl border border-slate-200 bg-slate-50`
- YouTube play button icon centered (SVG: red circle with white triangle)
- "Regarder sur YouTube" CTA text
- Hover state: `hover:bg-slate-100 hover:shadow-md transition-all`
- Opens in new tab: `target="_blank" rel="noopener noreferrer"`

**Live Indicator:**
- Dot: 8px `bg-rose-500 rounded-full animate-pulse`
- Text: `text-sm font-semibold text-rose-500`
- Positioned inline-flex next to heading

**Typography (Public Register Rules):**
- Heading: `text-2xl font-bold text-slate-900` — section title
- Subtext: `text-base text-slate-600` — description
- Minimum text size: 14px (`text-sm`) — NEVER smaller on public layer
- All text via `t()` from `useTranslation()` — zero hardcoded strings

**Color Tokens:**
- `--live`: `rose-500` (#F43F5E) — pulsing dot + "EN DIRECT" text
- Section background: `bg-white` (light section contrast)
- Card borders: `border-slate-200`
- Card background: `bg-slate-50`

**Responsive Breakpoints:**
- Base (375px) → mobile: full-width embed, stacked layout
- `sm:` (640px) → tablet: same full-width, more vertical padding
- `lg:` (1024px) → desktop: content constrained by max-w-7xl
- **NEVER `md:` (768px)** — intentionally skipped per architecture

### Existing Infrastructure to Reuse

**DO NOT recreate:**
- `GET /api/config` → public church info with YouTube URL ([Source: Controllers/ConfigController.cs:18])
- `configService.getPublic()` → frontend call ([Source: services/configService.ts:24])
- `useChurchInfo()` → hook fetching config ([Source: hooks/usePublicDashboard.ts])
- `PublicChurchConfigResponse` → DTO with `YouTubeChannelUrl` ([Source: Dtos/Config/PublicChurchConfigResponse.cs])
- `api` Axios instance → configured with interceptors ([Source: lib/api.ts])
- "public" rate limiting policy → already registered ([Source: Extensions/ServiceCollectionExtensions.cs])
- `IConfigService` → inject in `YouTubeService` to get church config

**Extend:**
- `PublicController` → add `GetLiveStatus()` endpoint
- `publicService.ts` → add `getLiveStatus()` method
- `usePublicDashboard.ts` → add `useLiveStatus()` hook
- `types/public.ts` → add `LiveStatus` interface
- `ServiceCollectionExtensions.cs` → add `IYouTubeService` DI + `AddMemoryCache()` + `AddHttpClient("YouTube")`

### Testing Standards

**Backend unit tests:**
- File: `tests/SdaManagement.Api.UnitTests/Services/YouTubeServiceTests.cs`
- Naming: `{MethodName}_{Scenario}_{ExpectedResult}`
- Mocking: NSubstitute for interfaces, custom `MockHttpMessageHandler` for HTTP calls
- Assertions: Shouldly

**Backend integration tests:**
- File: `tests/SdaManagement.Api.IntegrationTests/Public/LiveStatusEndpointTests.cs`
- Use `FakeYouTubeService` registered in test DI (no real YouTube API calls in tests)
- Client: `AnonymousClient` from `IntegrationTestBase`

**Frontend test files:** Co-located (`YouTubeSection.test.tsx` next to `YouTubeSection.tsx`)
**Frontend test setup:** Use `render()` from `test-utils.tsx` (wraps Router, i18n, QueryClient, Auth, Tooltip)
**Frontend mock pattern:** MSW handlers + `server.use()` for per-test overrides
**Frontend assertions:** `@testing-library/jest-dom` matchers

### Previous Story Intelligence (5.1)

From Story 5.1 implementation and code review:
- **TanStack Query v5**: Use `isPending` (not deprecated `isLoading`)
- **MSW per-test-file**: Server setup is per-test file, not global
- **test-utils.tsx i18n**: Must add new keys to inline translations for tests
- **`vi.useFakeTimers()`**: Used for date-dependent tests — not needed here since live status comes from API, not time-window
- **lg: desktop layout**: Ensure responsive layout works at lg: breakpoint
- **Skeleton override on dark bg**: Not needed here — YouTube section is on white bg
- **204 handling**: Not needed — live-status endpoint always returns 200

### Git Intelligence

Recent commits show:
- Story 5.1 committed as `feat(public): Story 5.1 — Public dashboard hero section & next activity with code review fixes`
- UI validation fixes applied separately
- Pattern: feature commit with code review fixes folded in

### Project Structure Notes

**New files to create:**
```
src/SdaManagement.Api/
├── Dtos/Public/PublicLiveStatusResponse.cs                 ← NEW
├── Services/IYouTubeService.cs                             ← NEW
├── Services/YouTubeService.cs                              ← NEW

tests/SdaManagement.Api.UnitTests/
└── Services/YouTubeServiceTests.cs                         ← NEW

tests/SdaManagement.Api.IntegrationTests/
├── Helpers/FakeYouTubeService.cs                           ← NEW
└── Public/LiveStatusEndpointTests.cs                       ← NEW

src/sdamanagement-web/src/
├── lib/youtube.ts                                          ← NEW (URL parser utility)
├── lib/youtube.test.ts                                     ← NEW (pure unit tests)
├── components/public/YouTubeSection.tsx                    ← NEW
├── components/public/YouTubeSection.test.tsx               ← NEW
├── components/public/LiveIndicator.tsx                     ← NEW
├── components/public/LiveIndicator.test.tsx                ← NEW
```

**Files to modify:**
```
src/SdaManagement.Api/
├── appsettings.json                                        ← ADD YouTube:ApiKey section (empty)
├── appsettings.Development.local.json                       ← ADD YouTube:ApiKey (dev key, gitignored)
├── Controllers/PublicController.cs                         ← ADD GetLiveStatus endpoint
├── Extensions/ServiceCollectionExtensions.cs               ← ADD YouTubeService DI + MemoryCache + HttpClient

src/sdamanagement-web/src/
├── types/public.ts                                         ← ADD LiveStatus interface
├── services/publicService.ts                               ← ADD getLiveStatus method
├── hooks/usePublicDashboard.ts                             ← ADD useLiveStatus hook
├── pages/HomePage.tsx                                      ← REPLACE 5.2 placeholder with YouTubeSection
├── pages/LivePage.tsx                                      ← REPLACE stub with YouTubeSection + title
├── pages/LivePage.test.tsx                                 ← NEW (LivePage test)
├── mocks/handlers/public.ts                                ← ADD liveStatus handlers
├── mocks/handlers/config.ts                                ← ADD configHandlersNoYouTube variant
├── test-utils.tsx                                          ← ADD i18n test keys

src/sdamanagement-web/public/
├── locales/fr/common.json                                  ← ADD pages.home.liveStream* keys
├── locales/en/common.json                                  ← ADD pages.home.liveStream* keys
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.2 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md:862 — Original YouTube approach (overridden by ADR in this story)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Live indicator design, public register typography, responsive layout, warm vocabulary]
- [Source: _bmad-output/planning-artifacts/prd.md — FR2 (YouTube live embed), FR56 (YouTube URL in config)]
- [Source: src/SdaManagement.Api/Data/Entities/ChurchConfig.cs — YouTubeChannelUrl field]
- [Source: src/SdaManagement.Api/Dtos/Config/PublicChurchConfigResponse.cs — YouTubeChannelUrl in public DTO]
- [Source: src/SdaManagement.Api/Controllers/PublicController.cs — Existing public endpoint pattern]
- [Source: src/SdaManagement.Api/Controllers/ConfigController.cs:18 — GET /api/config public endpoint]
- [Source: src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs — DI registration pattern + "public" rate limit policy]
- [Source: src/sdamanagement-web/src/services/configService.ts:24 — getPublic() method]
- [Source: src/sdamanagement-web/src/services/publicService.ts — publicService pattern]
- [Source: src/sdamanagement-web/src/hooks/usePublicDashboard.ts — useChurchInfo() and useNextActivity() hook patterns]
- [Source: src/sdamanagement-web/src/components/settings/ChurchIdentityForm.tsx — YouTube URL admin form]
- [Source: src/sdamanagement-web/src/schemas/configSchema.ts — youTubeChannelUrl Zod validation]
- [Source: src/sdamanagement-web/src/mocks/handlers/config.ts — mock YouTube URL]
- [Source: src/sdamanagement-web/src/mocks/handlers/public.ts — MSW handler pattern]
- [Source: _bmad-output/implementation-artifacts/5-1-public-dashboard-hero-section-and-next-activity.md — previous story patterns and learnings]
- [YouTube Data API v3 — search.list: 100 quota units/call, channels.list: 1 unit/call, default 10,000 units/day]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing `DatabaseSeeder.SeedDevDataAsync()` caused integration test failures — `Program.cs` calls it during host startup before migrations are applied in test environment. Fixed by adding `SeedDevData` config guard (defaults `true`, test factory sets `false`).
- `PublicLiveStatusResponse` nullable fields (`liveVideoId`, `liveTitle`) omitted from JSON by `WhenWritingNull` serializer option. Fixed integration test assertions to match actual serialization behavior.

### Completion Notes List

- All 18 tasks implemented and verified
- Backend: 246 unit tests + 305 integration tests passing (including 4 new LiveStatus tests)
- Frontend: 345 tests across 41 files passing (including 8 YouTubeSection + 2 LiveIndicator + 7 youtube parser + 2 LivePage + 1 HomePage tests)
- Pre-existing `DatabaseSeeder` issue fixed as part of integration test setup
- YouTube Data API v3 integration with server-side caching (2-min live status, permanent channel ID)
- Graceful degradation: service never throws, all errors degrade to "not live" + logging

### File List

**New files created:**
- `src/SdaManagement.Api/Dtos/Public/PublicLiveStatusResponse.cs`
- `src/SdaManagement.Api/Services/IYouTubeService.cs`
- `src/SdaManagement.Api/Services/YouTubeService.cs`
- `tests/SdaManagement.Api.UnitTests/Services/YouTubeServiceTests.cs`
- `tests/SdaManagement.Api.IntegrationTests/Helpers/FakeYouTubeService.cs`
- `tests/SdaManagement.Api.IntegrationTests/Public/LiveStatusEndpointTests.cs`
- `src/sdamanagement-web/src/lib/youtube.ts`
- `src/sdamanagement-web/src/lib/youtube.test.ts`
- `src/sdamanagement-web/src/components/public/YouTubeSection.tsx`
- `src/sdamanagement-web/src/components/public/YouTubeSection.test.tsx`
- `src/sdamanagement-web/src/components/public/LiveIndicator.tsx`
- `src/sdamanagement-web/src/components/public/LiveIndicator.test.tsx`
- `src/sdamanagement-web/src/pages/LivePage.test.tsx`

**Files modified:**
- `src/SdaManagement.Api/appsettings.json` — added `YouTube:ApiKey` section
- `src/SdaManagement.Api/Controllers/PublicController.cs` — added `GetLiveStatus` endpoint
- `src/SdaManagement.Api/Data/DatabaseSeeder.cs` — pre-existing uncommitted changes (SeedDevDataAsync from prior stories); `SeedDevData` config guard added to Program.cs to prevent test failures
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — added MemoryCache, HttpClient, YouTubeService DI
- `src/SdaManagement.Api/Program.cs` — added `SeedDevData` config guard for dev seeder
- `tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs` — registered FakeYouTubeService + SeedDevData=false
- `src/sdamanagement-web/src/types/public.ts` — added `LiveStatus` interface
- `src/sdamanagement-web/src/services/publicService.ts` — added `getLiveStatus` method
- `src/sdamanagement-web/src/hooks/usePublicDashboard.ts` — added `useLiveStatus` hook
- `src/sdamanagement-web/src/pages/HomePage.tsx` — replaced 5.2 placeholder with `<YouTubeSection />`
- `src/sdamanagement-web/src/pages/HomePage.test.tsx` — added liveStatusHandlers + YouTubeSection test
- `src/sdamanagement-web/src/pages/LivePage.tsx` — replaced stub with `<YouTubeSection />`
- `src/sdamanagement-web/public/locales/fr/common.json` — added liveStream i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — added liveStream i18n keys
- `src/sdamanagement-web/src/mocks/handlers/public.ts` — added liveStatus MSW handlers
- `src/sdamanagement-web/src/mocks/handlers/config.ts` — added configHandlersNoYouTube
- `src/sdamanagement-web/src/test-utils.tsx` — added i18n test keys
