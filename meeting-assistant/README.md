# Sample Gmail add-on: Meeting Assistant

This is a sample add-on that demonstrates interactivity and the use of the
Calendar API service to facilitate creating meetings based on email threads.

![Screenshot](assets/screenshot_1.png)

Note: This is not an official Google product.


## Before you begin

If you're new to add-on development or [Apps Script][apps-script],
try the [quickstart][quickstart] before proceeding.

This sample requires the following:

-  [Node.js][node] is installed with `npm` and `npx` commands.

## Downloading the sample

Download the sample app and navigate into the app directory:

1.  Clone the [Gmail add-ons samples][github-repo], to your local
    machine:

        git clone https://github.com/googlesamples/gmail-add-ons-samples.git

    Alternatively, you can [download the sample][github-zip] as a zip file and
    extract it.

2.  Change to the sample directory:

        cd gmail-add-ons-samples/meeting-assistant

3.  Initialize the project:

        npm install

4.  Bundle the dependencies:

        npm run build

## Deploy the add-on

Deploy the add-on by following these steps:

1.  Authorize clasp to manage your scripts

        npx @google/clasp login

2.  Create a new project:

        npx @google/clasp create --type standalone --title "Meeting Assistant"

3.  Push the code:

        npx @google/clasp push -f


## Install the add-on

One the add-on is deployed, install the add-on on your account using these steps:

1.  Open the project

        npx @google/clasp open
        
2. In the Apps Script editor, select **Publish > Deploy from manifest...** to open the *Deployments* dialog.

3. In the **Latest Version (Head)** row, click **Install add-on** to install the currently saved version of the add-on in development-mode. 

## Run the add-on

1.  Open [Gmail][gmail]. If Gmail was open prior to enabling the add-on,
    you may need to refresh the tab.

2.  Open a message in Gmail.

3.  The add-on should place a contextual card on the right-side of the window,
    with a message asking for authorization. Click the **Authorize access** link
    to open a dialog where you can authorize the add-on.

4.  Select the account that should authorize the add-on.

5.  Read the notice in the next dialog carefully, then click **Allow**.

6.  Once authorized, the add-on should automatically refresh and start operating.

## Contributing

Please read our [guidelines for contributors][contributing].

## License

This sample is licensed under the [Apache 2 license][license].


<!-- References -->
[quickstart]:https://developers.google.com/gsuite/add-ons/cats-quickstart
[node]:https://nodejs.org/en/
[apps-script]: https://script.google.com
[github-repo]: https://github.com/gsuitedevs/add-ons-samples
[github-zip]: https://github.com/gsuitedevs/add-ons-samples/archive/master.zip
[contributing]: https://github.com/gsuitedevs/add-ons-samples/blob/master/CONTRIBUTING.md
[license]: https://github.com/gsuitedevs/add-ons-samples/blob/master/LICENSE
[gmail]: https://mail.google.com/
