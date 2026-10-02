---
name: copywrite
description: House writing rules for Inbunden. Use whenever you write or edit any text a person will read, in English or Swedish. That covers i18n strings in app/src/i18n/{en,sv}, landing, guides, SEO titles and descriptions, legal pages, emails (api/src/lib/email.ts), error messages, admin UI, docs, READMEs, commit messages and PR descriptions. No em dashes, and plain natural language instead of consultancy speak.
---

# Copywrite

Every text we write should sound like a friendly person who knows the product, not like a consultancy slide deck. The existing copy in `app/src/i18n/en/landing.ts` is the reference for tone: short, concrete, "you" and "we".

## Hard rules

1. **No em dashes.** Never use the em dash character (U+2014). Do not use a spaced en dash (U+2013 with spaces around it) as a stand-in either. Rewrite with a full stop, comma, colon or parentheses. Two short sentences are usually better than one joined by a dash.
2. **Ranges:** prefer words ("1 to 4 photos", "1 till 4 bilder"). An unspaced en dash in a number range is allowed only where space is very tight.
3. **Names:** the product is Inbunden. The company is Venueve AB. Never mention the owner's personal name anywhere.
4. **British English spelling** (colour, personalise, favourite), matching the existing copy.

## Sound like a person, not a consultancy

Avoid the house style of Accenture, Deloitte, PwC, EY, McKinsey and their friends. If a phrase could appear in an annual report or a LinkedIn post about "transformation", rewrite it.

Words and phrases to avoid, with what to say instead:

| Avoid | Say instead |
| --- | --- |
| leverage, utilise | use |
| seamless, seamlessly | say what actually happens ("in two clicks") |
| robust, cutting-edge, state-of-the-art, best-in-class, world-class | drop it, or give the concrete fact |
| solution(s) | the thing itself: the app, the PDF, the book |
| empower, enable, unlock, elevate | let, help, or just the verb ("you can") |
| streamline, optimise (as a vague claim) | faster, simpler, fewer steps |
| journey, experience (as a noun for using the app) | drop it, or describe the steps |
| holistic, synergy, ecosystem, landscape, paradigm | drop it |
| game-changer, revolutionary, next-level | drop it |
| delve, dive into, navigate | look at, go through, use |
| curated, crafted, bespoke | chosen, made, your own |
| we are excited/thrilled to announce | just say the news |
| in today's fast-paced/digital world | drop it |
| at the end of the day, moving forward, going forward | drop it |
| it's not just X, it's Y | say what it is |

Also avoid these patterns:
- Lists of three just for rhythm ("simple, fast and beautiful"). Keep only the ones that are true and matter.
- Rhetorical questions as openers ("Ever wondered...?").
- Filler intros and wrap-up summaries ("In this guide we will...", "In summary...").
- Hedging stacks ("may potentially help to").
- Exclamation marks, unless something really is surprising. No emoji in product copy.

## How to write

- Short sentences. Everyday words. Active voice.
- Talk to the reader as "you". Talk about Inbunden as "we".
- Be concrete: prices, page counts, sizes, what happens next. "Download your PDF" beats "Access your content".
- Say it once. If a sentence repeats the heading, cut it.
- Sentence case for headings and buttons ("Start your book", not "Start Your Book").
- Buttons say what they do: a verb and an object.
- Error messages say what went wrong and what to do next, without blaming the user.
- Keep English and Swedish strings saying the same thing, but write each one natively. Do not translate word for word.

## Swedish

The same rules apply in Swedish, including no em dashes.
- Write Swedish the way people talk. Avoid translated corporate English: "leverera värde", "lösning" as a buzzword, "ta det till nästa nivå", "skapa engagemang", "i dagens digitala värld".
- Use "du", never "ni" for a single reader.
- Prefer Swedish words over anglicisms when a natural one exists ("ladda upp", not "uploada").
- Swedish conventions: decimal comma, space before units and "kr" ("199 kr", "21 × 21 cm"), sentence case headings.

## Examples

| Before | After |
| --- | --- |
| Inbunden seamlessly transforms your Instagram journey into a premium, curated photo book experience. | Inbunden turns your Instagram posts into a photo book. |
| Unlock your memories by leveraging our cutting-edge layout engine. | Pick your photos and we lay out the pages. |
| We're thrilled to announce that printed books are coming soon! | Printed books are coming soon. |
| An error occurred while processing your request. | We couldn't load your photos. Check your connection and try again. |
| Vi levererar en sömlös lösning för dina minnen. | Vi gör en fotobok av dina Instagram-bilder. |

## Before you finish

1. Search what you wrote for the em dash character (U+2014) and for a spaced en dash. Fix every hit.
2. Scan for the words in the table above.
3. Read it out loud. If it sounds like a press release, rewrite it until it sounds like a person.
