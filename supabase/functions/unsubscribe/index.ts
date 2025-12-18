// Supabase Edge Function: Unsubscribe from Newsletter
// Handles newsletter subscription management - redirects to static page

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const userId = url.searchParams.get('user_id')

  if (!userId) {
    return Response.redirect('https://pages.golinker.app/unsubscribe?status=error', 302)
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Disable newsletter for user
    const { error } = await supabase
      .from('profiles')
      .update({ newsletter_enabled: false })
      .eq('id', userId)

    if (error) {
      console.error('Unsubscribe error:', error)
      return Response.redirect('https://pages.golinker.app/unsubscribe?status=error', 302)
    }

    console.log(`User ${userId} unsubscribed from newsletter`)

    return Response.redirect('https://golinker.app/unsubscribe?status=success', 302)
  } catch (error) {
    console.error('Unsubscribe error:', error)
    return Response.redirect('https://pages.golinker.app/unsubscribe?status=error', 302)
  }
})
