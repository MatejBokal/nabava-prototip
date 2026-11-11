# Pogled po skladiščih

Dodava preklop na vrhu nabavnega lista: **Dobavitelji** (obstoječe) / **Skladišče** (novo). V skladiščnem pogledu so artikli grupirani po skladiščih (Suho, Hlajeno, Zamrznjeno …) ne glede na dobavitelja, tako da vpisuješ po poti skozi skladišče brez skakanja med dobavitelji.

## Kako deluje

- Gumb/preklop v lebdeči vrstici zgoraj (poleg iskanja), stanje se zapomni za vsako področje.
- Skladiščni pogled:
  - Sekcije = skladišča, urejene po obstoječem vrstnem redu skladišč, naslov sekcije je lepljiv (sticky) kot zdaj pri dobaviteljih.
  - Kartica artikla je enaka kot zdaj (ime, / ciljna zaloga, polje za vnos, opomba), dodatno pa ima majhno oznako z imenom dobavitelja, da veš kam gre.
  - Klik na ime odpre isto okno za urejanje artikla.
  - Drag & drop znotraj skladišča ureja **ločen** vrstni red, ki ne spremeni vrstnega reda pri dobaviteljih.
  - Artikli brez znanega skladišča gredo v sekcijo "Ostalo".
- Dodajanje dobaviteljev/artiklov in gumbi za pošiljanje ostanejo v pogledu Dobavitelji (pošiljanje je logično vezano na dobavitelja). V skladiščnem pogledu samo vpisuješ količine — vnosi so isti podatki, torej se takoj vidijo tudi v pogledu Dobavitelji.
- Iskanje in "Nova nabava" delujeta v obeh pogledih.

## Tehnično

- Migracija: nov stolpec `storage_sort_order integer not null default 0` v tabeli `articles` (ločen ročni vrstni red za skladiščni pogled).
- `useArticles`: branje/zapis novega polja + funkcija `reorderArticlesByStorage(orderedIds)`, enak vzorec kot obstoječi `reorderArticles` (optimistično stanje + batch update).
- `OrderList.tsx`: nov način prikaza `viewMode: 'supplier' | 'storage'` (stanje v `localStorage` po področju); grupiranje po `storageType` z `useMemo`, ista dnd-kit nastavitev in ista komponenta kartice (dodan prop za oznako dobavitelja).
