using Microsoft.EntityFrameworkCore;
using Backend.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.Api.Services.Users;
using Backend.Api.Services.Credentials;
using Backend.Api.Services.Categories;
using Backend.Api.Services.Emails;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Backend.Api.Services.Auth;
using Microsoft.AspNetCore.HttpOverrides;
using Backend.Api.Services.Subscriptions;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your token}"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins(
            "http://localhost:5173",
            "https://v2vault.vgbgroup.eu"
        )
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Define a partitioned policy specifically for 2FA
    options.AddPolicy("TwoFactorPolicy", httpContext =>
    {
        // Partition by User ID if logged in, otherwise fallback to Client IP
        var userId = httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var partitionKey = userId ?? httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: partitionKey,
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,                  // Allow maximum 5 attempts
                Window = TimeSpan.FromMinutes(5), // Reset window every 5 minutes
                QueueLimit = 0                    // Instantly reject extra requests (HTTP 429)
            });
    });
});

// Add the DB Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // If your proxy is on a known IP/network, restrict KnownProxies/KnownNetworks here
    // rather than trusting forwarded headers from anywhere.
});

// Link the Interface to the Implementation
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICredentialService, CredentialService>();
builder.Services.AddScoped<ICategoriesService, CategoriesService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISubscriptionService, SubscriptionService>();
builder.Services.AddHostedService<SubscriptionSyncBackgroundService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var secret = builder.Configuration["Jwt:Secret"]!;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

builder.Services.AddAuthorization();

Stripe.StripeConfiguration.ApiKey = builder.Configuration["App:Stripe:SecretKey"];

var app = builder.Build();

app.UseForwardedHeaders();

app.UseCors("FrontendPolicy");

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseDefaultFiles(); // Searches wwwroot for index.html at '/'
app.UseStaticFiles();  // Serves CSS, JS, images, etc., from wwwroot

// app.UseHttpsRedirection(); // <-- REMOVE THIS for production behind a proxy/tunnel
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.UseRateLimiter();

app.Use(async (context, next) =>
{
    context.Response.Headers["Content-Security-Policy"] =
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:;" +
        "connect-src 'self' https://api.pwnedpasswords.com; " ;
    await next();
});

app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));
app.MapGet("/thank-you", () => Results.Content(@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""UTF-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>Payment Successful</title>
    <style>
        body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; background: #f9fafb; }
        .card { max-width: 400px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        h1 { color: #22c55e; margin-bottom: 8px; }
        p { color: #6b7280; line-height: 1.6; }
        .emoji { font-size: 48px; }
        strong { color: #111827; }
    </style>
</head>
<body>
    <div class=""card"">
        <div class=""emoji"">✅</div>
        <h1>Payment Successful!</h1>
        <p>Your subscription is now active.</p>
        <p>You can close this page and return to the <strong>V2 Vault</strong> app.</p>
        <p style=""margin-top: 12px; font-size: 0.9rem;"">Tap <strong>""Refresh""</strong> in the app to unlock your Pro features.</p>
    </div>
</body>
</html>
", "text/html"));

app.MapFallbackToFile("index.html");

app.Run();