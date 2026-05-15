using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using TrackFlow.Data;
using TrackFlow.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<TrackFlowDb>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5200").AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();

// Auto-migrate
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<TrackFlowDb>();
    db.Database.Migrate();
}

// === PROJECTS ===

app.MapGet("/api/projects", async (TrackFlowDb db) =>
    await db.Projects.OrderBy(p => p.Name).ToListAsync());

app.MapGet("/api/projects/{id}", async (int id, TrackFlowDb db) =>
    await db.Projects.FindAsync(id) is Project p ? Results.Ok(p) : Results.NotFound());

app.MapPost("/api/projects", async (Project project, TrackFlowDb db) =>
{
    project.CreatedAt = DateTime.UtcNow;
    db.Projects.Add(project);
    await db.SaveChangesAsync();
    return Results.Created($"/api/projects/{project.Id}", project);
});

app.MapPut("/api/projects/{id}", async (int id, Project input, TrackFlowDb db) =>
{
    var project = await db.Projects.FindAsync(id);
    if (project is null) return Results.NotFound();
    project.Name = input.Name;
    project.Description = input.Description;
    project.RepoPath = input.RepoPath;
    await db.SaveChangesAsync();
    return Results.Ok(project);
});

app.MapDelete("/api/projects/{id}", async (int id, TrackFlowDb db) =>
{
    var project = await db.Projects.FindAsync(id);
    if (project is null) return Results.NotFound();
    db.Projects.Remove(project);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// === TASKS ===

app.MapGet("/api/projects/{projectId}/tasks", async (int projectId, TrackFlowDb db) =>
    await db.Tasks.Where(t => t.ProjectId == projectId)
        .OrderByDescending(t => t.Priority == "high" ? 3 : t.Priority == "medium" ? 2 : 1)
        .ThenByDescending(t => t.CreatedAt)
        .ToListAsync());

app.MapGet("/api/tasks/{id}", async (int id, TrackFlowDb db) =>
    await db.Tasks.FindAsync(id) is TaskItem t ? Results.Ok(t) : Results.NotFound());

app.MapPost("/api/projects/{projectId}/tasks", async (int projectId, TaskItem task, TrackFlowDb db) =>
{
    task.ProjectId = projectId;
    task.CreatedAt = DateTime.UtcNow;
    task.UpdatedAt = DateTime.UtcNow;
    db.Tasks.Add(task);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{task.Id}", task);
});

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
});

app.MapDelete("/api/tasks/{id}", async (int id, TrackFlowDb db) =>
{
    var task = await db.Tasks.FindAsync(id);
    if (task is null) return Results.NotFound();
    db.Tasks.Remove(task);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// === TIME ENTRIES ===

app.MapGet("/api/tasks/{taskId}/time-entries", async (int taskId, TrackFlowDb db) =>
    await db.TimeEntries.Where(t => t.TaskId == taskId)
        .OrderByDescending(t => t.StartTime)
        .ToListAsync());

app.MapPost("/api/tasks/{taskId}/time-entries", async (int taskId, TimeEntry entry, TrackFlowDb db) =>
{
    entry.TaskId = taskId;
    db.TimeEntries.Add(entry);
    await db.SaveChangesAsync();
    return Results.Created($"/api/tasks/{taskId}/time-entries/{entry.Id}", entry);
});

app.MapPut("/api/time-entries/{id}", async (int id, TimeEntry input, TrackFlowDb db) =>
{
    var entry = await db.TimeEntries.FindAsync(id);
    if (entry is null) return Results.NotFound();
    entry.StartTime = input.StartTime;
    entry.EndTime = input.EndTime;
    entry.User = input.User;
    entry.Note = input.Note;
    await db.SaveChangesAsync();
    return Results.Ok(entry);
});

app.MapDelete("/api/time-entries/{id}", async (int id, TrackFlowDb db) =>
{
    var entry = await db.TimeEntries.FindAsync(id);
    if (entry is null) return Results.NotFound();
    db.TimeEntries.Remove(entry);
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// === GIT ===

app.MapGet("/api/projects/{projectId}/git/branches", async (int projectId, TrackFlowDb db) =>
{
    var project = await db.Projects.FindAsync(projectId);
    if (project is null) return Results.NotFound();
    if (!Directory.Exists(project.RepoPath)) return Results.BadRequest("Repo path does not exist");

    var psi = new ProcessStartInfo("git", "branch --format=%(refname:short)")
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
    return Results.Ok(branches);
});

app.MapGet("/api/projects/{projectId}/git/commits", async (int projectId, string? branch, TrackFlowDb db) =>
{
    var project = await db.Projects.FindAsync(projectId);
    if (project is null) return Results.NotFound();
    if (!Directory.Exists(project.RepoPath)) return Results.BadRequest("Repo path does not exist");

    var args = string.IsNullOrEmpty(branch)
        ? "log --all --oneline -50 --format=%H||%s||%an||%ai"
        : $"log {branch} --oneline -50 --format=%H||%s||%an||%ai";

    var psi = new ProcessStartInfo("git", args)
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
});

app.Run();
