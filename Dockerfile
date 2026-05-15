# Stage 1: build the SPA (Vite → dist/)
FROM node:20-alpine AS spa-build
WORKDIR /app
COPY src/sdamanagement-web/package*.json ./
RUN npm ci
COPY src/sdamanagement-web/ ./
RUN npm run build

# Stage 2: restore + publish the API
FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS api-build
WORKDIR /src
COPY src/SdaManagement.Api/SdaManagement.Api.csproj ./SdaManagement.Api/
RUN dotnet restore ./SdaManagement.Api/SdaManagement.Api.csproj
COPY src/SdaManagement.Api/ ./SdaManagement.Api/
RUN dotnet publish ./SdaManagement.Api/SdaManagement.Api.csproj \
    -c Release -o /publish --no-restore /p:UseAppHost=false

# Stage 3: minimal runtime image — the aspnet:10.0-alpine image already provides
# a non-root `app` user; wget is available via BusyBox for the healthcheck.
FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS runtime
WORKDIR /app

# Alpine ships without IANA tzdata; PublicService.QuebecTimeZone needs "America/Toronto".
RUN apk add --no-cache tzdata

COPY --from=api-build /publish ./
COPY --from=spa-build /app/dist ./wwwroot

# Persistent data dir for LocalDisk blob provider (dev/QA without S3).
# Only this subtree needs to be writable by the app user.
RUN mkdir -p /app/data/blobs && chown -R app:app /app/data

USER app

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "SdaManagement.Api.dll"]
