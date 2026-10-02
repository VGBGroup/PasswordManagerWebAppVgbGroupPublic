using Backend.Api.DTOs.Credentials;
using Backend.Api.DTOs.Users;
using Backend.Api.DTOs.UserSettings;
using Backend.Api.Services.Credentials;
using Backend.Api.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Backend.Api.Controllers.Credentials;

[ApiController]
[Route("api/credentials")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly ICredentialService _credentialService;

    public UserController(ICredentialService credentialService)
    {
        _credentialService = credentialService;
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim is null ? null : Guid.Parse(claim);
    }

    [HttpGet]
    public async Task<IActionResult> GetUserCredentials()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _credentialService.GetUserCredentials(userRecordId.Value);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("create")]
    public async Task<IActionResult> CreateUserCredential([FromBody] CredentialCreateInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _credentialService.CreateCredentialAsync(userRecordId.Value, dto);
            return Ok(result);
        }
        catch (SubscriptionLimitExceededException ex)
        {
            return StatusCode(402, new
            {
                needsUpgrade = true,
                message = ex.Message,
                currentLimit = ex.CurrentLimit,
                upgradeUrl = ex.UpgradeUrl
            });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPatch("favourite")]
    public async Task<IActionResult> UpdateCredentialFavourite([FromBody] FavouriteInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _credentialService.UpdateFavourite(userRecordId.Value, dto);
            return Ok(true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{credentialRecordId}")]
    public async Task<IActionResult> DeleteCredential(long credentialRecordId)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _credentialService.DeleteCredential(userRecordId.Value, credentialRecordId);
            return Ok(true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{credentialRecordId}")]
    public async Task<IActionResult> UpdateCredential(long credentialRecordId, [FromBody] UpdateCredentialInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _credentialService.UpdateCredential(userRecordId.Value, credentialRecordId, dto);
            return Ok(true);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportCredentials([FromBody] CredentialImportRequestInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _credentialService.ImportCredentialsAsync(userRecordId.Value, dto);
            return Ok(result);
        }
        catch (SubscriptionLimitExceededException ex)
        {
            return StatusCode(402, new
            {
                needsUpgrade = true,
                message = ex.Message,
                currentLimit = ex.CurrentLimit,
                upgradeUrl = ex.UpgradeUrl
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}