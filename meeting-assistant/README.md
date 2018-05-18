# Sample Gmail add-on: Meeting Assistant

This is a sample add-on that demonstrates interactivity and the use of the
Calendar API service to facilitate creating meetings based on email threads.

![Screenshot](assets/screenshot_1.png)

Note: This is not an official Google product.

## Before you begin

If you're new to add-on development or Apps Script, try the [quickstart](quickstart)
before proceeding.

These instructions assume [Node.js](node) is installed along with
`[clasp][clasp-repo]`. `Clasp` is a
tool for managing Apps Script projects. See the
[installation and usage](clasp-install) instructions to get started.

## Downloading the sample

Download the sample app and navigate into the app directory:

1.  Clone the [Gmail add-ons samples][github-repo], to your local
    machine:

        git clone https://github.com/googlesamples/gmail-add-ons-samples

    Alternatively, you can [download the sample][github-zip] as a zip file and
    extract it.

2.  Change to the sample directory.

        cd gmail-add-on-samples/meeting-assistant

3.  Initialize the project:

        npm install

4.  Bundle the dependencies:

        npm run build

## Deploy the add-on

Deploy the add-on by following these steps:

1.  Create a new project:

        clasp create "Meeting assistant"

2.  Push the code:

        clasp push

3.  Tag a version:

        clasp version 'Push from github'

4.  Deploy the add-on:

        clasp deploy 1 'test'

5.  Verify the deployments:

        clasp deployments

Note the deployment ids. There will be two deployments, one for the tagged
version, another for the `head` version. Use the `head` deployment when
installing the add on if you intend to modify or experiment with the code.

## Install the add-on

One the add-on is deployed, install the add-on on your account using these steps:

1.  Open the [Gmail add-on settings](gmail-settings) tab.

2.  In the **Add-ons** tab, ensure that you have selected the **Enable developer
    add-ons for my account** checkbox.

3.  Paste your add-on's deployment ID into the **Install developer add-on** textbox
    and click **Install**.

4. In the **Install developer add-on** dialog that appears, click the checkbox to
   indicate that you trust this developer (yourself), then click **Install**.

The add-on appears in the **Developer add-ons** list at this point. The
**Enable debugging information** checkbox (which is checked by default) instructs
Gmail to create and display an error report card when script or runtime errors
occur during the execution of the add-on.

## Run the add-on

1.  Open [Gmail](gmail). If Gmail was open prior to enabling the add-on,
    you may need to refresh the tab.

2.  Open a message in Gmail.

3.  The add-on should place a contextual card on the right-side of the window,
    with a message asking for authorization. Click the **Authorize access** link
    to open a dialog where you can authorize the add-on.

4.  Select the account that should authorize the add-on.

5.  The next dialog may inform you that the app is not verified. In this case you
    can proceed by doing the following:

    a.  Click **Advanced**.

    b. At the bottom of the dialog, click **Go to Meeting Assistant (unsafe)**.

    c. In the new dialog, type "Continue" into the text field, then click **Next**.

6.  Read the notice in the next dialog carefully, then click **Allow**.

7.  Once authorized, the add-on should automatically refresh and start operating.

## Contributing

Please read our [guidelines for contributors][contributing].

## License

This sample is licensed under the [Apache 2 license][license].


<!-- References -->
[quickstart]:https://developers.google.com/gmail/add-ons/guides/quickstart
[node]:https://nodejs.org/en/
[apps-script]: https://script.google.com
[github-repo]: https://github.com/googlesamples/gmail-add-ons-samples
[github-zip]: https://github.com/googlesamples/gmail-add-ons-samples/archive/master.zip
[contributing]: https://github.com/googlesamples/gmail-add-ons-samples/blob/master/CONTRIBUTING.md
[license]: https://github.com/googlesamples/gmail-add-ons-samples/blob/master/LICENSE
[gmail-setting]: https://mail.google.com/mail/#settings/addons
[gmail]: https://mail.google.com/
[clasp-repo]: https://github.com/google/clasp
[clasp-install]: https://github.com/google/clasp#install
