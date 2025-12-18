// Supabase Edge Function: Send Weekly Newsletter
// Sends personalized newsletter with user's saved links and top recommendations

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Link {
  id: string
  url: string
  og_title: string
  og_image: string
  og_description: string
  created_at: string
  custom_title?: string
  saver_nickname?: string
}

interface User {
  id: string
  email: string
  nickname: string
}

// Get links saved in the last 7 days by a user with creator nickname
async function getUserWeeklyLinks(supabase: any, userId: string): Promise<Link[]> {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('links')
    .select('id, url, og_title, og_image, og_description, created_at, custom_title, user_id')
    .eq('user_id', userId)
    .gte('created_at', sevenDaysAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching user links:', error)
    return []
  }

  // Get user profile for nickname
  const { data: profile } = await supabase
    .from('profiles')
    .select('nickname')
    .eq('id', userId)
    .single()

  const DEFAULT_IMAGE = 'https://placehold.co/80x60/667eea/ffffff?text=LINKER'

  return (data || []).map((l: any) => {
    const isValidImageUrl = l.og_image &&
      (l.og_image.startsWith('http://') || l.og_image.startsWith('https://'))

    return {
      ...l,
      og_image: isValidImageUrl ? l.og_image : DEFAULT_IMAGE,
      saver_nickname: profile?.nickname || '익명'
    }
  })
}

// Get top 3 popular links (by boost_score)
async function getTopRecommendations(supabase: any): Promise<Link[]> {
  const DEFAULT_IMAGE = 'https://placehold.co/80x60/667eea/ffffff?text=LINKER'

  // Get curated links with highest boost_score
  const { data: curatedLinks, error: curatedError } = await supabase
    .from('curated_links')
    .select('id, url, title, thumbnail, description, created_at, boost_score, created_by, editor_id')
    .gt('boost_score', 0)
    .order('boost_score', { ascending: false })
    .limit(3)

  if (curatedError) {
    console.error('Error fetching curated links:', curatedError)
    return []
  }

  if (curatedLinks && curatedLinks.length > 0) {
    // Get unique user IDs for created_by (from profiles)
    const createdByIds = [...new Set(curatedLinks.map((l: any) => l.created_by).filter(Boolean))]
    // Get unique editor IDs (from curated_editors)
    const editorIds = [...new Set(curatedLinks.map((l: any) => l.editor_id).filter(Boolean))]

    // Fetch profiles for created_by users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nickname')
      .in('id', createdByIds)

    // Fetch curated_editors for editor nicknames
    const { data: editors } = await supabase
      .from('curated_editors')
      .select('id, nickname')
      .in('id', editorIds)

    // Create maps for quick lookup
    const profileNicknameMap: Record<string, string> = {}
    if (profiles) {
      profiles.forEach((p: any) => {
        profileNicknameMap[p.id] = p.nickname
      })
    }

    const editorNicknameMap: Record<string, string> = {}
    if (editors) {
      editors.forEach((e: any) => {
        editorNicknameMap[e.id] = e.nickname
      })
    }

    // Map curated_links columns to Link interface
    return curatedLinks.map((l: any) => {
      // Validate thumbnail URL
      const isValidImageUrl = l.thumbnail &&
        (l.thumbnail.startsWith('http://') || l.thumbnail.startsWith('https://'))

      // Get nickname: prioritize created_by (original author), fallback to editor nickname
      const saver = profileNicknameMap[l.created_by] || editorNicknameMap[l.editor_id] || 'LINKER 추천'

      return {
        id: l.id,
        url: l.url,
        og_title: l.title,
        og_image: isValidImageUrl ? l.thumbnail : DEFAULT_IMAGE,
        og_description: l.description,
        created_at: l.created_at,
        custom_title: l.title,
        saver_nickname: saver
      }
    })
  }

  return []
}

