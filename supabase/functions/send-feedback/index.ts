// Supabase Edge Function: Send Feedback to Slack
// Proxies feedback requests to avoid CORS issues

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SLACK_WEBHOOK_URL = Deno.env.get('SLACK_WEBHOOK_URL') || ''

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userEmail, feedback } = await req.json()

        if (!feedback || !feedback.trim()) {
            return new Response(
                JSON.stringify({ error: 'Feedback is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const userInfo = userEmail || '비로그인 사용자'
        const message = {
            text: `📝 *LINKER 의견*\n\n*사용자:* ${userInfo}\n*의견:* ${feedback}\n*시간:* ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
        }

        const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message),
        })

        if (!slackResponse.ok) {
            console.error('Slack webhook error:', await slackResponse.text())
            return new Response(
                JSON.stringify({ error: 'Failed to send feedback' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`Feedback received from ${userInfo}`)

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
