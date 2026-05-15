using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TrackFlow.Migrations
{
    /// <inheritdoc />
    public partial class AddMemberRepoPath : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RepoPath",
                table: "project_members",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RepoPath",
                table: "project_members");
        }
    }
}
