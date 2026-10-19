import { createClient } from '@supabase/supabase-js';
export const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
export const TIPOS = {
  vuelo: ['✈️', 'Vuelo'], hotel: ['🏨', 'Hotel'], transporte: ['🚗', 'Transporte'], tren: ['🚆', 'Tren'],
  crucero: ['🚢', 'Crucero'], restaurante: ['🍽️', 'Restaurante'], actividad: ['🎟️', 'Actividad'], nota: ['📝', 'Nota'],
};
