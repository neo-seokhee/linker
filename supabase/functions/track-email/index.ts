// Supabase Edge Function: Track Email Opens and Clicks
// Updates newsletter_logs when user opens email or clicks a link

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// 1x1 transparent PNG pixel
const TRACKING_PIXEL = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
    0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
])

serve(async (req) => {
    const url = new URL(req.url)
    const trackingId = url.searchParams.get('id')
    const action = url.searchParams.get('action') // 'open' or 'click'
    const redirectUrl = url.searchParams.get('url')

    if (!trackingId) {
        return new Response(TRACKING_PIXEL, {
            headers: { 'Content-Type': 'image/png' },
        })
    }

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        if (action === 'open') {
            // Update opened_at timestamp
            await supabase
                .from('newsletter_logs')
                .update({ opened_at: new Date().toISOString() })
                .eq('tracking_id', trackingId)
                .is('opened_at', null) // Only update if not already opened

            console.log(`Email opened: ${trackingId}`)

            // Return tracking pixel
            return new Response(TRACKING_PIXEL, {
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            })
        }

        if (action === 'click' && redirectUrl) {
            // Update clicked_at timestamp
            await supabase
                .from('newsletter_logs')
                .update({ clicked_at: new Date().toISOString() })
                .eq('tracking_id', trackingId)

            console.log(`Link clicked: ${trackingId} -> ${redirectUrl}`)

            // Redirect to the actual URL
            return new Response(null, {
                status: 302,
                headers: { 'Location': redirectUrl },
            })
        }

        // Default: return pixel
        return new Response(TRACKING_PIXEL, {
            headers: { 'Content-Type': 'image/png' },
        })
    } catch (error) {
        console.error('Tracking error:', error)

        // Still return pixel on error to not break email
        return new Response(TRACKING_PIXEL, {
            headers: { 'Content-Type': 'image/png' },
        })
    }
})
