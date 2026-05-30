import { auth } from "./auth";
import { supabase } from "./supabase";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Role } from "./types";

export async function getSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function getUserOrganization(userId: string) {
  const { data: member } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!member) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", member.organization_id)
    .single();

  return org ? { ...org, role: member.role as Role } : null;
}

export async function requireOrganization(userId: string) {
  const org = await getUserOrganization(userId);
  if (!org) {
    redirect("/setup");
  }
  return org;
}

export async function checkRole(userId: string, organizationId: string, allowedRoles: Role[]) {
  const { data: member } = await supabase
    .from("organization_members")
    .select("*")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .limit(1)
    .single();

  if (!member || !allowedRoles.includes(member.role as Role)) {
    return false;
  }
  return true;
}
