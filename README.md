# GitHub Changelog Generator

The changelog generator that will create automatic changelog for your projects using Github issue trackers.

## Description
This tool queries the GitHub Issues API using [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) to fetch all issues that were closed since a specific date.
While doing this, it keeps track of the number of requests remaining in the current rate limit window. 
You can provide an OAuth2 Token to increase the number of allowed requests per hour. 
A token can be created for instance through the web UI via the [Application settings page](https://github.com/settings/applications).


## What does a Changelog line look like?
For each closed issue it generates a line like this:

```
#341 Update from 2.3 to 2.4 breaks db password [by @tsteur]
```

For each issue the changelog generator lists:
* the issue number with a link to the Github issue page, 
* the issue title,
* all people who have contributed code to this issue and/or were assigned to the issue.

## Configuration

### config.js file
You can change the configuration in the [src/config.js](src/config.js) file.
The OAuth2 Token and the name of the repository can be changed directly in the UI as well.


### sample config.js file

This generator was created for the [Piwik analytics](http://piwik.org/) project to generate our [Release changelogs](http://piwik.org/changelog/).

Here is the configuration we're using to generate our changelog across our many projects and repositories:
    
    var config = {};
    
    config.repository = 'piwik/piwik,piwik/piwik-log-analytics,piwik/piwik-php-tracker,piwik/referrer-spam-blacklist,piwik/tracker-proxy,piwik/device-detector,piwik/searchengine-and-social-list,piwik/component-network,piwik/component-ini,piwik/component-decompress,piwik/component-cache,piwik/piwik-package,piwik/piwik-icons';
    
    config.oauthToken = 'secret';
    
    config.labelsToIgnore = ['invalid', 'wontfix', 'duplicate', 'worksforme', 'answered', 'not-in-changelog'];
    
    config.milestonesToIgnore = ['3.0.0'];
    
    config.sortByLabels = ['RFC', 'c: i18n', 'c: Website piwik.org', 'Bug', 'c: Platform', 'Task', 'c: Accessibility', 'c: Usability', 'c: Design / UI', 'Regression', 'c: Performance', 'Enhancement',  'c: Security', 'c: New plugin', 'Major', 'Critical'];


## Usage

Just open the file [src/index.html](src/index.html) in your browser, no server needed!

## License

GPL v3 (or later) see [LICENSE](LICENSE)

## Screenshot

![Screenshot](https://raw.github.com/piwik/github-changelog-generator/master/screenshot.png)
