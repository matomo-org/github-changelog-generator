# GitHub Changelog Generator

This tool queries the GitHub Issues API using [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) to fetch all issues that were closed since a specific date. While doing this, it keeps track of the number of requests remaining in the current rate limit window. You can provide an OAuth2 Token to increase the number of allowed requests per hour. A token can be created for instance through the web UI via the [Application settings page](https://github.com/settings/applications).

For each closed issue it generates a line like this:

```
#341 Update from 2.3 to 2.4 breaks db password [by @tsteur]
```

It lists the issue number, the issue title and all people who have contributed code to this issue.

## Configuration

You can change the configuration in the [src/config.js](src/config.js) file.
The OAuth2 Token and the name of the repository can be changed directly in the UI as well.

## Usage

Just open the file [src/index.html](src/index.html) in your browser, no server needed!

## License

GPL v3 (or later) see [LICENSE](LICENSE)

## Screenshot

![Screenshot](https://raw.github.com/piwik/github-changelog-generator/master/screenshot.png)
