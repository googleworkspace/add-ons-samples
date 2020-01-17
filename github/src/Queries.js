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
 * A GraphQL query.
 *
 * @typedef {string} Query
 */

/**
 * Github queries used for the add-on.
 */

var Queries = {
  // prettier-ignore
  /**
  * Retrieve the current users.
  *
  * @type {Query}
  * @constant
  *
  */
  VIEWER:
    'query { ' +
    '  viewer {' +
    '    login' +
    '    avatarUrl' +
    '  }' +
    '}',

  /**
  * Retrieves a repostory.
  *
  * @type {Query}
  * @constant
  */
  REPOSITORY:
    'query($owner:String!, $repo:String!) { ' +
    '  repository(owner:$owner name:$repo) { ' +
    '    nameWithOwner ' +
    '    owner { ' +
    '      avatarUrl ' +
    '    } ' +
    '    stargazers { ' +
    '      totalCount ' +
    '    } ' +
    '    forks { ' +
    '      totalCount ' +
    '    } ' +
    '    watchers { ' +
    '      totalCount ' +
    '    } ' +
    '    issues(states:OPEN) { ' +
    '      totalCount ' +
    '    } ' +
    '    pullRequests(states:OPEN) { ' +
    '      totalCount ' +
    '    } ' +
    '    updatedAt ' +
    '    url ' +
    '  }' +
    '}',

  /**
  * Retrieves an issue.
  *
  * @type {Query}
  * @constant
  */
  ISSUE:
    'query($owner:String!, $repo:String!, $issue:Int!) { ' +
    '  repository(owner:$owner name:$repo) { ' +
    '    nameWithOwner ' +
    '    issue(number: $issue) { ' +
    '      number ' +
    '      title ' +
    '      id ' +
    '      lastEditedAt ' +
    '      createdAt ' +
    '      closed ' +
    '      state ' +
    '      url ' +
    '      bodyHTML ' +
    '      assignees(first:1) { ' +
    '        nodes { ' +
    '          avatarUrl ' +
    '          url ' +
    '          login ' +
    '        } ' +
    '      } ' +
    '      author { ' +
    '        avatarUrl ' +
    '        url ' +
    '        login ' +
    '      } ' +
    '      milestone { ' +
    '        id ' +
    '        number ' +
    '        dueOn ' +
    '        title ' +
    '        url ' +
    '      } ' +
    '      labels(first:10) { ' +
    '        nodes { ' +
    '          id ' +
    '          color ' +
    '          name ' +
    '        } ' +
    '      } ' +
    '    } ' +
    '  } ' +
    '}',

  /**
  * Retrieves a pull request.
  *
  * @type {Query}
  * @constant
  */
  PULL_REQUEST:
    'query($owner:String!, $repo:String!, $pullRequest:Int!) { ' +
    '  repository(owner:$owner name:$repo) { ' +
    '    nameWithOwner ' +
    '    pullRequest(number: $pullRequest) { ' +
    '      title ' +
    '      id ' +
    '      number ' +
    '      publishedAt ' +
    '      mergeable ' +
    '      mergedAt ' +
    '      merged ' +
    '      lastEditedAt ' +
    '      createdAt ' +
    '      closed ' +
    '      state ' +
    '      url ' +
    '      bodyHTML ' +
    '      author { ' +
    '        avatarUrl ' +
    '        url ' +
    '        login ' +
    '      } ' +
    '      assignees(first:1) { ' +
    '        nodes { ' +
    '          avatarUrl ' +
    '          url ' +
    '          login ' +
    '        } ' +
    '      } ' +
    '      labels(first:10) { ' +
    '        nodes { ' +
    '          id ' +
    '          color ' +
    '          name ' +
    '        } ' +
    '      } ' +
    '    } ' +
    '  } ' +
    '}',

  /**
  * Retrieves a user.
  *
  * @type {Query}
  * @constant
  */
  USER:
    'query($login:String!) { ' +
    '  user(login:$login) { ' +
    '    login ' +
    '    name ' +
    '    email ' +
    '    createdAt ' +
    '    avatarUrl ' +
    '    url ' +
    '    bioHTML ' +
    '    companyHTML ' +
    '    repositoriesContributedTo { ' +
    '      totalCount ' +
    '    } ' +
    '    followers { ' +
    '      totalCount ' +
    '    } ' +
    '    repositories { ' +
    '      totalCount ' +
    '    } ' +
    '  } ' +
    '}',
};
