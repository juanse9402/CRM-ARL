import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nybdftecvgvgkxbbuvlw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55YmRmdGVjdmd2Z2t4YmJ1dmx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4OTc0MTMsImV4cCI6MjA5MzQ3MzQxM30.bsmZcoo6SoBYKpFPZ_bgTIIDP_lr6Wjs7bd3aFZFZnk';

export const supabase = createClient(supabaseUrl, supabaseKey);
