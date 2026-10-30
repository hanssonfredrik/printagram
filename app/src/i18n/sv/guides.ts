import type { Messages } from '../en';

export const guides: Messages['guides'] = {
  index: {
    title: 'Guider för fotobok',
    lead: 'Så gör du en fotobok av ditt Instagram, från att få ut bilderna ur Instagram till att hålla den tryckta boken.',
    read: 'Läs guiden',
    updated: (date) => `Uppdaterad ${date}`,
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
        'Gör en fotobok av dina Instagram-inlägg: få ut bilderna ur Instagram, välj inläggen, justera layouten och ladda ner en tryckfärdig PDF.',
      lead: 'För att göra en fotobok av Instagram behöver du bilderna ut ur Instagram, ett sätt att välja inläggen och en layout som håller i tryck. Med Inbunden laddar du upp din Instagram-export, väljer inläggen och laddar ner en tryckfärdig PDF. Det tar några minuter, plus den tid Instagram behöver för att ta fram exporten.',
      sections: [
        {
          title: 'Steg 1: Få ut bilderna ur Instagram',
          paragraphs: [
            'Instagram har ingen knapp för att trycka en bok, så bilderna måste ut först. Det finns två sätt, och inget av dem kräver ditt Instagram-lösenord:',
          ],
          bullets: [
            'Dataexport: be Instagram om en kopia av dina inlägg och ladda upp ZIP-filen du får via mejl. Det fungerar för alla konton, även privata. Instagram behöver några timmar till ett par dagar för att ta fram den. [Så laddar du ner din Instagram-data](guideInstagramExport) visar varje steg.',
            {
              text: 'Google Foto: be Instagram skicka en kopia av dina inlägg till Google Foto och välj dem sedan i Googles egen bildväljare. Bildtexter och gillningar följer inte med den vägen.',
              when: 'googlePhotos',
            },
            {
              text: 'Att ansluta ditt Instagram-konto direkt kommer snart. Vi väntar på att Instagram ska godkänna Inbunden.',
              when: 'noConnect',
            },
            {
              text: 'Anslut Instagram: logga in på Instagrams egen sida så dyker dina inlägg upp direkt. Det kräver ett kreatörs- eller företagskonto.',
              when: 'connect',
            },
          ],
        },
        {
          title: 'Steg 2: Välj inläggen',
          paragraphs: [
            'En bok blir bäst med ett tema: [ett år](guideYearBook), en resa, ett barns första år. Inbunden grupperar dina inlägg per månad och år, så att du kan bocka för hela perioder på en gång eller välja enstaka bilder. Karusellinlägg följer med, med alla bilder i dem.',
            'En bok rymmer upp till 999 bilder. PDF:en har inget minsta eller högsta antal sidor, och priset är detsamma oavsett hur många sidor det blir.',
          ],
        },
        {
          title: 'Steg 3: Kolla layouten och justera den',
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
            'Instagram sparar bilder i upp till 1080 pixlars bredd. Det ser bra ut när en bild tar en halv eller en kvarts sida, men kan bli mjukt över en hel sida. Förhandsvisningen varnar för bilder som är för små för sin plats, innan du betalar.',
          ],
        },
        {
          title: 'Steg 5: Skriv ut den',
          paragraphs: [
            'Ta PDF:en till valfritt tryckeri eller en fotobokstjänst på nätet som tar emot PDF-filer. Guiden om att [skriva ut din fotobok](guidePrint) går igenom vilka inställningar du ska be om. Tryckta böcker från Inbunden kommer snart.',
          ],
        },
      ],
      faq: [
        {
          q: 'Kan jag göra en fotobok av ett privat Instagram-konto?',
          a: 'Ja. Instagrams dataexport fungerar för privata konton, och ditt konto förblir privat.',
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
      lead: 'Du kan ladda ner allt du har lagt upp på Instagram via Kontocenter → Din information och dina behörigheter → Exportera din information. Välj Inlägg, hela perioden, JSON och högsta mediekvalitet. Instagram mejlar sedan en nedladdningslänk, oftast inom några timmar. Länken fungerar i fyra dagar.',
      sections: [
        {
          title: 'Innan du börjar',
          bullets: [
            'Det fungerar för alla konton: personliga, privata, kreatörs- och företagskonton.',
            'Instagram kan be om ditt lösenord för att bekräfta begäran. Du skriver det hos Instagram, aldrig hos Inbunden.',
            'Välj bara Inlägg. Filen blir mycket mindre, och det är bara dina inlägg Inbunden behöver.',
          ],
        },
        { title: 'I mobilen (Instagram-appen)', exportSteps: 'mobile' },
        { title: 'På en dator (instagram.com)', exportSteps: 'desktop' },
        {
          title: 'Varför JSON och högsta kvalitet?',
          paragraphs: [
            'JSON behåller datum, bildtexter och ordningen i karuseller i en form som program kan läsa säkert. HTML är tänkt för att läsas i en webbläsare. Högsta mediekvalitet ger dig de största kopior Instagram har sparat, och det är dem du vill ha i tryck.',
          ],
        },
        {
          title: 'Vad händer sedan?',
          paragraphs: [
            'Instagram tar fram filen och mejlar dig när den är klar. Det brukar ta några timmar, ibland en dag eller två, och officiellt kan det ta upp till 30 dagar. Nedladdningslänken fungerar bara i fyra dagar, så ladda ner ZIP-filen så fort mejlet kommer. Inget mejl? Kolla skräpposten, eller titta under Tillgängliga nedladdningar i Exportera din information.',
            'Ladda sedan upp ZIP-filen till Inbunden utan att packa upp den. Inbunden läser inläggen direkt ur filen och visar dem grupperade per månad.',
            'Fel format, inga inlägg eller en länk som har gått ut? Se [problem med Instagram-exporten och hur du löser dem](guideExportProblems).',
          ],
        },
      ],
      faq: [
        {
          q: 'Hur lång tid tar Instagrams dataexport?',
          a: 'Oftast några timmar, ibland en dag eller två. Instagram säger att det kan ta upp till 30 dagar.',
        },
        {
          q: 'Följer gilla-markeringarna med i exporten?',
          a: 'Nej. Du får bilderna, bildtexten och datumet för varje inlägg, men inte hur många gilla-markeringar inlägget fick. Gilla-markeringarna i exporten är de du själv har gett andra.',
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
    guideGooglePhotos: {
      title: 'Så gör du en fotobok av bilder i Google Foto',
      description:
        'Gör en tryckfärdig fotobok som PDF av bilderna i Google Foto, även Instagram-inlägg du fört över dit. Vad som följer med och hur du väljer bra.',
      lead: 'Bilder i Google Foto blir en fotobok i två steg: välj dem i Googles egen bildväljare och låt Inbunden göra layouten som en tryckfärdig PDF. Instagram kan också skicka en kopia av dina inlägg till Google Foto, vilket gör det här till den enklaste vägen för ett privat Instagram-konto: ingen ZIP att ladda ner, ingen väntan på mejl.',
      sections: [
        {
          title: 'Två sätt bilder hamnar i Google Foto',
          paragraphs: [
            'De flesta har redan Google Foto som säkerhetskopierar mobilen. Det är originalen: full storlek, med dagen bilden togs. De trycks skarpare än något som laddats ner från Instagram.',
            'Instagram kan också kopiera dina inlägg till Google Foto. Metas överföringsverktyg skickar de publicerade versionerna (upp till 1080 pixlar breda) till ett album som heter Dataöverföring (Data Transfer). Den vägen tar du när bilderna du vill ha bara finns på Instagram, eller när du vill ha inläggen precis som du publicerade dem.',
          ],
        },
        {
          title: 'Skicka dina Instagram-inlägg till Google Foto',
          paragraphs: [
            'Det här sker inne i Instagram, inte i Inbunden. Det tar två minuter att starta, och Instagram kopierar i bakgrunden. Det fungerar för alla konton, även privata.',
          ],
          steps: [
            {
              title: 'Öppna Kontocenter',
              text: 'I Instagram-appen: profil → meny (☰) → Inställningar och aktivitet → Kontocenter → Din information och dina behörigheter.',
            },
            {
              title: 'Överför en kopia av din information',
              text: 'Tryck på Överför en kopia av din information (äldre versioner: Ladda ner eller överför information → Överför till en destination). Välj din Instagram-profil.',
            },
            {
              title: 'Välj Google Foto',
              text: 'Välj Inlägg, alla eller ett datumintervall, och sedan Google Foto som destination. Logga in på Google när du blir ombedd och tillåt överföringen.',
            },
            {
              title: 'Vänta på Instagram',
              text: 'Instagram kopierar dina bilder i bakgrunden, oftast inom en timme, ibland längre. Google Foto visar dem i en mapp eller ett album som heter Dataöverföring.',
            },
          ],
        },
        {
          title: 'Välj bilderna och gör boken',
          bullets: [
            {
              text: 'I Inbunden väljer du Via Google Foto och loggar in med Google. Du loggar in på Googles egen sida; Inbunden ser aldrig ditt lösenord.',
              when: 'googlePhotos',
            },
            {
              text: 'Google Foto öppnas i en ny flik med sin bildväljare. Bocka för bilderna du vill ha (albumet Dataöverföring för Instagram-inlägg, eller vad som helst annat i ditt bibliotek) och tryck på Klar. Google delar bara de bilder du bockat för.',
              when: 'googlePhotos',
            },
            {
              text: 'Inbunden kopierar ditt urval i full storlek, lägger ut sidorna i datumordning och visar dig varje sida. Ändra layouter, flytta bilder, lägg till textsidor, välj omslag och ladda sedan ner PDF:en för {price}.',
              when: 'googlePhotos',
            },
            {
              text: 'Inbundens åtkomst till Google Foto upphör av sig själv inom en timme. Dina kopierade bilder finns kvar i ditt Inbunden-bibliotek i 3 månader så att du kan göra fler böcker.',
              when: 'googlePhotos',
            },
            {
              text: 'Inbundens import från Google Foto är pausad just nu. Använd Instagram-exporten i stället: [så laddar du ner din Instagram-data](guideInstagramExport).',
              when: 'noGooglePhotos',
            },
          ],
        },
        {
          title: 'Vad som följer med, och vad som inte gör det',
          bullets: [
            'Bilderna, i den storlek Google Foto har dem. Säkerhetskopior från mobilen är i full storlek; Instagram-överföringar är upp till 1080 pixlar breda, bra för en halv eller en fjärdedels sida, mjuka över en hel sida. Förhandsvisningen varnar för bilder som är för små för sin plats.',
            'Datumen kommer från Google Foto. För Instagram-överföringar är datumet ofta dagen för överföringen, inte dagen du publicerade, så den automatiska ordningen kan bli fel. Du kan dra sidor och bilder i rätt ordning innan du betalar.',
            'Bildtexter och gilla-markeringar stannar på Instagram. Vill du ha bildtexter under bilderna, använd [Instagram-exporten](guideInstagramExport) i stället: den tar med bildtext och datum för varje inlägg. Antal gilla-markeringar finns inte heller i exporten.',
            'Videor hoppas över. En bok rymmer upp till 999 bilder.',
          ],
        },
        {
          title: 'Tips för en bättre bok',
          bullets: [
            'Gör ett album i Google Foto först, till exempel ”Boken 2026”, och gå igenom det på en stor skärm. Att välja ur ett album i bildväljaren går fortare än att skrolla hela biblioteket.',
            'Använd Googles sökning för att hitta det du behöver: ett år, en plats, en person. Välj sedan bland träffarna.',
            'Har du både Instagram-versionen och originalet av en bild, välj originalet. Det trycks skarpare.',
            'Tema slår mängd: [ett år i bilder](guideYearBook), en resa, ett barns första år. Femtio bra bilder blir en bättre bok än trehundra.',
          ],
        },
        {
          title: 'Andra sätt att trycka från Google Foto',
          paragraphs: [
            'Google Foto har en egen tryckbutik i vissa länder (leta efter Tryckbutik i appen). Den trycker en bok som Google formger av bilderna du väljer, och boken skickas hem till dig; du får ingen fil. De flesta fotobokstjänster tar också emot bilder som laddas upp från Google Foto eller mobilen, och du bygger boken i deras redigerare.',
            'Inbunden ger dig en tryckfärdig PDF i stället: du väljer var den ska tryckas, och priset är detsamma oavsett antal sidor. [Guiden om att trycka](guidePrint) listar vad du ska be tryckeriet om, och [jämförelsen](guideCompare) går igenom de andra tjänsterna.',
          ],
        },
      ],
      faq: [
        {
          q: 'Ser Inbunden hela mitt Google Foto-bibliotek?',
          a: 'Nej. Googles bildväljare delar bara de bilder du bockar för. Inbunden kan inte bläddra, söka eller lista något annat, och åtkomsten upphör av sig själv inom en timme.',
        },
        {
          q: 'Behöver jag Google Foto för att använda Inbunden?',
          a: 'Nej. Instagram-exporten fungerar för alla konton och tar med bildtexter och datum. Google Foto är den snabbare vägen när du redan har bilderna där eller inte vill hantera en ZIP-fil.',
        },
        {
          q: 'Varför är datumen på mina Instagram-bilder fel?',
          a: 'När Instagram kopierar inlägg till Google Foto får filerna ofta datumet för överföringen i stället för dagen du publicerade. Inbunden kan bara läsa det datum Google Foto ger. Dra sidorna i rätt ordning, eller använd Instagram-exporten, som behåller de ursprungliga datumen.',
        },
        {
          q: 'Fungerar överföringen för ett privat Instagram-konto?',
          a: 'Ja. Du startar överföringen inne i ditt eget Instagram-konto, så den fungerar för privata och personliga konton lika väl. Inget ändras på ditt konto och inget publiceras.',
        },
        {
          q: 'Hur lång tid tar överföringen från Instagram?',
          a: 'Oftast under en timme, ibland några timmar för stora konton. Leta efter albumet Dataöverföring i Google Foto. Logga in på Inbunden när bilderna finns där.',
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
              text: 'Häftning (klammerhäftning) fungerar för tunna böcker, oftast upp till omkring 48 till 64 sidor. Limbindning passar tjockare böcker. Layflat-bindning gör att uppslagen öppnar sig helt.',
            },
            {
              title: 'Papper',
              text: 'För bilder är ett bestruket papper på runt 150 till 200 g/m² en bra början. Silk eller matt papper ger mindre reflexer än blankt.',
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
            'Hemskrivare skriver sällan ut ända ut till kanten och kan inte binda. För en bok du vill spara ger ett tryckeri eller en fotobokstjänst på nätet ett betydligt bättre resultat. Tryckta böcker från Inbunden kommer snart.',
            'Vill du hellre ha lösa kopior än en bok? Se [så skriver du ut dina Instagram-bilder](guidePrintPhotos). Osäker på vilken tjänst du ska välja? Se [fotobokstjänster för Instagram jämförda](guideCompare).',
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
          a: 'Instagram sparar bilder i upp till 1080 pixlars bredd. De blir bra på en halv eller en kvarts sida, men kan bli mjuka över en hel sida. Förhandsvisningen varnar för bilder som skulle bli oskarpa i tryck.',
        },
      ],
    },
    guideExportProblems: {
      title: 'Problem med Instagram-exporten och hur du löser dem',
      description:
        'Kom Instagram-exporten som HTML, saknar den inlägg, går den inte att öppna eller är den för stor? Vad varje problem betyder och hur du löser det.',
      lead: 'De flesta problem med Instagrams dataexport beror på tre inställningar: formatet ska vara JSON, Inlägg ska vara ibockat och ZIP-filen ska laddas ner inom fyra dagar. Om något av det blev fel begär du en ny export med rätt inställningar. Det tar bara ett par minuter att be om.',
      sections: [
        {
          title: 'Exporten är i HTML-format',
          paragraphs: [
            'Instagram har två format: HTML för att läsa i en webbläsare och JSON för program. Inbunden behöver JSON för att kunna läsa datum, bildtexter och ordningen i karuseller. Begär exporten igen och välj Format: JSON. Stegen finns i [så laddar du ner din Instagram-data](guideInstagramExport).',
          ],
        },
        {
          title: 'Det finns inga inlägg i exporten',
          paragraphs: [
            'ZIP-filen gick att öppna, men det fanns inget i den. Det händer när Inlägg inte var ibockat. Under Anpassa information bockar du ur allt och bockar i Inlägg under Din Instagram-aktivitet. I vissa versioner av appen heter det Media. Kolla också att du valde din Instagram-profil och inte bara ett Facebook-konto.',
          ],
        },
        {
          title: 'Filen går inte att öppna',
          paragraphs: [
            'Nedladdningen avbröts troligen, eller så hade länken redan gått ut. Länken i mejlet från Instagram fungerar i fyra dagar. Ladda ner ZIP-filen igen från mejlet, eller under Tillgängliga nedladdningar i Exportera din information. Har länken gått ut begär du en ny export.',
          ],
        },
        {
          title: 'Exporten kommer i flera delar',
          paragraphs: [
            'Stora konton får exporten uppdelad i flera ZIP-filer. Ladda ner alla och släpp dem på uppladdningssidan samtidigt. Inbunden läser dem som en export. Packa inte upp dem först.',
          ],
        },
        {
          title: 'Filen är för stor',
          paragraphs: [
            'Inbunden tar emot exporter på upp till 8 GB. Är din större begär du den igen med ett eget datumintervall, till exempel ett år i taget, eller med lägre mediekvalitet. Att bara välja Inlägg i stället för all din information gör också filen mycket mindre.',
          ],
        },
        {
          title: 'Mejlet kom aldrig',
          bullets: [
            'Kolla skräpposten och den mejladress som Instagram visade när du startade exporten.',
            'Titta under Tillgängliga nedladdningar i Exportera din information. Filen dyker upp där när den är klar.',
            'Vänta lite till. Det brukar ta några timmar, ibland en dag eller två, och Instagram säger att det kan ta upp till 30 dagar.',
          ],
        },
        {
          title: 'Några bilder hoppades över',
          paragraphs: [
            'Instagram-exporter innehåller normalt JPEG- och WebP-filer. Använder en bild ett annat format hoppar Inbunden över just den bilden och importerar resten. Videor och Reels kommer aldrig med, eftersom en bok är tryckt.',
          ],
        },
      ],
      faq: [
        {
          q: 'Ska jag välja HTML eller JSON för Instagram-exporten?',
          a: 'JSON. Det behåller datum, bildtexter och ordningen i karuseller i en form som program kan läsa. HTML är bara till för att titta på i en webbläsare.',
        },
        {
          q: 'Hur länge gäller nedladdningslänken från Instagram?',
          a: 'I fyra dagar. Efter det får du begära en ny export.',
        },
        {
          q: 'Måste jag packa upp exporten innan jag laddar upp den?',
          a: 'Nej. Ladda upp ZIP-filen som den är. Finns det flera delar släpper du alla samtidigt.',
        },
      ],
    },
    guidePrintPhotos: {
      title: 'Så skriver du ut dina Instagram-bilder',
      description:
        'Skriv ut dina Instagram-bilder som lösa kopior eller som en bok: hur du får ut bilderna, i vilken storlek de blir bra och var du trycker dem.',
      lead: 'För att skriva ut dina Instagram-bilder laddar du först ner dem med Instagrams dataexport. Instagram sparar bilder i upp till 1080 pixlars bredd, vilket blir skarpt upp till ungefär 10 × 10 cm och helt okej upp till ungefär 13 × 13 cm. Är det fler än en handfull bilder är en fotobok lättare att spara än en hög med kopior.',
      sections: [
        {
          title: 'Steg 1: Få ut bilderna ur Instagram',
          paragraphs: [
            'Instagram har ingen utskriftsknapp. Det säkra sättet att få ut alla dina bilder är dataexporten: Instagram mejlar dig en ZIP-fil med alla bilder du har lagt upp. [Så laddar du ner din Instagram-data](guideInstagramExport) visar varje steg.',
            'Har du kvar originalbilderna i mobilen eller kameran, använd dem till stora utskrifter. De har oftast betydligt fler pixlar än kopiorna Instagram sparar.',
          ],
        },
        {
          title: 'Steg 2: Välj en storlek som passar pixlarna',
          paragraphs: [
            'En utskrift blir skarp vid ungefär 300 pixlar per tum och godkänd vid ungefär 200. En Instagram-bild som är 1080 pixlar bred ger:',
          ],
          bullets: [
            'ungefär 9 cm bredd vid 300 pixlar per tum: skarpt',
            'ungefär 10 till 13 cm bredd: fortfarande bra för de flesta bilder',
            'större än ungefär 14 cm: kan se mjukt ut, särskilt på nära håll',
          ],
        },
        {
          title: 'Steg 3: Välj lösa kopior eller en bok',
          paragraphs: [
            'Kvadratiska kopior i 10 × 10 cm passar Instagrams kvadratiska inlägg och de flesta ramar och album. Beställ dem från ett fotolabb, en fototjänst på nätet eller en fotoautomat i butik. Stående inlägg behöver beskäras, eller få en vit kant, för att passa de vanliga storlekarna.',
            'För ett års inlägg, en resa eller ett barns första år håller en fotobok ordning på allt, med datum och bildtexter. Inbunden gör en bok av din export och ger dig en tryckfärdig PDF som du kan [trycka på vilket tryckeri som helst](guidePrint). Med en till fyra bilder per sida får varje bild en storlek där den blir skarp.',
          ],
        },
      ],
      faq: [
        {
          q: 'Hur stor kan jag skriva ut en Instagram-bild?',
          a: 'Instagram sparar bilder i upp till 1080 pixlars bredd. Det blir skarpt i ungefär 9 till 10 cm och ser bra ut upp till ungefär 13 cm.',
        },
        {
          q: 'Kan jag skriva ut bilder från någon annans Instagram?',
          a: 'Bara med deras tillåtelse, och de behöver skicka bilderna till dig. Dataexporten fungerar bara för ditt eget konto.',
        },
        {
          q: 'Skriver Inbunden ut lösa bilder?',
          a: 'Nej. Inbunden gör fotoböcker som tryckfärdig PDF. Du kan trycka PDF:en på vilket tryckeri som helst.',
        },
      ],
    },
    guideYearBook: {
      title: 'Så gör du en årsbok av ditt Instagram',
      description:
        'Gör en fotobok av ditt år från dina Instagram-inlägg: när du ska börja, hur du väljer bilderna och hur det blir en tradition varje år.',
      lead: 'En årsbok samlar årets Instagram-inlägg i en fotobok. Begär din Instagram-export, kryssa för året i Inbunden och ladda ner boken som tryckfärdig PDF. PDF:en kostar lika mycket oavsett hur många sidor året blir, så ett fullt år kostar inte mer än ett lugnt.',
      sections: [
        {
          title: 'Steg 1: Begär exporten i god tid',
          paragraphs: [
            'Instagram behöver några timmar, ibland en dag eller två, för att ta fram exporten. Be om den i början av januari, eller en vecka innan du vill ha boken. Välj hela perioden och JSON, och välj sedan året i Inbunden. [Så laddar du ner din Instagram-data](guideInstagramExport) visar varje steg.',
          ],
        },
        {
          title: 'Steg 2: Kryssa för året och rensa',
          paragraphs: [
            'Inbunden grupperar dina inlägg per månad, så att du kan kryssa för årets tolv månader med några klick. Kryssa sedan ur det som inte hör hemma: dubbletter, skärmdumpar och sådant du lade upp för någon annans skull.',
            'En bok rymmer upp till 999 bilder. Som riktmärke, med en till fyra bilder per sida, blir 100 bilder ungefär 35 till 50 sidor och 300 bilder ungefär 100 till 150.',
          ],
        },
        {
          title: 'Steg 3: Ge varje månad en början',
          bullets: [
            'Lägg till en textsida för varje månad eller årstid, med namnet och några ord.',
            'Använd en utfallande sida för månadens bästa bild.',
            'Slå på datum under bilderna så att boken läses som en dagbok.',
            'Sätt en bild från december, eller årets bästa, på omslaget och skriv en titel, till exempel "2026".',
          ],
        },
        {
          title: 'Steg 4: Gör det till en tradition',
          paragraphs: [
            'Behåll samma format varje år, kvadratiskt 21 × 21 cm eller stående 21 × 28 cm, så att böckerna ser bra ut tillsammans i bokhyllan. Inbunden sparar dina bilder i 3 månader, och varje ny bok ger 3 månader till, så du kan göra en bok till varje familjemedlem, eller ett extra exemplar, utan att importera igen.',
            'När boken är klar [trycker du PDF:en](guidePrint) var du vill. Många familjer ger årsboken som [julklapp](guideGift) till mor- och farföräldrar.',
          ],
        },
      ],
      faq: [
        {
          q: 'Hur många bilder får plats i en årsbok?',
          a: 'Upp till 999 bilder i en bok. Med en till fyra bilder per sida blir 200 bilder ungefär 70 till 100 sidor.',
        },
        {
          q: 'Kostar en tjockare bok mer?',
          a: 'Inte PDF:en. Den har ett pris oavsett antal sidor. Att trycka den kostar mer ju fler sidor den har.',
        },
        {
          q: 'Kan jag göra boken innan året är slut?',
          a: 'Ja. Gör en för första halvåret i sommar och en för andra halvåret i januari.',
        },
      ],
    },
    guideGift: {
      title: 'En fotobok från Instagram i present',
      description:
        'Gör en fotobok av ditt Instagram i present till mor- och farföräldrar, en partner eller en vän: idéer, hur lång tid det tar och hur du hinner i tid.',
      lead: 'En fotobok av ditt Instagram är en enkel och personlig present: bilderna är redan valda och daterade. Räkna med några dagar totalt. Instagram behöver några timmar till en dag eller två för exporten, själva boken tar under en timme och tryckningen beror på tryckeriet.',
      sections: [
        {
          title: 'Idéer som fungerar bra',
          bullets: [
            'Familjens år till mor- och farföräldrar, med datum under bilderna.',
            'Ert år tillsammans till en partner, med en textsida för varje årstid.',
            'Ett barns första år, månad för månad.',
            'En resa eller en sommar, som en tunn bok med stora bilder.',
            'En födelsedagsbok till en vän, av inläggen ni har delat genom åren.',
          ],
        },
        {
          title: 'Hur lång tid det tar',
          steps: [
            {
              title: 'Begär Instagram-exporten',
              text: 'Ungefär två minuter, sedan behöver Instagram några timmar, ibland en dag eller två. Se [så laddar du ner din Instagram-data](guideInstagramExport).',
            },
            {
              title: 'Gör boken',
              text: 'Välj bilderna, justera layouten och lägg till en textsida med en hälsning. Oftast under en timme.',
            },
            {
              title: 'Tryck den',
              text: 'Ett tryckeri i närheten kan ofta trycka på några dagar. Fotobokstjänster på nätet behöver oftast en vecka eller mer, så kolla leveranstiderna före jul. [Utskriftsguiden](guidePrint) går igenom vad du ska be om.',
            },
          ],
        },
        {
          title: 'Ont om tid?',
          paragraphs: [
            'PDF:en går att ladda ner direkt efter att du har betalat. Du kan ge den som fil, eller skriva ut en enda sida som kort och lämna över boken senare.',
          ],
        },
        {
          title: 'Vems bilder kan du använda?',
          paragraphs: [
            'Instagrams dataexport fungerar bara för ditt eget konto. För att göra en bok av någon annans inlägg behöver den personen begära exporten och skicka ZIP-filen till dig, och då är överraskningen förstörd. En bok med dina egna bilder av personen fungerar lika bra.',
          ],
        },
      ],
      faq: [
        {
          q: 'Hur lång tid tar det att göra en fotobok av Instagram?',
          a: 'Räkna med några dagar: Instagram-exporten tar några timmar till en dag eller två, boken under en timme och tryckningen beror på tryckeriet.',
        },
        {
          q: 'Kan jag skriva en hälsning i boken?',
          a: 'Ja. Lägg till en textsida var som helst i boken, till exempel direkt efter omslaget.',
        },
        {
          q: 'Kan jag ge bort PDF:en utan att trycka den?',
          a: 'Ja. PDF:en är din att dela eller trycka, och den går att ladda ner från ditt Inbunden-konto.',
        },
      ],
    },
    guideSaveInstagram: {
      title: 'Så sparar du dina Instagram-bilder innan du raderar kontot',
      description:
        'Ladda ner en kopia av dina Instagram-bilder, bildtexter och datum innan du raderar eller inaktiverar kontot, och vad du kan göra med filerna sedan.',
      lead: 'Innan du raderar Instagram laddar du ner din data under Kontocenter → Din information och dina behörigheter → Exportera din information. Välj hela perioden, JSON och högsta mediekvalitet, och vänta på mejlet med nedladdningslänken. Spara ZIP-filen på ett säkert ställe. När kontot är raderat kan Instagram inte skicka en ny kopia.',
      sections: [
        {
          title: 'Radera eller inaktivera?',
          paragraphs: [
            'Inaktiverar du kontot göms profilen tills du loggar in igen. Inläggen finns kvar hos Instagram och kommer tillbaka när du gör det. Raderar du kontot försvinner det och allt i det för gott. Instagram ger dig 30 dagar att ångra dig efter att du har begärt radering, sedan raderas kontot.',
            'Ladda ner din data först, vilket du än väljer. Det är gratis och tar ett par minuter att begära.',
          ],
        },
        {
          title: 'Vad du ska ta med',
          bullets: [
            'Allt: låt all information vara ibockad om du också vill ha meddelanden, kommentarer, stories och följare. Filen blir stor, men det är den enda fullständiga kopian du får.',
            'Bara bilderna: bocka bara i Inlägg. Filen blir mycket mindre, och det är allt du behöver för en fotobok.',
            'Hela perioden, JSON och högsta mediekvalitet, oavsett vad du tar med. JSON håller ihop datum och bildtext med varje bild.',
          ],
        },
        {
          title: 'Begär exporten i mobilen',
          paragraphs: [
            'Stegen nedan väljer bara Inlägg, vilket räcker för en fotobok. Vill du ha en fullständig kopia hoppar du över steg 5 och låter allt vara ibockat.',
          ],
          exportSteps: 'mobile',
        },
        {
          title: 'Ladda ner den i tid',
          paragraphs: [
            'Instagram mejlar dig när exporten är klar, oftast inom några timmar, ibland en dag eller två. Nedladdningslänken fungerar bara i fyra dagar. Vänta tills du har ZIP-filen på din egen enhet innan du raderar kontot.',
            'Gick något fel? Se [problem med Instagram-exporten och hur du löser dem](guideExportProblems).',
          ],
        },
        {
          title: 'Spara den säkert',
          bullets: [
            'Lägg ZIP-filen på två ställen, till exempel datorn och en molntjänst eller en extern hårddisk.',
            'Du behöver inte packa upp eller sortera den. ZIP-filen är originalet, och verktyg som Inbunden läser den som den är.',
            'Instagram sparar kopior av dina bilder med högst 1080 pixlars bredd. Har du kvar originalen i mobilen eller kameran, spara dem också. De blir skarpare i tryck.',
          ],
        },
        {
          title: 'Gör en bok av arkivet',
          paragraphs: [
            'En ZIP-fil på en hårddisk glöms lätt bort. Vill du se bilderna igen kan du ladda upp exporten till Inbunden, välja de år du vill ha och ladda ner en tryckfärdig PDF för {price}. Du kan göra boken långt efter att kontot är borta, så länge du har ZIP-filen. Se [så gör du en fotobok av ditt Instagram](guideInstagramBook).',
          ],
        },
      ],
      faq: [
        {
          q: 'Kan jag få tillbaka mina bilder efter att jag har raderat Instagram?',
          a: 'Bara under de 30 dagarna innan raderingen går igenom, genom att logga in igen. Sedan är kontot och bilderna borta, så ladda ner din data innan du raderar.',
        },
        {
          q: 'Följer bildtexter och datum med i exporten?',
          a: 'Ja. I JSON-format har varje inlägg sitt datum och sin bildtext. Stories, kommentarer och meddelanden följer bara med om du väljer dem.',
        },
        {
          q: 'Är Inbunden en säkerhetskopia av mitt Instagram?',
          a: 'Nej. Inbunden sparar dina bilder i 3 månader så att du kan göra böcker, sedan raderas de. Spara ZIP-filen själv.',
        },
      ],
    },
    guideChristmas: {
      title: 'En fotobok från ditt Instagram i julklapp',
      description:
        'Gör en fotobok av året på Instagram i julklapp: när du ska börja, hur du hinner före tryckeriernas sista dag och vad du gör om du är sent ute.',
      lead: 'En fotobok av årets Instagram-bilder är en personlig julklapp, och bilderna är redan valda och daterade. Börja senast i slutet av november om du vill ha en tryckt bok. Begär Instagram-exporten först, den tar några timmar till en dag eller två. Själva boken gör du på under en timme, och resten av tiden går till tryckningen.',
      sections: [
        {
          title: 'När du ska börja',
          steps: [
            {
              title: 'Slutet av november: begär Instagram-exporten',
              text: 'Det tar två minuter att begära och några timmar till en dag eller två innan den kommer. Se [så laddar du ner din Instagram-data](guideInstagramExport).',
            },
            {
              title: 'Början av december: gör boken',
              text: 'Välj årets inlägg, kolla layouten och lägg till en textsida med en hälsning efter omslaget. Oftast under en timme.',
            },
            {
              title: 'Första halvan av december: beställ tryckningen',
              text: 'Fotobokstjänster på nätet har egna sista beställningsdagar före jul, ofta i mitten av december, och de har mycket att göra. Ett tryckeri i närheten kan ofta trycka på några dagar. Kolla sista dagen innan du börjar, inte efteråt.',
            },
          ],
        },
        {
          title: 'Idéer till boken',
          bullets: [
            'Familjens år till mor- och farföräldrar, med datum och bildtexter under bilderna.',
            'Ert år tillsammans till en partner, med en textsida för varje årstid.',
            'Ett barns år, månad för månad, till resten av släkten.',
            'Årets bästa resa, som en tunn bok med stora bilder.',
          ],
        },
        {
          title: 'Sent ute? Ge PDF:en',
          paragraphs: [
            'PDF:en går att ladda ner så fort du har betalat, även på julafton. Skriv ut en sida som kort, lägg den under granen och tryck hela boken efter helgerna när tryckerierna har lugnat ner sig. [Presentguiden](guideGift) har fler idéer.',
          ],
        },
        {
          title: 'Vad det kostar',
          paragraphs: [
            'PDF:en kostar {price} oavsett antal sidor, så ett år med 300 bilder kostar lika mycket som en resa med 30. Tryckningen betalar du till det tryckeri du väljer, och priset beror på format, sidor och bindning. [Utskriftsguiden](guidePrint) går igenom vad du ska be om.',
          ],
        },
      ],
      faq: [
        {
          q: 'När är sista dagen att göra en fotobok i julklapp?',
          a: 'För en tryckt bok beror det på tryckeriet. Fotobokstjänster på nätet slutar ofta ta emot julbeställningar i mitten av december. Själva PDF:en kan du göra och ladda ner vilken dag som helst, även på julafton.',
        },
        {
          q: 'Kan jag göra en fotobok av någon annans Instagram?',
          a: 'Bara med deras export, eftersom Instagram bara låter dig ladda ner ditt eget konto. En bok med dina egna bilder av personen fungerar lika bra och behåller överraskningen.',
        },
        {
          q: 'Hur många bilder ska en fotobok i julklapp ha?',
          a: 'Någonstans mellan 40 och 150 bilder ger en bok som känns fyllig utan att bli tung. En bok rymmer upp till 999 bilder.',
        },
      ],
    },
    guideCompare: {
      title: 'Fotobokstjänster för Instagram-bilder jämförda',
      description:
        'Inbunden, MySocialBook, Chatbooks, ifolor, CEWE, Smartphoto och Fotoklok jämförda för fotobok från Instagram: import, lägsta pris och vad du får.',
      lead: 'Få fotobokstjänster kan fortfarande hämta bilder direkt från Instagram. Sedan Meta stängde Instagram Basic Display API får du oftast ladda upp bilderna själv. MySocialBook ansluter till kreatörs- och företagskonton. Inbunden läser Instagrams egen dataexport från alla konton och ger dig en tryckfärdig PDF, medan ifolor, CEWE, Smartphoto och Fotoklok trycker en bok som du gör i deras redigerare.',
      sections: [
        {
          title: 'Två sorters tjänster',
          paragraphs: [
            'De flesta fotobokstjänster säljer en tryckt bok. Du laddar upp bilder, placerar dem i deras redigerare och de trycker och skickar boken. Det passar om du vill ha en färdig bok hemskickad och gärna placerar bilderna själv.',
            'Inbunden utgår i stället från dina Instagram-inlägg. Tjänsten läser exporten du får från Instagram, gör layouten i datumordning med dina bildtexter och säljer resultatet som en tryckfärdig PDF. Du bestämmer själv var den ska tryckas. Tryckta böcker från Inbunden kommer snart.',
          ],
        },
        {
          title: 'Snabb översikt',
          table: {
            caption: 'Fotobokstjänster för Instagram-bilder, kontrollerat 5 oktober 2026',
            head: ['Tjänst', 'Så kommer Instagram-bilderna in', 'Billigaste boken', 'Vad du får'],
            rows: [
              [
                'Inbunden',
                'Ladda upp Instagrams dataexport (alla konton, även privata)',
                '{price} för PDF:en, oavsett antal sidor',
                'Tryckfärdig PDF med layout från dina inlägg',
              ],
              [
                'MySocialBook',
                'Ansluter till Instagram (bara kreatörs- och företagskonton)',
                'Från 33 dollar, häftad med 25 sidor',
                'Tryckt bok, PDF som tillval',
              ],
              [
                'Chatbooks',
                'Ingen Instagram-import längre. Kamerarullen eller Google Foto',
                'Inte kontrollerat',
                'Tryckt bok, skickas till Sverige',
              ],
              [
                'ifolor',
                'Ladda upp från mobil eller dator, eller via deras app',
                'Från 99 kr, häftad 13 × 13 cm med 20 sidor',
                'Tryckt bok, e-bok (ePub) som tillval',
              ],
              [
                'CEWE',
                'Ladda upp, app eller program; Google Foto stöds',
                'Från 99 kr, kompakt bok på ungefär 15 × 15 cm',
                'Tryckt bok',
              ],
              [
                'Smartphoto',
                'Ladda upp från mobil eller dator',
                'Från 109 kr (Mini)',
                'Tryckt bok, tryckt i Belgien',
              ],
              [
                'Fotoklok',
                'Ladda upp, app eller program',
                'Från 199 kr, häftad',
                'Tryckt bok, tryckt i Sverige; trycker även din egen PDF',
              ],
            ],
            note: 'Priserna är ordinarie lägsta priser på varje tjänsts svenska eller internationella webbplats den 5 oktober 2026, utan kampanjkoder, och ändras ofta. Kolla hos tjänsten innan du beställer.',
          },
        },
        {
          title: 'Så har vi jämfört',
          paragraphs: [
            'Vi gör Inbunden, så läs det här som en jämförelse skriven av en av tjänsterna i den. Den 5 oktober 2026 kollade vi tre saker på varje tjänsts egen webbplats: hur Instagram-bilderna kommer in, ordinarie lägsta pris för en bok utan kampanjkoder och vad du får. Tjänsterna säljer olika format och sidantal, så de lägsta priserna är startpunkter och inte en jämförelse av likvärdiga böcker.',
            'Har vi fel eller är något inaktuellt? Mejla hello@inbunden.com så rättar vi det.',
          ],
        },
        {
          title: 'När Inbunden passar dig',
          bullets: [
            'Dina bilder finns på Instagram och du vill ha dem i datumordning, med bildtexter, utan att placera varje bild för hand.',
            'Ditt konto är privat eller personligt, så direktanslutningar till Instagram fungerar inte.',
            'Du vill ha en fil som är din och som du kan trycka var som helst, fler gånger.',
            'Du har många bilder. PDF:en kostar lika mycket med 30 sidor som med 300.',
          ],
        },
        {
          title: 'När en annan tjänst passar bättre',
          bullets: [
            'Du vill få en tryckt bok hemskickad och slippa tryckeriet. Inbunden trycker inte böcker än.',
            'Dina bästa bilder finns i mobilen eller kameran, inte på Instagram. Originalfiler blir skarpare i tryck än Instagrams kopior.',
            'Du vill ha en mycket liten bok eller ett speciellt format, som en presentbok på 13 × 13 cm.',
          ],
        },
        {
          title: 'Trycka en PDF från Inbunden',
          paragraphs: [
            'PDF:en fungerar på alla tryckerier och tjänster på nätet som tar emot PDF-filer. Fotoklok i Sverige trycker böcker från din egen PDF (minst 3 exemplar när detta skrivs). ifolor skriver att de inte kan ta emot PDF-filer i sina beställningar. [Utskriftsguiden](guidePrint) går igenom vad du ska be om.',
          ],
        },
      ],
      faq: [
        {
          q: 'Vilka fotobokstjänster kan hämta bilder direkt från Instagram?',
          a: 'Av tjänsterna vi kollade den 5 oktober 2026 är det bara MySocialBook som ansluter till Instagram, och bara för kreatörs- och företagskonton. Chatbooks slutade när Meta stängde Instagram Basic Display API. Inbunden använder Instagrams dataexport, som fungerar för alla konton.',
        },
        {
          q: 'Vad är billigaste sättet att göra en fotobok av Instagram?',
          a: 'De billigaste tryckta böckerna börjar på ungefär 99 kr för en liten häftad bok. PDF:en från Inbunden kostar {price} oavsett antal sidor, och tryckningen betalar du till det tryckeri du väljer.',
        },
        {
          q: 'Kan jag få min fotobok som PDF?',
          a: 'Inbunden säljer boken som PDF. MySocialBook har PDF som tillval. ifolor har en e-bok i ePub-format. Hos de andra tjänsterna vi kollade hittade vi inget PDF-alternativ.',
        },
      ],
    },
  },
};
