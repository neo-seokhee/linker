// Feed Collector Edge Function
// Collects content from RSS feeds, newsletters, and APIs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedSource {
  id: string
  name: string
  source_type: 'rss' | 'newsletter' | 'api' | 'scraper'
  url: string
  email_parser_config: any
  editor_nickname: string
  editor_profile_image: string | null
  category: string
  show_in_feed: boolean
  show_in_featured: boolean
  boost_score: number
  collection_interval_hours: number
  max_items_per_collection: number
  keywords_include: string[] | null
  keywords_exclude: string[] | null
}

interface RSSItem {
  title: string
  link: string
  description?: string
  pubDate?: string
  'media:thumbnail'?: { $: { url: string } }
  enclosure?: { $: { url: string } }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get request body to check for specific source_id
    let sourceId: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        sourceId = body.source_id || null
      } catch {
        // No body or invalid JSON, proceed with all sources
      }
    }

    // Get feed sources - either specific one or all active
    let query = supabase.from('feed_sources').select('*')

    if (sourceId) {
      query = query.eq('id', sourceId)
    } else {
      query = query.eq('is_active', true)
    }

    const { data: feedSources, error: sourcesError } = await query

    if (sourcesError) {
      throw sourcesError
    }

    if (!feedSources || feedSources.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active feed sources found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    const results = []

    // Process each feed source
    for (const source of feedSources as FeedSource[]) {
      try {
        // Check if it's time to collect based on interval (skip check if specific source_id was requested)
        if (!sourceId && source.last_collected_at) {
          const lastCollected = new Date(source.last_collected_at)
          const now = new Date()
          const hoursSinceLastCollection = (now.getTime() - lastCollected.getTime()) / (1000 * 60 * 60)

          if (hoursSinceLastCollection < source.collection_interval_hours) {
            console.log(`Skipping ${source.name}: collected ${hoursSinceLastCollection.toFixed(1)} hours ago`)
            continue
          }
        }

        let items: RSSItem[] = []

        if (source.source_type === 'rss') {
          items = await collectRSS(source.url, source.max_items_per_collection)
        } else if (source.source_type === 'api') {
          items = await collectAPI(source.url, source.max_items_per_collection)
        } else if (source.source_type === 'scraper') {
          items = await collectScraper(source.url, source.max_items_per_collection, source.email_parser_config)
        }
        // Newsletter collection would require email integration (future feature)

        if (items.length === 0) {
          console.log(`No items found for ${source.name}`)
          continue
        }

        // Filter items by keywords if specified
        const filteredItems = filterItems(items, source.keywords_include, source.keywords_exclude)

        let itemsCollected = 0
        let itemsSkipped = 0

        // Insert items into curated_links
        for (const item of filteredItems) {
          // Check for duplicates
          const { data: existing } = await supabase
            .from('curated_links')
            .select('id')
            .eq('url', item.link)
            .single()

          if (existing) {
            itemsSkipped++
            continue
          }

          // Extract thumbnail
          let thumbnail = item['media:thumbnail']?.$.url || item.enclosure?.$.url || null

          const { error: insertError } = await supabase
            .from('curated_links')
            .insert({
              url: item.link,
              title: item.title,
              description: item.description || null,
              thumbnail: thumbnail,
              nickname: source.editor_nickname,
              profile_image: source.editor_profile_image,
              category: source.category,
              boost_score: source.boost_score,
              show_in_feed: source.show_in_feed,
              show_in_featured: source.show_in_featured,
            })

          if (insertError) {
            console.error(`Error inserting item from ${source.name}:`, insertError)
            continue
          }

          itemsCollected++
        }

        // Update feed source stats
        await supabase
          .from('feed_sources')
          .update({
            last_collected_at: new Date().toISOString(),
            total_items_collected: (source.total_items_collected || 0) + itemsCollected,
          })
          .eq('id', source.id)

        // Log collection
        await supabase
          .from('feed_collection_logs')
          .insert({
            feed_source_id: source.id,
            status: 'success',
            items_collected: itemsCollected,
            items_skipped: itemsSkipped,
          })

        results.push({
          source: source.name,
          collected: itemsCollected,
          skipped: itemsSkipped,
        })

      } catch (error) {
        console.error(`Error processing ${source.name}:`, error)

        // Log error
        await supabase
          .from('feed_collection_logs')
          .insert({
            feed_source_id: source.id,
            status: 'error',
            error_message: error.message,
          })

        results.push({
          source: source.name,
          error: error.message,
        })
      }
    }

    return new Response(
      JSON.stringify({ message: 'Feed collection complete', results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Feed collector error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

// Parse RSS feed
async function collectRSS(url: string, maxItems: number): Promise<RSSItem[]> {
  try {
    const response = await fetch(url)
    const xml = await response.text()

    // Simple XML parsing for RSS
    const items: RSSItem[] = []
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || []

    for (const itemXml of itemMatches.slice(0, maxItems)) {
      const title = itemXml.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim()
      const link = itemXml.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
      const description = itemXml.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim()
      const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim()

      // Try to extract image
      const mediaThumbMatch = itemXml.match(/<media:thumbnail url="([^"]+)"/)
      const enclosureMatch = itemXml.match(/<enclosure url="([^"]+)"/)

      if (title && link) {
        items.push({
          title,
          link,
          description,
          pubDate,
          ...(mediaThumbMatch && { 'media:thumbnail': { $: { url: mediaThumbMatch[1] } } }),
          ...(enclosureMatch && { enclosure: { $: { url: enclosureMatch[1] } } }),
        })
      }
    }

    return items
  } catch (error) {
    console.error('RSS parsing error:', error)
    return []
  }
}

// Collect from API endpoint
async function collectAPI(url: string, maxItems: number): Promise<RSSItem[]> {
  try {
    const response = await fetch(url)
    const data = await response.json()

    // Assume API returns array of items with title, link, description
    if (Array.isArray(data)) {
      return data.slice(0, maxItems).map(item => ({
        title: item.title || '',
        link: item.link || item.url || '',
        description: item.description || item.summary || '',
      }))
    }

    return []
  } catch (error) {
    console.error('API collection error:', error)
    return []
  }
}

// Web scraper for community boards without RSS
async function collectScraper(url: string, maxItems: number, config: any): Promise<RSSItem[]> {
  try {
    const response = await fetch(url)
    const html = await response.text()

    // Use configuration to extract items
    // config should contain: { linkSelector, titleSelector, descriptionSelector }
    const items: RSSItem[] = []

    if (!config || !config.linkSelector) {
      // Special handling for Clien.net
      if (url.includes('clien.net')) {
        console.log('Processing Clien.net URL:', url)

        // Extract links and titles separately
        const linkPattern = /<a\s+class="list_subject"\s+href="([^"]+)"/gi
        const links: string[] = []
        let linkMatch

        while ((linkMatch = linkPattern.exec(html)) !== null) {
          links.push(linkMatch[1])
        }

        console.log('Found', links.length, 'links')

        // Extract titles from subject_fixed spans
        const titlePattern = /<span\s+class="subject_fixed"[^>]*title="([^"]*)"/gi
        const titles: string[] = []
        let titleMatch

        while ((titleMatch = titlePattern.exec(html)) !== null) {
          titles.push(titleMatch[1])
        }

        console.log('Found', titles.length, 'titles')

        // Combine links and titles (they should be in the same order)
        const itemCount = Math.min(links.length, titles.length, maxItems)
        console.log('Creating', itemCount, 'items (maxItems:', maxItems, ')')

        for (let i = 0; i < itemCount; i++) {
          const link = links[i].startsWith('http')
            ? links[i]
            : new URL(links[i], url).href

          items.push({
            title: titles[i].trim() || '제목 없음',
            link: link,
          })
        }

        console.log('Final items count:', items.length)
      } else {
        // Default: try to extract links from common patterns
        const linkMatches = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi) || []

        for (const match of linkMatches.slice(0, maxItems)) {
          const hrefMatch = match.match(/href=["']([^"']+)["']/)
          const titleMatch = match.match(/>([^<]+)<\/a>/)

          if (hrefMatch && titleMatch) {
            const link = hrefMatch[1].startsWith('http')
              ? hrefMatch[1]
              : new URL(hrefMatch[1], url).href

            items.push({
              title: titleMatch[1].trim(),
              link: link,
            })
          }
        }
      }
    } else {
      // Use custom selectors (simplified CSS selector matching)
      const linkRegex = new RegExp(config.linkSelector, 'gi')
      const matches = html.match(linkRegex) || []

      for (const match of matches.slice(0, maxItems)) {
        // Extract href and title
        const hrefMatch = match.match(/href=["']([^"']+)["']/)
        const titleMatch = config.titleSelector
          ? match.match(new RegExp(config.titleSelector))
          : match.match(/>([^<]+)</)

        if (hrefMatch) {
          const link = hrefMatch[1].startsWith('http')
            ? hrefMatch[1]
            : new URL(hrefMatch[1], url).href

          items.push({
            title: titleMatch ? titleMatch[1]?.trim() || '제목 없음' : '제목 없음',
            link: link,
          })
        }
      }
    }

    return items
  } catch (error) {
    console.error('Web scraping error:', error)
    return []
  }
}

// Filter items by keywords
function filterItems(
  items: RSSItem[],
  includeKeywords: string[] | null,
  excludeKeywords: string[] | null
): RSSItem[] {
  let filtered = items

  // Include filter (OR logic)
  if (includeKeywords && includeKeywords.length > 0) {
    filtered = filtered.filter(item => {
      const text = `${item.title} ${item.description || ''}`.toLowerCase()
      return includeKeywords.some(keyword => text.includes(keyword.toLowerCase()))
    })
  }

  // Exclude filter (AND logic)
  if (excludeKeywords && excludeKeywords.length > 0) {
    filtered = filtered.filter(item => {
      const text = `${item.title} ${item.description || ''}`.toLowerCase()
      return !excludeKeywords.some(keyword => text.includes(keyword.toLowerCase()))
    })
  }

  return filtered
}
