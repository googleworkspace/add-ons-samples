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

public class CreateLinkPreview implements HttpFunction {
  private static final Gson gson = new Gson();

  /**
   * Responds to any HTTP request related to link previews.
   *
   * @param request  An HTTP request context.
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
    if ("example.com".equals(parsedURL.getHost())) {
      if (parsedURL.getPath().startsWith("/support/cases/")) {
        response.getWriter().write(gson.toJson(caseLinkPreview(url)));
        return;
      }

      if (parsedURL.getPath().startsWith("/people/")) {
        response.getWriter().write(gson.toJson(peopleLinkPreview()));
        return;
      }
    }

    response.getWriter().write("{}");
  }

  // [START add_ons_case_preview_link]

  /**
   * A support case link preview.
   *
   * @param url A URL.
   * @return A case link preview card.
   */
  JsonObject caseLinkPreview(String url) throws UnsupportedEncodingException {
    String[] segments = url.split("/");
    JsonObject caseDetails = gson.fromJson(URLDecoder.decode(segments[segments.length - 1].replace("+", "%2B"), "UTF-8").replace("%2B", "+"), JsonObject.class);
    String caseName = String.format("Case %s", caseDetails.get("name").getAsString());
    String caseDescription = caseDetails.get("description").getAsString();

    JsonObject cardHeader = new JsonObject();
    cardHeader.add("title", new JsonPrimitive(caseName));

    JsonObject textParagraph = new JsonObject();
    textParagraph.add("text", new JsonPrimitive(caseDescription));

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
  // [START add_ons_people_preview_link]

  /**
   * An employee profile link preview.
   *
   * @return A people link preview card.
   */
  JsonObject peopleLinkPreview() {
    JsonObject cardHeader = new JsonObject();
    cardHeader.add("title", new JsonPrimitive("Rosario Cruz"));

    JsonObject image = new JsonObject();
    image.add("imageUrl", new JsonPrimitive("https://developers.google.com/workspace/add-ons/images/employee-profile.png"));

    JsonObject imageWidget = new JsonObject();
    imageWidget.add("image", image);

    JsonObject startIcon = new JsonObject();
    startIcon.add("knownIcon", new JsonPrimitive("EMAIL"));

    JsonObject decoratedText = new JsonObject();
    decoratedText.add("startIcon", startIcon);
    decoratedText.add("text", new JsonPrimitive("rosario@example.com"));
    decoratedText.add("bottomLabel", new JsonPrimitive("Case Manager"));

    JsonObject decoratedTextWidget = new JsonObject();
    decoratedTextWidget.add("decoratedText", decoratedText);

    JsonArray widgets = new JsonArray();
    widgets.add(imageWidget);
    widgets.add(decoratedTextWidget);

    JsonObject section = new JsonObject();
    section.add("widgets", widgets);

    JsonArray sections = new JsonArray();
    sections.add(section);

    JsonObject previewCard = new JsonObject();
    previewCard.add("header", cardHeader);
    previewCard.add("sections", sections);

    JsonObject linkPreview = new JsonObject();
    linkPreview.add("title", new JsonPrimitive("Rosario Cruz"));
    linkPreview.add("previewCard", previewCard);

    JsonObject action = new JsonObject();
    action.add("linkPreview", linkPreview);

    JsonObject renderActions = new JsonObject();
    renderActions.add("action", action);

    return renderActions;
  }

  // [END add_ons_people_preview_link]
}

// [END add_ons_preview_link]
