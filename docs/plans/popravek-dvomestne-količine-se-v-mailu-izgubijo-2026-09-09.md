# Popravek: dvomestne količine se v mailu izgubijo

## Kaj se dogaja

Preveril sem shranjevanje količin in bazo. Ko vpišeš dvomestno številko, se lahko zgodita dve stvari:

1. **Prva številka "prehiti" drugo.** Pri prvi vpisani številki se v ozadju ustvari nov zapis naročila, pri drugi pa še en. Ker baza za vsak artikel dovoli samo en zapis (to sem potrdil s pravilom `UNIQUE (article_id)` v tabeli naročil), drugi zapis tiho pade skozi — v bazi ostane samo prva številka (npr. 1 namesto 12). Na zaslonu je videti pravilno, v mailu pa je stara vrednost.
2. **Pošiljanje takoj po tipkanju.** Vnos se shrani z zamikom 250 ms. Če v tem času pritisneš "Pošlji", gre v mail še prejšnja vrednost.

## Kaj bom popravil

- Shranjevanje količine bo uporabilo "vstavi ali posodobi" (upsert) po artiklu, tako da nobena številka ne more več tiho pasti skozi.
- Vpisi za isti artikel se bodo izvajali eden za drugim (zaporedna vrsta), da se zadnja vpisana vrednost vedno zapiše kot zadnja.
- Če shranjevanje kdaj ne uspe, se prikaže opozorilo namesto tihe napake.
- Ob kliku iz polja (blur) in ob pritisku na "Pošlji" se čakajoči vnosi takoj shranijo, preden se sestavi mail.
- Enako velja za hitri vnos (⚡), ki uporablja isto pot shranjevanja.

## Preverjanje

- Hitro vtipkam dvomestne in trimestne količine pri več artiklih, počakam na osvežitev in preverim, da so v bazi točno te vrednosti.
- Preverim vsebino mail/SMS besedila, da se ujema s prikazanimi številkami, tudi če takoj po vpisu pritisnem "Pošlji".

## Tehnične opombe

- `useOrders.updateOrder` v `src/hooks/useNabavni.ts`: zamenjava `select` + `insert`/`update` z `.upsert({...}, { onConflict: 'article_id' })`, plus `Map<articleId, Promise>` za serializacijo in obravnava `error`.
- `DebouncedInput` / `useDebouncedValue`: izpostavim `flush()` in ga kličem `onBlur`; `OrderList` pred `onSendEmail` počaka na `flushAllPendingQty()`.
- Brez sprememb sheme baze.
