# Hitrejši in enostavnejši nabavni list

## 1. Napaka: izbrisana številka vseeno pošlje maksimalno količino

Potrjeno v kodi: ko v polje vpišeš številko in jo nato izbrišeš, se v bazi shrani "prazna" vrednost, vrstica naročila pa ostane. Ob pošiljanju se za tak artikel uporabi rezervni izračun (ciljna zaloga), zato v naročilo pade polna količina.

Popravek: prazno polje pomeni "ne naroči". Ko izbrišeš vsebino, se vnos naročila za ta artikel odstrani, artikel postane neaktiven in ga pošiljanje ignorira. Odstrani se tudi rezervni izračun preko ciljne zaloge — v naročilo gre izključno to, kar je vpisano.

## 2. Hitri vnos (nov način "Popis")

Nov gumb "Hitri vnos" ob preklopu Dobavitelji/Skladišče. Odpre poln zaslon, ki gre po artiklih v vrstnem redu skladišča:

```text
┌──────────────────────────────┐
│ Suho            12 / 34      │
│                              │
│   Moka gladka                │
│   opomba: naroči v petek     │
│                              │
│        [   ] kos             │
│                              │
│  [ Preskoči ]   [ Naprej → ] │
└──────────────────────────────┘
```

- Numerična tipkovnica se odpre sama, polje je fokusirano.
- Enter = shrani in skoči na naslednji artikel. Prazno + Enter = preskoči (nič ne naroči). Enako velja za vse vnose količin, tudi v navadnem seznamu.
- Napredek in možnost koraka nazaj; na koncu povzetek s številom vnesenih artiklov in gumbom nazaj na seznam.
- Deluje po istem vrstnem redu, kot ga imaš v skladiščnem pogledu.

## 3. Manj klikov v obstoječem seznamu

- Enter v polju za količino skoči na naslednji artikel v skupini (brez zapiranja tipkovnice).
- `inputMode="numeric"` na vseh količinskih poljih — takoj številčna tipkovnica na mobilnem.
- Klik na polje označi obstoječo vrednost, da jo prepišeš z eno potezo.
- Gumb za brisanje (x) v polju, da količino odstraniš brez brisanja po znakih.

## 4. Boljše iskanje

- Iskanje išče tudi po imenu artikla pri dobavitelju in po opombi.
- Neobčutljivo na šumnike (c/č, s/š, z/ž) in na vrstni red besed.
- Gumb za izbris iskalnega niza in števec zadetkov.
- Med iskanjem so prazne skupine skrite, prvi zadetek pa označen.

## 5. Občutek hitrosti

- Optimistični lokalni prikaz vnosa: številka se izpiše takoj, sinhronizacija v ozadje (zdaj vsak vnos čaka na bazo).
- Skrajšanje zakasnitve shranjevanja z 500 ms na ~250 ms in preprečitev "povratnega prepisa" iz realtime dogodkov med tipkanjem (to povzroča občasno brisanje vnesenega).
- Izračuni skupin, iskanja in številčenja se memoizirajo, da se seznam ne preračunava ob vsakem pritisku tipke.
- Aktivni zavihek, način pogleda in iskanje se ohranijo ob osvežitvi.

## Tehnične opombe

- `useOrders`: nova metoda `removeOrder(articleId)`; `updateOrder` z `manualOrderQty === null` izbriše vrstico.
- `Index.tsx` `handleSend`: količina = `manualOrderQty ?? 0`, brez `targetStock - currentStock`.
- `OrderList.tsx`: `useMemo` za `filteredArticles`, `grouped`, `groupedByStorage`, `fullStorageGroups`; normalizacija besedila za iskanje v `src/lib/utils.ts`.
- Nova komponenta `QuickEntry.tsx` (poln zaslon, uporablja isti `updateOrder` in vrstni red `storageSortOrder`).
- `DebouncedInput`: `inputMode`, `select()` ob fokusu, `onEnterNext`, ne prepisuje vrednosti dokler je polje v fokusu.
- Brez sprememb v bazi.
