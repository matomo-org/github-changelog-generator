/*!
 * Matomo - free/libre analytics platform
 *
 * @link http://matomo.org
 * @license http://www.gnu.org/licenses/gpl-3.0.html GPL v3 or later
 */

var limitExceeded = false;
var repositoriesDone;

function setup(repo, token, exclusionRegex)
{
    if (repo) {
        $('#repository').val(repo);
    }

    if (token) {
        $('#authtoken').val(token);
    }

    if (exregex) {
        $('#exregex').val(exclusionRegex);
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

        $.each(getRepositories(), function (index, repository) {
            fetchIssuesSince(repository, [], isoDate, 1);
        });
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

function renderIssues(repository, issues)
{
    var isMainRepository = repository === 'diffblue/test-gen';

    if (config.sortByLabels.length) {
        issues.sort(sortIssues);
    }

    var $issues = $('#issues');

    if (!isMainRepository) {
        $issues.append("  * " + repository + " changes\n");
    }

    if (issues && issues.length === 0) {
        if (isMainRepository) {
            $issues.prepend("  * No changes\n");
        } else {
            $issues.append("    * No changes\n");
        }
    } else {
        $.each(issues, function (index, issue) {
            var description = formatChangelogEntry(issue, repository);
            if (isMainRepository) {
                $('#issues').prepend( description + "\n" );
            } else {
                $('#issues').append("  " + description + "\n");
            }
        });
    }
}

function onStart()
{
    repositoriesDone = {};

    $('#issues').html('');
    $('#go').attr('disabled', 'disabled');
    $('#status').text('Fetching issues in progress');
    $('#numIssues').text('');
}

function onEnd(repository)
{
    repositoriesDone[repository] = true;

    if (!haveAllRepositoriesEnded()) {
        return;
    }

    $('#go').attr('disabled', null);
    $('#status').text('');

    var numIssuesClosed = $('#issues').find('li:not(.notAnIssue)').length;

    $('#numIssues').text('Found ' + numIssuesClosed + ' closed issues');
}

function haveAllRepositoriesEnded()
{
    var done = true;
    $.each(getRepositories(), function (i, repository) {
        if (!(repository in repositoriesDone)) {
            done = false;
        }
    });

    return done;
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

function encodedStr(rawStr)
{
    return rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function (i) {
        return '&#' + i.charCodeAt(0) + ';';
    });
}

function formatChangelogEntry(issue, repository)
{
    var description = '  * ' + encodedStr(issue.title) + ' (' + repository + '#' + issue.number + ')'

    return description;
}

function fetchIssuesSince (repository, issues, isoDate, page)
{
    callGithubApi({
        service : 'repos/' + repository + '/issues',
        data : {since: isoDate, state: 'closed', direction: 'asc', filter: 'all', page: page},
        success : function(result, xhr) {

            $.each(result, function (index, issue) {

                if (hasIssueAnIgnoredLabel(issue)) {
                    return;
                }

                if (hasIssueAnIgnoredMilestone(issue)) {
                    return;
                }

                if (!issue.closed_at || isDateOlderThan(issue.closed_at, isoDate)) {
                    console.log('ignore this issue because it was updated within your date range, but it was already closed before', issue);
                    return;
                }

                if (isPullRequest(issue) && !isPullRequestMerged(issue)) {
                    console.log('Ignoring issue as it was not merged', issue);
                    return;
                }

                if( isIssueExcluded(issue) ) {
                    console.log('Ignoring issue due to exclusion regex.', issue);
                    return;
                }

                //issue.authors = getCommitter(issue, 1);
                issues.push(issue);
            });

            if (hasNextPage(xhr)) {
                issues = fetchIssuesSince(repository, issues, isoDate, page + 1);
            } else {
                renderIssues(repository, issues);
                onEnd(repository);
            }
        }
    }, true);

    return issues;
}

function isPullRequest(issue)
{
    return !!issue.pull_request;
}

function isPullRequestMerged(issue)
{
    var pullRequest = getPullRequest(issue.pull_request.url);

    return pullRequest && pullRequest.merged;
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

function isIssueExcluded(issue)
{
    var exclusionRegexText = getExclusionRegex();
    if( exclusionRegexText === '') {
        return false;
    }
    return (new RegExp(exclusionRegexText)).test(issue.title)
}

function hasIssueAnIgnoredMilestone(issue)
{
    if (!issue || !issue.milestone || !issue.milestone.title) {
        return false;
    }

    var milestone = issue.milestone.title;

    var milestonesToIgnore = config.milestonesToIgnore;
    var index, milestoneToIgnore;

    for (index = 0; index < milestonesToIgnore.length; index++) {
        milestoneToIgnore = milestonesToIgnore[index];

        var re = new RegExp( milestoneToIgnore );

        if (re.test(milestone)) {
            console.log('issue has an ignored milestone ', milestoneToIgnore, issue);
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

function getPullRequest(url)
{
    var pullRequest;

    callGithubApi({
        async: false,
        service : url.replace('https://api.github.com/', ''),
        success : function(result) {
            pullRequest = result;
        }
    }, false);

    return pullRequest;
}

function getCommitter(issue, page)
{
    var authors = [];

    if (isPullRequest(issue)) {
        var formatted = formatAuthor(issue.user);
        authors.push(formatted);
    }

    callGithubApi({
        async: false,
        service : issue.events_url,
        data : {page: page},
        success : function(result, xhr) {

            $.each(result, function (index, event) {
                if (event.event != 'closed' && event.event != 'assigned' && event.event != 'merged') {
                    // we want to list only authors who have contributed code
                    return;
                }

                // the "assigned" event does not require a commit_id as we always credit the assigned user
                var onlyCreditAuthorWhenCommitFound = (event.event == 'referenced' || event.event == 'closed');
                if (onlyCreditAuthorWhenCommitFound && !event.commit_id) {
                    console.log('Found a event.event = ' + event.event + ' but it has no commit_id so we do not credit this author', event);
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
    }, true);

    authors = makeArrayUnique(authors);

    return authors;
}

function getRepositories()
{
    return $('#repository').val().split(',');
}

function getAuthToken()
{
    return $('#authtoken').val();
}

function getExclusionRegex()
{
    return $('#exregex').val();
}

function callGithubApi(params, expectArray)
{
    if (limitExceeded) {
        console.log('Ignoring call to GitHub API, limit exceeded', params);
        return;
    }

    if (0 === params.service.indexOf('https://')) {
        params.url = params.service;
    } else {
        params.url = "https://api.github.com/" + params.service;
    }

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
        var success = params.success;
        if ($.isFunction(success)) {
            params.success = function (result, status, xhr) {
                console.log('got api response', arguments);

                if (!result || (expectArray && !$.isArray(result))) {
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
