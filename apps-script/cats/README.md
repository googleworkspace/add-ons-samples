# Sample G Suite add-on: Cats

This add-on creates contextual and non-contextual sidebars in Gmail, Calendar, and Drive. The sidebar presents a random image of a cat with text overlaying it. The text is either static (for homepages) or taken from the host application context (for contextual triggers).

Note: This is not an official Google product.

## Before you begin

This sample requires the following:

-  [Node.js][node] is installed with `npm` and `npx` commands.

## Downloading the sample

Download the sample app and navigate into the app directory:

1.  Clone the [Add-ons samples][github-repo], to your local
    machine:

        git clone https://github.com/googleworkspace/add-ons-samples.git

    Alternatively, you can [download the sample][github-zip] as a zip file and
    extract it.

2.  Change to the sample directory:

        cd add-ons-samples/apps-script/cats

3.  Initialize the project:

        npm install

## Deploy the add-on

Deploy the add-on by following these steps:

1.  Authorize clasp to manage your scripts

        npx @google/clasp login

2.  Create a new project:

        npx @google/clasp create --type standalone --title "Cats add-on"

3.  Push the code:

        npx @google/clasp push -f
        

## Install the add-on

Once the add-on is deployed, install the add-on on your account using these steps:

1.  Open the project

        npx @google/clasp open
        
2. In the Apps Script editor, select **Publish > Deploy from manifest...** to open the *Deployments* dialog.

3. In the **Latest Version (Head)** row, click **Install add-on** to install the currently saved version of the add-on in development-mode. 


## Run the add-on

1.  Open [Gmail][gmail]. If Gmail was open prior to enabling the add-on,
    you may need to refresh the tab.

2.  Click the paw print icon in the right icon column to open the add-on.

3.  The add-on should place a card on the right-side of the window,
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
[node]:https://nodejs.org/en/
[github-repo]: https://github.com/googleworkspace/add-ons-samples
[github-zip]: https://github.com/googleworkspace/add-ons-samples/archive/main.zip
[contributing]: https://github.com/googleworkspace/add-ons-samples/blob/main/CONTRIBUTING.md
[license]: https://github.com/googleworkspace/add-ons-samples/blob/main/LICENSE
[gmail]: https://mail.google.com/

