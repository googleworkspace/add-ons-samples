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
 * Urls of various icons.
 * From https://github.com/webdog/octicons-png
 * @constant
 */
var Icons = {
  repository: buildIconUrl_('repo'),
  contributedRepositories: buildIconUrl_('repo-push'),
  state: buildIconUrl_('pulse'),
  person: buildIconUrl_('person'),
  calendar: buildIconUrl_('calendar'),
  stars: buildIconUrl_('star'),
  forks: buildIconUrl_('repo-forked'),
  watchers: buildIconUrl_('eye'),
  issues: buildIconUrl_('bug'),
  pullRequests: buildIconUrl_('repo-pull'),
  email: buildIconUrl_('mail'),
  company: buildIconUrl_('organization'),
  location: buildIconUrl_('location'),
  bio: buildIconUrl_('note'),
  followers: buildIconUrl_('radio-tower'),
  labels: buildIconUrl_('tag'),
};

/**
 * Constructs the full URL for an icon.
 * @param {String} name - base file name of the icon
 * @return {String} full URL to the hosted icon.
 */
function buildIconUrl_(name) {
  return 'https://cdn.rawgit.com/webdog/octicons-png/bd02e5bc/' + name + '.svg.png';
}

/**
 * Builds the custom authorization card to connect to the user's GitHub
 * account.
 *
 *  @param {Object} opts Parameters for building the card
 * @param {string} opts.url - Authorization URL to redirect to.
 * @return {Card}
 */
function buildAuthorizationCard(opts) {
  var header = CardService.newCardHeader().setTitle('Authorization required');
  var section = CardService.newCardSection()
      .addWidget(
          CardService.newTextParagraph().setText(
              'Please authorize access to your GitHub account.'
          )
      )
      .addWidget(
          CardService.newButtonSet().addButton(
              CardService.newTextButton()
                  .setText('Authorize')
                  .setAuthorizationAction(
                      CardService.newAuthorizationAction()
                          .setAuthorizationUrl(opts.url)
                  )
          )
      );
  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addSection(section);
  return card.build();
}

/**
 * Creates a card for display error details.
 *
 * @param {Object} opts Parameters for building the card
 * @param {Error} opts.exception - Exception that caused the error
 * @param {string} opts.errorText - Error message to show
 * @param {boolean} opts.showStackTrace - True if full stack trace should be displayed
 * @return {Card}
 */
function buildErrorCard(opts) {
  var errorText = opts.errorText;

  if (opts.exception && !errorText) {
    errorText = opts.exception.toString();
  }

  if (!errorText) {
    errorText = 'No additional information is available.';
  }

  var card = CardService.newCardBuilder();
  card.setHeader(
      CardService.newCardHeader().setTitle('An unexpected error occurred')
  );
  card.addSection(
      CardService.newCardSection().addWidget(
          CardService.newTextParagraph().setText(errorText)
      )
  );

  if (opts.showStackTrace && opts.exception && opts.exception.stack) {
    var stack = opts.exception.stack.replace(/\n/g, '<br/>');
    card.addSection(
        CardService.newCardSection()
            .setHeader('Stack trace')
            .addWidget(CardService.newTextParagraph().setText(stack))
    );
  }

  return card.build();
}

/**
 * Creates a card for displaying the add-on settings.
 *
 * @param {Object} opts Parameters for building the card
 * @param {string} opts.avatarUrl - URL of the user's avatar
 * @param {string} opts.login - User's github login ID.
 * @return {Card}
 */
function buildSettingsCard(opts) {
  var header = CardService.newCardHeader()
      .setTitle('Settings')
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(opts.avatarUrl)
      .setSubtitle(opts.login);

  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addSection(
          CardService.newCardSection().addWidget(
              CardService.newButtonSet().addButton(
                  CardService.newTextButton()
                      .setText('Disconnect account')
                      .setOnClickAction(createAction_('disconnectAccount'))
              )
          )
      );
  return card.build();
}

/**
 * Creates a card displaying details about an issue.
 *
 * @param {Object} opts Parameters for building the card
 * @param {string} opts.id - Issue Id
 * @param {number} opts.number - Issue number
 * @param {string} opts.title - Issue title
 * @param {string} opts.url - Link to issue on github
 * @param {string} opts.authorAvatarUrl - URL of the author's avatar image
 * @param {string} opts.repositoryName - Name of the containing repository (org/name syntax)
 * @param {string[]} opts.labels - Labels assigned to issue
 * @param {string} opts.state - Issue state
 * @param {Object} opts.author - Issue author
 * @param {Object} opts.assignee - User the pull request is assigned to
 * @param {Date} opts.createdAt - Date/time the issue was created
 * @param {Date} opts.updatedAt - Date/time the issue was last updated
 * @return {Card}
 */
