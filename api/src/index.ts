/**
 * Entry point for the managed Functions app. Importing each module registers its routes
 * with the Azure Functions v4 programming model.
 */
import './functions/session.js';
import './functions/auth.js';
import './functions/libraries.js';
import './functions/books.js';
import './functions/orders.js';
import './functions/stripeWebhook.js';
import './functions/instagram.js';
import './functions/cron.js';
import './functions/account.js';
