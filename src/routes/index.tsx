import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "NEON.GRIND — Synthwave Productivity Arcade" },
      {
        name: "description",
        content:
          "A retro synthwave productivity app with XP, task streaks, urge mode and keyboard shortcuts.",
      },
    ],
  }),
});
