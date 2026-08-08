# Goal tracks (Tier 3), deferred

See web docs: MindKshetra/docs/goal-tracks.md

## Present on disk (web)

`MindKshetra/data/meditation/tracks/anxiety-7.json` — seven short anxiety sits
(`tier: "goal"`, `track: "anxiety"`). Server helper: `loadGoalTrack("anxiety-7")`.
Not wired into the app meditation catalog or sitting-course progress yet.

When stewarded for the app, mirror under `tracks/<track>-7.json` here and
register through a dedicated loader — do not merge into foundation / habit /
deepening segment files.
