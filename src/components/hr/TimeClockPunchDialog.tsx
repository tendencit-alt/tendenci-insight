// Diálogo de batimento de ponto com foto (câmera) + geolocalização.
// Bucket privado `hr-time-photos`, prefixado por tenant_id.

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { distanceMeters } from "@/lib/clt-provisions";
import { useHrSettings, useWorkLocations } from "@/hooks/useRhPj";


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string;
  employeeName: string;
  kind: "in" | "out";
  onPunched?: () => void;
}

export function TimeClockPunchDialog({ open, onOpenChange, employeeId, employeeName, kind, onPunched }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const { data: settings } = useHrSettings();
  const { data: locations = [] } = useWorkLocations();

  // Avalia geofence: retorna {within, location, distance}
  const fence = (() => {
    const active = (locations as any[]).filter(l => l.active);
    if (!coords || !active.length) return { within: null as boolean | null, location: null as any, distance: null as number | null };
    let best: any = null; let bestDist = Infinity;
    for (const l of active) {
      const d = distanceMeters(coords.lat, coords.lng, Number(l.latitude), Number(l.longitude));
      if (d < bestDist) { bestDist = d; best = l; }
    }
    const within = best ? bestDist <= Number(best.radius_m) : false;
    return { within, location: best, distance: bestDist };
  })();
  const mode = (settings as any)?.geofence_mode ?? "warn";
  const blocking = mode === "block" && fence.within === false;


  // start camera
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" }, audio: false,
        });
        if (cancelled) { s.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = s;
        if (videoRef.current) { videoRef.current.srcObject = s; await videoRef.current.play(); }
      } catch (e: any) {
        toast.error("Câmera indisponível: " + (e?.message || "permissão negada"));
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [open]);

  // request geo on open
  useEffect(() => {
    if (!open) return;
    setGeoError(null);
    if (!navigator.geolocation) { setGeoError("Geolocalização indisponível"); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => setGeoError(e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open]);

  const capture = async () => {
    const v = videoRef.current; if (!v) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/jpeg", 0.85));
    setPhotoBlob(blob);
    setPhotoUrl(URL.createObjectURL(blob));
  };

  const punch = async () => {
    if (!photoBlob) { toast.error("Capture a foto antes"); return; }
    if (!coords) { toast.error("Aguardando localização..."); return; }
    if (blocking) { toast.error("Fora do raio do local de trabalho — bloqueado por política"); return; }
    setBusy(true);
    try {
      const { data: tenantId } = await supabase.rpc("get_user_tenant_id");
      if (!tenantId) throw new Error("Tenant não identificado");
      const today = new Date().toISOString().slice(0, 10);
      const ts = Date.now();
      const key = `${tenantId}/${employeeId}/${today}_${kind}_${ts}.jpg`;
      const up = await supabase.storage.from("hr-time-photos").upload(key, photoBlob, {
        contentType: "image/jpeg", upsert: false,
      });
      if (up.error) throw up.error;

      const nowIso = new Date().toISOString();
      const nowTime = nowIso.slice(11, 19);
      const { data: existing } = await supabase
        .from("hr_time_records").select("id, time_in, time_out")
        .eq("employee_id", employeeId).eq("work_date", today).maybeSingle();

      const fenceFields = fence.within == null
        ? {} // sem local cadastrado: não preenche
        : kind === "in"
          ? { time_in_within_fence: fence.within, time_in_location_id: fence.location?.id ?? null }
          : { time_out_within_fence: fence.within, time_out_location_id: fence.location?.id ?? null };

      const patch: any = kind === "in"
        ? { time_in: nowTime, time_in_at: nowIso, time_in_photo_path: up.data.path,
            time_in_lat: coords.lat, time_in_lng: coords.lng, time_in_accuracy: coords.acc, ...fenceFields }
        : { time_out: nowTime, time_out_at: nowIso, time_out_photo_path: up.data.path,
            time_out_lat: coords.lat, time_out_lng: coords.lng, time_out_accuracy: coords.acc, ...fenceFields };

      if (existing) {
        const { error } = await supabase.from("hr_time_records").update(patch).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hr_time_records").insert({
          employee_id: employeeId, work_date: today, ...patch,
        });
        if (error) throw error;
      }
      const msg = kind === "in" ? "Entrada registrada" : "Saída registrada";
      if (fence.within === false) toast.warning(`${msg} — FORA do local (${Math.round(fence.distance!)}m)`);
      else toast.success(msg);
      onPunched?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao bater ponto");
    } finally { setBusy(false); }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Bater ponto — {kind === "in" ? "Entrada" : "Saída"} ({employeeName})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative rounded-md overflow-hidden bg-muted aspect-video">
            {!photoUrl
              ? <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              : <img src={photoUrl} alt="captura" className="w-full h-full object-cover" />}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-4 w-4" />
            {coords
              ? <span>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} <span className="text-muted-foreground">±{Math.round(coords.acc)}m</span></span>
              : <span className="text-muted-foreground">{geoError ?? "Obtendo localização..."}</span>}
          </div>

          <div className="flex gap-2">
            {!photoUrl
              ? <Button onClick={capture} className="flex-1"><Camera className="h-4 w-4 mr-1" />Capturar foto</Button>
              : <>
                  <Button variant="outline" onClick={() => { setPhotoBlob(null); setPhotoUrl(null); }} className="flex-1">Refazer</Button>
                  <Button onClick={punch} disabled={busy || !coords} className="flex-1">
                    {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                    Confirmar
                  </Button>
                </>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
