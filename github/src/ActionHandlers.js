// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * Map of internal functions for handling various types of github links.
 */
var linkHandlers = {
  issues: handleIssue_,
  pull: handlePullRequest_,
};

/**
 * Collection of functions to handle user interactions with the add-on.
 *
 * @constant
 */
var ActionHandlers = {
  /**
   * Primary handler for the add-on. Displays cards about a pull or issue
   * if referenced in the email.
   *
   * @param {Event} e - Event from Gmail
   * @return {Card[]}
   */
  showAddOn: function(e) {
    var message = getCurrentMessage(e);
    var links = extractGitHubLinks(message.getBody());

    if (_.isEmpty(links)) {
      return [];
    }

    var cards = _.map(links, function(link) {
      if (!linkHandlers[link.type]) {
        throw new Error('Invalid link type: ' + link.type);
      }
      return linkHandlers[link.type](link.owner, link.repo, link.id);
    });
    return cards;
  },

  /**
   * Displays the add-on settings card.
   *
   * @param {Event} e - Event from Gmail
   * @return {CardService.FormAction}
   */
  showSettings: function(e) {
    var githubResponse = githubClient().query(Queries.VIEWER, {});

    var card = buildSettingsCard({
      avatarUrl: githubResponse.viewer.avatarUrl,
      login: githubResponse.viewer.login,
    });

    return CardService.newUniversalActionResponseBuilder()
        .displayAddOnCards([card])
        .build();
  },


  /**
   * Disconnects the user's GitHub account.
   *
   * @param {Event} e - Event from Gmail
   * @return {CardService.ActionResponse}
   */
  disconnectAccount: function(e) {
    githubClient().disconnect();
    var authCard = buildAuthorizationCard({
      url: githubClient().authorizationUrl(),
    });
    var navigation = CardService.newNavigation()
        .popToRoot()
        .updateCard(authCard);
    return CardService.newActionResponseBuilder()
        .setNavigation(navigation)
        .setStateChanged(true)
        .build();
  },

  /**
   * Shows a card displaying details about a GitHub user (name, employer, location, etc.)
   *
   * @param {Event} e - Event from Gmail
   * @return {CardService.FormAction}
   */
  showUser: function(e) {
    var githubResponse = githubClient().query(Queries.USER, {
      login: e.parameters.login,
    });

    var user = githubResponse.user;
    var card = buildUserCard({
      login: user.login,
      avatarUrl: user.avatarUrl,
      url: user.url,
      name: user.name,
      email: user.email,
      company: user.email,
      location: user.location,
      bio: user.bio,
      memberSince: user.createdAt,
      repositoryCount: user.repositories.totalCount,
      contributedRepositoryCount: user.contributedRepositories.totalCount,
      followerCount: user.followers.totalCount,
    });

    return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().pushCard(card))
        .build();
  },

  /**
   * Shows a card displaying details of a GitHub repository.
   *
   * @param {Event} e - Event from Gmail
   * @return {CardService.ActionResponse}
   */
  showRepository: function(e) {
    var githubResponse = githubClient().query(Queries.REPOSITORY, {
      owner: e.parameters.owner,
      repo: e.parameters.repo,
    });

    var repo = githubResponse.repository;

    var card = buildRepositoryCard({
      name: repo.nameWithOwner,
      url: repo.url,
      ownerAvatarUrl: repo.owner.avatarUrl,
      stargazers: repo.stargazers.totalCount,
      forks: repo.forks.totalCount,
      watchers: repo.watchers.totalCount,
      openIssues: repo.issues.totalCount,
      pullRequests: repo.pullRequests.totalCount,
      updatedAt: repo.updatedAt,
    });

    return CardService.newActionResponseBuilder()
        .setNavigation(CardService.newNavigation().pushCard(card))
        .build();
  },

  /**
   * Shows a the GitHub authorization card.
   *
   * @param {Event} e - Event from Gmail
   * @return {CardService.Card}
   */
  showAuthorizationCard: function(e) {
    return buildAuthorizationCard({
      url: githubClient().authorizationUrl(),
    });
  },
};

/**
 * Shows a card for a GitHub issue.
 *
 * @param {string} owner - owner of the repo
 * @param {string} repoName - Repository name
 * @param {integer} id - Issue #
 * @return {CardService.Card}
 * @private
 */
function handleIssue_(owner, repoName, id) {
  var githubResponse = githubClient().query(Queries.ISSUE, {
    owner: owner,
    repo: repoName,
    issue: id,
  });

  var repo = githubResponse.repository;
  var issue = githubResponse.repository.issue;

  var card = buildIssueCard({
    id: issue.id,
    number: issue.number,
    title: issue.title,
    url: issue.url,
    authorAvatarUrl: issue.author.avatarUrl,
    repositoryName: repo.nameWithOwner,
    labels: _.map(issue.labels.nodes, 'name'),
    state: issue.state,
    author: issue.author.login,
    assignee: _.get(issue, 'assignees.nodes[0].login'),
    createdAt: issue.createdAt,
    updatedAt: issue.lastEditedAt,
  });

  return card;
}

/**
 * Shows a card for a GitHub pull request.
 *
 * @param {string} owner - owner of the repo
 * @param {string} repoName - Repository name
 * @param {integer} id - Pull request #
 * @return {CardService.Card}
 * @private
 */
function handlePullRequest_(owner, repoName, id) {
  var githubResponse = githubClient().query(Queries.PULL_REQUEST, {
    owner: owner,
    repo: repoName,
    pullRequest: id,
  });

  var repo = githubResponse.repository;
  var pullRequest = repo.pullRequest;

  var card = buildPullRequestCard({
    id: pullRequest.id,
    number: pullRequest.number,
    title: pullRequest.title,
    url: pullRequest.url,
    authorAvatarUrl: pullRequest.author.avatarUrl,
    repositoryName: repo.nameWithOwner,
    labels: _.map(pullRequest.labels.nodes, 'name'),
    state: pullRequest.state,
    author: pullRequest.author.login,
    assignee: _.get(pullRequest, 'assignees.nodes[0].login'),
    createdAt: pullRequest.createdAt,
    updatedAt: pullRequest.lastEditedAt,
    mergedAt: pullRequest.mergedAt,
    closedAt: pullRequest.closedAt,
  });
  return card;
}
