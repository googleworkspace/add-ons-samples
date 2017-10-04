# Meeting Assistant sample Gmail add-on

This is a sample add-on that demonstrates interactivity and the use of the
Calendar API service to facilitate creating meetings based on email threads.

<!-- TODO: Link to published version to try it out? -->

## Before you begin

This sample assumes you have `[gasp][gasp-repo]` installed. `Gasp` is a
tool for managing Apps Script projects. See the
[installation and usage](gasp-install) instructions to get started.

## Downloading the sample

Download the sample app and navigate into the app directory:

1.  Clone the [Gmail add-ons samples][github-repo], to your local
    machine:

        git clone https://github.com/googlesamples/gmail-add-on-samples.git

    Alternatively, you can [download the sample][github-zip] as a zip file and
    extract it.

2.  Change to the sample directory.

        cd gmail-add-on-samples/meeting-assistant

## Deploy the add-on

Deploy the add-on by following these steps:

1.  Create a new project:

        gasp create "Meeting Assistant"

2.  Push the code:

        gasp push

3.  Tag a version:

        gasp version 'Push from github'

4.  Deploy the add-on:

        gasp deploy 1 'test'

5.  Verify the deployments:

        gasp deployments

Note the deployment ids. There will be two deployments, one for the tagged
version, another for the `head` version. Use the `head` deployment when
installing the add on if you intend to modify or experiment with the code.

## Install the add-on

One the add-on is deployed, install the add-on on your account using these steps:

1.  Open the [Gmail add-on settings](gmail-settings) tab.

2.  In the *Add-ons* tab, ensure that you have selected the *Enable developer
    add-ons for my account* checkbox.

3.  Paste your add-on's deployment ID into the *Install developer add-on* textbox
    and click *Install*.

4. In the *Install developer add-on* dialog that appears, click the checkbox to
   indicate that you trust this developer (yourself), then click *Install*.

The add-on appears in the *Developer add-ons* list at this point. The
*Enable debugging information* checkbox (which is checked by default) instructs
Gmail to create and display an error report card when script or runtime errors
occur during the execution of the add-on.

## Run the add-on

1.  Open [Gmail](gmail). If Gmail was open prior to enabling the add-on,
    you may need to refresh the tab.

2.  Choose a message in Gmail and open it.

3.  The add-on should place a contextual card on the right-side of the window,
    with a message asking for authorization. Click the *Authorize access* link
    to open a dialog where you can authorize the add-on.

4.  Select the account that should authorize the add-on.

5.  The next dialog may inform you that the app is not verified. In this case you
    can proceed by doing the following:

    a.  Click *Advanced*.

    b. At the bottom of the dialog, click *Go to Meeting Assistant (unsafe)*.

    c. In the new dialog, type "Continue" into the text field, then click *Next*.

6.  Read the notice in the next dialog carefully, then click *Allow*.

7.  Once authorized, the add-on should automatically refresh and start operating.

## Contributing

Please read our [guidelines for contributors][contributing].

## License

This sample is licensed under the [Apache 2 license][license].


<!-- References -->
[github-repo]: https://github.com/googlesamples/gmail-add-ons-samples
[github-zip]: https://github.com/googlesamples/gmail-add-ons-samples/archive/master.zip
[contributing]: https://github.com/googlesamples/gmail-add-ons-samples/blob/master/CONTRIBUTING
[license]: https://github.com/googlesamples/gmail-add-ons-samples/blob/master/LICENSE
[gasp-repo]: TODO
[gasp-install]: TODO
[gmail-setting]: https://mail.google.com/mail/#settings/addons
[gmail]: https://mail.google.com/
