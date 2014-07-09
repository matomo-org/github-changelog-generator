/*!
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

var config = {};

/**
 * GitHub Repository to fetch issues from.
 * @type {string}
 */
config.repository = 'piwik/piwik';

/**
 * See https://developer.github.com/v3/oauth_authorizations/#create-a-new-authorization
 * @type {string}
 */
config.oauthToken = '';

/**
 * Ignore issues having at least one of those labels.
 * @type {Array}
 */
config.labelsToIgnore = ['R: wontfix', 'R: duplicate', 'R: answered', 'R: invalid.', 'invalid', 'wontfix', 'duplicate'];