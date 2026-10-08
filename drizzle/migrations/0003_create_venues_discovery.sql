CREATE TABLE public.venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  osm_id text UNIQUE,
  name text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  venue_type text NOT NULL DEFAULT 'public_park',
  amenities text[] NOT NULL DEFAULT '{}',
  leash_rules text NOT NULL DEFAULT '',
  hours text NOT NULL DEFAULT 'Unknown',
  source text NOT NULL DEFAULT 'osm',
  verification_state text NOT NULL DEFAULT 'discovered',
  verified_at timestamptz,
  neighborhood text NOT NULL DEFAULT '',
  incident_flag_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX venues_lat_lng_idx ON public.venues (lat, lng);
GRANT SELECT ON public.venues TO anon, authenticated;
GRANT ALL ON public.venues TO service_role;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Venues are publicly viewable" ON public.venues FOR SELECT TO anon, authenticated USING (verification_state IN ('verified','discovered'));

CREATE TABLE public.venue_discovery_cells (
  cell_key text PRIMARY KEY,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  venue_count integer NOT NULL DEFAULT 0
);
GRANT ALL ON public.venue_discovery_cells TO service_role;
ALTER TABLE public.venue_discovery_cells ENABLE ROW LEVEL SECURITY;