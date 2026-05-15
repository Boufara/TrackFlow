using System.Diagnostics;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TrackFlow.Data;
using TrackFlow.Models;

var builder = WebApplication.CreateBuilder(args);

var jwtKey = builder.Configuration["Jwt:Key"] ?? "TrackFlow-Secret-Key-Change-In-Production-2026!";

builder.Services.AddDbContext<TrackFlowDb>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

// Auto-migrate + seed admin
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TrackFlowDb>();
    db.Database.Migrate();
    if (!await db.Users.AnyAsync())
    {
        db.Users.Add(new User
        {
            Username = "admin",
            PasswordHash = HashPassword("admin"),
            DisplayName = "Administrateur",
            IsAdmin = true
        });
        await db.SaveChangesAsync();
    }
}

// === AUTH ===

app.MapPost("/api/auth/login", async (LoginRequest req, TrackFlowDb db) =>
{
    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);
    if (user is null || user.PasswordHash != HashPassword(req.Password))
        return Results.Unauthorized();

    var token = GenerateToken(user);
    return Results.Ok(new { token, user = new { user.Id, user.Username, user.DisplayName, user.IsAdmin } });
});

app.MapGet("/api/auth/me", (ClaimsPrincipal principal, TrackFlowDb db) =>
{
    var userId = int.Parse(principal.FindFirstValue("userId")!);
    return db.Users.Where(u => u.Id == userId)
        .Select(u => new { u.Id, u.Username, u.DisplayName, u.IsAdmin })
        .FirstOrDefaultAsync();
}).RequireAuthorization();

// === USERS (admin only) ===

app.MapGet("/api/users", async (TrackFlowDb db) =>
    await db.Users.Select(u => new { u.Id, u.Username, u.DisplayName, u.IsAdmin, u.CreatedAt }).ToListAsync())
    .RequireAuthorization();

app.MapPost("/api/users", async (CreateUserRequest req, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    if (await db.Users.AnyAsync(u => u.Username == req.Username))
        return Results.Conflict(new { error = "Username deja utilise" });
    var user = new User
    {
        Username = req.Username,
        PasswordHash = HashPassword(req.Password),
        DisplayName = req.DisplayName,
        IsAdmin = req.IsAdmin
    };
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Results.Created($"/api/users/{user.Id}", new { user.Id, user.Username, user.DisplayName, user.IsAdmin });
}).RequireAuthorization();

