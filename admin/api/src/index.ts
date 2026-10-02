/**
 * Entry point for the admin Static Web App's managed Functions. boot.js runs first (imports
 * evaluate in order), so a production app with missing secrets fails to load instead of serving.
 */
import './boot.js';
import './functions/auth.js';
import './functions/users.js';
import './functions/orders.js';
import './functions/stats.js';
import './functions/promos.js';
import './functions/settings.js';
