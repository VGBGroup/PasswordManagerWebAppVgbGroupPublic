using Backend.Api.DTOs.Users;
using Backend.Api.DTOs.UserSettings;
using Backend.Api.Services.Auth;
using Backend.Api.Services.Users;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace Backend.Api.Controllers.Users;

[ApiController]
[Route("api/user")]
public class UserController : ControllerBase
{
    private readonly IUserService _userService;
    private readonly IAuthService _authService;

    public UserController(IUserService userService, IAuthService authService)
    {
        _userService = userService;
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterUserInDto dto)
    {
        try
        {
            var result = await _authService.RegisterAsync(dto);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] ChallengeRequestInDto dto)
    {
        try
        {
            var result = await _authService.ChallengeUserAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("verifylogin")]
    public async Task<IActionResult> VerifyLogin([FromBody] VerifyRequestInDto dto)
    {
        try
        {
            var result = await _authService.VerifyAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("2fa/verify")]
    [EnableRateLimiting("TwoFactorPolicy")]
    public async Task<IActionResult> VerifyTwoFactor([FromBody] TwoFactorVerifyInDto dto)
    {
        try
        {
            var result = await _authService.VerifyTwoFactorAsync(dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("2fa/setup")]
    [Authorize]
    public async Task<IActionResult> SetupTwoFactor()
    {
        var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _authService.SetupTwoFactorAsync(userId);
        return Ok(result);
    }

    [HttpPost("2fa/enable")]
    [Authorize]
    public async Task<IActionResult> EnableTwoFactor([FromBody] TwoFactorEnableInDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
            var result = await _authService.EnableTwoFactorAsync(userId, dto);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("2fa/disable")]
    [EnableRateLimiting("TwoFactorPolicy")]
    [Authorize]
    public async Task<IActionResult> DisableTwoFactor([FromBody] TwoFactorDisableInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _authService.DisableTwoFactorAsync(userRecordId.Value, dto.Code);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPost("2fa/verify-authenticated")]
    [EnableRateLimiting("TwoFactorPolicy")]
    [Authorize]
    public async Task<IActionResult> VerifyTwoFactorAuthenticated([FromBody] AuthenticatedTwoFactorVerifyInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var isValid = await _authService.VerifyTwoFactorForUserAsync(userRecordId.Value, dto.Code);
            if (!isValid) return BadRequest(new { message = "Invalid 2FA code. Please try again." });

            return Ok(new { success = true });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return claim is null ? null : Guid.Parse(claim);
    }

    [HttpGet("getsettings")]
    [Authorize]
    public async Task<IActionResult> GetUserSettings()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _userService.GetSettingsAsync(userRecordId.Value);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpGet("generalData")]
    [Authorize]
    public async Task<IActionResult> GetGeneralUserData()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _userService.GetGeneralUserDataAsync(userRecordId.Value);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
    }

    [HttpPut("updateSettings")]
    [Authorize]
    public async Task<IActionResult> UpdateUseSettings([FromBody] UserSettingInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _userService.UpdateSettingsAsync(userRecordId.Value, dto);
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

    [HttpPut("updateProfile")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileInDto dto)
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _userService.UpdateProfileAsync(userRecordId.Value, dto);
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

    [HttpGet("profile")]
    [Authorize]
    public async Task<IActionResult> GetProfile()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            var result = await _userService.GetProfileAsync(userRecordId.Value);
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

    [HttpGet("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token)
    {
        var result = await _authService.VerifyEmailAsync(token);
        if (!result.Success) return BadRequest(new { message = result.Message });
        return Ok(new { message = result.Message });
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationInDto dto)
    {
        await _authService.ResendVerificationAsync(dto.Email);
        // Same response regardless of whether the email exists — prevents enumeration
        return Ok(new { message = "If an account exists with that email, a verification link has been sent." });
    }

    [HttpDelete("account")]
    [Authorize]
    public async Task<IActionResult> DeleteAccount()
    {
        var userRecordId = GetUserId();
        if (userRecordId is null) return Unauthorized(new { message = "Something went wrong" });

        try
        {
            await _userService.DeleteAccountAsync(userRecordId.Value);
            return Ok(new { message = "Account deleted successfully." });
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
}