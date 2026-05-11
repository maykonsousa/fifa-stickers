import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-bold text-white">Meu Perfil</h1>
      <p className="mt-1 text-sm text-gray-400">
        Edite suas informações. Instagram e WhatsApp são visíveis apenas para amigos.
      </p>
      <ProfileForm profile={profile} />
    </div>
  );
}
