namespace TrackFlow.Models;

public class TaskItem
{
    public int Id { get; set; }
    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = "todo"; // todo, in_progress, to_review, validated, rejected
    public string Priority { get; set; } = "medium"; // low, medium, high
    public string? AssignedTo { get; set; }
    public string? CommitHash { get; set; }
    public string? BranchName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ValidatedAt { get; set; }
}
