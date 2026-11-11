# Avtomatska nabava pijače iz tedenske prodaje

Cilj: naložiš tedenski izvoz prodaje (.xls), aplikacija sešteje, koliko je bilo porabljeno, in sama izpolni količine za naročilo po paketih. Brez vodenja zaloge — princip "naročimo, kolikor smo prodali". Vse izpolnjene količine lahko ročno popraviš pred pošiljanjem.

## Kako bo delovalo

1. Na nabavnem listu (npr. Pijača) je nov gumb **Uvozi prodajo**.
2. Izbereš .xls datoteko iz telefona ali računalnika. Aplikacija prebere stolpca naziv in količina.
3. Za vsak artikel sešteje vse povezane prodajne nazive in izračuna, koliko paketov je treba naročiti.
4. Pokaže pregled: kaj je izpolnila, in seznam prodajnih nazivov, ki jih še ne pozna — te lahko z enim klikom pripneš k obstoječemu artiklu ali preskočiš.
5. Potrdiš in količine se vpišejo v nabavni list, kjer jih lahko še popraviš.

## Recepture in pakiranja (Google Preglednice v oblaku)

Recepture in pakiranja živijo v **Googlovi preglednici**, ki jo urejaš kot navaden Excel v brskalniku; aplikacija jo prebere sproti ob vsakem uvozu prodaje. Preglednica ima dva zavihka:

- **Recepture** — stolpci: `Prodajni naziv` | `Artikel` | `Poraba na enoto` | `Enota`. Isti prodajni naziv se lahko pojavi v več vrsticah (Cappuccino → Kava 0,009 kg in → Mleko 0,1 kg).
- **Pakiranja** — stolpci: `Artikel` | `Pakiranje` | `Enota` (Coca Cola | 24 | kos; Kava | 1 | kg).

Primer vsebine zavihka Recepture:

- **Pakiranje** – koliko enot je v enem paketu (Coca Cola: 24 kos; kava: 1 kg).
- **Prodajni nazivi** – seznam vrstic iz izvoza, ki štejejo k temu artiklu, vsaka s porabo na enoto prodaje:

```text
Coca Cola 0,33 lit             → 1 kos
Meni Coca Cola 0,33 lit        → 1 kos
Personal Coca Cola 0,33 lit    → 1 kos

Kava (artikel, pakiranje 1 kg)
Espresso                       → 0,009 kg
Personal kava                  → 0,009 kg
Cappuccino                     → 0,009 kg
Kava z mlekom                  → 0,009 kg
```

Tako en prodani Cappuccino porabi 0,009 kg kave in hkrati 0,1 kg mleka pri artiklu Mleko — isti prodajni naziv se lahko pojavi pri več artiklih.

## Izračun količine

Poraba = seštevek (prodana količina × faktor) po vseh povezanih nazivih.
Naročilo = poraba / pakiranje, zaokroženo navzgor na cel paket.

Primer iz priložene datoteke: Coca Cola 0,33 = 304 + 97 + 11 = 412 kos → 412 / 24 = 18 paketov.
Primer kava: (99 + 154 + 46 + 86 + ...) × 0,009 kg → zaokroženo na cele kg.

Če je poraba 0, artikel ostane prazen (se ne naroči), enako kot zdaj.

## Kaj naredimo najprej

Prva faza pokrije celoten mehanizem, začnemo pa s Coca Colo: ustvariš Googlovo preglednico z dvema zavihkoma, vpišeš pakiranje 24 in tri prodajne nazive, povežeš Googlov račun v aplikaciji, uvozimo priloženo datoteko in preverimo, da izračuna 18 paketov. Nato po istem postopku v preglednico dodaš ostale pijače in kavne recepture — brez novega razvoja.

## Tehnične podrobnosti

- Google Preglednice se povežejo prek povezave (enkratna prijava z Googlovim računom, preglednica je v lasti vašega računa). Potreben je ID preglednice, ki ga vneseš v nastavitvah aplikacije.
- Nova backend funkcija `read-recipes` prebere oba zavihka preglednice in vrne recepture + pakiranja; brskalnik rezultat začasno predpomni, da se ne bere pri vsakem kliku.
- Brez novih tabel v bazi — `sales_mappings` in `package_size` odpadeta, saj je vir resnice preglednica.
- Branje .xls v brskalniku z knjižnico `xlsx` (SheetJS) — podpira star .xls format iz vašega programa.
- Parser za obstoječi format poročila: naziv v stolpcu B, količina v stolpcu L (slovenski zapis z vejico), preskoči glave in prazne vrstice.
- Ujemanje nazivov je neobčutljivo na šumnike, velike črke in presledke (uporabi obstoječi `normalizeText`).
- Nova komponenta `ImportSalesDialog`: izbira datoteke, predogled izračuna po artiklih, seznam neznanih nazivov s hitrim pripenjanjem, gumb za potrditev.
- Vpis količin gre skozi obstoječi `updateOrder` (upsert, serializirane pisave), zato ostane združljivo s pošiljanjem naročil.
- Zgodovina uvozov se v tej fazi ne shranjuje.
