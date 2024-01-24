/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// [START add_ons_preview_link]

import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.Map;

public class CreateLinkPreview implements HttpFunction {
  private static final Gson gson = new Gson();

  /**
   * Responds to any HTTP request related to link previews.
   *
   * @param request An HTTP request context.
   * @param response An HTTP response context.
   */
  @Override
  public void service(HttpRequest request, HttpResponse response) throws Exception {
    JsonObject event = gson.fromJson(request.getReader(), JsonObject.class);
    String url = event.getAsJsonObject("docs")
        .getAsJsonObject("matchedUrl")
        .get("url")
        .getAsString();
    URL parsedURL = new URL(url);
    // If the event object URL matches a specified pattern for preview links.
    if ("example.com".equals(parsedURL.getHost())) {
      if (parsedURL.getPath().startsWith("/support/cases/")) {
        response.getWriter().write(gson.toJson(caseLinkPreview(parsedURL)));
        return;
      }
    }

    response.getWriter().write("{}");
  }

  // [START add_ons_case_preview_link]

  /**
   * A support case link preview.
   *
   * @param url A matching URL.
   * @return The resulting preview link card.
   */
  JsonObject caseLinkPreview(URL url) throws UnsupportedEncodingException {
    // Parses the URL and identify the case details.
    Map<String, String> caseDetails = new HashMap<String, String>();
    for (String pair : url.getQuery().split("&")) {
        caseDetails.put(URLDecoder.decode(pair.split("=")[0], "UTF-8"), URLDecoder.decode(pair.split("=")[1], "UTF-8"));
    }

    // Builds a preview card with the case name, and description
    // Uses the text from the card's header for the title of the smart chip.
    JsonObject cardHeader = new JsonObject();
    String caseName = String.format("Case %s", caseDetails.get("name"));
    cardHeader.add("title", new JsonPrimitive(caseName));

    JsonObject textParagraph = new JsonObject();
    textParagraph.add("text", new JsonPrimitive(caseDetails.get("description")));

    JsonObject widget = new JsonObject();
    widget.add("textParagraph", textParagraph);

    JsonArray widgets = new JsonArray();
    widgets.add(widget);

    JsonObject section = new JsonObject();
    section.add("widgets", widgets);

    JsonArray sections = new JsonArray();
    sections.add(section);

    JsonObject previewCard = new JsonObject();
    previewCard.add("header", cardHeader);
    previewCard.add("sections", sections);

    JsonObject linkPreview = new JsonObject();
    linkPreview.add("title", new JsonPrimitive(caseName));
    linkPreview.add("previewCard", previewCard);

    JsonObject action = new JsonObject();
    action.add("linkPreview", linkPreview);

    JsonObject renderActions = new JsonObject();
    renderActions.add("action", action);

    return renderActions;
  }

  // [END add_ons_case_preview_link]
}

// [END add_ons_preview_link]
