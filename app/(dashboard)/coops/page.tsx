import { requireSession, requireOrganization } from "@/src/lib/session";
import { supabase } from "@/src/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function CoopsPage() {
  const session = await requireSession();
  const org = await requireOrganization(session.user.id);

  const { data: allCoops } = await supabase
    .from("coops")
    .select("*")
    .eq("organization_id", org.id);

  const coopsList = allCoops || [];

  // Get active flock for each coop
  const coopsWithFlocks = await Promise.all(
    coopsList.map(async (coop) => {
      const { data: activeFlock } = await supabase
        .from("flocks")
        .select("*")
        .eq("coop_id", coop.id)
        .eq("status", "active")
        .limit(1)
        .single();
      return { ...coop, activeFlock };
    })
  );

  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    empty: "bg-gray-100 text-gray-800",
    harvest: "bg-yellow-100 text-yellow-800",
    inactive: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    active: "Aktif",
    empty: "Kosong",
    harvest: "Panen",
    inactive: "Nonaktif",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kandang</h1>
          <p className="text-muted-foreground">Kelola semua kandang di farm Anda</p>
        </div>
        {(org.role === "owner" || org.role === "manager") && (
          <Link href="/coops/new">
            <Button>+ Tambah Kandang</Button>
          </Link>
        )}
      </div>

      {coopsList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Belum ada kandang. Tambahkan kandang pertama Anda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {coopsWithFlocks.map((coop) => (
            <Link key={coop.id} href={`/coops/${coop.id}`}>
              <Card className="cursor-pointer transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{coop.name}</CardTitle>
                    <Badge className={statusColors[coop.status || "empty"]}>
                      {statusLabels[coop.status || "empty"]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>📍 {coop.location || "Lokasi belum diatur"}</p>
                    <p>🐔 Kapasitas: {coop.capacity.toLocaleString("id-ID")} ekor</p>
                    {coop.activeFlock && (
                      <p className="text-foreground font-medium">
                        🟢 Flock aktif: {coop.activeFlock.strain.replace("_", " ")} — {coop.activeFlock.doc_count.toLocaleString("id-ID")} DOC
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
