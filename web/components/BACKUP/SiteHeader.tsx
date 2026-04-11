import SiteHeaderClient from "@/components/SiteHeaderClient";
import { supabaseServer } from "@/lib/supabase-server";

export default async function SiteHeader(props: {
  onOpenSearch?: () => void;
  onOpenPlatforms?: () => void;
}) {
  const supabase = await supabaseServer();

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user ?? null;

  return (
    <SiteHeaderClient
      initialUserId={user?.id ?? null}
      initialUserEmail={user?.email ?? null}
      {...props}
    />
  );
}