// Generate HTML email template
function generateEmailHtml(
  nickname: string,
  userLinks: Link[],
  recommendations: Link[],
  trackingId: string,
  unsubscribeUrl: string
): string {
  const DEFAULT_IMAGE = 'https://placehold.co/80x60/667eea/ffffff?text=LINKER'

  const linkCard = (link: Link, saverName: string) => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="80" style="vertical-align: top;">
              <img src="${link.og_image || DEFAULT_IMAGE}" 
                   alt="" width="80" height="60" 
                   style="border-radius: 8px; object-fit: cover;"
                   onerror="this.src='${DEFAULT_IMAGE}'">
            </td>
            <td style="padding-left: 12px; vertical-align: top;">
              <a href="${link.url}" 
                 style="color: #333; text-decoration: none; font-weight: 600; font-size: 14px;">
                ${link.custom_title || link.og_title || link.url}
              </a>
              <p style="margin: 4px 0 0; color: #667eea; font-size: 11px;">by ${saverName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `

  const userLinksHtml = userLinks.length > 0
    ? userLinks.map(l => linkCard(l, l.saver_nickname || nickname)).join('')
    : '<tr><td style="padding: 20px; text-align: center; color: #999;">이번 주에 저장한 링크가 없습니다</td></tr>'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LINKER 주간 뉴스레터</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">📎 LINKER</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">주간 뉴스레터</p>
            </td>
          </tr>
          
          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 24px 20px;">
              <h2 style="margin: 0; color: #333; font-size: 18px;">
                안녕하세요, ${nickname || '회원'}님! 👋
              </h2>
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 12px 0 0;">
                이번 주 LINKER 활동 리포트를 보내드립니다.
              </p>
            </td>
          </tr>
          
          <!-- User's saved links -->
          <tr>
            <td style="padding: 0 24px 20px;">
              <h3 style="margin: 0 0 16px; color: #333; font-size: 16px; border-bottom: 2px solid #667eea; padding-bottom: 8px;">
                📚 이번 주 저장한 링크 (${userLinks.length}개)
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${userLinksHtml}
              </table>
            </td>
          </tr>
          
          <!-- Recommendations -->
          <tr>
            <td style="padding: 0 24px 30px;">
              <h3 style="margin: 0 0 16px; color: #333; font-size: 16px; border-bottom: 2px solid #f0ad4e; padding-bottom: 8px;">
                🔥 이번 주 인기 링크 TOP 3
              </h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${recommendations.map(l => linkCard(l, l.saver_nickname || 'LINKER 추천')).join('')}
              </table>
            </td>
          </tr>
          
          <!-- CTA Button -->
          <tr>
            <td style="padding: 20px 24px 30px; text-align: center;">
              <a href="https://golinker.app" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                LINKER에서 확인하기
              </a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 20px 24px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; color: #999; font-size: 12px;">
                LINKER  |  더포지인더스트리  |  사업자등록번호: 241-25-02034
              </p>
              <p style="margin: 8px 0 0;">
                <a href="${unsubscribeUrl}" style="color: #999; font-size: 12px;">수신거부</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  
  <!-- Tracking pixel -->
  <img src="${SUPABASE_URL}/functions/v1/track-email?id=${trackingId}&action=open" 
       width="1" height="1" style="display: none;" alt="">
</body>
</html>
  `
}

// Send email via Resend
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'LINKER <newsletter@golinker.app>',
        to: [to],
        subject,
        html,
        tags: [{ name: 'type', value: 'newsletter' }],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Resend error:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Send email error:', error)
    return false
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get all users with newsletter enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, nickname')
      .eq('newsletter_enabled', true)
      .not('email', 'is', null)

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    console.log(`Found ${users?.length || 0} users with newsletter enabled`)

    // Get top recommendations (same for all users)
    const recommendations = await getTopRecommendations(supabase)

    let sentCount = 0
    let failedCount = 0

    for (const user of users || []) {
      // Get user's weekly links
      const userLinks = await getUserWeeklyLinks(supabase, user.id)

      // Skip if no links AND no recommendations
      if (userLinks.length === 0 && recommendations.length === 0) {
        console.log(`Skipping ${user.email}: no content`)
        continue
      }

      // Generate tracking ID
      const trackingId = crypto.randomUUID()
      const unsubscribeUrl = `${SUPABASE_URL}/functions/v1/unsubscribe?user_id=${user.id}`

      // Generate email
      const html = generateEmailHtml(
        user.nickname,
        userLinks,
        recommendations,
        trackingId,
        unsubscribeUrl
      )

      // Send email
      const success = await sendEmail(
        user.email,
        `📎 이번 주 LINKER 뉴스레터 - ${userLinks.length}개의 링크`,
        html
      )

      if (success) {
        // Log the sent newsletter
        await supabase.from('newsletter_logs').insert({
          user_id: user.id,
          links_count: userLinks.length,
          recommendations_count: recommendations.length,
          tracking_id: trackingId,
        })
        sentCount++
        console.log(`Sent to ${user.email}`)
      } else {
        failedCount++
        console.error(`Failed to send to ${user.email}`)
      }

      // Rate limit: wait 600ms between emails (Resend allows 2/sec)
      await new Promise(resolve => setTimeout(resolve, 600))
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: users?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Newsletter error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
