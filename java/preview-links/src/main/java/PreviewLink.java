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

import com.google.api.services.chat.v1.model.Card;
import com.google.api.services.chat.v1.model.CardHeader;
import com.google.api.services.chat.v1.model.Image;
import com.google.api.services.chat.v1.model.KeyValue;
import com.google.api.services.chat.v1.model.Section;
import com.google.api.services.chat.v1.model.TextParagraph;
import com.google.api.services.chat.v1.model.WidgetMarkup;
import com.google.cloud.functions.HttpFunction;
import com.google.cloud.functions.HttpRequest;
import com.google.cloud.functions.HttpResponse;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.List;

public class PreviewLink implements HttpFunction {
  private static final Gson gson = new Gson();

  @Override
  public void service(HttpRequest request, HttpResponse response) throws Exception {
    JsonObject body = gson.fromJson(request.getReader(), JsonObject.class);
    String url = body.getAsJsonObject("docs")
        .getAsJsonObject("matchedUrl")
        .get("url")
        .getAsString();

    response.getWriter().write(gson.toJson(createCard(url)));
  }

  Card createCard(String url) throws MalformedURLException {
    URL parsedURL = new URL(url);

    if (!parsedURL.getHost().equals("www.example.com")) {
      return new Card();
    }

    if (parsedURL.getPath().startsWith("/support/cases/")) {
      return caseLinkPreview(url);
    }

    if (parsedURL.getPath().startsWith("/people/")) {
      return peopleLinkPreview();
    }

    return new Card();
  }

  // [START add_ons_case_preview_link]

  Card caseLinkPreview(String url) {
    String[] segments = url.split("/");
    String caseId = segments[segments.length - 1];

    CardHeader cardHeader = new CardHeader();
    cardHeader.setTitle(String.format("Case %s: Title bar is broken.", caseId));

    TextParagraph textParagraph = new TextParagraph();
    textParagraph.setText("Customer can't view title on mobile device.");

    WidgetMarkup widget = new WidgetMarkup();
    widget.setTextParagraph(textParagraph);
    Section section = new Section();
    section.setWidgets(List.of(widget));

    Card card = new Card();
    card.setHeader(cardHeader);
    card.setSections(List.of(section));

    return card;
  }

  // [END add_ons_case_preview_link]
  // [START add_ons_people_preview_link]

  Card peopleLinkPreview() {
    CardHeader cardHeader = new CardHeader();
    cardHeader.setTitle("Rosario Cruz");

    Image image = new Image();
    image.setImageUrl("https://developers.google.com/workspace/add-ons/images/employee-profile.png");

    WidgetMarkup imageWidget = new WidgetMarkup();
    imageWidget.setImage(image);

    KeyValue keyValue = new KeyValue();
    keyValue.setIcon("EMAIL");
    keyValue.setContent("rosario@example.com");
    keyValue.setBottomLabel("Case Manager");

    WidgetMarkup keyValueWidget = new WidgetMarkup();
    keyValueWidget.setKeyValue(keyValue);

    Section section = new Section();
    section.setWidgets(List.of(imageWidget, keyValueWidget));

    Card card = new Card();
    card.setHeader(cardHeader);
    card.setSections(List.of(section));

    return card;
  }

  // [END add_ons_people_preview_link]
}

// [END add_ons_preview_link]
