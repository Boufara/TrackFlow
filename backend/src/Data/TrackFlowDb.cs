using Microsoft.EntityFrameworkCore;
using TrackFlow.Models;

namespace TrackFlow.Data;

public class TrackFlowDb : DbContext
{
    public TrackFlowDb(DbContextOptions<TrackFlowDb> options) : base(options) { }

    public DbSet<Project> Projects => Set<Project>();
    public DbSet<TaskItem> Tasks => Set<TaskItem>();
    public DbSet<TimeEntry> TimeEntries => Set<TimeEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Project>(e =>
        {
            e.ToTable("projects");
            e.Property(p => p.Id).HasColumnName("id");
            e.Property(p => p.Name).HasColumnName("name");
            e.Property(p => p.Description).HasColumnName("description");
            e.Property(p => p.RepoPath).HasColumnName("repo_path");
            e.Property(p => p.CreatedAt).HasColumnName("created_at");
        });

        modelBuilder.Entity<TaskItem>(e =>
        {
            e.ToTable("tasks");
            e.Property(t => t.Id).HasColumnName("id");
            e.Property(t => t.ProjectId).HasColumnName("project_id");
            e.Property(t => t.Title).HasColumnName("title");
            e.Property(t => t.Description).HasColumnName("description");
            e.Property(t => t.Status).HasColumnName("status");
            e.Property(t => t.Priority).HasColumnName("priority");
            e.Property(t => t.AssignedTo).HasColumnName("assigned_to");
            e.Property(t => t.CommitHash).HasColumnName("commit_hash");
            e.Property(t => t.BranchName).HasColumnName("branch_name");
            e.Property(t => t.CreatedAt).HasColumnName("created_at");
            e.Property(t => t.UpdatedAt).HasColumnName("updated_at");
            e.Property(t => t.ValidatedAt).HasColumnName("validated_at");
            e.HasOne(t => t.Project).WithMany().HasForeignKey(t => t.ProjectId);
        });

        modelBuilder.Entity<TimeEntry>(e =>
        {
            e.ToTable("time_entries");
            e.Property(t => t.Id).HasColumnName("id");
            e.Property(t => t.TaskId).HasColumnName("task_id");
            e.Property(t => t.User).HasColumnName("user_name");
            e.Property(t => t.StartTime).HasColumnName("start_time");
            e.Property(t => t.EndTime).HasColumnName("end_time");
            e.Property(t => t.Note).HasColumnName("note");
            e.HasOne(t => t.Task).WithMany().HasForeignKey(t => t.TaskId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
