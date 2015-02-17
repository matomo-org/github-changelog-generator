/*!
 * Piwik - free/libre analytics platform
 *
 * @link http://piwik.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

var limitExceeded = false;

function setup(repo, token)
{
    if (repo) {
        $('#repository').val(repo);
    }

    if (token) {
        $('#authtoken').val(token);
    }

    $("#go").on('click', function() {

        var date = $("#issuedate").val();
        var time = $("#issuetime").val();

        if (!date || !time) {
            alert('Please select a date and time.');
            return;
        }

        var dateCheck = /^20\d{2}-\d{2}-\d{2}$/;
        if (!dateCheck.test(date)) {
            alert('Date must be in format YYYY-MM-DD');
            return;
        }

        var timeCheck = /^\d{2}:\d{2}$/;
        if (!timeCheck.test(time)) {
            alert('Time must be in format HH:MM');
            return;
        }

        var isoDate = date + 'T' + time + ':00Z';

        onStart();
        fetchIssuesSince([], isoDate, 1);
    });
}

function getSortRankingOfLabel(memo, label)
{
    var value = _.lastIndexOf(config.sortByLabels, label, false);

    if (value !== -1) {
        memo += (value + 1);
    }

    return memo;
}

function sortIssues(issueA, issueB)
{
    var labelsA = getLabelsFromIssue(issueA);
    var labelsB = getLabelsFromIssue(issueB);

    var indexA = _.reduce(labelsA, getSortRankingOfLabel, 0);
    var indexB = _.reduce(labelsB, getSortRankingOfLabel, 0);

    if (indexA === indexB) {
        return 0;
    }

    return indexA > indexB ? -1 : 1;
}

function renderIssues(issues)
{
    if (config.sortByLabels.length) {
        issues.sort(sortIssues);
    }

    $.each(issues, function (index, issue) {

        var description = formatChangelogEntry(issue, issue.authors);

        $('#issues').append('<li>' + description + '</li>' + "\n");
    });
}

function onStart()
{
    $('#issues').html('');
    $('#go').attr('disabled', 'disabled');
    $('#status').text('Fetching issues in progress');
}

function onEnd(issues)
{
    renderIssues(issues);

    $('#go').attr('disabled', null);
    $('#status').text('');

    var numIssuesClosed = issues.length;

    $('#numIssues').text('Found ' + numIssuesClosed + ' closed issues');
}

function onLimitExceeded()
{
    limitExceeded = true;
    $('#status').text('Limit exceeded!');
    $('#limit').addClass('exceeded');
    $('#go').attr('disabled', null);
}

function formatAuthor(user)
{
    return '<a href="' + user.html_url + '">@' + user.login + '</a>';
}

function formatChangelogEntry(issue, authors)
{
    var description = '<a href="' + issue.html_url + '">#' + issue.number + '</a> ' + issue.title;

    if (authors.length) {
        description += ' [by ' + authors.join(', ') + ']';
    }

    return description;
}

function fetchIssuesSince (issues, isoDate, page)
{
    callGithubApi({
        service : 'repos/' + getRepository() + '/issues',
        data : {since: isoDate, state: 'closed', direction: 'asc', filter: 'all', page: page},
        success : function(result, xhr) {

            $.each(result, function (index, issue) {

                if (hasIssueAnIgnoredLabel(issue)) {
                    return;
                }

                if (!issue.closed_at || isDateOlderThan(issue.closed_at, isoDate)) {
                    // this issue was update after isoDate but already closed before, ignore it
                    return;
                }

                issue.authors = getCommitter(issue, 1);
                issues.push(issue);
            });

            if (hasNextPage(xhr)) {
                issues = fetchIssuesSince(issues, isoDate, page + 1);
            } else {
                onEnd(issues);
            }
        }
    });

    return issues;
}

function getLabelsFromIssue(issue)
{
    if (!issue.labels) {
        return [];
    }

    var labels = [];

    for (index = 0; index < issue.labels.length; index++) {
        labels.push(issue.labels[index].name);
    }

    return labels;
}

function hasIssueAnIgnoredLabel(issue)
{
    var labels = getLabelsFromIssue(issue);

    if (!labels.length) {
        return false;
    }

    var labelsToIgnore = config.labelsToIgnore;
    var index, label;

    for (index = 0; index < labels.length; index++) {
        label = labels[index];

        if (-1 !== labelsToIgnore.indexOf(label)) {
            console.log('issue has an ignored label ', label, issue);
            return true;
        }
    }

    return false;
}

function isDateOlderThan(isoDate, isoDateToCompare)
{
    var date1        = new Date(isoDate);
    var date2Compare = new Date(isoDateToCompare);

    var diff = date1 - date2Compare;

    if (0 > diff) {
        console.log(isoDate, ' is older than ', isoDateToCompare);
        return true;
    }

    return false;
}

function logXRateLimit(xhr)
{
    if (!xhr) {
        return;
    }

    var current = xhr.getResponseHeader('X-RateLimit-Remaining');
    var total   = xhr.getResponseHeader('X-RateLimit-Limit');
    var limit   = 'Remaining requests: ' + current + ' of ' + total;

    if (0 === current || '0' === current) {
        onLimitExceeded();
    }

    $('#limit').html(limit);
}

function hasNextPage(xhr)
{
    var link = xhr.getResponseHeader('Link');

    if (!link) {
        return false;
    }

    return -1 !== link.indexOf('rel="next"');
}

function makeArrayUnique(array){
    return array.filter(function(el, index, arr) {
        return index == arr.indexOf(el);
    });
}

function getCommitter(issue, page)
{
    var authors = [];

    if (issue.pull_request) {
        var formatted = formatAuthor(issue.user);
        authors.push(formatted);
    }

    callGithubApi({
        async: false,
        service : 'repos/' + getRepository() + '/issues/' + issue.number + '/events',
        data : {page: page},
        success : function(result, xhr) {

            $.each(result, function (index, event) {
                if (event.event != 'referenced' && event.event != 'closed') {
                    // we want to list only authors who have contributed code
                    return;
                }

                if (!event.commit_id) {
                    return;
                }

                var formatted = formatAuthor(event.actor);
                authors.push(formatted);
            });

            if (hasNextPage(xhr)) {
                var nextPageAuthors = getCommitter(issue, page + 1);
                authors = authors.concat(nextPageAuthors);
            }
        }
    });

    authors = makeArrayUnique(authors);

    return authors;
}

function getRepository()
{
    return $('#repository').val();
}

function getAuthToken()
{
    return $('#authtoken').val();
}

function callGithubApi(params)
{
    if (limitExceeded) {
        console.log('Ignoring call to GitHub API, limit exceeded', params);
        return;
    }

    params.url   = "https://api.github.com/" + params.service;
    params.error = function (result) {
        console.log('error fetching resource', result);

        var message = 'Error while requesting GitHub API: ';

        if (result && result.responseJSON && result.responseJSON.message) {
            message += result.responseJSON.message;
        } else {
            message += 'see console';
        }

        alert(message);
        onEnd();
    };

    if (getAuthToken()) {
        params.headers = {"Authorization": 'token ' + getAuthToken()};
    }

    if ($.support.cors) {
        var success = params.success
        if ($.isFunction(success)) {
            params.success = function (result, status, xhr) {
                console.log('got api response', arguments);

                if (!result || !$.isArray(result)) {
                    alert('Got an unexpected response');
                    return;
                }

                logXRateLimit(xhr);

                success.call(this, result, xhr)
            }
        }
    } else {
        alert('CORS is not supported, please try another browser');
        return;
    }

    $.ajax(params);
}