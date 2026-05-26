import { AlertCircle, Music2, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MatchedSong } from "@/store/setlistStore";
import { SpotifyTrack } from "@/api/spotify";
import { confidenceLabel } from "@/lib/matching";

function getTrackOptions(matched: MatchedSong): SpotifyTrack[] {
  const seen = new Set<string>();
  const options: SpotifyTrack[] = [];

  if (matched.spotifyMatch) {
    options.push(matched.spotifyMatch);
    seen.add(matched.spotifyMatch.id);
  }

  for (const alt of matched.alternatives ?? []) {
    if (!seen.has(alt.id)) {
      options.push(alt);
      seen.add(alt.id);
    }
  }

  return options;
}

function formatTrackLabel(track: SpotifyTrack): string {
  const artists = track.artists.map((a) => a.name).join(", ");
  return `${track.name} — ${artists}`;
}

interface SongMatchRowProps {
  matched: MatchedSong;
  index: number;
  onSelectTrack: (index: number, trackId: string) => void;
  onRemove: (index: number) => void;
  onExclude?: (index: number) => void;
  disabled?: boolean;
  showMatchControls?: boolean;
}

export function SongMatchRow({
  matched,
  index,
  onSelectTrack,
  onRemove,
  onExclude,
  disabled,
  showMatchControls = true,
}: SongMatchRowProps) {
  if (matched.excluded) {
    return (
      <div className="flex items-center justify-between gap-3 p-4 border border-dashed border-muted rounded-lg opacity-60">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm text-muted-foreground font-mono w-6 shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0">
            <div className="font-medium line-through truncate">{matched.title}</div>
            <div className="text-xs text-muted-foreground">Excluida de la playlist</div>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={disabled}
        >
          Eliminar fila
        </Button>
      </div>
    );
  }

  const options = getTrackOptions(matched);
  const { label, variant } = confidenceLabel(matched.confidence);
  const cover = matched.spotifyMatch?.album.images?.[0]?.url;

  return (
    <div className="flex flex-col gap-4 p-4 border border-border rounded-lg bg-background/50 md:flex-row md:items-center">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <span className="text-sm text-muted-foreground font-mono w-6 shrink-0 pt-1">
          {index + 1}
        </span>
        {cover ? (
          <img
            src={cover}
            alt=""
            className="w-12 h-12 rounded object-cover shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center shrink-0">
            <Music2 className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium truncate">{matched.title}</div>
          {matched.artist && (
            <div className="text-sm text-muted-foreground truncate">
              Setlist: {matched.artist}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 md:w-96 shrink-0">
        {showMatchControls && matched.spotifyMatch ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Match Spotify</span>
              <Badge variant={variant}>{label}</Badge>
            </div>
            <Select
              value={matched.spotifyMatch.id}
              onValueChange={(id) => onSelectTrack(index, id)}
              disabled={disabled || options.length <= 1}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Elegir canción" />
              </SelectTrigger>
              <SelectContent>
                {options.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {formatTrackLabel(track)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        ) : showMatchControls ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>No se encontró en Spotify</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Conecta Spotify para buscar esta canción
          </p>
        )}

        <div className="flex gap-2 justify-end">
          {showMatchControls && onExclude && matched.spotifyMatch && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => onExclude(index)}
              disabled={disabled}
              title="Quitar de la playlist sin borrar del listado"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Quitar
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => onRemove(index)}
            disabled={disabled}
            title="Eliminar del setlist"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  );
}
