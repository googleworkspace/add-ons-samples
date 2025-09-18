# Gen AI Chat apps built as a Google Workspace add-ons

These code samples create
[Google Chat apps as Google Workspace add-ons](https://developers.google.com/workspace/add-ons/chat)
run on highly scalable platforms such as [Google Cloud Run](https://cloud.google.com/run).
They showcase how to support typical generative AI features and concepts using
[Google Gen AI SDK](https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview),
[Vertex AI](https://cloud.google.com/vertex-ai), and 
[Google Agentspace](https://cloud.google.com/agentspace/docs):

1. **Prompt:** Use a [Gen AI model](https://ai.google.dev/gemini-api/docs/models) to reply to textual messages
   from users in natural language. Specific instructions are provided to the model on how to generate the
   textual answers (language, size).

   ![gen-ai-app-prompt](./showcase/gen-ai-app-prompt.gif)

1. **Format:** Use a Gen AI model to reply to textual messages from users in natural language with
   Google Chat-compatible formatting. Specific instructions are provided to the model on how to generate
   the textual answers (language, size, formatting).

   ![gen-ai-app-format](./showcase/gen-ai-app-format.gif)

1. **Stream:** Use a Gen AI model to generate and reply with short stories based on themes provided by users. 
   Streaming and [Google Chat API](https://developers.google.com/workspace/chat/api/reference) calls are used
   to create the textual message and update it with the story content as its being progressively generated. An
   accessory widget is in the message to clarify when it's generating and complete as well.

   ![gen-ai-app-stream](./showcase/gen-ai-app-stream.gif)

1. **Multimodal:** Use a Gen AI model to edit images based on textual instructions provided by users.
   Google Chat API calls are used to create the reply messages and manage image attachments (download and
   upload).

   ![gen-ai-app-multimodal](./showcase/gen-ai-app-multimodal.gif)

1. **Multi-turn:** Similar to the `prompt` code sample but with support of multi-turn. The history is persisted
   to a [Google Cloud Firestore database](https://firebase.google.com/docs/firestore) and it allows the model to
   generate textual answers based on previous user interactions.

   ![gen-ai-app-multi-turn](./showcase/gen-ai-app-multi-turn.gif)

1. **Ground:** Similar to the `prompt` code sample but with support of the
   [Google Search tool for grounding](https://ai.google.dev/gemini-api/docs/google-search). Sources are highlighted
   by adding cards to the reply messages with URL button links.

   ![gen-ai-app-ground](./showcase/gen-ai-app-ground.gif)

1. **Custom Tool:** Similar to the `multi-turn` code sample but with support of a
   [custom tool for function calling](https://ai.google.dev/gemini-api/docs/function-calling) that calls the
   [Google Workspace Calendar API](https://developers.google.com/workspace/calendar/api) to retrieve the title of
   the next event in a public calendar. The model automatically gathers the ID of the public calendar when not
   already provided by the user because it's required to make the API call.

   ![gen-ai-app-custom-tool](./showcase/gen-ai-app-custom-tool.gif)

1. **MCP:** Similar to the `format` code sample but with support of the
   Workspace Developer Assist MCP remote server.

   ![gen-ai-app-mcp](./showcase/gen-ai-app-mcp.gif)

1. **Google Agentspace:** Wrap a custom [agent](https://cloud.google.com/agentspace/docs) to query
   user's business data retrieved from Calendar, Gmail, Drive, and Sites in natural language with support of
   message formatting, multi-turn, grounding, and suggested follow-ups.

   ![gen-ai-app-agentspace](./showcase/gen-ai-app-agentspace.gif)