function buildIssueCard(opts) {
  var header = CardService.newCardHeader()
      .setTitle(Utilities.formatString('Issue #%d', opts.number))
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(opts.authorAvatarUrl)
      .setSubtitle(opts.title);

  var labels = _.join(opts.labels, '<br/>');

  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addCardAction(
          CardService.newCardAction()
              .setText('View issue on GitHub')
              .setOpenLink(createExternalLink_(opts.url))
      )
      .addSection(
          CardService.newCardSection()
              .setHeader('Details')
              .addWidget(createRepositoryKeyValue_('Repository', opts.repositoryName))
              .addWidget(createKeyValue_('State', Icons.state, opts.state))
              .addWidget(createUserKeyValue_('Reported by', opts.author))
              .addWidget(createUserKeyValue_('Assignee', opts.assignee))
              .addWidget(
                  createKeyValue_(
                      'Created at',
                      Icons.calendar,
                      formatDateTime_(opts.createdAt)
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Updated at',
                      Icons.calendar,
                      formatDateTime_(opts.updatedAt)
                  )
              )
              .addWidget(createKeyValue_('Labels', Icons.labels, labels))
      );
  return card.build();
}

/**
 * Creates a card displaying details about a pull request.
 *
 * @param {Object} opts Parameters for building the card
 * @param {string} opts.id - Issue Id
 * @param {number} opts.number - Issue number
 * @param {string} opts.title - Issue title
 * @param {string} opts.url - Link to issue on github
 * @param {string} opts.authorAvatarUrl - URL of the author's avatar image
 * @param {string} opts.repositoryName - Name of the containing repository (org/name syntax)
 * @param {string[]} opts.labels - Labels assigned to issue
 * @param {string} opts.state - Issue state
 * @param {Object} opts.author - Issue author
 * @param {Object} opts.assignee - User the pull request is assigned to
 * @param {Date} opts.createdAt - Date/time the pull request was created
 * @param {Date} opts.updatedAt - Date/time the pull request was last updated
 * @param {Date} opts.mergedAt - Date/time the pull request was merged (if so)
 * @param {Date} opts.closedAt - Date/time the pull request was closed (if so)
 * @return {Card}
 */
function buildPullRequestCard(opts) {
  var header = CardService.newCardHeader()
      .setTitle(Utilities.formatString('Pull request #%d', opts.number))
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(opts.authorAvatarUrl)
      .setSubtitle(opts.title);

  var labels = _.join(opts.labels, '<br/>');

  var closedOrMergedAt = opts.state == 'MERGED' ? opts.mergedAt : opts.closedAt;
  var lastEditedAt = opts.updatedAt ? opts.updatedAt : closedOrMergedAt;

  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addCardAction(
          CardService.newCardAction()
              .setText('View pull request on GitHub')
              .setOpenLink(createExternalLink_(opts.url))
      )
      .addSection(
          CardService.newCardSection()
              .setHeader('Details')
              .addWidget(createRepositoryKeyValue_('Repository', opts.repositoryName))
              .addWidget(createKeyValue_('State', Icons.state, opts.state))
              .addWidget(createUserKeyValue_('Created by', opts.author))
              .addWidget(createUserKeyValue_('Assignee', opts.assignee))
              .addWidget(
                  createKeyValue_(
                      'Created at',
                      Icons.calendar,
                      formatDateTime_(opts.createdAt)
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Updated at',
                      Icons.calendar,
                      formatDateTime_(lastEditedAt)
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Closed at',
                      Icons.calendar,
                      formatDateTime_(closedOrMergedAt)
                  )
              )
              .addWidget(createKeyValue_('Labels', Icons.labels, labels))
      );
  return card.build();
}

/**
 * Creates a card displaying details about a repository.
 *
 * @param {Object} opts Parameters for building the card
 * @param {string} opts.name - Name of the containing repository (org/name syntax)
 * @param {string} opts.ownerAvatarUrl - URL of the author's avatar image
 * @param {number} opts.stargazers - Number of stars
 * @param {number} opts.forks - Number of forks
 * @param {number} opts.watchers - Number of watchers
 * @param {number} opts.openIssues - Number of open issues
 * @param {number} opts.pullRequests - Number of open pull requests
 * @param {Date} opts.updatedAt - Date/time the repo was last updated
 * @return {Card}
 */
function buildRepositoryCard(opts) {
  var header = CardService.newCardHeader()
      .setTitle(opts.name)
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setImageUrl(opts.ownerAvatarUrl);

  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addCardAction(
          CardService.newCardAction()
              .setText('View repository on GitHub')
              .setOpenLink(createExternalLink_(opts.url))
      )
      .addSection(
          CardService.newCardSection()
              .addWidget(
                  createKeyValue_('Stars', Icons.stars, opts.stargazers.toString())
              )
              .addWidget(createKeyValue_('Forks', Icons.forks, opts.forks.toString()))
              .addWidget(
                  createKeyValue_('Watchers', Icons.watchers, opts.watchers.toString())
              )
              .addWidget(
                  createKeyValue_(
                      'Open Issues',
                      Icons.watchers,
                      opts.openIssues.toString()
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Open pull requests',
                      Icons.pullRequests,
                      opts.pullRequests.toString()
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Updated at',
                      Icons.calendar,
                      formatDateTime_(opts.updatedAt)
                  )
              )
      );
  return card.build();
}

