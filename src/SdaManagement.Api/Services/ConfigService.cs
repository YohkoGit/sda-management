using Microsoft.EntityFrameworkCore;
using SdaManagement.Api.Data;
using SdaManagement.Api.Data.Entities;
using SdaManagement.Api.Dtos.Config;

namespace SdaManagement.Api.Services;

public class ConfigService(AppDbContext dbContext) : IConfigService
{
    public async Task<PublicChurchConfigResponse?> GetPublicConfigAsync()
    {
        return await dbContext.ChurchConfigs
            .Select(c => new PublicChurchConfigResponse
            {
                ChurchName = c.ChurchName,
                Address = c.Address,
                WelcomeMessage = c.WelcomeMessage,
                YouTubeChannelUrl = c.YouTubeChannelUrl,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ChurchConfigResponse?> GetConfigAsync()
    {
        return await dbContext.ChurchConfigs
            .Select(c => new ChurchConfigResponse
            {
                Id = c.Id,
                ChurchName = c.ChurchName,
                Address = c.Address,
                YouTubeChannelUrl = c.YouTubeChannelUrl,
                PhoneNumber = c.PhoneNumber,
                WelcomeMessage = c.WelcomeMessage,
                DefaultLocale = c.DefaultLocale,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ChurchConfigResponse> UpsertConfigAsync(UpdateChurchConfigRequest request)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable);

        var config = await dbContext.ChurchConfigs.FirstOrDefaultAsync();

        if (config is null)
        {
            config = new ChurchConfig
            {
                ChurchName = request.ChurchName,
                Address = request.Address,
                YouTubeChannelUrl = request.YouTubeChannelUrl,
                PhoneNumber = request.PhoneNumber,
                WelcomeMessage = request.WelcomeMessage,
                DefaultLocale = request.DefaultLocale,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
            dbContext.ChurchConfigs.Add(config);
        }
        else
        {
            config.ChurchName = request.ChurchName;
            config.Address = request.Address;
            config.YouTubeChannelUrl = request.YouTubeChannelUrl;
            config.PhoneNumber = request.PhoneNumber;
            config.WelcomeMessage = request.WelcomeMessage;
            config.DefaultLocale = request.DefaultLocale;
            config.UpdatedAt = DateTime.UtcNow;
        }

        await dbContext.SaveChangesAsync();
        await transaction.CommitAsync();

        return new ChurchConfigResponse
        {
            Id = config.Id,
            ChurchName = config.ChurchName,
            Address = config.Address,
            YouTubeChannelUrl = config.YouTubeChannelUrl,
            PhoneNumber = config.PhoneNumber,
            WelcomeMessage = config.WelcomeMessage,
            DefaultLocale = config.DefaultLocale,
            CreatedAt = config.CreatedAt,
            UpdatedAt = config.UpdatedAt,
        };
    }
}
