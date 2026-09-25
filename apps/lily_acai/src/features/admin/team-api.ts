import { parseResponse } from "../../api";

export type LilyTeamMember = {
  id: string;
  phone: string;
  displayName: string | null;
  role: "customer" | "staff" | "admin";
  status: "active" | "suspended";
  staffPasswordUpgradeRequired: boolean;
  createdAt: string;
  updatedAt: string;
  activeSessions: number;
};

export async function getLilyTeam(input?: { q?: string; includeCustomers?: boolean }) {
  const params = new URLSearchParams();
  if (input?.q) params.set("q", input.q);
  if (input?.includeCustomers) params.set("includeCustomers", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const response = await fetch(`/api/v1/lily/admin/team${suffix}`, {
    credentials: "same-origin"
  });
  return parseResponse<{ members: LilyTeamMember[] }>(response);
}

export async function promoteLilyTeamMember(
  input: { phone: string; role: "staff" | "admin" },
  csrfToken: string
) {
  const response = await fetch("/api/v1/lily/admin/team/promote", {
    method: "POST",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify(input)
  });
  return parseResponse<LilyTeamMember>(response);
}

export async function updateLilyTeamMember(
  userId: string,
  input: { role?: "customer" | "staff" | "admin"; status?: "active" | "suspended" },
  csrfToken: string
) {
  const response = await fetch(`/api/v1/lily/admin/team/${encodeURIComponent(userId)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      "X-Lily-CSRF": csrfToken
    },
    body: JSON.stringify(input)
  });
  return parseResponse<LilyTeamMember>(response);
}
