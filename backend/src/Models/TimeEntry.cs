namespace TrackFlow.Models;

public class TimeEntry
{
    public int Id { get; set; }
    public int TaskId { get; set; }
    public TaskItem Task { get; set; } = null!;
    public string? User { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string? Note { get; set; }
}
