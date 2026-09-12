import type { Metadata } from "next";

import { SettingsForm } from "@/components/settings-form";

export const metadata: Metadata = {
  title: "Settings - Spotify",
};

export default function SettingsPage() {
  return <SettingsForm />;
}