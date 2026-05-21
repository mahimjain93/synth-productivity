import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/Dashboard";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "YouMS — Synthwave Movement Arcade" },
      {
        name: "description",
        content:
          "A retro synthwave productivity app with XP, task streaks, urge mode and keyboard shortcuts.",
      },
    ],
  }),
});
