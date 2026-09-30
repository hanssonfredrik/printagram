import type { Messages } from '../en';

export const guides: Messages['guides'] = {
  index: {
    title: 'Guider',
    lead: 'Så gör du en fotobok av ditt Instagram, från att få ut bilderna ur Instagram till att hålla den tryckta boken.',
    read: 'Läs guiden',
  },
  breadcrumb: 'Guider',
  breadcrumbLabel: 'Brödsmulor',
  updated: (date) => `Uppdaterad ${date}`,
  faqTitle: 'Frågor',
  related: 'Fler guider',
  cta: {
    title: 'Redo att göra din egen?',
    text: 'Hämta in dina bilder, välj de du vill ha och se varje sida innan du betalar.',
    button: 'Skapa din bok',
  },
  items: {
    guideInstagramBook: {
      title: 'Så gör du en fotobok av ditt Instagram',
      description:
        'Gör en fotobok av dina Instagram-inlägg: hämta in bilderna (anslut, exportera eller Google Foto), välj inläggen, justera layouten och ladda ner en tryckfärdig PDF.',
      lead: 'För att göra en fotobok av Instagram behöver du tre saker: bilderna ut ur Instagram, ett sätt att välja inläggen och en layout som håller i tryck. Med Inbunden hämtar du in bilderna, väljer inläggen och laddar ner en tryckfärdig PDF. Det tar några minuter, plus den tid Instagram behöver om du använder dataexporten.',
      sections: [
        {
          title: 'Steg 1: Få ut bilderna ur Instagram',
          paragraphs: [
            'Instagram har ingen knapp för att trycka en bok, så bilderna måste ut först. Det finns tre sätt, och inget av dem kräver ditt lösenord:',
          ],
          bullets: [
            'Anslut: logga in på Instagrams egen sida och låt Inbunden läsa dina inlägg. Det tar några sekunder och gillamarkeringarna följer med, men Instagram tillåter det bara för professionella konton (kreatör eller företag).',
            'Dataexport: be Instagram om en kopia av dina inlägg och ladda upp ZIP-filen du får via mejl. Det fungerar för alla konton, även privata, men Instagram behöver några timmar till ett par dagar för att ta fram den.',
            'Google Foto: om dina bilder också finns i Google Foto kan du välja dem i Googles egen bildväljare.',
          ],
        },
        {
          title: 'Steg 2: Välj inläggen',
          paragraphs: [
            'En bok blir bäst med ett tema: ett år, en resa, ett barns första år. Inbunden grupperar dina inlägg per månad och år, så att du kan bocka för hela perioder på en gång eller välja enstaka bilder. När du ansluter kan du också sortera på flest gillamarkeringar. Karusellinlägg följer med, med alla bilder i dem.',
            'En bok rymmer upp till 999 bilder. PDF:en har inget minsta eller högsta antal sidor, och priset är detsamma oavsett hur många sidor det blir.',
          ],
        },
        {
          title: 'Steg 3: Låt layouten göras, justera sedan',
          paragraphs: [
            'Inbunden lägger ut sidorna åt dig i datumordning, med en till fyra bilder per sida, utfallande eller med marginal. Sedan kan du ändra allt:',
          ],
          bullets: [
            'layouten på varje sida: en, två, tre eller fyra bilder, eller utfallande',
            'ordningen, genom att dra bilder mellan sidor',
            'textsidor för en titel, ett datum eller några ord',
            'omslagsbild, titel och format: kvadratiskt (21 × 21 cm) eller stående (21 × 28 cm)',
            'bildtexter och datum under bilderna, av eller på',
          ],
        },
        {
          title: 'Steg 4: Ladda ner den tryckfärdiga PDF:en',
          paragraphs: [
            'Förhandsvisningen är exakt det som trycks. När du är nöjd betalar du en gång och laddar ner en högupplöst PDF. Varje sida har 4 mm utfall och en trimbox. Bilderna bäddas in som originalfilerna, utan omkomprimering, och färgerna är märkta som sRGB, så att ett tryckeri kan trycka filen som den är.',
            'Förhandsvisningen varnar för bilder med låg upplösning innan du betalar. Instagram sparar bilder i upp till 1080 pixlars bredd, vilket blir skarpt i de storlekar layouten använder.',
          ],
        },
        {
          title: 'Steg 5: Skriv ut den',
          paragraphs: [
            'Ta PDF:en till valfritt tryckeri eller en fotobokstjänst på nätet som tar emot PDF-filer. Guiden om att skriva ut din fotobok går igenom vilka inställningar du ska be om. Tryckta böcker från Inbunden, levererade hem till dig, kommer snart.',
          ],
        },
      ],
      faq: [
        {
          q: 'Kan jag göra en fotobok av ett privat Instagram-konto?',
          a: 'Ja, med Instagrams dataexport, som fungerar för privata konton. För att ansluta direkt krävs ett professionellt konto, och sådana gör Instagram offentliga.',
        },
        {
          q: 'Kommer bildtexter och datum med?',
          a: 'Bara om du vill. Du kan visa bildtexter och datum under bilderna eller låta bli, för hela boken.',
        },
        {
          q: 'Fungerar videor?',
          a: 'En bok är tryckt, så Inbunden använder dina bilder. Videor och Reels kommer inte med i boken.',
        },
      ],
    },
    guideInstagramExport: {
      title: 'Så laddar du ner din Instagram-data (bilder och inlägg)',
      description:
        'Steg för steg: begär en kopia av dina Instagram-inlägg i Kontocenter, välj rätt format och kvalitet och ladda ner ZIP-filen när Instagram mejlar dig.',
      lead: 'Du kan ladda ner allt du har lagt upp på Instagram via Kontocenter → Din information och dina behörigheter → Exportera din information. Välj Inlägg, Hela tiden, JSON och Högre mediekvalitet. Instagram mejlar sedan en nedladdningslänk, oftast inom några timmar, och länken fungerar i fyra dagar.',
      sections: [
        {
          title: 'Innan du börjar',
          bullets: [
            'Det fungerar för alla konton: personliga, privata, kreatörs- och företagskonton.',
            'Du behöver ditt Instagram-lösenord en gång, för att bekräfta beställningen på Instagrams egen sida.',
            'Välj bara Inlägg. Filen blir mycket mindre, och det är bara dina inlägg Inbunden behöver.',
          ],
        },
        { title: 'I mobilen (Instagram-appen)', exportSteps: 'mobile' },
        { title: 'På en dator (instagram.com)', exportSteps: 'desktop' },
        {
          title: 'Varför JSON och Högre kvalitet?',
          paragraphs: [
            'JSON behåller datum, bildtexter och ordningen i karuseller i en form som program kan läsa säkert, medan HTML är tänkt för att läsas i en webbläsare. Högre mediekvalitet ger dig de största kopior Instagram har sparat, och det är dem du vill ha i tryck.',
          ],
        },
        {
          title: 'Vad händer sedan',
          paragraphs: [
            'Instagram tar fram filen och mejlar dig när den är klar. Det brukar ta några timmar, ibland en dag eller två, och officiellt ger Instagram sig själv upp till 30 dagar. Nedladdningslänken gäller bara i fyra dagar, så ladda ner ZIP-filen så fort mejlet kommer. Om inget mejl dyker upp, titta i skräpposten eller under Exportera din information i Kontocenter.',
            'Ladda sedan upp ZIP-filen till Inbunden utan att packa upp den. Inbunden läser inläggen direkt ur filen och visar dem grupperade per månad.',
          ],
        },
      ],
      faq: [
        {
          q: 'Hur lång tid tar Instagrams dataexport?',
          a: 'Oftast några timmar, ibland en dag eller två. Instagram säger att det kan ta upp till 30 dagar.',
        },
        {
          q: 'Hur stor blir ZIP-filen?',
          a: 'Det beror på hur mycket du har lagt upp. Med bara Inlägg blir den ofta från några hundra megabyte till några gigabyte. Inbunden tar emot exporter på upp till 8 GB.',
        },
        {
          q: 'Är det säkert att ladda upp min export?',
          a: 'Inbunden läser bara inläggen i filen. Dina bilder sparas i 3 månader så att du kan göra fler böcker, och du kan radera dem när du vill.',
        },
      ],
    },
    guidePrint: {
      title: 'Så skriver du ut din fotobok som PDF',
      description:
        'Var och hur du trycker en fotobok från PDF: vad du ska säga till tryckeriet om format, utfall och färg, och hur du väljer papper och bindning.',
      lead: 'En PDF från Inbunden är tryckfärdig som den är: varje sida har det färdiga formatet plus 4 mm utfall, och färgerna är märkta som sRGB. Skicka den till ett tryckeri eller en fotobokstjänst på nätet som tar emot PDF-filer. Berätta för dem vilket skuret format det är (210 × 210 mm eller 210 × 280 mm), att utfallet redan finns med, och vilket papper och vilken bindning du vill ha.',
      sections: [
        {
          title: 'Vad PDF:en innehåller',
          bullets: [
            'En PDF-sida per boksida, i läsordning, med omslaget som första sida.',
            'Skuret format 210 × 210 mm (kvadratiskt) eller 210 × 280 mm (stående), plus 4 mm utfall runt om. Trimboxen i filen visar var det ska skäras.',
            'Bilderna inbäddade som originalfilerna, utan omkomprimering. Text ligger minst 10 mm innanför skärkanten.',
            'Färg: RGB-bilder med en sRGB-profil (output intent), så att tryckeriet konverterar färgerna förutsägbart.',
          ],
        },
        {
          title: 'Vad du ska säga till tryckeriet',
          steps: [
            {
              title: 'Format och utfall',
              text: '"Skuret format 210 × 210 mm (eller 210 × 280 mm), 4 mm utfall ingår, trimbox satt." Be dem att inte skala sidorna.',
            },
            {
              title: 'Färg',
              text: '"RGB med sRGB-profil. Konvertera gärna till er tryckprofil." De flesta fototryckerier gör det automatiskt.',
            },
            {
              title: 'Bindning',
              text: 'Häftning (klammerhäftning) fungerar för tunna böcker, oftast upp till omkring 48–64 sidor. Limbindning passar tjockare böcker. Layflat-bindning gör att uppslagen öppnar sig helt.',
            },
            {
              title: 'Papper',
              text: 'För bilder är ett bestruket papper på runt 150–200 g/m² en bra början. Silk eller matt papper ger mindre reflexer än blankt.',
            },
            {
              title: 'Omslag',
              text: 'Omslaget är första sidan i PDF:en. För en inbunden bok med tryckt omslag runt pärmarna behöver många tryckerier en separat omslagsfil med rygg. Fråga vad de behöver.',
            },
          ],
        },
        {
          title: 'Skriva ut hemma eller på tryckeri?',
          paragraphs: [
            'Hemskrivare skriver sällan ut ända ut till kanten och kan inte binda. För en bok du vill spara ger ett tryckeri eller en fotobokstjänst på nätet ett betydligt bättre resultat. Tryckta böcker från Inbunden, levererade hem till dig, kommer snart.',
          ],
        },
      ],
      faq: [
        {
          q: 'Kan jag trycka PDF:en på vilket tryckeri som helst?',
          a: 'Ja. PDF:en följer de vanliga trycknormerna (trimbox, utfall, inbäddade bilder, sRGB-profil), så alla tryckerier som tar emot PDF-filer kan trycka den.',
        },
        {
          q: 'Varför blir det vita eller avskurna kanter?',
          a: 'Oftast har sidorna skalats för att passa. Be tryckeriet att skriva ut i 100 % och skära vid trimboxen. De 4 mm utfall är till för att skäras bort.',
        },
        {
          q: 'Blir mina Instagram-bilder skarpa i tryck?',
          a: 'Instagram sparar bilder i upp till 1080 pixlars bredd, vilket blir bra i de storlekar layouten använder. Förhandsvisningen varnar för bilder som skulle bli oskarpa eller suddiga.',
        },
      ],
    },
  },
};
