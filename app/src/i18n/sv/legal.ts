import type { Messages } from '../en';

export const legal: Messages['legal'] = {
  updated: (date: string) => `Senast uppdaterad ${date}`,
  contact: 'hello@inbunden.com',
  privacy: {
    title: 'Integritetspolicy',
    lead: 'Vad Inbunden sparar om dig, varför, hur länge och vilka mer som ser det.',
    sections: [
      {
        title: 'Vem som ansvarar',
        paragraphs: [
          'Inbunden drivs av Venueve AB i Sverige, som är personuppgiftsansvarig för uppgifterna som beskrivs här. Skriv till hello@inbunden.com om du har frågor eller önskemål om dina uppgifter.',
        ],
      },
      {
        title: 'Vad vi sparar',
        paragraphs: [
          'Dina bilder: kopior av bilderna du tar in (från din Instagram-export, Instagram-inloggning eller Google Foto), med datum, bildtext och antal gilla-markeringar när källan har dem.',
          'Dina böcker och beställningar: titlar, sidlayouter, PDF:erna du beställer, priser och betalstatus.',
          'Ditt konto: din e-postadress och ett hashat lösenord (aldrig själva lösenordet), om du skapar ett konto. Innan dess använder du Inbunden med en anonym session.',
          'Åtkomstnycklar: om du ansluter Instagram eller Google Foto sparar vi nyckeln de ger oss, krypterad. Vi ser eller sparar aldrig ditt lösenord till Instagram eller Google.',
          'Teknisk information: din IP-adress används kort för att begränsa upprepade inloggningsförsök och sparas inte.',
          'Besöksstatistik: när en sida öppnas räknar vi sidans adress, webbplatsen du kom från, typen av enhet (mobil, surfplatta eller dator) och språket. För att räkna unika besökare utan kaka kombineras din IP-adress och webbläsare med ett slumpvärde som byts varje dygn och görs om till en envägskod. Själva IP-adressen sparas aldrig, och koden kan inte spåras tillbaka till dig eller kopplas ihop mellan dagar.',
          'Google Analytics, bara om du godkänner det i cookie-rutan: vilka sidor du tittar på, hur du kom hit, din enhet, webbläsare och ungefärliga plats (land eller stad, som Google härleder från din IP-adress), och en slumpmässig identifierare som sparas i en kaka. Vi använder det för att förstå hur webbplatsen används, aldrig för reklam: annonsfunktionerna är avstängda.',
        ],
      },
      {
        title: 'Varför, och med vilken rättslig grund',
        paragraphs: [
          'För att leverera tjänsten du ber om: importera bilder, bygga boken, leverera PDF:en och skicka mejlen som hör till (returlänk, boken är klar, nytt lösenord, påminnelse före radering). Den rättsliga grunden är avtalet mellan dig och oss (GDPR artikel 6.1 b).',
          'För att hålla tjänsten säker och förhindra missbruk, till exempel gränser för inloggningsförsök. Den rättsliga grunden är vårt berättigade intresse (artikel 6.1 f).',
          'För att förstå hur många som besöker webbplatsen och vilka sidor de använder, genom den anonyma besöksstatistiken ovan. Den rättsliga grunden är vårt berättigade intresse (artikel 6.1 f).',
          'Google Analytics används bara med ditt samtycke (artikel 6.1 a). Du kan återkalla det när som helst under Cookie-inställningar längst ner på varje sida; inget skickas till Google innan du godkänner.',
          'För att bevara bokföring över betalda beställningar enligt bokföringslagen (artikel 6.1 c).',
          'Vi använder inte dina bilder eller uppgifter för reklam, profilering eller för att träna något, och vi säljer dem inte.',
        ],
      },
      {
        title: 'Hur länge vi sparar',
        paragraphs: [
          'Bilder sparas i 3 månader efter en import, och varje ny bok förlänger tiden med 3 månader. Vi mejlar dig en vecka innan de raderas. Du kan radera dem själv när du vill under Mina böcker.',
          'Beställda PDF:er finns kvar på ditt konto tills du ber oss radera dem, så att du kan ladda ner boken igen.',
          'En anonym session som inte används på 30 dagar, och aldrig ledde till en beställning, raderas med allt innehåll.',
          'Åtkomsten till Instagram upphör senast efter 60 dagar, eller när du kopplar från. Åtkomsten till Google Foto upphör inom en timme.',
          'Bokföring av betalda beställningar sparas i de 7 år som lagen kräver.',
          'Besöksstatistik raderas efter 90 dagar.',
          'Data i Google Analytics sparas av Google i 14 månader. Kakorna upphör efter högst 2 år, eller tas bort så fort du återkallar ditt samtycke.',
        ],
      },
      {
        title: 'Vilka mer som behandlar dina uppgifter',
        paragraphs: [
          'Microsoft Azure driver webbplatsen, databasen och bildlagringen i Microsofts region West Europe (Nederländerna).',
          'Resend skickar våra mejl och får din e-postadress och mejlets innehåll.',
          'Google (Google Ireland Limited) driver Google Analytics åt oss som personuppgiftsbiträde, om du godkänner det.',
          'Stripe hanterar kortbetalningar när kortbetalning är aktiverad. Kortuppgifterna går direkt till Stripe och når aldrig oss.',
          'Google får din inloggning när du använder import från Google Foto och delar bara bilderna du väljer. Instagram (Meta) är inblandat bara om du ansluter det eller använder dess export.',
          'Webbplatsens egna typsnitt hämtas från vår server. Bara betalformuläret i kassan hämtar ett typsnitt från Google Fonts, vilket innebär att din webbläsare kontaktar Googles servrar där och att Google ser din IP-adress.',
          'Några av leverantörerna finns i USA. Överföringarna omfattas av EU–US Data Privacy Framework eller EU:s standardavtalsklausuler.',
        ],
      },
      {
        title: 'Så skyddar vi dina uppgifter',
        paragraphs: [
          'Under överföring: all trafik till och från Inbunden, och mellan Inbunden och tjänsterna vi använder, krypteras med HTTPS (TLS 1.2 eller nyare).',
          'I lagring: dina bilder, böcker och vår databas lagras krypterade hos Microsoft Azure inom EU. Lagringen är aldrig öppen för allmänheten. Dina bilder ligger i privata lagringsbehållare och kan bara öppnas via kortlivade signerade länkar som ges till din egen session.',
          'Åtkomstnycklar: nycklarna vi får från Google och Instagram krypteras med AES-256-GCM innan de sparas, med en nyckel som förvaras skild från uppgifterna. Google-nyckeln ger bara läsrätt, gäller bara bilderna du väljer, förnyas aldrig och upphör inom en timme. Kopplar du från återkallas den hos Google direkt.',
          'Lösenord och sessioner: lösenord sparas bara som en saltad scrypt-hash. Din session är en signerad kaka som skript på sidan inte kan läsa (HttpOnly) och som bara skickas över HTTPS.',
          'Behörighet: bara Inbundens egen tjänst kan läsa dina bilder och nycklar. Ingen på Venueve AB tittar på dina bilder om du inte ber oss hjälpa till med en viss bok. Vårt eget administrationsverktyg är en separat webbplats som kräver inloggning i två steg, och allt som görs där loggas. Upprepade inloggningsförsök begränsas.',
          'Om en personuppgiftsincident ändå skulle inträffa anmäler vi den till Integritetsskyddsmyndigheten (IMY) inom 72 timmar och informerar de som berörs, som GDPR kräver.',
        ],
      },
      {
        title: 'Uppgifter från Google',
        paragraphs: [
          'När du importerar från Google Foto får Inbunden bara bilderna du väljer i Googles egen bildväljare, och bara för att kopiera dem till din bok. Vi kan inte se resten av ditt bibliotek, dina album eller din Google-profil.',
          'Vi delar inte uppgifter från Google med någon annan än de biträden som listas ovan och som driver tjänsten, och vi använder dem aldrig för reklam, profilering eller för att träna AI- eller maskininlärningsmodeller.',
          'Inbundens användning och överföring till andra appar av information som tas emot från Googles API:er följer Google API Services User Data Policy (developers.google.com/terms/api-services-user-data-policy), inklusive kraven på begränsad användning (Limited Use).',
        ],
      },
      {
        title: 'Kakor och lagring i webbläsaren',
        paragraphs: [
          'Inbunden sätter en kaka, pg_session, som håller dig inloggad i upp till 30 dagar. Den är nödvändig för tjänsten, så vi ber inte om samtycke. Besöksstatistiken ovan fungerar helt utan kakor och utan lagring i webbläsaren.',
          'Om du godkänner Google Analytics i cookie-rutan sätter Google kakorna _ga och _ga_JJQ0ZS1MSP (upp till 2 år). Inget sätts innan du godkänner, det är lika enkelt att avböja som att godkänna, och du kan ändra ditt val under Cookie-inställningar längst ner på varje sida. Det finns inga reklamkakor.',
          'Din webbläsare sparar också ditt språkval, ditt cookie-val och boken du arbetar med (lokal lagring), så att de finns kvar om sidan laddas om. De lämnar aldrig din enhet om du inte sparar boken.',
        ],
      },
      {
        title: 'Dina rättigheter',
        paragraphs: [
          'Du kan begära en kopia av dina uppgifter, få dem rättade eller raderade, begränsa eller invända mot behandlingen och få ut dem i ett flyttbart format. Skriv till hello@inbunden.com; vi svarar inom en månad. Vill du radera ditt konto och allt i det räcker det att du hör av dig. Bilder kan du radera själv direkt under Mina böcker.',
          'Tycker du att vi hanterar dina uppgifter fel kan du klaga hos Integritetsskyddsmyndigheten (IMY, imy.se).',
        ],
      },
      {
        title: 'Ändringar',
        paragraphs: [
          'Om policyn ändras på ett sätt som spelar roll säger vi det på webbplatsen och, om du har ett konto, via mejl.',
        ],
      },
    ],
  },
  terms: {
    title: 'Användarvillkor',
    lead: 'Avtalet mellan dig och Inbunden när du använder webbplatsen eller köper en bok.',
    sections: [
      {
        title: 'Tjänsten',
        paragraphs: [
          'Inbunden gör en fotobok av bilder du väljer. Du tar in bilderna, väljer vilka du vill ha och arrangerar sidorna; vi tar fram en tryckfärdig PDF av boken. Tryckta böcker säljs inte ännu.',
          'Inbunden drivs av Venueve AB i Sverige (hello@inbunden.com). Villkoren gäller alla som använder webbplatsen; genom att använda den godkänner du dem.',
        ],
      },
      {
        title: 'Ditt konto',
        paragraphs: [
          'Du kan börja utan konto. För att köpa en bok behöver du en e-postadress och ett lösenord. Håll lösenordet för dig själv; du ansvarar för det som görs med ditt konto.',
        ],
      },
      {
        title: 'Dina bilder',
        paragraphs: [
          'Dina bilder är fortsatt dina. Du ger oss tillåtelse att lagra, behandla och lägga ut bilderna du tar in, enbart för att leverera tjänsten till dig och så länge som integritetspolicyn beskriver.',
          'Du får bara använda bilder som du har rätt att använda. Ladda inte upp innehåll som är olagligt eller som gör intrång i någon annans upphovsrätt, integritet eller andra rättigheter. Vi kan ta bort sådant innehåll och stänga kontot.',
        ],
      },
      {
        title: 'Pris och betalning',
        paragraphs: [
          'Priset visas innan du betalar och inkluderar moms där det gäller. Betalningen dras när du bekräftar beställningen. Så länge webbplatsen visar ”Testläge” dras ingen riktig betalning.',
        ],
      },
      {
        title: 'Leverans och ångerrätt',
        paragraphs: [
          'PDF:en är digitalt innehåll som levereras direkt efter betalning. Enligt distansavtalslagen (2005:59) har du 14 dagars ångerrätt vid köp på nätet, men den gäller inte digitalt innehåll när leveransen har påbörjats med ditt samtycke och ditt godkännande av att ångerrätten därmed upphör.',
          'Om PDF:en inte kan tas fram eller har ett fel som vi orsakat rättar vi det eller betalar tillbaka hela beloppet. Skriv till hello@inbunden.com.',
        ],
      },
      {
        title: 'Tillgänglighet och ansvar',
        paragraphs: [
          'Vi arbetar för att Inbunden ska vara tillgängligt och dina bilder säkra, men kan inte lova att tjänsten alltid fungerar utan avbrott. Behåll dina originalbilder: Inbunden är ingen säkerhetskopiering, och bildkopior raderas enligt integritetspolicyn.',
          'Vårt ansvar är begränsat till det belopp du betalade för beställningen i fråga, utom där lagen inte tillåter en sådan begränsning, till exempel vid grov vårdslöshet. Inget i villkoren begränsar dina rättigheter som konsument enligt svensk lag.',
        ],
      },
      {
        title: 'Andra tjänster',
        paragraphs: [
          'När du ansluter Instagram eller Google Foto gäller deras egna villkor för din användning av dem. Inbunden är inte knutet till, godkänt eller sponsrat av Instagram, Meta eller Google.',
        ],
      },
      {
        title: 'Ändringar och tvister',
        paragraphs: [
          'Vi kan uppdatera villkoren; den version som visas när du beställer gäller för den beställningen. Svensk lag gäller. Om vi inte kommer överens kan du vända dig till Allmänna reklamationsnämnden (ARN, arn.se) eller allmän domstol.',
        ],
      },
    ],
  },
};
