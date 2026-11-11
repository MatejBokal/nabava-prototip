# Uvoz receptur iz Google Preglednic brez Lovable

Status: **odloženo** (odločitev 11. 11. 2026). Ta načrt je še v teku, ne zgodovina.

## 1. Stanje

- Pogovorno okno za uvoz prodaje (`src/components/ImportSalesDialog.tsx`) prebere prodajno datoteko, nato pokliče Supabase funkcijo `read-recipes` (`supabase/functions/read-recipes/index.ts`).
- Funkcija iz Google preglednice prebere dva zavihka: **Recepture** (`A2:D2000`: prodajno ime, artikel, faktor, enota) in **Pakiranja** (`A2:C1000`: artikel, velikost pakiranja, enota). Vrne `{ recipes, packagings }`, iz tega `computeImport` izračuna količine za nabavo.
- ID preglednice vpiše uporabnik v oknu in se shrani samo v `localStorage` brskalnika (`nabavni-recipes-sheet-id`), ne v bazo.
- Funkcija **ne kliče Googla neposredno**. Gre prek Lovablovega prehoda `connector-gateway.lovable.dev` s skrivnostma `LOVABLE_API_KEY` in `GOOGLE_SHEETS_API_KEY`. Ti sta obstajali samo v starem Lovable projektu.
- Na novem Supabase projektu (Nabava, `vqgiduwrltjmachlzesp`) funkcija **ni nameščena** in skrivnosti **ne obstajajo**. Uvoz prodaje zato javi "Uvoz ni uspel". Ostali deli aplikacije delujejo.

## 2. Kaj je treba narediti

1. **Izbrati način dostopa do Googla.**
   - A) API ključ: preprosto. Preglednica mora biti deljena kot "vsak s povezavo lahko ogleduje". Priporočeno, ker preglednica vsebuje le recepture in pakiranja.
   - B) Service account: preglednica ostane zasebna, a je več nastavitev in kode (podpis JWT).
2. **Google Cloud (to mora narediti človek):** ustvariti projekt, vklopiti Google Sheets API, ustvariti API ključ in ga omejiti na Sheets API (A), ali service account z JSON ključem in preglednico deliti z njegovim e-naslovom (B).
3. **Koda:** v `read-recipes` zamenjati `GATEWAY_URL` z `https://sheets.googleapis.com/v4/spreadsheets/{id}/values/{range}?key=...` (A), odstraniti `LOVABLE_API_KEY` in popraviti sporočilo napake, ki omenja povezavo Google računa. `parseNum`, razčlenjevanje in oblika odgovora ostanejo enaki, zato aplikacije (`ImportSalesDialog`) ni treba spreminjati.
4. **Skrivnost:** `supabase secrets set GOOGLE_SHEETS_API_KEY=...` (pri B npr. `GOOGLE_SERVICE_ACCOUNT_JSON`). Vrednosti nikoli ne gredo v git.
5. **Namestitev:** `supabase functions deploy read-recipes`, po dogovoru z lastnikom repozitorija.
6. **Preizkus:** prijavljen v aplikacijo uvoziti vzorčno prodajno datoteko in preveriti, da se količine izpolnijo.

## 3. Opombe

- Sprememba je majhna, težava je samo v Google poverilnicah, ki jih mora ustvariti človek.
- Podatki v bazi (tabeli `article_recipes` in `recipe_exclusions`) s tem nimajo zveze. To so receptura med artikli, ne receptura iz preglednice.
