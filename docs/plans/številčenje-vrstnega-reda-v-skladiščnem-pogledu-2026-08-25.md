# Številčenje vrstnega reda v skladiščnem pogledu

V zavihku **Skladišče** dobi vsaka kartica artikla majhno polje z zaporedno številko. Vpišeš številko in artikel se takoj premakne na to mesto znotraj svojega skladišča — tudi če si ga našel prek iskanja.

## Kako deluje

- Levo na kartici (namesto/ob ročici za vlečenje) je ozko polje s trenutno zaporedno številko, npr. `1`, `2`, `3` …
- Številke tečejo **znotraj vsakega skladišča** posebej (Suho 1..N, Hlajeno 1..N, Ostalo 1..N).
- Vpis številke: artikel se vstavi na to mesto, ostali v istem skladišču se preštevilčijo (kot pri drag & drop). Prevelika številka = na konec, manjša od 1 = na začetek.
- Deluje tudi med iskanjem: filtrirani artikel pokaže svojo pravo številko v skladišču, vpis pa ga prestavi znotraj celotnega (nefiltriranega) skladišča, ne le med prikazanimi zadetki.
- Drag & drop ostane in po premiku posodobi prikazane številke.
- Vpisovanje količin in vse ostalo ostane nespremenjeno; v pogledu Dobavitelji številk ni (tam velja svoj vrstni red).

## Tehnično

- Brez sprememb baze — uporabi obstoječi stolpec `articles.storage_sort_order` in obstoječo funkcijo `reorderArticlesByStorage`.
- `OrderList.tsx`:
  - Za vsako skladišče izračunaj poln (nefiltriran) seznam artiklov, urejen po `storageSortOrder`; iz njega izhaja prikazana številka (index + 1) tudi za filtrirane kartice.
  - `SortableArticleCard` dobi neobvezna propa `orderNumber` in `onOrderNumberChange`; polje je majhen številski input, ki se potrdi ob Enter/blur (ne ob vsaki tipki), lokalno stanje med tipkanjem.
  - Ob potrditvi: prestavi id na nov index v polnem seznamu skladišča in pokliči `reorderArticlesByStorage(newIds)` (optimistično stanje že obstaja).
  - Polje je skrito med vlečenjem (collapsed) in se ne prikaže v pogledu Dobavitelji.
