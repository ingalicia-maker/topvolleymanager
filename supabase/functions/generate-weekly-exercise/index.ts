import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generates 2 volleyball exercises per week using AI and assigns
// multiple categories and scopes via the pivot tables.
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load all categories and scopes (with slugs and names) so the AI can pick from a closed list
    const [{ data: categories }, { data: scopes }] = await Promise.all([
      supabase.from("exercise_categories").select("id, slug, name_en"),
      supabase.from("exercise_scopes").select("id, slug, name_en"),
    ]);

    if (!categories?.length || !scopes?.length) {
      throw new Error("No categories or scopes available in database");
    }

    const categorySlugs = categories.map((c) => c.slug);
    const scopeSlugs = scopes.map((s) => s.slug);
    const slugToCategoryId = new Map(categories.map((c) => [c.slug, c.id]));
    const slugToScopeId = new Map(scopes.map((s) => [s.slug, s.id]));

    // Avoid generating duplicates: pull existing slugs to give the AI context
    const { data: existing } = await supabase
      .from("exercises")
      .select("slug, title_en")
      .order("created_at", { ascending: false })
      .limit(40);

    const existingTitles = (existing || []).map((e) => e.title_en).join(", ");

    const EXERCISES_PER_RUN = 2;
    const generatedExercises: string[] = [];
    const errors: string[] = [];

    for (let i = 0; i < EXERCISES_PER_RUN; i++) {
      try {
        const prompt = `Generate ONE professional volleyball exercise for a coaching platform.

AVAILABLE CATEGORIES (use slugs exactly): ${categorySlugs.join(", ")}
AVAILABLE LEVELS/SCOPES (use slugs exactly): ${scopeSlugs.join(", ")}

Recent existing exercises (avoid duplicates): ${existingTitles}

Return ONLY valid JSON (no markdown fencing) with these fields:
{
  "slug": "url-friendly-slug-in-english",
  "title_en": "Title in English",
  "title_es": "Title in Spanish",
  "title_it": "Title in Italian",
  "purpose_en": "Purpose paragraph in English",
  "purpose_es": "Purpose paragraph in Spanish",
  "purpose_it": "Purpose paragraph in Italian",
  "how_it_works_en": "Step-by-step instructions in English (markdown allowed)",
  "how_it_works_es": "Step-by-step instructions in Spanish",
  "how_it_works_it": "Step-by-step instructions in Italian",
  "variations_en": "2-3 variations in English",
  "variations_es": "2-3 variations in Spanish",
  "variations_it": "2-3 variations in Italian",
  "requirements_en": "Equipment/space requirements in English",
  "requirements_es": "Equipment/space requirements in Spanish",
  "requirements_it": "Equipment/space requirements in Italian",
  "difficulty": 1-5,
  "min_players": 2-12,
  "max_players": 4-16,
  "category_slugs": ["slug1", "slug2"],  // 1-3 categories from AVAILABLE CATEGORIES, pick ALL that genuinely apply
  "scope_slugs": ["slug1"]  // 1-2 levels from AVAILABLE LEVELS, pick both if exercise works for both senior and youth
}

Rules:
- All category_slugs MUST come from AVAILABLE CATEGORIES.
- All scope_slugs MUST come from AVAILABLE LEVELS.
- Be generous: if an exercise trains multiple skills, include all relevant categories. If it works for both senior and youth, include both scopes.
- Make the exercise specific, practical, and unique.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI API error: ${aiResponse.status} ${await aiResponse.text()}`);
        }

        const aiData = await aiResponse.json();
        const responseText = aiData.choices?.[0]?.message?.content || "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("No JSON in AI response");
        const ex = JSON.parse(jsonMatch[0]);

        // Validate and resolve category/scope slugs to IDs
        const catSlugs: string[] = Array.isArray(ex.category_slugs) ? ex.category_slugs : [];
        const scpSlugs: string[] = Array.isArray(ex.scope_slugs) ? ex.scope_slugs : [];
        const validCatIds = catSlugs
          .map((s) => slugToCategoryId.get(s))
          .filter((id): id is string => !!id);
        const validScopeIds = scpSlugs
          .map((s) => slugToScopeId.get(s))
          .filter((id): id is string => !!id);

        if (validCatIds.length === 0 || validScopeIds.length === 0) {
          throw new Error(
            `Invalid slugs returned. categories=${JSON.stringify(catSlugs)} scopes=${JSON.stringify(scpSlugs)}`
          );
        }

        // Ensure unique slug
        const uniqueSlug = `${ex.slug}-${Date.now()}-${i}`;

        // Insert exercise (legacy single category_id/scope_id = first selection for backward compatibility)
        const { data: inserted, error: insertError } = await supabase
          .from("exercises")
          .insert({
            slug: uniqueSlug,
            title_en: ex.title_en,
            title_es: ex.title_es,
            title_it: ex.title_it,
            purpose_en: ex.purpose_en,
            purpose_es: ex.purpose_es,
            purpose_it: ex.purpose_it,
            how_it_works_en: ex.how_it_works_en,
            how_it_works_es: ex.how_it_works_es,
            how_it_works_it: ex.how_it_works_it,
            variations_en: ex.variations_en,
            variations_es: ex.variations_es,
            variations_it: ex.variations_it,
            requirements_en: ex.requirements_en,
            requirements_es: ex.requirements_es,
            requirements_it: ex.requirements_it,
            difficulty: Math.max(1, Math.min(5, Number(ex.difficulty) || 2)),
            min_players: Number(ex.min_players) || 4,
            max_players: Number(ex.max_players) || 12,
            category_id: validCatIds[0],
            scope_id: validScopeIds[0],
            is_published: true,
          })
          .select("id")
          .single();

        if (insertError || !inserted) throw insertError || new Error("Insert failed");

        // Insert pivot links (multiple categories + multiple scopes)
        const categoryLinks = validCatIds.map((category_id) => ({
          exercise_id: inserted.id,
          category_id,
        }));
        const scopeLinks = validScopeIds.map((scope_id) => ({
          exercise_id: inserted.id,
          scope_id,
        }));

        const [catLinkRes, scopeLinkRes] = await Promise.all([
          supabase.from("exercise_category_links").insert(categoryLinks),
          supabase.from("exercise_scope_links").insert(scopeLinks),
        ]);

        if (catLinkRes.error) console.error("Category link error:", catLinkRes.error);
        if (scopeLinkRes.error) console.error("Scope link error:", scopeLinkRes.error);

        generatedExercises.push(`${ex.title_en} (cats: ${catSlugs.join("+")}, scopes: ${scpSlugs.join("+")})`);
      } catch (err: any) {
        console.error(`Error generating exercise ${i + 1}:`, err);
        errors.push(err.message || String(err));
      }
    }

    return new Response(
      JSON.stringify({
        success: generatedExercises.length > 0,
        generated: generatedExercises,
        errors,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
