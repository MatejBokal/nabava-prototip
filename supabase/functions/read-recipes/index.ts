import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_sheets/v4";

// Parses "0,009" / "1.234,56" / "24" into a number
function parseNum(v: unknown): number {
  if (typeof v === "number") return v;
  if (v == null) return NaN;
  const s = String(v).trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  return Number(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const connectionKey = Deno.env.get("GOOGLE_SHEETS_API_KEY");
    if (!lovableKey || !connectionKey) {
      return new Response(
        JSON.stringify({ error: "Google Preglednice niso povezane. Poveži Google račun v nastavitvah projekta." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { spreadsheetId } = await req.json();
    if (!spreadsheetId) {
      return new Response(JSON.stringify({ error: "Manjka ID preglednice." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const fetchRange = async (range: string) => {
      const res = await fetch(`${GATEWAY_URL}/spreadsheets/${spreadsheetId}/values/${range}`, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
        },
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Google Sheets [${res.status}]: ${body}`);
      }
      const data = await res.json();
      return (data.values ?? []) as string[][];
    };

    const [recipeRows, packagingRows] = await Promise.all([
      fetchRange("Recepture!A2:D2000"),
      fetchRange("Pakiranja!A2:C1000"),
    ]);

    const recipes = recipeRows
      .filter(r => r[0] && r[1])
      .map(r => ({
        salesName: String(r[0]).trim(),
        article: String(r[1]).trim(),
        factor: parseNum(r[2]) || 1,
        unit: r[3] ? String(r[3]).trim() : "",
      }));

    const packagings = packagingRows
      .filter(r => r[0])
      .map(r => ({
        article: String(r[0]).trim(),
        packageSize: parseNum(r[1]) || 1,
        unit: r[2] ? String(r[2]).trim() : "",
      }));

    return new Response(JSON.stringify({ recipes, packagings }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
