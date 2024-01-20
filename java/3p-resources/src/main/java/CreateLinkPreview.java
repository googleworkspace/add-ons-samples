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
import com.google.gson.JsonObject;

import java.io.UnsupportedEncodingException;
import java.net.URL;
import java.net.URLDecoder;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
  Map caseLinkPreview(String url) throws UnsupportedEncodingException {
    String[] segments = url.split("/");
    JsonObject caseDetails = gson.fromJson(URLDecoder.decode(segments[segments.length - 1].replace("+", "%2B"), "UTF-8").replace("%2B", "+"), JsonObject.class);

    Map cardHeader = new HashMap();
    cardHeader.put("title", String.format("Case %s", caseDetails.get("name").getAsString()));

    Map textParagraph = new HashMap();
    textParagraph.put("text", caseDetails.get("description").getAsString());

    Map widget = new HashMap();
    widget.put("textParagraph", textParagraph);

    Map section = new HashMap();
    section.put("widgets", List.of(widget));

    Map previewCard = new HashMap();
    previewCard.put("header", cardHeader);
    previewCard.put("sections", List.of(section));

    Map linkPreview = new HashMap();
    linkPreview.put("title", String.format("Case %s", caseDetails.get("name").getAsString()));
    linkPreview.put("previewCard", previewCard);

    Map action = new HashMap();
    action.put("linkPreview", linkPreview);

    Map renderActions = new HashMap();
    renderActions.put("action", action);

    return renderActions;
  }

  // [END add_ons_case_preview_link]
  // [START add_ons_people_preview_link]

  /**
   * An employee profile link preview.
   *
   * @return A people link preview card.
   */
  Map peopleLinkPreview() {
    Map cardHeader = new HashMap();
    cardHeader.put("title", "Rosario Cruz");

    Map image = new HashMap();
    image.put("imageUrl", "https://developers.google.com/workspace/add-ons/images/employee-profile.png");

    Map imageWidget = new HashMap();
    imageWidget.put("image", image);

    Map startIcon = new HashMap();
    startIcon.put("knownIcon", "EMAIL");

    Map decoratedText = new HashMap();
    decoratedText.put("startIcon", startIcon);
    decoratedText.put("text", "rosario@example.com");
    decoratedText.put("bottomLabel", "Case Manager");

    Map decoratedTextWidget = new HashMap();
    decoratedTextWidget.put("decoratedText", decoratedText);

    Map section = new HashMap();
    section.put("widgets", List.of(imageWidget, decoratedTextWidget));

    Map previewCard = new HashMap();
    previewCard.put("header", cardHeader);
    previewCard.put("sections", List.of(section));

    Map linkPreview = new HashMap();
    linkPreview.put("title", "Rosario Cruz");
    linkPreview.put("previewCard", previewCard);

    Map action = new HashMap();
    action.put("linkPreview", linkPreview);

    Map renderActions = new HashMap();
    renderActions.put("action", action);

    return renderActions;
  }

  // [END add_ons_people_preview_link]
}

// [END add_ons_preview_link]
