// Supabase Edge Function: Unsubscribe from Newsletter
// Handles newsletter subscription management

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const successHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINKER 뉴스레터 구독 해지</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    h1 { color: #333; font-size: 24px; margin: 0 0 16px; }
    p { color: #666; font-size: 14px; line-height: 1.6; margin: 0; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    .btn {
      display: inline-block;
      margin-top: 24px;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h1>구독이 해지되었습니다</h1>
    <p>더 이상 LINKER 주간 뉴스레터를 받지 않습니다.<br>언제든 설정에서 다시 구독할 수 있습니다.</p>
    <a href="https://linker.im" class="btn">LINKER로 돌아가기</a>
  </div>
</body>
</html>
`

const errorHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>오류 - LINKER</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 16px;
      padding: 40px;
      text-align: center;
      max-width: 400px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    h1 { color: #333; font-size: 24px; margin: 0 0 16px; }
    p { color: #666; font-size: 14px; line-height: 1.6; margin: 0; }
    .icon { font-size: 48px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>오류가 발생했습니다</h1>
    <p>구독 해지 처리 중 문제가 발생했습니다.<br>잠시 후 다시 시도해주세요.</p>
  </div>
</body>
</html>
`

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const url = new URL(req.url)
    const userId = url.searchParams.get('user_id')

    if (!userId) {
        return new Response(errorHtml, {
            status: 400,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
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
            return new Response(errorHtml, {
                status: 500,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
        }

        console.log(`User ${userId} unsubscribed from newsletter`)

        return new Response(successHtml, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    } catch (error) {
        console.error('Unsubscribe error:', error)
        return new Response(errorHtml, {
            status: 500,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
    }
})
