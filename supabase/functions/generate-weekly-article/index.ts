import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// This edge function generates and publishes a new blog article using AI
// It's triggered by a cron job every Thursday at 13:00 UTC (15:00 CET)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get existing article count to determine the topic
    const { count } = await supabase
      .from("blog_articles")
      .select("*", { count: "exact", head: true });

    const articleNumber = (count || 0) + 1;

    // Volleyball & coaching topics rotation
    const topics = [
      { keyword: "volleyball setting technique", category: "technique" },
      { keyword: "growth mindset coaching volleyball", category: "mindset" },
      { keyword: "plyometric training volleyball", category: "training" },
      { keyword: "volleyball nutrition athletes", category: "health" },
      { keyword: "blocking strategies volleyball", category: "technique" },
      { keyword: "youth volleyball development", category: "coaching" },
      { keyword: "injury prevention volleyball", category: "health" },
      { keyword: "volleyball match analysis tactics", category: "strategy" },
      { keyword: "passing and digging drills", category: "training" },
      { keyword: "international volleyball events", category: "news" },
      { keyword: "volleyball serve techniques", category: "technique" },
      { keyword: "team communication volleyball", category: "coaching" },
      { keyword: "volleyball warm up routines", category: "training" },
      { keyword: "mental toughness athletes", category: "mindset" },
      { keyword: "volleyball rotation strategies", category: "strategy" },
      { keyword: "recovery nutrition post-match", category: "health" },
      { keyword: "volleyball libero skills", category: "technique" },
      { keyword: "coaching leadership styles", category: "coaching" },
      { keyword: "volleyball agility training", category: "training" },
      { keyword: "game day preparation volleyball", category: "strategy" },
    ];

    const topicIndex = (articleNumber - 1) % topics.length;
    const topic = topics[topicIndex];

    // Use Lovable AI to generate the article
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prompt = `Write a professional blog article about "${topic.keyword}" for a volleyball coaching platform. 
The article should be:
- 800-1200 words
- Written in English
- SEO-optimized with the keyword "${topic.keyword}" used naturally
- Include practical tips and actionable advice
- Use ## headers for sections
- Professional tone suitable for volleyball coaches and directors
- Include specific drills, exercises, or strategies where appropriate

Return a JSON object with these fields:
- title: SEO-optimized title (under 60 chars)
- slug: URL-friendly slug
- excerpt: 150-160 char meta description
- content: full article in markdown
- tags: array of 5-8 relevant tags
- meta_description: SEO meta description (under 160 chars)
- title_es: Spanish title
- excerpt_es: Spanish excerpt
- content_es: full article translated to Spanish
- title_it: Italian title  
- excerpt_it: Italian excerpt
- content_it: full article translated to Italian

Return ONLY valid JSON, no markdown fencing.`;

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const responseText = aiData.choices?.[0]?.message?.content || "";
    
    // Parse the JSON response
    let articleData;
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        articleData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (e) {
      console.error("Failed to parse AI response:", responseText.substring(0, 500));
      throw new Error("Failed to parse AI-generated article");
    }

    // Get or create category
    const { data: categories } = await supabase
      .from("blog_categories")
      .select("id")
      .eq("slug", topic.category)
      .single();

    const categoryId = categories?.id || null;

    // Calculate next Thursday at 15:00 CET
    const now = new Date();
    const publishedAt = new Date(now);
    // Set to 13:00 UTC (15:00 CET)
    publishedAt.setUTCHours(13, 0, 0, 0);

    // Insert articles in all 3 languages
    const articles = [
      {
        title: articleData.title,
        slug: articleData.slug || articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        excerpt: articleData.excerpt,
        content: articleData.content,
        tags: articleData.tags,
        meta_description: articleData.meta_description || articleData.excerpt,
        category_id: categoryId,
        language: "en",
        is_published: true,
        published_at: publishedAt.toISOString(),
      },
      {
        title: articleData.title_es,
        slug: (articleData.slug || articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "-es",
        excerpt: articleData.excerpt_es,
        content: articleData.content_es,
        tags: articleData.tags,
        meta_description: articleData.excerpt_es,
        category_id: categoryId,
        language: "es",
        is_published: true,
        published_at: publishedAt.toISOString(),
      },
      {
        title: articleData.title_it,
        slug: (articleData.slug || articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")) + "-it",
        excerpt: articleData.excerpt_it,
        content: articleData.content_it,
        tags: articleData.tags,
        meta_description: articleData.excerpt_it,
        category_id: categoryId,
        language: "it",
        is_published: true,
        published_at: publishedAt.toISOString(),
      },
    ];

    const { error: insertError } = await supabase.from("blog_articles").insert(articles);
    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, articles: articles.map((a) => a.title) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating article:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
