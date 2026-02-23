import { supabase } from "./supabase"; 


export async function hasEnabledServices(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_services")
    .select("service_id")
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.log("hasEnabledServices error:", error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}