app.MapDelete("/api/users/{id}", async (int id, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();
    db.Users.Remove(user);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

// === PROJECTS ===

app.MapGet("/api/projects", async (TrackFlowDb db) =>
    await db.Projects.OrderBy(p => p.Name).ToListAsync()).RequireAuthorization();

app.MapGet("/api/projects/{id}", async (int id, TrackFlowDb db) =>
    await db.Projects.FindAsync(id) is Project p ? Results.Ok(p) : Results.NotFound()).RequireAuthorization();

app.MapPost("/api/projects", async (Project project, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    project.CreatedAt = DateTime.UtcNow;
    db.Projects.Add(project);
    await db.SaveChangesAsync();
    return Results.Created($"/api/projects/{project.Id}", project);
}).RequireAuthorization();

app.MapPut("/api/projects/{id}", async (int id, Project input, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    var project = await db.Projects.FindAsync(id);
    if (project is null) return Results.NotFound();
    project.Name = input.Name;
    project.Description = input.Description;
    project.RepoPath = input.RepoPath;
    await db.SaveChangesAsync();
    return Results.Ok(project);
}).RequireAuthorization();

app.MapDelete("/api/projects/{id}", async (int id, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    var project = await db.Projects.FindAsync(id);
    if (project is null) return Results.NotFound();
    db.Projects.Remove(project);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

// === MEMBERS ===

app.MapGet("/api/projects/{projectId}/members", async (int projectId, TrackFlowDb db) =>
    await db.ProjectMembers
        .Where(m => m.ProjectId == projectId)
        .Include(m => m.User)
        .Select(m => new { m.Id, m.ProjectId, m.UserId, UserName = m.User.DisplayName })
        .ToListAsync()).RequireAuthorization();

app.MapPost("/api/projects/{projectId}/members", async (int projectId, AddMemberRequest req, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    if (await db.ProjectMembers.AnyAsync(m => m.ProjectId == projectId && m.UserId == req.UserId))
        return Results.Conflict(new { error = "Membre deja ajoute" });
    var member = new ProjectMember { ProjectId = projectId, UserId = req.UserId };
    db.ProjectMembers.Add(member);
    await db.SaveChangesAsync();
    return Results.Created($"/api/projects/{projectId}/members/{member.Id}", member);
}).RequireAuthorization();

app.MapDelete("/api/members/{id}", async (int id, TrackFlowDb db, ClaimsPrincipal principal) =>
{
    if (principal.FindFirstValue("isAdmin") != "True") return Results.Forbid();
    var member = await db.ProjectMembers.FindAsync(id);
    if (member is null) return Results.NotFound();
    db.ProjectMembers.Remove(member);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

// === TASKS ===

app.MapGet("/api/projects/{projectId}/tasks", async (int projectId, TrackFlowDb db) =>
    await db.Tasks.Where(t => t.ProjectId == projectId)
        .OrderByDescending(t => t.Priority == "high" ? 3 : t.Priority == "medium" ? 2 : 1)
        .ThenByDescending(t => t.CreatedAt)
        .ToListAsync()).RequireAuthorization();

app.MapGet("/api/tasks/{id}", async (int id, TrackFlowDb db) =>
    await db.Tasks.FindAsync(id) is TaskItem t ? Results.Ok(t) : Results.NotFound()).RequireAuthorization();

app.MapPost("/api/projects/{projectId}/tasks", async (int projectId, TaskItem task, TrackFlowDb db) =>
{
    task.ProjectId = projectId;
    task.CreatedAt = DateTime.UtcNow;
    task.UpdatedAt = DateTime.UtcNow;
    db.Tasks.Add(task);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{task.Id}", task);
}).RequireAuthorization();

app.MapPut("/api/tasks/{id}", async (int id, TaskItem input, TrackFlowDb db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();
    task.Title = input.Title;
    task.Description = input.Description;
    task.Status = input.Status;
    task.Priority = input.Priority;
    task.AssignedTo = input.AssignedTo;
    task.CommitHash = input.CommitHash;
    task.BranchName = input.BranchName;
    task.UpdatedAt = DateTime.UtcNow;
    if (input.Status == "validated" && task.ValidatedAt == null)
        task.ValidatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();
    return Results.Ok(task);
}).RequireAuthorization();

app.MapDelete("/api/tasks/{id}", async (int id, TrackFlowDb db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();
    db.Tasks.Remove(task);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

// === TIME ENTRIES ===

app.MapGet("/api/projects/{projectId}/time-stats", async (int projectId, TrackFlowDb db) =>
{
    var taskIds = await db.Tasks.Where(t => t.ProjectId == projectId).Select(t => t.Id).ToListAsync();
    var entries = await db.TimeEntries
        .Where(e => taskIds.Contains(e.TaskId))
        .GroupBy(e => e.TaskId)
        .Select(g => new
        {
            TaskId = g.Key,
            Users = g.Where(e => e.User != null && e.User != "").Select(e => e.User!).Distinct().ToList(),
            TotalMinutes = g.Sum(e => (e.EndTime - e.StartTime).TotalMinutes)
        })
        .ToListAsync();
    return Results.Ok(entries.ToDictionary(x => x.TaskId, x => new { x.Users, x.TotalMinutes }));
}).RequireAuthorization();

app.MapGet("/api/tasks/{taskId}/time-entries", async (int taskId, TrackFlowDb db) =>
    await db.TimeEntries.Where(t => t.TaskId == taskId)
        .OrderByDescending(t => t.StartTime)
        .ToListAsync()).RequireAuthorization();

app.MapPost("/api/tasks/{taskId}/time-entries", async (int taskId, TimeEntry entry, TrackFlowDb db) =>
{
    entry.TaskId = taskId;
    entry.StartTime = DateTime.SpecifyKind(entry.StartTime, DateTimeKind.Utc);
    entry.EndTime = DateTime.SpecifyKind(entry.EndTime, DateTimeKind.Utc);
    db.TimeEntries.Add(entry);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{taskId}/time-entries/{entry.Id}", entry);
}).RequireAuthorization();

app.MapPut("/api/time-entries/{id}", async (int id, TimeEntry input, TrackFlowDb db) =>
{
    var entry = await db.TimeEntries.FindAsync(id);
    if (entry is null) return Results.NotFound();
    entry.StartTime = DateTime.SpecifyKind(input.StartTime, DateTimeKind.Utc);
    entry.EndTime = DateTime.SpecifyKind(input.EndTime, DateTimeKind.Utc);
    entry.User = input.User;
    entry.Note = input.Note;
    await db.SaveChangesAsync();
    return Results.Ok(entry);
}).RequireAuthorization();

app.MapDelete("/api/time-entries/{id}", async (int id, TrackFlowDb db) =>
{
    var entry = await db.TimeEntries.FindAsync(id);
    if (entry is null) return Results.NotFound();
    db.TimeEntries.Remove(entry);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).RequireAuthorization();

// === GIT ===

// === GIT ===

app.MapGet("/api/projects/{projectId}/git/branches", async (int projectId, TrackFlowDb db) =>
{
    var project = await db.Projects.FindAsync(projectId);
    if (project is null) return Results.NotFound();
    if (!Directory.Exists(project.RepoPath)) return Results.BadRequest("Repo path does not exist");

    var psi = new ProcessStartInfo(@"C:\Program Files\Git\cmd\git.exe", "branch --format=%(refname:short)")
    {
        WorkingDirectory = project.RepoPath,
        RedirectStandardOutput = true,
        UseShellExecute = false
    };
    using var proc = Process.Start(psi);
    if (proc is null) return Results.Problem("Failed to run git");
    var output = await proc.StandardOutput.ReadToEndAsync();
    await proc.WaitForExitAsync();
    var branches = output.Split('\n', StringSplitOptions.RemoveEmptyEntries).Select(b => b.Trim()).ToList();

    // Get current branch
    var psiHead = new ProcessStartInfo(@"C:\Program Files\Git\cmd\git.exe", "rev-parse --abbrev-ref HEAD")
    {
        WorkingDirectory = project.RepoPath,
        RedirectStandardOutput = true,
        UseShellExecute = false
    };
    using var procHead = Process.Start(psiHead);
    var currentBranch = "";
    if (procHead is not null)
    {
        currentBranch = (await procHead.StandardOutput.ReadToEndAsync()).Trim();
        await procHead.WaitForExitAsync();
    }

    return Results.Ok(new { branches, currentBranch });
}).RequireAuthorization();

app.MapGet("/api/projects/{projectId}/git/commits", async (int projectId, string? branch, TrackFlowDb db) =>
{
    var project = await db.Projects.FindAsync(projectId);
    if (project is null) return Results.NotFound();
    if (!Directory.Exists(project.RepoPath)) return Results.BadRequest("Repo path does not exist");

    var args = string.IsNullOrEmpty(branch)
        ? "log --all --oneline -50 --format=%H||%s||%an||%ai"
        : $"log {branch} --oneline -50 --format=%H||%s||%an||%ai";

    var psi = new ProcessStartInfo(@"C:\Program Files\Git\cmd\git.exe", args)
    {
        WorkingDirectory = project.RepoPath,
        RedirectStandardOutput = true,
        UseShellExecute = false
    };
    using var proc = Process.Start(psi);
    if (proc is null) return Results.Problem("Failed to run git");
    var output = await proc.StandardOutput.ReadToEndAsync();
    await proc.WaitForExitAsync();

    var commits = output.Split('\n', StringSplitOptions.RemoveEmptyEntries)
        .Select(line =>
        {
            var parts = line.Split("||", 4);
            return new
            {
                Hash = parts.Length > 0 ? parts[0] : "",
                Message = parts.Length > 1 ? parts[1] : "",
                Author = parts.Length > 2 ? parts[2] : "",
                Date = parts.Length > 3 ? parts[3] : ""
            };
        }).ToList();

    return Results.Ok(commits);
}).RequireAuthorization();

app.MapFallbackToFile("index.html");

app.Run();

// === Helpers ===

string HashPassword(string password)
{
    var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(password + "TrackFlow-Salt"));
    return Convert.ToBase64String(bytes);
}

string GenerateToken(User user)
{
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var claims = new[]
    {
        new Claim("userId", user.Id.ToString()),
        new Claim("username", user.Username),
        new Claim("displayName", user.DisplayName),
        new Claim("isAdmin", user.IsAdmin.ToString()),
    };
    var token = new JwtSecurityToken(
        claims: claims,
        expires: DateTime.UtcNow.AddDays(7),
        signingCredentials: creds);
    return new JwtSecurityTokenHandler().WriteToken(token);
}

// === Request DTOs ===
record LoginRequest(string Username, string Password);
record CreateUserRequest(string Username, string Password, string DisplayName, bool IsAdmin);
record AddMemberRequest(int UserId);
