# GitHub Changelog Generator

This tool queries the GitHub Issues API using [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing) to fetch all issues that were closed since a specific date. While doing this, it keeps track of the number of requests remaining in the current rate limit window. You can provide an OAuth2 Token to increase the number of allowed requests per hour.

For each closed issue it generates a line like this:

```
#341 Update from 2.3 to 2.4 breaks db password [by @tsteur]
```

It lists the issue number, the issue title and all people who have contributed code to this issue.

![Screenshot](https://raw.github.com/piwik/github-changelog-generator/master/screenshot.png)

## Configuration

You can either change the OAuth2 Token and the repository directly in the UI or in the [src/config.js](src/config.js) file.

## Usage

Just open the file [src/index.html](src/index.html) in your browser, no server needed!

## License

GPL v3 (or later) see [LICENSE](LICENSE)