/**
 * Creates a card displaying details about a user.
 *
 * @param {Object} opts Parameters for building the card
 * @param {string} opts.login - User's login Id
 * @param {string} opts.avatarUrl - URL of the avatar image
 * @param {string} opts.name - User's name
 * @param {string} opts.email - User's email
 * @param {string} opts.company - User's employer
 * @param {string} opts.location - User's location
 * @param {string} opts.bio - User's bio
 * @param {Date} opts.memberSince - Date user joined GitHub
 * @param {number} opts.repositoryCount - Number of repositories the user owns or forked
 * @param {number} opts.contributedRepositorytCount - Number of repositories the user contributed to
 * @param {number} opts.followerCount - Number of people following the user
 * @return {Card}
 */
function buildUserCard(opts) {
  var header = CardService.newCardHeader()
      .setImageUrl(opts.avatarUrl)
      .setImageStyle(CardService.ImageStyle.CIRCLE)
      .setTitle(opts.login)
      .setSubtitle(defaultTo_(opts.name, ''));
  var card = CardService.newCardBuilder()
      .setHeader(header)
      .addCardAction(
          CardService.newCardAction()
              .setText('View user on GitHub')
              .setOpenLink(createExternalLink_(opts.url))
      )
      .addSection(
          CardService.newCardSection()
              .setHeader('About')
              .addWidget(createKeyValue_('Email', Icons.email, opts.email))
              .addWidget(createKeyValue_('Company', Icons.company, opts.company))
              .addWidget(createKeyValue_('Location', Icons.location, opts.location))
              .addWidget(createKeyValue_('Bio', Icons.bio, opts.bio))
      )
      .addSection(
          CardService.newCardSection()
              .setHeader('Statistics')
              .addWidget(
                  createKeyValue_(
                      'Member since',
                      Icons.calendar,
                      formatDateTime_(opts.memberSince)
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Repositories',
                      Icons.repository,
                      opts.repositoryCount.toString()
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Contributed repositories',
                      Icons.contributedRepositories,
                      opts.contributedRepositoryCount.toString()
                  )
              )
              .addWidget(
                  createKeyValue_(
                      'Followers',
                      Icons.followers,
                      opts.followerCount.toString()
                  )
              )
      );
  return card.build();
}

/**
 * Choses between a value and a default placeholder. The placeholder
 * is used if the value is falsy.
 *
 * @param {Object} value - Value to check/return
 * @param {Object} defaultValue - Value to return if original value not valid.
 * @return {Object}
 * @private
 */
function defaultTo_(value, defaultValue) {
  if (_.isEmpty(value)) {
    value = null;
  }
  return _.defaultTo(value, defaultValue);
}

/**
 * Creates a key/value widget. Simple wrapper to reduce boilerplace code.
 *
 * @param {string} label - Top label of widget
 * @param {string} icon - URL of the icon
 * @param {string} value - Main content
 * @return {KeyValue}
 * @private
 */
function createKeyValue_(label, icon, value) {
  return CardService.newKeyValue()
      .setTopLabel(label)
      .setIconUrl(icon)
      .setContent(defaultTo_(value, '---'));
}

/**
 * Creates an action that routes through the `dispatchAction` entry point.
 *
 * @param {string} name - Action handler name
 * @param {Object} optParams - Additional parameters to pass through
 * @return {Action}
 * @private
 */
function createAction_(name, optParams) {
  var params = _.extend({}, optParams);
  params.action = name;
  return CardService.newAction()
      .setFunctionName('dispatchAction')
      .setParameters(params);
}

/**
 * Creates a link to an external URL.
 *
 * @param {string} url - URL to link to
 * @return {OpenLink}
 * @private
 */
function createExternalLink_(url) {
  return CardService.newOpenLink()
      .setUrl(url)
      .setOpenAs(CardService.OpenAs.FULL_SIZE);
}

/**
 * Creates a clickable key/value widget for a user. Links
 * to a user card if the user is not null.
 *
 * @param {string} label - Display name
 * @param {string} person - GitHub username
 * @return {KeyValue}
 * @private
 */
function createUserKeyValue_(label, person) {
  var widget = createKeyValue_(label, Icons.person, person);
  if (person) {
    widget.setOnClickAction(createAction_('showUser', {login: person}));
  }
  return widget;
}

/**
 * Creates a clickable key/value widget for a repository. Links to the
 * repository card.
 *
 * @param {string} label - Display name
 * @param {string} nameWithOwner - Fully qualified repo name
 * @return {KeyValue}
 * @private
 */
function createRepositoryKeyValue_(label, nameWithOwner) {
  var nameAndOwner = nameWithOwner.split('/');
  var action = createAction_('showRepository', {
    owner: nameAndOwner[0],
    repo: nameAndOwner[1],
  });

  return createKeyValue_(
      label,
      Icons.repository,
      nameWithOwner
  ).setOnClickAction(action);
}
/**
 * Formats a date/time into a relative time (e.g. 1 day ago).
 *
 * @param {Date} value - Date/time to format
 * @return {string}
 * @private
 */
function formatDateTime_(value) {
  return value ? moment(value).fromNow() : '---';
}
